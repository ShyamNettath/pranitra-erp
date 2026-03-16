/**
 * Migration: Add modules JSONB column to workspaces table.
 *
 * Run: node src/config/migrate-workspace-modules.js
 */
require('dotenv').config();
const db = require('./db');

const DEFAULT_MODULES = JSON.stringify(['dashboard', 'projects', 'tasks', 'gantt', 'reports', 'resources']);

async function run() {
  const hasTable = await db.schema.hasTable('workspaces');
  if (!hasTable) {
    console.log('— workspaces table does not exist, skipping');
    process.exit(0);
  }

  const hasCol = await db.schema.hasColumn('workspaces', 'modules');
  if (!hasCol) {
    await db.schema.alterTable('workspaces', (t) => {
      t.jsonb('modules').defaultTo(DEFAULT_MODULES);
    });
    // Backfill existing rows
    await db('workspaces').whereNull('modules').update({ modules: DEFAULT_MODULES });
    console.log('✔ Added modules column to workspaces table');
  } else {
    console.log('— modules column already exists');
  }

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
