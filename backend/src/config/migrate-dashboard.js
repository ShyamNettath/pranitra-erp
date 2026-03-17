/**
 * PRANITRA PM — Dashboard Migration
 * Creates dashboard_todos and dashboard_notes tables.
 * Run: node src/config/migrate-dashboard.js
 */
require('dotenv').config();
const db = require('./db');
const logger = require('./logger');

async function migrate() {
  logger.info('Running dashboard migration...');

  const hasTodos = await db.schema.hasTable('dashboard_todos');
  if (!hasTodos) {
    await db.schema.createTable('dashboard_todos', (t) => {
      t.increments('id').primary();
      t.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      t.text('text').notNullable();
      t.boolean('is_done').defaultTo(false);
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    logger.info('Created dashboard_todos table.');
  } else {
    logger.info('dashboard_todos table already exists — skipping.');
  }

  const hasNotes = await db.schema.hasTable('dashboard_notes');
  if (!hasNotes) {
    await db.schema.createTable('dashboard_notes', (t) => {
      t.increments('id').primary();
      t.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').unique();
      t.text('content');
      t.timestamp('updated_at').defaultTo(db.fn.now());
    });
    logger.info('Created dashboard_notes table.');
  } else {
    logger.info('dashboard_notes table already exists — skipping.');
  }

  logger.info('Dashboard migration complete.');
  process.exit(0);
}

async function rollback() {
  logger.info('Rolling back dashboard migration...');
  await db.schema.dropTableIfExists('dashboard_todos');
  await db.schema.dropTableIfExists('dashboard_notes');
  logger.info('Dropped dashboard_todos and dashboard_notes tables.');
  process.exit(0);
}

if (process.argv[2] === 'rollback') rollback();
else migrate();
