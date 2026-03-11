const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { writeAuditLog } = require('../utils/audit');

// GET /api/users
exports.list = async (req, res, next) => {
  try {
    const { workspace_id, role, search, active } = req.query;
    let q = db('users as u')
      .leftJoin('user_roles as ur', 'ur.user_id', 'u.id')
      .where('u.is_deleted', false)
      .select('u.id', 'u.email', 'u.name', 'u.job_title', 'u.department', 'u.is_active', 'u.last_login', 'u.created_at')
      .groupBy('u.id')
      .select(db.raw("array_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles"));

    if (workspace_id) {
      q = q.join('workspace_members as wm', function () {
        this.on('wm.user_id', 'u.id').andOn('wm.workspace_id', db.raw('?', [workspace_id]));
      });
    }
    if (role) q = q.havingRaw('? = ANY(array_agg(ur.role))', [role]);
    if (search) q = q.where(function () { this.whereILike('u.name', `%${search}%`).orWhereILike('u.email', `%${search}%`); });
    if (active !== undefined) q = q.where('u.is_active', active === 'true');

    const users = await q.orderBy('u.name');
    return res.json(users);
  } catch (err) { next(err); }
};

// GET /api/users/:id
exports.get = async (req, res, next) => {
  try {
    const user = await db('users').where({ id: req.params.id, is_deleted: false }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const roles = (await db('user_roles').where({ user_id: req.params.id }).select('role')).map(r => r.role);
    const workspaces = await db('workspace_members as wm')
      .join('workspaces as w', 'w.id', 'wm.workspace_id')
      .where({ 'wm.user_id': req.params.id }).select('w.id', 'w.name', 'w.slug');
    const { password_hash, ...safe } = user;
    return res.json({ ...safe, roles, workspaces });
  } catch (err) { next(err); }
};

// POST /api/users
exports.create = async (req, res, next) => {
  try {
    const { email, name, password, job_title, department, roles = ['team_member'] } = req.body;
    if (!email || !name || !password) return res.status(422).json({ error: 'email, name, password required' });
    const existing = await db('users').where({ email }).first();
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    const hash = await bcrypt.hash(password, 12);
    const [user] = await db('users').insert({ email, name, password_hash: hash, job_title, department, is_active: true }).returning('*');
    for (const role of roles) {
      await db('user_roles').insert({ user_id: user.id, role }).onConflict().ignore();
    }
    await writeAuditLog(req.user.id, 'user.create', 'user', user.id, { name, email, roles }, req);
    const { password_hash, ...safe } = user;
    return res.status(201).json({ ...safe, roles });
  } catch (err) { next(err); }
};

// PUT /api/users/:id
exports.update = async (req, res, next) => {
  try {
    const { name, job_title, department, location, is_active } = req.body;
    const [user] = await db('users').where({ id: req.params.id, is_deleted: false })
      .update({ name, job_title, department, location, is_active }).returning('*');
    if (!user) return res.status(404).json({ error: 'Not found' });
    await writeAuditLog(req.user.id, 'user.update', 'user', req.params.id, req.body, req);
    const { password_hash, ...safe } = user;
    return res.json(safe);
  } catch (err) { next(err); }
};

// PUT /api/users/:id/roles
exports.updateRoles = async (req, res, next) => {
  try {
    const { roles } = req.body;
    if (!Array.isArray(roles)) return res.status(422).json({ error: 'roles must be array' });
    await db('user_roles').where({ user_id: req.params.id }).delete();
    for (const role of roles) {
      await db('user_roles').insert({ user_id: req.params.id, role }).onConflict().ignore();
    }
    await writeAuditLog(req.user.id, 'user.roles_updated', 'user', req.params.id, { roles }, req);
    return res.json({ ok: true, roles });
  } catch (err) { next(err); }
};

// POST /api/users/:id/deactivate
exports.deactivate = async (req, res, next) => {
  try {
    await db('users').where({ id: req.params.id }).update({ is_active: false });
    // Remove from all active projects
    await db('project_members').where({ user_id: req.params.id }).update({ is_active: false });
    await writeAuditLog(req.user.id, 'user.deactivate', 'user', req.params.id, null, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// POST /api/users/:id/reactivate
exports.reactivate = async (req, res, next) => {
  try {
    await db('users').where({ id: req.params.id }).update({ is_active: true });
    await writeAuditLog(req.user.id, 'user.reactivate', 'user', req.params.id, null, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// PUT /api/users/me/password
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await db('users').where({ id: req.user.id }).first();
    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await db('users').where({ id: req.user.id }).update({ password_hash: hash });
    // Revoke all refresh tokens (force re-login)
    await db('refresh_tokens').where({ user_id: req.user.id }).update({ revoked: true });
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// DELETE /api/users/:id (soft delete)
exports.softDelete = async (req, res, next) => {
  try {
    await db('users').where({ id: req.params.id }).update({ is_deleted: true, is_active: false });
    await db('project_members').where({ user_id: req.params.id }).update({ is_active: false });
    await writeAuditLog(req.user.id, 'user.delete', 'user', req.params.id, null, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};
