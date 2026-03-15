/**
 * PRANITRA PM — must_reset_password Migration
 * Adds must_reset_password column to users table.
 * Run: node src/config/migrate-must-reset.js
 */
const db = require('./db');
const logger = require('./logger');

async function migrate() {
  logger.info('Running must_reset_password migration...');

  const hasColumn = await db.schema.hasColumn('users', 'must_reset_password');
  if (!hasColumn) {
    await db.schema.alterTable('users', (t) => {
      t.boolean('must_reset_password').defaultTo(false);
    });
    logger.info('Added must_reset_password column to users table.');
  } else {
    logger.info('must_reset_password column already exists — skipping.');
  }

  logger.info('Migration complete.');
  process.exit(0);
}

async function rollback() {
  logger.info('Rolling back must_reset_password migration...');
  const hasColumn = await db.schema.hasColumn('users', 'must_reset_password');
  if (hasColumn) {
    await db.schema.alterTable('users', (t) => {
      t.dropColumn('must_reset_password');
    });
    logger.info('Dropped must_reset_password column.');
  }
  process.exit(0);
}

if (process.argv[2] === 'rollback') rollback();
else migrate();
