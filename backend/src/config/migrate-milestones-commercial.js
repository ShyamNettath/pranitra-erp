/**
 * Migration: Create project_milestones table for commercial milestones.
 *
 * Run: node src/config/migrate-milestones-commercial.js
 */
require('dotenv').config();
const db = require('./db');

async function run() {
  const exists = await db.schema.hasTable('project_milestones');
  if (!exists) {
    await db.schema.createTable('project_milestones', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
      t.text('name').notNullable();
      t.date('due_date');
      t.decimal('amount', 14, 2);
      t.integer('sort_order').defaultTo(0);
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('✔ project_milestones table created');
  } else {
    console.log('— project_milestones table already exists');
  }

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
