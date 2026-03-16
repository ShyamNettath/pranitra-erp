const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const db = require('../config/db');
router.use(authenticate);
router.get('/', async (req, res, next) => {
  try {
    // super_user sees all workspaces; everyone else sees only their assigned workspaces
    if (req.user.roles.includes('super_user')) {
      return res.json(await db('workspaces').where({ is_active: true }).select('*').orderBy('name'));
    }
    const rows = await db('workspace_members as wm')
      .join('workspaces as w', 'w.id', 'wm.workspace_id')
      .where({ 'wm.user_id': req.user.id, 'wm.is_active': true, 'w.is_active': true })
      .select('w.*')
      .orderBy('w.name');
    res.json(rows);
  } catch(e){ next(e); }
});
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, slug, description, color } = req.body;
    const [ws] = await db('workspaces').insert({ name, slug, description, color }).returning('*');
    res.status(201).json(ws);
  } catch(e){ next(e); }
});
router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const [ws] = await db('workspaces').where({ id: req.params.id }).update(req.body).returning('*');
    res.json(ws);
  } catch(e){ next(e); }
});
router.post('/:id/members', requireRole('admin'), async (req, res, next) => {
  try {
    const { user_id } = req.body;
    await db('workspace_members').insert({ workspace_id: req.params.id, user_id }).onConflict(['workspace_id','user_id']).merge({ is_active: true });
    res.json({ ok: true });
  } catch(e){ next(e); }
});
router.delete('/:id/members/:userId', requireRole('admin'), async (req, res, next) => {
  try {
    await db('workspace_members').where({ workspace_id: req.params.id, user_id: req.params.userId }).update({ is_active: false });
    res.json({ ok: true });
  } catch(e){ next(e); }
});
module.exports = router;
