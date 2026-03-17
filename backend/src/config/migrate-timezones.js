/**
 * PRANITRA PM — Timezones Migration
 * Creates timezones table with default entries.
 * Run: node src/config/migrate-timezones.js
 */
require('dotenv').config();
const db = require('./db');
const logger = require('./logger');

async function migrate() {
  logger.info('Running timezones migration...');

  const hasTable = await db.schema.hasTable('timezones');
  if (!hasTable) {
    await db.schema.createTable('timezones', (t) => {
      t.increments('id').primary();
      t.string('label', 100).notNullable();
      t.string('timezone', 100).notNullable();
      t.integer('display_order').defaultTo(0);
      t.boolean('is_active').defaultTo(true);
    });
    await db('timezones').insert([
      { label: 'India', timezone: 'Asia/Kolkata', display_order: 1 },
      { label: 'UK', timezone: 'Europe/London', display_order: 2 },
      { label: 'Germany', timezone: 'Europe/Berlin', display_order: 3 },
    ]);
    logger.info('Created timezones table with default entries.');
  } else {
    logger.info('timezones table already exists — skipping.');
  }

  logger.info('Timezones migration complete.');
  process.exit(0);
}

async function rollback() {
  logger.info('Rolling back timezones migration...');
  await db.schema.dropTableIfExists('timezones');
  logger.info('Dropped timezones table.');
  process.exit(0);
}

if (process.argv[2] === 'rollback') rollback();
else migrate();
