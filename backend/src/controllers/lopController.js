const db = require('../config/db');
const { writeAuditLog } = require('../utils/audit');
const { addWorkingDays } = require('../utils/workingDays');

async function canAccessProject(userId, roles, projectId) {
  if (roles.includes('admin') || roles.includes('director')) return true;
  const member = await db('project_members').where({ project_id: projectId, user_id: userId, is_active: true }).first();
  return !!member;
}

async function getProjectForAccess(projectId) {
  return db('projects').where({ id: projectId, is_deleted: false }).first();
}

exports.listSections = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const sections = await db('lop_sections')
      .where({ tenant_id: tenantId, is_deleted: false })
      .orderBy('name');
    return res.json(sections);
  } catch (err) { next(err); }
};

exports.createSection = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { name, description, is_active } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Section name is required' });
    }
    const [section] = await db('lop_sections').insert({
      tenant_id: tenantId,
      name: name.trim(),
      description: description || null,
      is_active: is_active === false ? false : true,
    }).returning('*');
    await writeAuditLog(req.user.id, 'lop.section.create', 'lop_section', section.id, section, req);
    return res.status(201).json(section);
  } catch (err) {
    if (err?.code === '23505') return res.status(409).json({ error: 'Section with same name exists' });
    next(err);
  }
};

exports.updateSection = async (req, res, next) => {
  try {
    const { tenantId, id } = req.params;
    const { name, description, is_active } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description;
    if (is_active !== undefined) data.is_active = !!is_active;
    const [updated] = await db('lop_sections')
      .where({ id, tenant_id: tenantId, is_deleted: false })
      .update(data)
      .returning('*');
    if (!updated) return res.status(404).json({ error: 'Section not found' });
    await writeAuditLog(req.user.id, 'lop.section.update', 'lop_section', updated.id, data, req);
    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.deleteSection = async (req, res, next) => {
  try {
    const { tenantId, id } = req.params;
    const updated = await db('lop_sections')
      .where({ id, tenant_id: tenantId, is_deleted: false })
      .update({ is_deleted: true, is_active: false });
    if (!updated) return res.status(404).json({ error: 'Section not found' });
    await writeAuditLog(req.user.id, 'lop.section.delete', 'lop_section', id, null, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.listItems = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, impact, section_id, owner_id } = req.query;

    const project = await getProjectForAccess(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!await canAccessProject(req.user.id, req.user.roles, projectId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let q = db('lop_items as l')
      .leftJoin('lop_sections as s', 's.id', 'l.section_id')
      .leftJoin('users as raised', 'raised.id', 'l.raised_by')
      .leftJoin('users as owner', 'owner.id', 'l.owner')
      .leftJoin('users as closed_by', 'closed_by.id', 'l.closed_by')
      .where({ 'l.project_id': projectId, 'l.is_deleted': false, 'l.tenant_id': project.workspace_id })
      .select(
        'l.*',
        's.name as section_name',
        'raised.name as raised_by_name',
        'owner.name as owner_name',
        'closed_by.name as closed_by_name'
      )
      .orderBy('l.si', 'asc');

    if (status) q.where('l.status', status);
    if (impact) q.where('l.impact', impact);
    if (section_id) q.where('l.section_id', section_id);
    if (owner_id) q.where('l.owner', owner_id);

    const items = await q;
    return res.json(items);
  } catch (err) { next(err); }
};

exports.createItem = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await getProjectForAccess(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!await canAccessProject(req.user.id, req.user.roles, projectId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { date_raised, section_id, description, owner, impact, status, target_date, comments, closed_date, closed_by } = req.body;
    if (!description || description.trim().length < 5) return res.status(400).json({ error: 'Description must be at least 5 characters' });
    if (!impact) return res.status(400).json({ error: 'Impact is required' });
    if (!status) return res.status(400).json({ error: 'Status is required' });

    // Auto-calculate target_date if not supplied: +5 working days from date_raised
    let finalTargetDate = target_date;
    if (!finalTargetDate) {
      const raisedDate = date_raised || new Date().toISOString().split('T')[0];
      const calculated = await addWorkingDays(raisedDate, 5, project.workspace_id);
      finalTargetDate = calculated.toISOString().split('T')[0];
    }

    if ((status === 'Closed' || status === 'Force Closed') && (!closed_date || !closed_by)) {
      return res.status(400).json({ error: 'closed_date and closed_by are required when closing an item' });
    }
    const [last] = await db('lop_items').where({ project_id: projectId, is_deleted: false }).orderBy('si', 'desc').limit(1);
    const nextSi = last ? last.si + 1 : 1;

    const [item] = await db('lop_items').insert({
      tenant_id: project.workspace_id,
      project_id: projectId,
      si: nextSi,
      date_raised: date_raised || new Date(),
      section_id: section_id || null,
      description: description.trim(),
      raised_by: req.user.id,
      owner: owner || null,
      impact,
      status,
      target_date: finalTargetDate,
      closed_date: closed_date || null,
      closed_by: closed_by || null,
      comments: comments || null,
    }).returning('*');

    await writeAuditLog(req.user.id, 'lop.item.create', 'lop_item', item.id, item, req);
    return res.status(201).json(item);
  } catch (err) { next(err); }
};

exports.updateItem = async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const project = await getProjectForAccess(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!await canAccessProject(req.user.id, req.user.roles, projectId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const payload = { ...req.body };
    delete payload.si; // read-only
    if (payload.description !== undefined) {
      if (!payload.description.trim() || payload.description.trim().length < 5) return res.status(400).json({ error: 'Description must be at least 5 characters' });
      payload.description = payload.description.trim();
    }
    if (payload.status && (payload.status === 'Closed' || payload.status === 'Force Closed')) {
      if (!payload.closed_date || !payload.closed_by) return res.status(400).json({ error: 'closed_date and closed_by are required when closing an item' });
    }
    if (payload.status && payload.status === 'Open') {
      payload.closed_date = null;
      payload.closed_by = null;
    }

    const [updated] = await db('lop_items')
      .where({ id, project_id: projectId, is_deleted: false })
      .update(payload)
      .returning('*');

    if (!updated) return res.status(404).json({ error: 'Item not found' });
    await writeAuditLog(req.user.id, 'lop.item.update', 'lop_item', updated.id, payload, req);
    return res.json(updated);
  } catch (err) { next(err); }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const project = await getProjectForAccess(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!await canAccessProject(req.user.id, req.user.roles, projectId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await db('lop_items')
      .where({ id, project_id: projectId, is_deleted: false })
      .update({ is_deleted: true });
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    await writeAuditLog(req.user.id, 'lop.item.delete', 'lop_item', id, null, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.exportItems = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, impact, section_id, owner_id } = req.query;
    const project = await getProjectForAccess(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!await canAccessProject(req.user.id, req.user.roles, projectId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let q = db('lop_items as l')
      .leftJoin('lop_sections as s', 's.id', 'l.section_id')
      .leftJoin('users as raised', 'raised.id', 'l.raised_by')
      .leftJoin('users as owner', 'owner.id', 'l.owner')
      .leftJoin('users as closed_by', 'closed_by.id', 'l.closed_by')
      .where({ 'l.project_id': projectId, 'l.is_deleted': false, 'l.tenant_id': project.workspace_id })
      .select(
        'l.si', 'l.date_raised', 's.name as section', 'l.description',
        'raised.name as raised_by', 'owner.name as owner', 'l.impact', 'l.status',
        'l.target_date', 'l.closed_date', 'closed_by.name as closed_by', 'l.comments'
      )
      .orderBy('l.si', 'asc');
    if (status) q.where('l.status', status);
    if (impact) q.where('l.impact', impact);
    if (section_id) q.where('l.section_id', section_id);
    if (owner_id) q.where('l.owner', owner_id);

    const items = await q;

    const headers = ['SI','Date Raised','Section','Description','Raised By','Owner','Impact','Status','Target Date','Closed Date','Closed By','Comments'];
    const rows = items.map(i => [
      i.si,
      i.date_raised ? new Date(i.date_raised).toISOString().split('T')[0] : '',
      i.section || '',
      (i.description || '').replace(/\n/g, ' '),
      i.raised_by || '',
      i.owner || '',
      i.impact || '',
      i.status || '',
      i.target_date ? new Date(i.target_date).toISOString().split('T')[0] : '',
      i.closed_date ? new Date(i.closed_date).toISOString().split('T')[0] : '',
      i.closed_by || '',
      (i.comments || '').replace(/\n/g, ' '),
    ]);
    const lines = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v||'').replace(/"/g, '""')}"`).join(','))];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="lop_${projectId}.csv"`);
    return res.send(lines.join('\n'));
  } catch (err) { next(err); }
};
