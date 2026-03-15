/**
 * PRANITRA PM — TOTP Migration
 * Adds totp_secret and totp_enabled columns to users table.
 * Run: node src/config/migrate-totp.js
 */
const db = require('./db');
const logger = require('./logger');

async function migrate() {
  logger.info('Running TOTP migration...');

  const hasSecret = await db.schema.hasColumn('users', 'totp_secret');
  if (!hasSecret) {
    await db.schema.alterTable('users', (t) => {
      t.text('totp_secret').nullable();
      t.boolean('totp_enabled').defaultTo(false);
    });
    logger.info('Added totp_secret and totp_enabled columns to users table.');
  } else {
    logger.info('TOTP columns already exist — skipping.');
  }

  logger.info('TOTP migration complete.');
  process.exit(0);
}

async function rollback() {
  logger.info('Rolling back TOTP migration...');
  const hasSecret = await db.schema.hasColumn('users', 'totp_secret');
  if (hasSecret) {
    await db.schema.alterTable('users', (t) => {
      t.dropColumn('totp_secret');
      t.dropColumn('totp_enabled');
    });
    logger.info('Dropped totp_secret and totp_enabled columns.');
  }
  process.exit(0);
}

if (process.argv[2] === 'rollback') rollback();
else migrate();
