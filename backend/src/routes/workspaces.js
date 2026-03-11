const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const db = require('../config/db');
router.use(authenticate);
router.get('/', async (req, res, next) => {
  try {
    let q = db('workspaces').where({ is_active: true });
    if (!req.user.roles.includes('admin') && !req.user.roles.includes('director')) {
      q = q.join('workspace_members as wm', function(){
        this.on('wm.workspace_id','workspaces.id').andOn('wm.user_id', db.raw('?',[req.user.id])).andOn('wm.is_active',db.raw('true'));
      });
    }
    res.json(await q.select('workspaces.*').orderBy('workspaces.name'));
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
