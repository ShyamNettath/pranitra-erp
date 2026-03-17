/**
 * PRANITRA PM — Dashboard Migration
 * Creates dashboard_todos table.
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
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.text('text').notNullable();
      t.boolean('is_done').defaultTo(false);
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    logger.info('Created dashboard_todos table.');
  } else {
    logger.info('dashboard_todos table already exists — skipping.');
  }

  logger.info('Dashboard migration complete.');
  process.exit(0);
}

async function rollback() {
  logger.info('Rolling back dashboard migration...');
  await db.schema.dropTableIfExists('dashboard_todos');
  logger.info('Dropped dashboard_todos table.');
  process.exit(0);
}

if (process.argv[2] === 'rollback') rollback();
else migrate();
