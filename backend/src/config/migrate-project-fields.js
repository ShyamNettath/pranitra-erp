/**
 * Migration: Add new project fields for the project initiation wizard.
 *   customer_name, oem_name, project_code, cycle_time, payment_terms, sections (JSON), software (JSON)
 *
 * Run: node src/config/migrate-project-fields.js
 */
require('dotenv').config();
const db = require('./db');

async function run() {
  const has = async (col) => db.schema.hasColumn('projects', col);

  await db.schema.alterTable('projects', (t) => {});

  if (!await has('customer_name'))  await db.schema.alterTable('projects', t => t.text('customer_name'));
  if (!await has('oem_name'))       await db.schema.alterTable('projects', t => t.text('oem_name'));
  if (!await has('project_code'))   await db.schema.alterTable('projects', t => t.text('project_code'));
  if (!await has('cycle_time'))     await db.schema.alterTable('projects', t => t.text('cycle_time'));
  if (!await has('payment_terms'))  await db.schema.alterTable('projects', t => t.text('payment_terms'));
  if (!await has('sections'))       await db.schema.alterTable('projects', t => t.jsonb('sections'));
  if (!await has('software'))       await db.schema.alterTable('projects', t => t.jsonb('software'));

  console.log('✔ projects table updated with new fields');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
