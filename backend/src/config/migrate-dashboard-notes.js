/**
 * PRANITRA PM — Dashboard Notes Migration
 * Creates dashboard_notes table.
 * Run: node src/config/migrate-dashboard-notes.js
 */
require('dotenv').config();
const db = require('./db');
const logger = require('./logger');

async function migrate() {
  logger.info('Running dashboard notes migration...');

  const hasNotes = await db.schema.hasTable('dashboard_notes');
  if (!hasNotes) {
    await db.schema.createTable('dashboard_notes', (t) => {
      t.increments('id').primary();
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.text('content');
      t.timestamp('updated_at').defaultTo(db.fn.now());
    });
    logger.info('Created dashboard_notes table.');
  } else {
    logger.info('dashboard_notes table already exists — skipping.');
  }

  logger.info('Dashboard notes migration complete.');
  process.exit(0);
}

async function rollback() {
  logger.info('Rolling back dashboard notes migration...');
  await db.schema.dropTableIfExists('dashboard_notes');
  logger.info('Dropped dashboard_notes table.');
  process.exit(0);
}

if (process.argv[2] === 'rollback') rollback();
else migrate();
