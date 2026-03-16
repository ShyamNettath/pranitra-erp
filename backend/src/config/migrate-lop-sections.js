/**
 * Migration: Create lop_sections and lop_items tables.
 *
 * Run: node src/config/migrate-lop-sections.js
 */
require('dotenv').config();
const db = require('./db');

async function run() {
  // ── lop_sections ──────────────────────────────────────────────
  const hasSections = await db.schema.hasTable('lop_sections');
  if (!hasSections) {
    await db.schema.createTable('lop_sections', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.uuid('tenant_id').references('id').inTable('workspaces').onDelete('CASCADE').notNullable();
      t.string('name').notNullable();
      t.text('description');
      t.boolean('is_active').defaultTo(true);
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
      t.unique(['tenant_id', 'name']);
    });
    console.log('✔ lop_sections table created');
  } else {
    console.log('— lop_sections table already exists');
  }

  // ── lop_items ─────────────────────────────────────────────────
  const hasItems = await db.schema.hasTable('lop_items');
  if (!hasItems) {
    await db.schema.createTable('lop_items', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.uuid('tenant_id').references('id').inTable('workspaces').onDelete('CASCADE').notNullable();
      t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
      t.integer('si').notNullable();
      t.date('date_raised').notNullable();
      t.uuid('section_id').references('id').inTable('lop_sections');
      t.text('description').notNullable();
      t.uuid('raised_by').references('id').inTable('users');
      t.uuid('owner').references('id').inTable('users');
      t.string('impact').notNullable();
      t.string('status').notNullable().defaultTo('Open');
      t.date('target_date').notNullable();
      t.date('closed_date');
      t.uuid('closed_by').references('id').inTable('users');
      t.text('comments');
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
      t.unique(['project_id', 'si']);
    });
    console.log('✔ lop_items table created');
  } else {
    console.log('— lop_items table already exists');
  }

  // ── Seed default sections for all existing workspaces ─────────
  const DEFAULT_SECTIONS = [
    'Timeline', 'Budget', 'Scope', 'Design', 'Simulation',
    'Planning', 'Layout', 'QC', 'Resource', 'Risk', 'Client', 'General',
  ];

  if (!hasSections) {
    const workspaces = await db('workspaces').where({ is_active: true }).select('id');
    for (const ws of workspaces) {
      for (const section of DEFAULT_SECTIONS) {
        await db('lop_sections').insert({
          tenant_id: ws.id,
          name: section,
          description: `${section} issues`,
          is_active: true,
        }).onConflict(['tenant_id', 'name']).ignore();
      }
    }
    console.log(`✔ Seeded default LOP sections for ${workspaces.length} workspace(s)`);
  }

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
