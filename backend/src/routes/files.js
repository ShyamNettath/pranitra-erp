const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/filesController');
router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', ctrl.uploadMiddleware, ctrl.upload);
router.delete('/:id', ctrl.softDelete);
module.exports = router;
