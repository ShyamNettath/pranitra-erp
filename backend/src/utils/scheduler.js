const cron   = require('node-cron');
const db     = require('../config/db');
const logger = require('../config/logger');
const { sendNotificationEmail } = require('../services/emailService');

// ── Purge expired recycle bin items (daily at 02:00) ─────────────
cron.schedule('0 2 * * *', async () => {
  try {
    const deleted = await db('recycle_bin')
      .where('expires_at', '<', new Date())
      .whereNotNull('expires_at')
      .delete();
    if (deleted > 0) logger.info(`Recycle bin: purged ${deleted} expired items`);
  } catch (e) { logger.error('Recycle bin purge error:', e); }
});

// ── Auto-remove inactive project members (daily at 03:00) ────────
cron.schedule('0 3 * * *', async () => {
  try {
    const setting = await db('system_settings').where({ key: 'project_inactivity_days' }).first();
    const days = parseInt(setting?.value || '90');
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stale = await db('project_members as pm')
      .join('users as u', 'u.id', 'pm.user_id')
      .join('projects as p', 'p.id', 'pm.project_id')
      .where('pm.last_active_date', '<', cutoff)
      .where('pm.is_active', true)
      .select('pm.id', 'pm.user_id', 'pm.project_id', 'u.email', 'u.name as user_name', 'p.name as project_name');

    for (const row of stale) {
      await db('project_members').where({ id: row.id }).update({ is_active: false });
      await sendNotificationEmail(
        row.email, row.user_name,
        'Removed from project due to inactivity',
        `You have been auto-removed from "${row.project_name}" after ${days} days of inactivity. Contact your Project Manager to be re-added.`
      ).catch(() => {});
      logger.info(`Auto-removed user ${row.user_id} from project ${row.project_id}`);
    }
  } catch (e) { logger.error('Auto-removal error:', e); }
});

// ── Overdue task notifications (daily at 08:00) ───────────────────
cron.schedule('0 8 * * *', async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const overdue = await db('tasks as t')
      .join('users as u', 'u.id', 't.assignee_id')
      .join('projects as p', 'p.id', 't.project_id')
      .where('t.due_date', '<', today)
      .whereIn('t.status', ['todo', 'in_progress', 'in_review'])
      .where('t.is_deleted', false)
      .select('t.id', 't.name as task_name', 't.due_date', 'u.email', 'u.name as user_name', 'p.name as project_name', 'p.project_manager_id');

    for (const task of overdue) {
      // Notify assignee
      await sendNotificationEmail(
        task.email, task.user_name,
        `Overdue Task: ${task.task_name}`,
        `Your task "${task.task_name}" in project "${task.project_name}" was due on ${task.due_date} and is still open.`
      ).catch(() => {});

      // Insert in-app notification
      await db('notifications').insert({
        user_id:     task.assignee_id,
        type:        'task_overdue',
        title:       `Task overdue: ${task.task_name}`,
        body:        `Due: ${task.due_date}`,
        entity_type: 'task',
        entity_id:   task.id,
      }).catch(() => {});
    }

    if (overdue.length > 0) logger.info(`Sent ${overdue.length} overdue task notifications`);
  } catch (e) { logger.error('Overdue task notification error:', e); }
});

// ── Cleanup old soft-deleted records + stale notifications (daily at 03:00) ──
cron.schedule('0 3 * * *', async () => {
  try {
    const { runCleanup } = require('../services/cleanupService');
    await runCleanup();
  } catch (e) { logger.error('Cleanup service error:', e); }
});

// ── Zoho People sync (every 24h at 06:00) ────────────────────────
cron.schedule('0 6 * * *', async () => {
  if (!process.env.ZOHO_CLIENT_ID) return; // skip if not configured
  try {
    const { syncAllEmployees } = require('../services/zohoService');
    await syncAllEmployees();
  } catch (e) { logger.error('Zoho sync error:', e); }
});

logger.info('Background scheduler started');
