/**
 * PRANITRA PM — Timezones Order Migration
 * Updates display_order for default timezone entries: DE=1, UK=2, IN=3.
 * Run: node src/config/migrate-timezones-order.js
 */
require('dotenv').config();
const db = require('./db');
const logger = require('./logger');

async function migrate() {
  logger.info('Running timezones order migration...');

  const hasTable = await db.schema.hasTable('timezones');
  if (!hasTable) {
    logger.info('timezones table does not exist — skipping.');
    process.exit(0);
    return;
  }

  await db('timezones').where({ timezone: 'Europe/Berlin' }).update({ display_order: 1 });
  await db('timezones').where({ timezone: 'Europe/London' }).update({ display_order: 2 });
  await db('timezones').where({ timezone: 'Asia/Kolkata' }).update({ display_order: 3 });

  logger.info('Timezones order migration complete.');
  process.exit(0);
}

async function rollback() {
  logger.info('Rolling back timezones order migration...');
  await db('timezones').where({ timezone: 'Europe/Berlin' }).update({ display_order: 3 });
  await db('timezones').where({ timezone: 'Europe/London' }).update({ display_order: 2 });
  await db('timezones').where({ timezone: 'Asia/Kolkata' }).update({ display_order: 1 });
  logger.info('Timezones order rollback complete.');
  process.exit(0);
}

if (process.argv[2] === 'rollback') rollback();
else migrate();
