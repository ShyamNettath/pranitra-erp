const db = require('../config/db');
exports.list = async (req, res, next) => {
  try {
    const notifs = await db('notifications').where({ user_id:req.user.id })
      .orderBy('created_at','desc').limit(50);
    return res.json(notifs);
  } catch(err){ next(err); }
};
exports.markRead = async (req, res, next) => {
  try {
    await db('notifications').where({ id:req.params.id, user_id:req.user.id }).update({ is_read:true });
    return res.json({ ok:true });
  } catch(err){ next(err); }
};
exports.markAllRead = async (req, res, next) => {
  try {
    await db('notifications').where({ user_id:req.user.id }).update({ is_read:true });
    return res.json({ ok:true });
  } catch(err){ next(err); }
};
exports.getPreferences = async (req, res, next) => {
  try {
    return res.json(await db('notification_preferences').where({ user_id:req.user.id }));
  } catch(err){ next(err); }
};
exports.updatePreference = async (req, res, next) => {
  try {
    const { event_type, email_enabled, teams_enabled } = req.body;
    await db('notification_preferences')
      .insert({ user_id:req.user.id, event_type, email_enabled, teams_enabled })
      .onConflict(['user_id','event_type']).merge({ email_enabled, teams_enabled });
    return res.json({ ok:true });
  } catch(err){ next(err); }
};
