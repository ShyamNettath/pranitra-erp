/**
 * Migration: Add new user profile fields.
 *   employee_id, designation, location, team, contact_number
 *
 * Run: node src/config/migrate-user-fields.js
 */
require('dotenv').config();
const db = require('./db');

async function run() {
  const has = async (col) => db.schema.hasColumn('users', col);

  if (!await has('employee_id'))     await db.schema.alterTable('users', t => t.text('employee_id').unique());
  if (!await has('designation'))     await db.schema.alterTable('users', t => t.text('designation'));
  if (!await has('location'))        await db.schema.alterTable('users', t => t.text('location'));
  if (!await has('team'))            await db.schema.alterTable('users', t => t.text('team'));
  if (!await has('contact_number'))  await db.schema.alterTable('users', t => t.text('contact_number'));

  console.log('✔ users table updated with new fields');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
