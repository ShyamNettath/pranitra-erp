/**
 * Migration: Add md5_hash column and indexes to files table.
 *
 * Run: node src/config/migrate-file-optimisation.js
 */
require('dotenv').config();
const db = require('./db');

async function run() {
  const hasFiles = await db.schema.hasTable('files');
  if (!hasFiles) {
    console.log('— files table does not exist, skipping');
    process.exit(0);
  }

  // Add md5_hash column
  const hasHash = await db.schema.hasColumn('files', 'md5_hash');
  if (!hasHash) {
    await db.schema.alterTable('files', (t) => {
      t.text('md5_hash');
    });
    console.log('✔ Added md5_hash column to files table');
  } else {
    console.log('— md5_hash column already exists');
  }

  // Add index on md5_hash
  try {
    await db.schema.alterTable('files', (t) => {
      t.index('md5_hash', 'idx_files_md5_hash');
    });
    console.log('✔ Added index on files.md5_hash');
  } catch {
    console.log('— Index on files.md5_hash already exists');
  }

  // Add index on entity_id (project_id)
  try {
    await db.schema.alterTable('files', (t) => {
      t.index('project_id', 'idx_files_project_id');
    });
    console.log('✔ Added index on files.project_id');
  } catch {
    console.log('— Index on files.project_id already exists');
  }

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
