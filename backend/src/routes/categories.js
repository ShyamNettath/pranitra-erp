const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/categoriesController');
const pm = requireRole('project_manager', 'admin');

router.use(authenticate);

// Design
router.get('/design/:project_id',          ctrl.getDesignStructure);
router.post('/design/:project_id/init',    pm, ctrl.initDesign);
router.put('/design/subcategory/:id',      pm, ctrl.updateSubcategory);
router.post('/design/zones',               pm, ctrl.createZone);
router.post('/design/stations',            pm, ctrl.createStation);
router.post('/design/units',               pm, ctrl.createUnit);
router.put('/design/units/:id',            ctrl.updateUnit);
router.post('/design/units/qc',            ctrl.createUnitQc);

// Simulation
router.get('/simulation/:project_id',      ctrl.getSimulationStructure);
router.post('/simulation/zones',           pm, ctrl.createSafetyZone);
router.post('/simulation/robots',          pm, ctrl.createRobot);
router.put('/simulation/stages/:id/qc',    ctrl.updateStageQc);
router.get('/simulation/categories',       ctrl.getRobotCategories);
router.post('/simulation/categories',      requireRole('admin'), ctrl.upsertRobotCategory);

// Planning
router.get('/planning/:project_id',        ctrl.getPlanningStructure);
router.post('/planning/nodes',             pm, ctrl.createPlanningNode);
router.get('/planning/nodes/:node_id/metrics', ctrl.getPlanningMetrics);
router.post('/planning/metrics',           pm, ctrl.addPlanningMetric);
router.post('/planning/entries',           ctrl.logPlanningEntry);

// Layout
router.get('/layout/:project_id',          ctrl.getLayoutStructure);
router.post('/layout/nodes',               pm, ctrl.createLayoutNode);
router.get('/layout/nodes/:node_id/metrics', ctrl.getLayoutMetrics);
router.post('/layout/metrics',             pm, ctrl.addLayoutMetric);
router.post('/layout/entries',             ctrl.logLayoutEntry);

module.exports = router;
