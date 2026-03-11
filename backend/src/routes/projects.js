const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/projectsController');

router.use(authenticate);

// List projects (filtered by workspace, role)
router.get('/',          ctrl.list);
router.get('/:id',       ctrl.get);

// Create/submit — PM only
router.post('/',         requireRole('project_manager', 'admin'), ctrl.create);
router.put('/:id',       requireRole('project_manager', 'admin'), ctrl.update);
router.post('/:id/submit', requireRole('project_manager', 'admin'), ctrl.submit);

// Director approval
router.post('/:id/approve',        requireRole('director', 'admin'), ctrl.approve);
router.post('/:id/reject',         requireRole('director', 'admin'), ctrl.reject);
router.post('/:id/request-changes',requireRole('director', 'admin'), ctrl.requestChanges);

// Team management
router.post('/:id/members',        requireRole('project_manager', 'admin'), ctrl.addMember);
router.delete('/:id/members/:userId', requireRole('project_manager', 'admin'), ctrl.removeMember);

// Soft delete
router.delete('/:id',   requireRole('project_manager', 'admin'), ctrl.softDelete);

// Milestones
router.get('/:id/milestones',      ctrl.listMilestones);
router.post('/:id/milestones',     requireRole('project_manager', 'admin'), ctrl.createMilestone);
router.put('/:id/milestones/:mid', requireRole('project_manager', 'admin'), ctrl.updateMilestone);

module.exports = router;
