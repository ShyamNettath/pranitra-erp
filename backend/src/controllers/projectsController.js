const db = require('../config/db');
const { writeAuditLog } = require('../utils/audit');
const { sendNotificationEmail } = require('../services/emailService');

// ── helpers ──────────────────────────────────────────────────────
async function canAccessProject(userId, roles, projectId) {
  if (roles.includes('admin') || roles.includes('director')) return true;
  const member = await db('project_members').where({ project_id: projectId, user_id: userId, is_active: true }).first();
  return !!member;
}

// ── GET /api/projects ────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const { workspace_id, status, search } = req.query;
    const { id: userId, roles } = req.user;

    let q = db('projects as p')
      .join('users as pm', 'pm.id', 'p.project_manager_id')
      .where('p.is_deleted', false)
      .select(
        'p.*',
        'pm.name as pm_name',
        db.raw(`(SELECT ROUND(100.0 * p.actual_hours / NULLIF(p.baseline_hours, 0), 1)) as progress_pct`)
      );

    if (workspace_id) q = q.where('p.workspace_id', workspace_id);
    if (status)       q = q.where('p.status', status);
    if (search)       q = q.whereILike('p.name', `%${search}%`);

    // Non-admin/director: only see projects they belong to
    if (!roles.includes('admin') && !roles.includes('director')) {
      q = q.join('project_members as pm2', function() {
        this.on('pm2.project_id', 'p.id').andOn('pm2.user_id', db.raw('?', [userId])).andOn('pm2.is_active', db.raw('true'));
      });
    }

    const projects = await q.orderBy('p.created_at', 'desc');
    return res.json(projects);
  } catch (err) { next(err); }
};

// ── GET /api/projects/:id ─────────────────────────────────────────
exports.get = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!await canAccessProject(req.user.id, req.user.roles, id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const project = await db('projects').where({ id, is_deleted: false }).first();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Enrich with members and categories
    const members = await db('project_members as pm')
      .join('users as u', 'u.id', 'pm.user_id')
      .where({ 'pm.project_id': id, 'pm.is_active': true })
      .select('u.id', 'u.name', 'u.email', 'pm.role', 'pm.allocation_pct');

    return res.json({ ...project, members });
  } catch (err) { next(err); }
};

// ── POST /api/projects ────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const { workspace_id, name, description, color, start_date, end_date, budget } = req.body;
    const [project] = await db('projects').insert({
      workspace_id, name, description, color,
      status: 'draft',
      project_manager_id: req.user.id,
      start_date, end_date,
      baseline_start_date: start_date,
      baseline_end_date: end_date,
      budget,
    }).returning('*');

    // Add PM as member
    await db('project_members').insert({
      project_id: project.id, user_id: req.user.id, role: 'project_manager', allocation_pct: 0, added_date: new Date(),
    }).onConflict().ignore();

    await writeAuditLog(req.user.id, 'project.create', 'project', project.id, { name }, req);
    return res.status(201).json(project);
  } catch (err) { next(err); }
};

// ── PUT /api/projects/:id ─────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowed = ['name','description','color','start_date','end_date','budget'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const [updated] = await db('projects').where({ id, is_deleted: false }).update(data).returning('*');
    if (!updated) return res.status(404).json({ error: 'Project not found' });
    await writeAuditLog(req.user.id, 'project.update', 'project', id, data, req);
    return res.json(updated);
  } catch (err) { next(err); }
};

// ── POST /api/projects/:id/submit ────────────────────────────────
exports.submit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await db('projects').where({ id, is_deleted: false }).first();
    if (!project) return res.status(404).json({ error: 'Not found' });
    if (!['draft', 'changes_requested'].includes(project.status)) {
      return res.status(400).json({ error: 'Project cannot be submitted in current status' });
    }

    await db('projects').where({ id }).update({
      status: 'pending_approval',
      approval_version: project.approval_version + 1,
    });

    // Notify all directors
    const directors = await db('user_roles as ur')
      .join('users as u', 'u.id', 'ur.user_id')
      .where({ 'ur.role': 'director', 'u.is_active': true })
      .select('u.email', 'u.name');

    for (const d of directors) {
      await sendNotificationEmail(d.email, d.name,
        `Project awaiting approval: ${project.name}`,
        `${req.user.name} has submitted "${project.name}" for Director approval.`
      ).catch(() => {});
    }

    await writeAuditLog(req.user.id, 'project.submit', 'project', id, null, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── POST /api/projects/:id/approve ───────────────────────────────
exports.approve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    await db('projects').where({ id }).update({
      status: 'active',
      approved_by: req.user.id,
      approved_at: new Date(),
      approval_comment: comment || null,
    });

    const project = await db('projects').where({ id }).first();
    const pm = await db('users').where({ id: project.project_manager_id }).first();
    if (pm) {
      await sendNotificationEmail(pm.email, pm.name,
        `Project approved: ${project.name}`,
        `${req.user.name} has approved your project "${project.name}". Work can now begin.`
      ).catch(() => {});
    }

    await writeAuditLog(req.user.id, 'project.approve', 'project', id, { comment }, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── POST /api/projects/:id/reject ────────────────────────────────
exports.reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ error: 'Rejection reason required' });
    await db('projects').where({ id }).update({ status: 'draft', approval_comment: comment });
    await writeAuditLog(req.user.id, 'project.reject', 'project', id, { comment }, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── POST /api/projects/:id/request-changes ───────────────────────
exports.requestChanges = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    await db('projects').where({ id }).update({ status: 'changes_requested', approval_comment: comment });
    await writeAuditLog(req.user.id, 'project.request_changes', 'project', id, { comment }, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── POST /api/projects/:id/members ───────────────────────────────
exports.addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, role, allocation_pct } = req.body;
    await db('project_members').insert({
      project_id: id, user_id, role, allocation_pct: allocation_pct || 0, added_date: new Date(), last_active_date: new Date(),
    }).onConflict(['project_id', 'user_id']).merge({ is_active: true, role, allocation_pct: allocation_pct || 0 });
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── DELETE /api/projects/:id/members/:userId ──────────────────────
exports.removeMember = async (req, res, next) => {
  try {
    await db('project_members')
      .where({ project_id: req.params.id, user_id: req.params.userId })
      .update({ is_active: false });
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── DELETE /api/projects/:id ──────────────────────────────────────
exports.softDelete = async (req, res, next) => {
  try {
    await db('projects').where({ id: req.params.id }).update({ is_deleted: true });
    await writeAuditLog(req.user.id, 'project.delete', 'project', req.params.id, null, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── Milestones ────────────────────────────────────────────────────
exports.listMilestones = async (req, res, next) => {
  try {
    const milestones = await db('milestones').where({ project_id: req.params.id, is_deleted: false }).orderBy('due_date');
    return res.json(milestones);
  } catch (err) { next(err); }
};

exports.createMilestone = async (req, res, next) => {
  try {
    const { name, category, due_date, owner_id, budget_checkpoint } = req.body;
    const [ms] = await db('milestones').insert({
      project_id: req.params.id, name, category, due_date, owner_id, budget_checkpoint,
    }).returning('*');
    return res.status(201).json(ms);
  } catch (err) { next(err); }
};

exports.updateMilestone = async (req, res, next) => {
  try {
    const { status, name, due_date } = req.body;
    const [ms] = await db('milestones')
      .where({ id: req.params.mid, project_id: req.params.id })
      .update({ status, name, due_date })
      .returning('*');
    return res.json(ms);
  } catch (err) { next(err); }
};
