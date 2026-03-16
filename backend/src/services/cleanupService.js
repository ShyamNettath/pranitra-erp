/**
 * Cleanup service — removes old soft-deleted records and stale notifications.
 */
const db = require('../config/db');
const logger = require('../config/logger');

async function runCleanup() {
  logger.info('Cleanup: starting...');
  let totalRemoved = 0;
  let notificationsPruned = 0;

  // Permanently delete soft-deleted records older than 90 days
  const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const tables = ['projects', 'tasks', 'comments', 'files'];

  for (const table of tables) {
    try {
      const hasDeleted = await db.schema.hasColumn(table, 'is_deleted');
      if (!hasDeleted) continue;

      const deleted = await db(table)
        .where('is_deleted', true)
        .where('updated_at', '<', cutoff90)
        .delete();
      if (deleted > 0) {
        logger.info(`Cleanup: removed ${deleted} soft-deleted rows from ${table}`);
        totalRemoved += deleted;
      }
    } catch (err) {
      logger.error(`Cleanup: error cleaning ${table} — ${err.message}`);
    }
  }

  // Delete read notifications older than 30 days
  const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  try {
    const hasNotifications = await db.schema.hasTable('notifications');
    if (hasNotifications) {
      const deleted = await db('notifications')
        .where('is_read', true)
        .where('created_at', '<', cutoff30)
        .delete();
      notificationsPruned = deleted;
      if (deleted > 0) {
        logger.info(`Cleanup: pruned ${deleted} read notifications`);
      }
    }
  } catch (err) {
    logger.error(`Cleanup: error pruning notifications — ${err.message}`);
  }

  logger.info(`Cleanup complete: ${totalRemoved} records removed, ${notificationsPruned} notifications pruned`);
  return { totalRemoved, notificationsPruned };
}

module.exports = { runCleanup };
