/**
 * PRANITRA PM — Fix Phone Format Migration
 * Reformats all existing emergency_contacts phone numbers to +91 XXXX XXX XXX.
 * Run: node src/config/migrate-fix-phone-format.js
 */
require('dotenv').config();
const db = require('./db');
const logger = require('./logger');

function formatPhone(raw) {
  if (!raw) return raw;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0'))  digits = digits.slice(1);
  if (digits.length !== 10) return raw;
  return `+91 ${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
}

async function migrate() {
  logger.info('Running phone format migration...');

  const hasTable = await db.schema.hasTable('emergency_contacts');
  if (!hasTable) {
    logger.info('emergency_contacts table does not exist — skipping.');
    process.exit(0);
    return;
  }

  const contacts = await db('emergency_contacts').select('id', 'phone');
  let updated = 0;

  for (const c of contacts) {
    const formatted = formatPhone(c.phone);
    if (formatted !== c.phone) {
      await db('emergency_contacts').where({ id: c.id }).update({ phone: formatted });
      updated++;
    }
  }

  logger.info(`Phone format migration complete — ${updated} of ${contacts.length} records updated.`);
  process.exit(0);
}

async function rollback() {
  logger.info('Phone format migration has no rollback — original values are not stored.');
  process.exit(0);
}

if (process.argv[2] === 'rollback') rollback();
else migrate();
