const db = require('../config/db');
const { writeAuditLog } = require('../utils/audit');

exports.list = async (req, res, next) => {
  try {
    const { project_id, user_id, task_id, date_from, date_to, approval_status } = req.query;
    let q = db('time_entries as te').join('users as u','u.id','te.user_id')
      .leftJoin('tasks as t','t.id','te.task_id').where('te.is_deleted',false)
      .select('te.*','u.name as user_name','t.name as task_name');
    if (project_id) q=q.where('te.project_id',project_id);
    if (user_id) q=q.where('te.user_id',user_id);
    if (task_id) q=q.where('te.task_id',task_id);
    if (date_from) q=q.where('te.date','>=',date_from);
    if (date_to) q=q.where('te.date','<=',date_to);
    if (approval_status) q=q.where('te.approval_status',approval_status);
    // Non-PM/admin/director can only see own entries
    if (!req.user.roles.some(r=>['admin','director','project_manager'].includes(r))) {
      q=q.where('te.user_id',req.user.id);
    }
    return res.json(await q.orderBy('te.date','desc').orderBy('te.created_at','desc'));
  } catch(err){ next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { project_id,task_id,user_id,date,hours,description,notes,is_billable=false } = req.body;
    if (!project_id||!date||!hours) return res.status(422).json({ error:'project_id, date, hours required' });
    // PM can log for others; members can only log for themselves
    const targetUser = (req.user.roles.some(r=>['project_manager','admin'].includes(r)) && user_id) ? user_id : req.user.id;
    const approval_status = is_billable ? 'pending' : 'na';
    const [entry] = await db('time_entries').insert({
      project_id, task_id:task_id||null, user_id:targetUser, logged_by:req.user.id,
      date, hours, description, notes, is_billable, approval_status
    }).returning('*');
    // Update task actual hours
    if (task_id) {
      const total = await db('time_entries').where({task_id,is_deleted:false}).sum('hours as t').first();
      await db('tasks').where({id:task_id}).update({actual_hours:total.t||0});
    }
    // Update project actual hours
    const projTotal = await db('time_entries').where({project_id,is_deleted:false}).sum('hours as t').first();
    await db('projects').where({id:project_id}).update({actual_hours:projTotal.t||0});
    await writeAuditLog(req.user.id,'time.create','time_entry',entry.id,{hours,date},req);
    return res.status(201).json(entry);
  } catch(err){ next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const entry = await db('time_entries').where({id:req.params.id,is_deleted:false}).first();
    if (!entry) return res.status(404).json({ error:'Not found' });
    // Only the logger or admin can edit; approved entries locked
    if (entry.logged_by!==req.user.id && !req.user.roles.includes('admin'))
      return res.status(403).json({ error:'Cannot edit this entry' });
    if (entry.approval_status==='approved')
      return res.status(400).json({ error:'Approved entries cannot be edited' });
    const allowed = ['date','hours','description','notes','is_billable'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k])=>allowed.includes(k)));
    if (data.is_billable!==undefined) data.approval_status = data.is_billable ? 'pending' : 'na';
    const [updated] = await db('time_entries').where({id:req.params.id}).update(data).returning('*');
    return res.json(updated);
  } catch(err){ next(err); }
};

exports.approve = async (req, res, next) => {
  try {
    const [e] = await db('time_entries').where({id:req.params.id}).update({
      approval_status:'approved', approved_by:req.user.id, approved_at:new Date()
    }).returning('*');
    await writeAuditLog(req.user.id,'time.approve','time_entry',req.params.id,null,req);
    return res.json(e);
  } catch(err){ next(err); }
};

exports.reject = async (req, res, next) => {
  try {
    const [e] = await db('time_entries').where({id:req.params.id}).update({approval_status:'rejected'}).returning('*');
    return res.json(e);
  } catch(err){ next(err); }
};

exports.softDelete = async (req, res, next) => {
  try {
    const entry = await db('time_entries').where({id:req.params.id}).first();
    if (!entry) return res.status(404).json({ error:'Not found' });
    if (entry.approval_status==='approved') return res.status(400).json({ error:'Cannot delete approved entry' });
    await db('time_entries').where({id:req.params.id}).update({is_deleted:true});
    // Recalculate task/project actuals
    if (entry.task_id) {
      const total = await db('time_entries').where({task_id:entry.task_id,is_deleted:false}).sum('hours as t').first();
      await db('tasks').where({id:entry.task_id}).update({actual_hours:total.t||0});
    }
    const projTotal = await db('time_entries').where({project_id:entry.project_id,is_deleted:false}).sum('hours as t').first();
    await db('projects').where({id:entry.project_id}).update({actual_hours:projTotal.t||0});
    return res.json({ ok:true });
  } catch(err){ next(err); }
};

// GET /api/time/summary?project_id=&user_id=
exports.summary = async (req, res, next) => {
  try {
    const { project_id, user_id } = req.query;
    let q = db('time_entries').where('is_deleted',false);
    if (project_id) q=q.where('project_id',project_id);
    if (user_id) q=q.where('user_id',user_id);
    const rows = await q;
    const total = rows.reduce((s,r)=>s+parseFloat(r.hours),0);
    const billable = rows.filter(r=>r.is_billable).reduce((s,r)=>s+parseFloat(r.hours),0);
    const approved = rows.filter(r=>r.approval_status==='approved').reduce((s,r)=>s+parseFloat(r.hours),0);
    const pending = rows.filter(r=>r.approval_status==='pending').reduce((s,r)=>s+parseFloat(r.hours),0);
    return res.json({ total, billable, non_billable:total-billable, approved, pending });
  } catch(err){ next(err); }
};
