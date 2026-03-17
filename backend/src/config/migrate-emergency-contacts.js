/**
 * PRANITRA PM — Emergency Contacts Migration
 * Creates emergency_contacts table.
 * Run: node src/config/migrate-emergency-contacts.js
 */
require('dotenv').config();
const db = require('./db');
const logger = require('./logger');

async function migrate() {
  logger.info('Running emergency contacts migration...');

  const hasTable = await db.schema.hasTable('emergency_contacts');
  if (!hasTable) {
    await db.schema.createTable('emergency_contacts', (t) => {
      t.increments('id').primary();
      t.string('name', 255).notNullable();
      t.string('role', 255).notNullable();
      t.string('phone', 20).notNullable();
      t.integer('display_order').defaultTo(0);
      t.boolean('is_active').defaultTo(true);
      t.string('contact_type', 20).defaultTo('external');
      t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL').nullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    logger.info('Created emergency_contacts table.');
  } else {
    logger.info('emergency_contacts table already exists — skipping.');
  }

  logger.info('Emergency contacts migration complete.');
  process.exit(0);
}

async function rollback() {
  logger.info('Rolling back emergency contacts migration...');
  await db.schema.dropTableIfExists('emergency_contacts');
  logger.info('Dropped emergency_contacts table.');
  process.exit(0);
}

if (process.argv[2] === 'rollback') rollback();
else migrate();
