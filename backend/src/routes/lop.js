const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/lopController');

router.use(authenticate);

// Section management (admin only)
router.get('/tenants/:tenantId/lop-sections', requireRole('admin'), ctrl.listSections);
router.post('/tenants/:tenantId/lop-sections', requireRole('admin'), ctrl.createSection);
router.put('/tenants/:tenantId/lop-sections/:id', requireRole('admin'), ctrl.updateSection);
router.delete('/tenants/:tenantId/lop-sections/:id', requireRole('admin'), ctrl.deleteSection);

// LOP items per project
router.get('/projects/:projectId/lop/export', ctrl.exportItems);
router.get('/projects/:projectId/lop', ctrl.listItems);
router.post('/projects/:projectId/lop', requireRole('project_manager', 'admin', 'director'), ctrl.createItem);
router.put('/projects/:projectId/lop/:id', requireRole('project_manager', 'admin', 'director'), ctrl.updateItem);
router.delete('/projects/:projectId/lop/:id', requireRole('project_manager', 'admin', 'director'), ctrl.deleteItem);

module.exports = router;
