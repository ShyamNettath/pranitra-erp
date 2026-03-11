const db = require('../config/db');

async function checkVisible(report_key, roles) {
  const rows = await db('report_visibility').where({ report_key }).whereIn('role', roles).where({ visible: true });
  return rows.length > 0;
}

// GET /api/reports/project/:project_id/effort-variance
exports.effortVariance = async (req, res, next) => {
  try {
    if (!await checkVisible('effort_variance', req.user.roles)) return res.status(403).json({ error: 'Access denied' });
    const { project_id } = req.params;

    // Design
    const designData = await db('design_subcategories as sc')
      .where({ project_id })
      .select('sc.name', 'sc.baseline_hours', 'sc.actual_hours',
        db.raw('ROUND(100.0*(sc.actual_hours-sc.baseline_hours)/NULLIF(sc.baseline_hours,0),1) as variance_pct'));

    // Simulation per zone
    const simData = await db('simulation_safety_zones as sz')
      .join('simulation_robots as r', 'r.safety_zone_id', 'sz.id')
      .where({ 'sz.project_id': project_id, 'r.is_deleted': false })
      .select(db.raw("'Simulation: '||sz.name as name"),
        db.raw('SUM(r.baseline_hours) as baseline_hours'), db.raw('SUM(r.actual_hours) as actual_hours'),
        db.raw('ROUND(100.0*(SUM(r.actual_hours)-SUM(r.baseline_hours))/NULLIF(SUM(r.baseline_hours),0),1) as variance_pct'))
      .groupBy('sz.id', 'sz.name');

    // Tasks
    const taskData = await db('tasks').where({ project_id, is_deleted: false })
      .select(db.raw("SUM(baseline_hours) as baseline_hours"), db.raw("SUM(actual_hours) as actual_hours"))
      .first();

    return res.json({ design: designData, simulation: simData, tasks: taskData });
  } catch (err) { next(err); }
};

// GET /api/reports/project/:project_id/schedule-variance
exports.scheduleVariance = async (req, res, next) => {
  try {
    if (!await checkVisible('schedule_variance', req.user.roles)) return res.status(403).json({ error: 'Access denied' });
    const { project_id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const tasks = await db('tasks')
      .where({ project_id, is_deleted: false })
      .whereNotNull('due_date')
      .select('id', 'name', 'status', 'due_date', 'baseline_due_date', 'assignee_id',
        db.raw(`CASE WHEN due_date < '${today}' AND status NOT IN ('done') THEN true ELSE false END as is_overdue`),
        db.raw(`due_date::date - baseline_due_date::date as days_variance`));

    const overdue_count = tasks.filter(t => t.is_overdue).length;
    const on_track = tasks.filter(t => !t.is_overdue && t.status !== 'done').length;
    const completed = tasks.filter(t => t.status === 'done').length;

    return res.json({ tasks, overdue_count, on_track, completed, total: tasks.length });
  } catch (err) { next(err); }
};

// GET /api/reports/project/:project_id/budget-variance
exports.budgetVariance = async (req, res, next) => {
  try {
    if (!await checkVisible('budget_variance', req.user.roles)) return res.status(403).json({ error: 'Access denied' });
    const { project_id } = req.params;

    const project = await db('projects').where({ id: project_id }).first();
    // Costing: time_entries * hourly_rate from associate_profiles
    const costData = await db('time_entries as te')
      .join('associate_profiles as ap', 'ap.user_id', 'te.user_id')
      .where({ 'te.project_id': project_id, 'te.is_deleted': false })
      .select(db.raw('SUM(te.hours * ap.hourly_rate) as actual_cost'), db.raw('SUM(te.hours) as total_hours'))
      .first();

    const actual_cost = parseFloat(costData?.actual_cost || 0);
    const budget = parseFloat(project?.budget || 0);
    return res.json({
      budget, actual_cost,
      remaining: budget - actual_cost,
      variance_pct: budget > 0 ? Math.round(100 * (actual_cost - budget) / budget * 10) / 10 : 0,
      total_hours: parseFloat(costData?.total_hours || 0),
    });
  } catch (err) { next(err); }
};

// GET /api/reports/project/:project_id/rework
exports.reworkAnalysis = async (req, res, next) => {
  try {
    if (!await checkVisible('rework_analysis', req.user.roles)) return res.status(403).json({ error: 'Access denied' });
    const { project_id } = req.params;

    // Design QC failures = rework
    const qcFails = await db('design_unit_qc as qc')
      .join('design_units as u', 'u.id', 'qc.unit_id')
      .join('design_stations as st', 'st.id', 'u.station_id')
      .join('design_zones as z', 'z.id', 'st.zone_id')
      .join('design_subcategories as sc', 'sc.id', 'z.subcategory_id')
      .where({ 'sc.project_id': project_id, 'qc.result': 'fail' })
      .select('sc.name as subcategory', 'u.name as unit', 'u.complexity', 'qc.notes', 'qc.qc_hours', 'qc.created_at');

    const totalReworkHours = qcFails.reduce((s, r) => s + parseFloat(r.qc_hours || 0), 0);
    const project = await db('projects').where({ id: project_id }).first();
    const reworkPct = parseFloat(project.baseline_hours) > 0
      ? Math.round(100 * totalReworkHours / parseFloat(project.baseline_hours) * 10) / 10 : 0;

    return res.json({ fails: qcFails, total_rework_hours: totalReworkHours, rework_pct: reworkPct });
  } catch (err) { next(err); }
};

// GET /api/reports/project/:project_id/performance
exports.projectPerformance = async (req, res, next) => {
  try {
    if (!await checkVisible('project_performance', req.user.roles)) return res.status(403).json({ error: 'Access denied' });
    const { project_id } = req.params;
    const project = await db('projects').where({ id: project_id }).first();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const taskStats = await db('tasks').where({ project_id, is_deleted: false })
      .select(db.raw("status, COUNT(*) as count")).groupBy('status');

    const memberCount = await db('project_members').where({ project_id, is_active: true }).count('id as c').first();
    const milestones = await db('milestones').where({ project_id, is_deleted: false });
    const missedMs = milestones.filter(m => m.status === 'missed').length;
    const achievedMs = milestones.filter(m => m.status === 'achieved').length;

    return res.json({ project, task_stats: taskStats, member_count: parseInt(memberCount.c), milestones: { total: milestones.length, achieved: achievedMs, missed: missedMs } });
  } catch (err) { next(err); }
};

// GET /api/reports/associate/:user_id/productivity
exports.associateProductivity = async (req, res, next) => {
  try {
    if (!await checkVisible('associate_productivity', req.user.roles)) return res.status(403).json({ error: 'Access denied' });
    const { user_id } = req.params;
    const { date_from, date_to } = req.query;

    let q = db('time_entries').where({ user_id, is_deleted: false });
    if (date_from) q = q.where('date', '>=', date_from);
    if (date_to) q = q.where('date', '<=', date_to);
    const entries = await q;

    const total = entries.reduce((s, e) => s + parseFloat(e.hours), 0);
    const billable = entries.filter(e => e.is_billable).reduce((s, e) => s + parseFloat(e.hours), 0);

    // Tasks completed in period
    const tasksCompleted = await db('tasks').where({ assignee_id: user_id, status: 'done', is_deleted: false })
      .modify(q => { if (date_from) q.where('updated_at', '>=', date_from); if (date_to) q.where('updated_at', '<=', date_to); })
      .count('id as c').first();

    // Weekly breakdown
    const weekly = await db('time_entries').where({ user_id, is_deleted: false })
      .modify(q => { if (date_from) q.where('date', '>=', date_from); if (date_to) q.where('date', '<=', date_to); })
      .select(db.raw("DATE_TRUNC('week',date) as week"), db.raw('SUM(hours) as total'))
      .groupByRaw("DATE_TRUNC('week',date)").orderBy('week');

    return res.json({ total_hours: total, billable_hours: billable, tasks_completed: parseInt(tasksCompleted.c), weekly });
  } catch (err) { next(err); }
};

// GET /api/reports/associate/:user_id/idle-time
exports.idleTime = async (req, res, next) => {
  try {
    if (!await checkVisible('idle_time', req.user.roles)) return res.status(403).json({ error: 'Access denied' });
    const { user_id } = req.params;
    // Idle = weeks where logged hours < configured capacity
    const capacity = 40; // default 40h/week
    const weekly = await db('time_entries').where({ user_id, is_deleted: false })
      .where('date', '>=', db.raw("CURRENT_DATE - INTERVAL '90 days'"))
      .select(db.raw("DATE_TRUNC('week',date) as week"), db.raw('SUM(hours) as logged'))
      .groupByRaw("DATE_TRUNC('week',date)").orderBy('week');
    const result = weekly.map(w => ({ ...w, idle: Math.max(0, capacity - parseFloat(w.logged)), capacity }));
    return res.json(result);
  } catch (err) { next(err); }
};
