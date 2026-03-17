/**
 * PRANITRA PM — Fix Phone Format v2 Migration
 * Reformats existing emergency_contacts phone numbers to +91 XXXX XXX XXX
 * using a single PostgreSQL UPDATE. Only touches rows not already formatted.
 * Run: node src/config/migrate-fix-phone-format-v2.js
 */
require('dotenv').config();
const db = require('./db');
const logger = require('./logger');

async function migrate() {
  logger.info('Running phone format v2 migration...');

  const hasTable = await db.schema.hasTable('emergency_contacts');
  if (!hasTable) {
    logger.info('emergency_contacts table does not exist — skipping.');
    process.exit(0);
    return;
  }

  const result = await db.raw(`
    UPDATE emergency_contacts SET phone =
      '+91 ' ||
      substring(regexp_replace(phone, '[^0-9]', '', 'g'), length(regexp_replace(phone, '[^0-9]', '', 'g'))-9, 4) || ' ' ||
      substring(regexp_replace(phone, '[^0-9]', '', 'g'), length(regexp_replace(phone, '[^0-9]', '', 'g'))-5, 3) || ' ' ||
      substring(regexp_replace(phone, '[^0-9]', '', 'g'), length(regexp_replace(phone, '[^0-9]', '', 'g'))-2, 3)
    WHERE phone NOT LIKE '+91 % % %'
  `);

  const count = result.rowCount ?? 0;
  logger.info(`Phone format v2 migration complete — ${count} records updated.`);
  process.exit(0);
}

async function rollback() {
  logger.info('Phone format v2 migration has no rollback — original values not stored.');
  process.exit(0);
}

if (process.argv[2] === 'rollback') rollback();
else migrate();
