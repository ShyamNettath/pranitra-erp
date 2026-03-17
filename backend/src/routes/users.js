const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const os = require('os');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/usersController');
const db = require('../config/db');

const upload = multer({
  dest: path.join(os.tmpdir(), 'pranitra-uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(xlsx|xls)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only Excel files (.xlsx) are allowed'));
  },
});

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/bulk-upload-template', requireRole('admin'), ctrl.bulkUploadTemplate);
router.post('/bulk-upload', requireRole('admin'), upload.single('file'), ctrl.bulkUpload);
router.get('/:id', ctrl.get);
router.post('/', requireRole('admin'), ctrl.create);
router.put('/me/password', ctrl.changePassword);
router.put('/me/ms-token', async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { ms_access_token, ms_refresh_token, ms_expires_in } = req.body;
    const ms_token_expiry = ms_expires_in ? new Date(Date.now() + ms_expires_in * 1000) : null;
    await db('users').where({ id: userId }).update({ ms_access_token, ms_refresh_token: ms_refresh_token || null, ms_token_expiry });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save MS token' });
  }
});
router.put('/:id', requireRole('admin'), ctrl.update);
router.put('/:id/workspaces', requireRole('super_user'), ctrl.updateWorkspaces);
router.put('/:id/roles', requireRole('admin'), ctrl.updateRoles);
router.post('/:id/deactivate', requireRole('admin'), ctrl.deactivate);
router.post('/:id/reactivate', requireRole('admin'), ctrl.reactivate);
router.delete('/:id', requireRole('admin'), ctrl.softDelete);
module.exports = router;
