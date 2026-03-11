const db = require('../config/db');

exports.list = async (req, res, next) => {
  try {
    const { project_id, task_id } = req.query;
    let q = db('comments as c').join('users as u','u.id','c.author_id')
      .where('c.is_deleted',false).select('c.*','u.name as author_name','u.avatar_url');
    if (project_id) q=q.where('c.project_id',project_id);
    if (task_id) q=q.where('c.task_id',task_id);
    else q=q.whereNull('c.task_id');
    return res.json(await q.orderBy('c.created_at'));
  } catch(err){ next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { project_id,task_id,parent_comment_id,body,mentions=[] } = req.body;
    if (!project_id||!body) return res.status(422).json({ error:'project_id and body required' });
    const [comment] = await db('comments').insert({
      project_id, task_id:task_id||null, parent_comment_id:parent_comment_id||null,
      author_id:req.user.id, body, mentions:JSON.stringify(mentions)
    }).returning('*');
    // Notify mentions
    for (const uid of mentions) {
      if (uid!==req.user.id) {
        await db('notifications').insert({
          user_id:uid, type:'comment_mention', title:`${req.user.name} mentioned you`,
          body: body.slice(0,80), entity_type:'comment', entity_id:comment.id
        }).catch(()=>{});
      }
    }
    return res.status(201).json(comment);
  } catch(err){ next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { body } = req.body;
    const c = await db('comments').where({id:req.params.id}).first();
    if (!c) return res.status(404).json({ error:'Not found' });
    if (c.author_id!==req.user.id) return res.status(403).json({ error:'Cannot edit others comments' });
    const [updated] = await db('comments').where({id:req.params.id}).update({body}).returning('*');
    return res.json(updated);
  } catch(err){ next(err); }
};

exports.softDelete = async (req, res, next) => {
  try {
    const c = await db('comments').where({id:req.params.id}).first();
    if (!c) return res.status(404).json({ error:'Not found' });
    const canDelete = c.author_id===req.user.id || req.user.roles.some(r=>['admin','project_manager'].includes(r));
    if (!canDelete) return res.status(403).json({ error:'Cannot delete this comment' });
    await db('comments').where({id:req.params.id}).update({is_deleted:true});
    return res.json({ ok:true });
  } catch(err){ next(err); }
};
