const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const os = require('os');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/usersController');

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
router.put('/:id', requireRole('admin'), ctrl.update);
router.put('/:id/roles', requireRole('admin'), ctrl.updateRoles);
router.post('/:id/deactivate', requireRole('admin'), ctrl.deactivate);
router.post('/:id/reactivate', requireRole('admin'), ctrl.reactivate);
router.delete('/:id', requireRole('admin'), ctrl.softDelete);
module.exports = router;
