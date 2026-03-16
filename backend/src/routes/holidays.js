const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/holidayController');
const { addWorkingDays } = require('../utils/workingDays');

const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads', 'tmp'), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

// Excel import/export/template — admin+ (must be before /:id routes)
router.post('/tenants/:tenantId/holidays/import',   requireRole('admin'), upload.single('file'), ctrl.importExcel);
router.get('/tenants/:tenantId/holidays/export',    requireRole('admin'), ctrl.exportExcel);
router.get('/tenants/:tenantId/holidays/template',  requireRole('admin'), ctrl.downloadTemplate);

// Holiday CRUD — view for all, modify for admin+
router.get('/tenants/:tenantId/holidays',           ctrl.list);
router.post('/tenants/:tenantId/holidays',          requireRole('admin'), ctrl.create);
router.put('/tenants/:tenantId/holidays/:id',       requireRole('admin'), ctrl.update);
router.delete('/tenants/:tenantId/holidays/:id',    requireRole('admin'), ctrl.delete);

// Working day calculation endpoint (for frontend target_date suggestions)
router.get('/tenants/:tenantId/working-days', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { start_date, days } = req.query;
    if (!start_date || !days) return res.status(400).json({ error: 'start_date and days are required' });
    const result = await addWorkingDays(start_date, parseInt(days), tenantId);
    return res.json({ target_date: result.toISOString().split('T')[0] });
  } catch (err) { next(err); }
});

module.exports = router;
