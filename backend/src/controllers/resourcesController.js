const db = require('../config/db');

exports.list = async (req, res, next) => {
  try {
    const { search, skill_id } = req.query;
    let q = db('associate_profiles as ap')
      .join('users as u','u.id','ap.user_id')
      .where('u.is_active',true)
      .select('ap.*','u.name','u.email','u.job_title','u.department','u.avatar_url',
        db.raw(`(SELECT ROUND(100.0 * SUM(te.hours) / NULLIF(
          (SELECT value::int FROM system_settings WHERE key='weekly_capacity_hours' LIMIT 1), 0), 1)
          FROM time_entries te WHERE te.user_id=ap.user_id AND te.is_deleted=false
          AND te.date >= CURRENT_DATE - INTERVAL '30 days') as utilisation_pct`));
    if (search) q=q.where(b=>b.whereILike('u.name',`%${search}%`).orWhereILike('u.email',`%${search}%`));
    if (skill_id) {
      q=q.join('associate_skills as ask','ask.profile_id','ap.id').where('ask.skill_id',skill_id);
    }
    const profiles = await q.orderBy('u.name');
    // Attach skills
    for (const p of profiles) {
      p.skills = await db('associate_skills as ask').join('skills as s','s.id','ask.skill_id')
        .where('ask.profile_id',p.id).select('s.id','s.name','s.category','ask.level');
      p.active_projects = await db('project_members as pm').join('projects as pr','pr.id','pm.project_id')
        .where({'pm.user_id':p.user_id,'pm.is_active':true,'pr.is_deleted':false})
        .whereIn('pr.status',['active','pending_approval'])
        .select('pr.id','pr.name','pm.allocation_pct','pm.role');
    }
    return res.json(profiles);
  } catch(err){ next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const profile = await db('associate_profiles as ap').join('users as u','u.id','ap.user_id')
      .where('ap.user_id',req.params.user_id).select('ap.*','u.name','u.email','u.job_title','u.department').first();
    if (!profile) return res.status(404).json({ error:'Profile not found' });
    profile.skills = await db('associate_skills as ask').join('skills as s','s.id','ask.skill_id')
      .where('ask.profile_id',profile.id).select('s.*','ask.level');
    profile.projects = await db('project_members as pm').join('projects as pr','pr.id','pm.project_id')
      .where({'pm.user_id':req.params.user_id}).select('pr.id','pr.name','pr.status','pm.allocation_pct','pm.added_date');
    // Weekly utilisation last 8 weeks
    profile.weekly_utilisation = await db('time_entries')
      .where({user_id:req.params.user_id,is_deleted:false})
      .where('date','>=',db.raw("CURRENT_DATE - INTERVAL '56 days'"))
      .select(db.raw("DATE_TRUNC('week',date) as week"), db.raw('SUM(hours) as total_hours'))
      .groupByRaw("DATE_TRUNC('week',date)").orderBy('week');
    // Costing — admin only
    if (!req.user.roles.includes('admin')) delete profile.hourly_rate;
    return res.json(profile);
  } catch(err){ next(err); }
};

exports.createOrUpdateProfile = async (req, res, next) => {
  try {
    const { user_id, department, location, joined_date, hourly_rate, currency } = req.body;
    const existing = await db('associate_profiles').where({ user_id }).first();
    let profile;
    if (existing) {
      const data = { department, location, joined_date };
      if (req.user.roles.includes('admin')) { data.hourly_rate=hourly_rate; data.currency=currency; }
      [profile] = await db('associate_profiles').where({ user_id }).update(data).returning('*');
    } else {
      const data = { user_id, department, location, joined_date };
      if (req.user.roles.includes('admin')) { data.hourly_rate=hourly_rate; data.currency=currency; }
      [profile] = await db('associate_profiles').insert(data).returning('*');
    }
    return res.json(profile);
  } catch(err){ next(err); }
};

exports.updateSkills = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { skills=[] } = req.body; // [{skill_id, level}]
    const profile = await db('associate_profiles').where({ user_id }).first();
    if (!profile) return res.status(404).json({ error:'Profile not found' });
    await db('associate_skills').where({ profile_id:profile.id }).delete();
    for (const s of skills) {
      await db('associate_skills').insert({ profile_id:profile.id, skill_id:s.skill_id, level:s.level||'proficient' });
    }
    return res.json({ ok:true });
  } catch(err){ next(err); }
};

exports.listSkills = async (_req, res, next) => {
  try { return res.json(await db('skills').orderBy('category').orderBy('name')); }
  catch(err){ next(err); }
};

exports.createSkill = async (req, res, next) => {
  try {
    const { name, category } = req.body;
    const [s] = await db('skills').insert({ name, category }).onConflict('name').ignore().returning('*');
    return res.status(201).json(s);
  } catch(err){ next(err); }
};
