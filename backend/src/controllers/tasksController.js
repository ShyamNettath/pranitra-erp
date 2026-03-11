const db = require('../config/db');
const { writeAuditLog } = require('../utils/audit');
const { sendNotificationEmail } = require('../services/emailService');

exports.list = async (req, res, next) => {
  try {
    const { project_id, assignee_id, status, parent_id, entity_type, entity_id } = req.query;
    let q = db('tasks as t').leftJoin('users as u','u.id','t.assignee_id').where('t.is_deleted',false)
      .select('t.*','u.name as assignee_name',
        db.raw('(SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id=t.id AND st.is_deleted=false) as subtask_count'));
    if (project_id) q=q.where('t.project_id',project_id);
    if (assignee_id) q=q.where('t.assignee_id',assignee_id);
    if (status) q=q.where('t.status',status);
    if (entity_type) q=q.where('t.entity_type',entity_type);
    if (entity_id) q=q.where('t.entity_id',entity_id);
    if (parent_id==='null') q=q.whereNull('t.parent_task_id');
    else if (parent_id) q=q.where('t.parent_task_id',parent_id);
    return res.json(await q.orderBy('t.sort_order').orderBy('t.created_at'));
  } catch(err){ next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const task = await db('tasks as t').leftJoin('users as a','a.id','t.assignee_id')
      .where({'t.id':req.params.id,'t.is_deleted':false}).select('t.*','a.name as assignee_name','a.email as assignee_email').first();
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const subtasks = await db('tasks as t').leftJoin('users as u','u.id','t.assignee_id')
      .where({'t.parent_task_id':req.params.id,'t.is_deleted':false}).select('t.*','u.name as assignee_name').orderBy('t.sort_order');
    const deps = await db('task_dependencies as td').join('tasks as dt','dt.id','td.depends_on_id')
      .where({'td.task_id':req.params.id}).select('dt.id','dt.name','dt.status');
    const timeTotal = await db('time_entries').where({task_id:req.params.id,is_deleted:false}).sum('hours as total').first();
    return res.json({ ...task, subtasks, dependencies: deps, total_hours: parseFloat(timeTotal?.total||0) });
  } catch(err){ next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { project_id,parent_task_id,entity_type,entity_id,name,description,status='todo',priority='medium',
      assignee_id,start_date,due_date,baseline_hours,sort_order=0,dependency_ids=[] } = req.body;
    if (!project_id||!name) return res.status(422).json({ error:'project_id and name required' });
    const [task] = await db('tasks').insert({
      project_id, parent_task_id:parent_task_id||null, entity_type:entity_type||null, entity_id:entity_id||null,
      name, description, status, priority, assignee_id:assignee_id||null, start_date, due_date,
      baseline_due_date:due_date, baseline_hours:baseline_hours||0, sort_order
    }).returning('*');
    for (const dep_id of dependency_ids) {
      await db('task_dependencies').insert({task_id:task.id,depends_on_id:dep_id}).onConflict().ignore();
    }
    if (assignee_id && assignee_id!==req.user.id) {
      const assignee = await db('users').where({id:assignee_id}).first();
      if (assignee) {
        await sendNotificationEmail(assignee.email,assignee.name,`New task: ${name}`,`Assigned by ${req.user.name}.`).catch(()=>{});
        await db('notifications').insert({user_id:assignee_id,type:'task_assigned',title:`New task: ${name}`,body:`Assigned by ${req.user.name}`,entity_type:'task',entity_id:task.id});
      }
    }
    await writeAuditLog(req.user.id,'task.create','task',task.id,{name},req);
    return res.status(201).json(task);
  } catch(err){ next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['name','description','status','priority','assignee_id','start_date','due_date','progress_pct','baseline_hours','sort_order'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k])=>allowed.includes(k)));
    const [task] = await db('tasks').where({id:req.params.id,is_deleted:false}).update(data).returning('*');
    if (!task) return res.status(404).json({ error:'Not found' });
    await writeAuditLog(req.user.id,'task.update','task',req.params.id,data,req);
    return res.json(task);
  } catch(err){ next(err); }
};

exports.approve = async (req, res, next) => {
  try {
    const [task] = await db('tasks').where({id:req.params.id,is_deleted:false}).update({status:'done'}).returning('*');
    if (!task) return res.status(404).json({ error:'Not found' });
    await writeAuditLog(req.user.id,'task.approve','task',req.params.id,null,req);
    return res.json(task);
  } catch(err){ next(err); }
};

exports.updateDependencies = async (req, res, next) => {
  try {
    const { dependency_ids=[] } = req.body;
    await db('task_dependencies').where({task_id:req.params.id}).delete();
    for (const dep_id of dependency_ids) {
      await db('task_dependencies').insert({task_id:req.params.id,depends_on_id:dep_id}).onConflict().ignore();
    }
    return res.json({ ok:true });
  } catch(err){ next(err); }
};

exports.softDelete = async (req, res, next) => {
  try {
    await db('tasks').where({id:req.params.id}).update({is_deleted:true});
    await db('tasks').where({parent_task_id:req.params.id}).update({is_deleted:true});
    await writeAuditLog(req.user.id,'task.delete','task',req.params.id,null,req);
    return res.json({ ok:true });
  } catch(err){ next(err); }
};
