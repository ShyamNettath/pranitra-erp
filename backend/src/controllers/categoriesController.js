/**
 * Engineering Categories Controller
 * Handles: Design hierarchy, Simulation hierarchy, Planning/Layout free-form nodes
 */
const db = require('../config/db');
const { writeAuditLog } = require('../utils/audit');

// ── DESIGN ────────────────────────────────────────────────────────

exports.getDesignStructure = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const subcats = await db('design_subcategories').where({ project_id }).orderBy('sort_order');
    for (const sc of subcats) {
      sc.zones = await db('design_zones').where({ subcategory_id: sc.id, is_deleted: false }).orderBy('sort_order');
      for (const z of sc.zones) {
        z.stations = await db('design_stations').where({ zone_id: z.id, is_deleted: false }).orderBy('sort_order');
        for (const st of z.stations) {
          st.units = await db('design_units as u').leftJoin('users as usr', 'usr.id', 'u.assignee_id')
            .where({ 'u.station_id': st.id, 'u.is_deleted': false })
            .select('u.*', 'usr.name as assignee_name').orderBy('u.sort_order');
        }
      }
    }
    return res.json(subcats);
  } catch (err) { next(err); }
};

// Init design subcategories for a new project (called by PM on project creation)
exports.initDesign = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { subcategories = [
      { name: 'Concept Design', effort_share_pct: 30, sort_order: 0 },
      { name: '3D Finish', effort_share_pct: 40, sort_order: 1 },
      { name: '2D Drawings', effort_share_pct: 30, sort_order: 2 },
    ]} = req.body;
    const existing = await db('design_subcategories').where({ project_id });
    if (existing.length > 0) return res.status(409).json({ error: 'Design already initialised for this project' });
    const rows = subcategories.map(s => ({ ...s, project_id }));
    const created = await db('design_subcategories').insert(rows).returning('*');
    return res.status(201).json(created);
  } catch (err) { next(err); }
};

exports.updateSubcategory = async (req, res, next) => {
  try {
    const { effort_share_pct, qc_pct } = req.body;
    const [sc] = await db('design_subcategories').where({ id: req.params.id }).update({ effort_share_pct, qc_pct }).returning('*');
    return res.json(sc);
  } catch (err) { next(err); }
};

exports.createZone = async (req, res, next) => {
  try {
    const { subcategory_id, name, sort_order = 0 } = req.body;
    const [zone] = await db('design_zones').insert({ subcategory_id, name, sort_order }).returning('*');
    return res.status(201).json(zone);
  } catch (err) { next(err); }
};

exports.createStation = async (req, res, next) => {
  try {
    const { zone_id, name, sort_order = 0 } = req.body;
    const [st] = await db('design_stations').insert({ zone_id, name, sort_order }).returning('*');
    return res.status(201).json(st);
  } catch (err) { next(err); }
};

exports.createUnit = async (req, res, next) => {
  try {
    const { station_id, name, complexity, assignee_id, sort_order = 0 } = req.body;
    if (!['simple', 'medium', 'complex'].includes(complexity))
      return res.status(422).json({ error: 'complexity must be simple | medium | complex' });

    // Get baseline hours from system settings
    const settingKey = `complexity_${complexity}_hours`;
    const setting = await db('system_settings').where({ key: settingKey }).first();
    const baseline_hours = parseFloat(setting?.value || (complexity === 'simple' ? 12 : complexity === 'medium' ? 16 : 24));

    const [unit] = await db('design_units').insert({
      station_id, name, complexity, baseline_hours, assignee_id: assignee_id || null, sort_order
    }).returning('*');

    // Rollup hours up the chain
    await rollupDesignHours(unit.station_id);
    await writeAuditLog(req.user.id, 'design.unit.create', 'design_unit', unit.id, { name, complexity, baseline_hours }, req);
    return res.status(201).json(unit);
  } catch (err) { next(err); }
};

exports.updateUnit = async (req, res, next) => {
  try {
    const allowed = ['name', 'assignee_id', 'status', 'sort_order']; // complexity is LOCKED
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const [unit] = await db('design_units').where({ id: req.params.id, is_deleted: false }).update(data).returning('*');
    if (!unit) return res.status(404).json({ error: 'Not found' });
    return res.json(unit);
  } catch (err) { next(err); }
};

exports.createUnitQc = async (req, res, next) => {
  try {
    const { unit_id, result, notes, qc_hours } = req.body;
    const [qc] = await db('design_unit_qc').insert({
      unit_id, reviewer_id: req.user.id, result: result || 'pending', notes, qc_hours: qc_hours || 0
    }).returning('*');
    // If fail, block the unit
    if (result === 'fail') await db('design_units').where({ id: unit_id }).update({ status: 'qc_failed' });
    if (result === 'pass') await db('design_units').where({ id: unit_id }).update({ status: 'complete' });
    return res.status(201).json(qc);
  } catch (err) { next(err); }
};

async function rollupDesignHours(station_id) {
  const units = await db('design_units').where({ station_id, is_deleted: false });
  const bl = units.reduce((s, u) => s + parseFloat(u.baseline_hours || 0), 0);
  const ac = units.reduce((s, u) => s + parseFloat(u.actual_hours || 0), 0);
  await db('design_stations').where({ id: station_id }).update({ baseline_hours: bl, actual_hours: ac });
  const st = await db('design_stations').where({ id: station_id }).first();
  if (!st) return;
  const siblings = await db('design_stations').where({ zone_id: st.zone_id, is_deleted: false });
  const zbl = siblings.reduce((s, x) => s + parseFloat(x.baseline_hours || 0), 0);
  const zac = siblings.reduce((s, x) => s + parseFloat(x.actual_hours || 0), 0);
  await db('design_zones').where({ id: st.zone_id }).update({ baseline_hours: zbl, actual_hours: zac });
}

// ── SIMULATION ────────────────────────────────────────────────────

exports.getSimulationStructure = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const zones = await db('simulation_safety_zones').where({ project_id, is_deleted: false }).orderBy('sort_order');
    for (const z of zones) {
      z.robots = await db('simulation_robots as r')
        .leftJoin('simulation_robot_categories as rc', 'rc.id', 'r.robot_category_id')
        .where({ 'r.safety_zone_id': z.id, 'r.is_deleted': false })
        .select('r.*', 'rc.name as category_name', 'rc.baseline_hours as category_baseline', 'rc.stage_splits', 'rc.qc_pct')
        .orderBy('r.sort_order');
      for (const robot of z.robots) {
        robot.stages = await db('simulation_stages').where({ robot_id: robot.id, is_deleted: false }).orderBy('stage_number');
      }
    }
    return res.json(zones);
  } catch (err) { next(err); }
};

exports.createSafetyZone = async (req, res, next) => {
  try {
    const { project_id, name, sort_order = 0 } = req.body;
    const [z] = await db('simulation_safety_zones').insert({ project_id, name, sort_order }).returning('*');
    return res.status(201).json(z);
  } catch (err) { next(err); }
};

exports.createRobot = async (req, res, next) => {
  try {
    const { safety_zone_id, robot_category_id, name, sort_order = 0 } = req.body;
    const category = await db('simulation_robot_categories').where({ id: robot_category_id }).first();
    if (!category) return res.status(404).json({ error: 'Robot category not found' });

    const [robot] = await db('simulation_robots').insert({
      safety_zone_id, robot_category_id, name,
      baseline_hours: category.baseline_hours, sort_order
    }).returning('*');

    // Auto-create stages
    const splits = JSON.parse(category.stage_splits || '[25,35,40]');
    for (let i = 0; i < splits.length; i++) {
      const pct = splits[i];
      const stageHours = parseFloat(category.baseline_hours) * pct / 100;
      await db('simulation_stages').insert({
        robot_id: robot.id, name: `Stage 0${i + 1}`,
        stage_number: i + 1, split_pct: pct,
        baseline_hours: stageHours
      });
    }
    robot.stages = await db('simulation_stages').where({ robot_id: robot.id }).orderBy('stage_number');
    await writeAuditLog(req.user.id, 'sim.robot.create', 'simulation_robot', robot.id, { name }, req);
    return res.status(201).json(robot);
  } catch (err) { next(err); }
};

exports.updateStageQc = async (req, res, next) => {
  try {
    const { qc_result, actual_hours } = req.body;
    const [stage] = await db('simulation_stages').where({ id: req.params.id })
      .update({ qc_result, actual_hours: actual_hours || undefined }).returning('*');
    return res.json(stage);
  } catch (err) { next(err); }
};

exports.getRobotCategories = async (_req, res, next) => {
  try {
    return res.json(await db('simulation_robot_categories').where({ is_active: true }).orderBy('name'));
  } catch (err) { next(err); }
};

exports.upsertRobotCategory = async (req, res, next) => {
  try {
    const { id, name, baseline_hours, stage_splits, qc_pct } = req.body;
    if (id) {
      const [rc] = await db('simulation_robot_categories').where({ id })
        .update({ name, baseline_hours, stage_splits: JSON.stringify(stage_splits), qc_pct }).returning('*');
      return res.json(rc);
    }
    const [rc] = await db('simulation_robot_categories')
      .insert({ name, baseline_hours, stage_splits: JSON.stringify(stage_splits || [25, 35, 40]), qc_pct: qc_pct || 10 })
      .returning('*');
    return res.status(201).json(rc);
  } catch (err) { next(err); }
};

// ── PLANNING / LAYOUT (shared logic) ──────────────────────────────

async function getNodesTree(table, project_id) {
  const nodes = await db(table).where({ project_id, is_deleted: false }).orderBy('sort_order');
  const build = (parentId) => nodes
    .filter(n => (n.parent_id || null) === parentId)
    .map(n => ({ ...n, children: build(n.id) }));
  return build(null);
}

async function getMetrics(metricsTable, entriesTable, node_id) {
  const metrics = await db(metricsTable).where({ node_id });
  for (const m of metrics) {
    m.entries = await db(entriesTable).where({ metric_id: m.id }).orderBy('week_ending', 'desc').limit(12);
  }
  return metrics;
}

exports.getPlanningStructure = async (req, res, next) => {
  try {
    return res.json(await getNodesTree('planning_nodes', req.params.project_id));
  } catch (err) { next(err); }
};

exports.getLayoutStructure = async (req, res, next) => {
  try {
    return res.json(await getNodesTree('layout_nodes', req.params.project_id));
  } catch (err) { next(err); }
};

exports.createPlanningNode = async (req, res, next) => {
  try {
    const { project_id, parent_id, name, sort_order = 0 } = req.body;
    const [n] = await db('planning_nodes').insert({ project_id, parent_id: parent_id || null, name, sort_order }).returning('*');
    return res.status(201).json(n);
  } catch (err) { next(err); }
};

exports.createLayoutNode = async (req, res, next) => {
  try {
    const { project_id, parent_id, name, sort_order = 0 } = req.body;
    const [n] = await db('layout_nodes').insert({ project_id, parent_id: parent_id || null, name, sort_order }).returning('*');
    return res.status(201).json(n);
  } catch (err) { next(err); }
};

exports.getPlanningMetrics = async (req, res, next) => {
  try {
    return res.json(await getMetrics('planning_metrics', 'planning_metric_entries', req.params.node_id));
  } catch (err) { next(err); }
};

exports.getLayoutMetrics = async (req, res, next) => {
  try {
    return res.json(await getMetrics('layout_metrics', 'layout_metric_entries', req.params.node_id));
  } catch (err) { next(err); }
};

exports.addPlanningMetric = async (req, res, next) => {
  try {
    const { node_id, metric_name, target_value, unit } = req.body;
    const [m] = await db('planning_metrics').insert({ node_id, metric_name, target_value, unit }).returning('*');
    return res.status(201).json(m);
  } catch (err) { next(err); }
};

exports.addLayoutMetric = async (req, res, next) => {
  try {
    const { node_id, metric_name, target_value, unit } = req.body;
    const [m] = await db('layout_metrics').insert({ node_id, metric_name, target_value, unit }).returning('*');
    return res.status(201).json(m);
  } catch (err) { next(err); }
};

exports.logPlanningEntry = async (req, res, next) => {
  try {
    const { metric_id, week_ending, value } = req.body;
    const [e] = await db('planning_metric_entries')
      .insert({ metric_id, week_ending, value, entered_by: req.user.id })
      .onConflict(['metric_id', 'week_ending']).merge({ value, entered_by: req.user.id })
      .returning('*');
    return res.json(e);
  } catch (err) { next(err); }
};

exports.logLayoutEntry = async (req, res, next) => {
  try {
    const { metric_id, week_ending, value } = req.body;
    const [e] = await db('layout_metric_entries')
      .insert({ metric_id, week_ending, value, entered_by: req.user.id })
      .onConflict(['metric_id', 'week_ending']).merge({ value, entered_by: req.user.id })
      .returning('*');
    return res.json(e);
  } catch (err) { next(err); }
};
