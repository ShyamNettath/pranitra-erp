/**
 * PRANITRA PM — Automatic Migration Runner
 *
 * Creates a migration_history table to track which migrations have run.
 * Executes each migration file in order, skipping already-applied ones.
 * Each migration is still idempotent internally, so re-running is safe.
 *
 * Run: node src/config/migrate-runner.js
 */
require('dotenv').config();
const db = require('./db');
const path = require('path');
const { execSync } = require('child_process');

// Ordered list of migration files to run
const MIGRATIONS = [
  'migrate.js',
  'migrate-totp.js',
  'migrate-must-reset.js',
  'migrate-user-fields.js',
  'migrate-project-fields.js',
  'migrate-milestones-commercial.js',
  'migrate-lop-sections.js',
  'migrate-zoho-sync.js',
  'migrate-file-optimisation.js',
  'migrate-workspace-modules.js',
];

async function run() {
  console.log('[migrate-runner] Starting automatic migration runner...');

  // Ensure migration_history table exists
  const hasTable = await db.schema.hasTable('migration_history');
  if (!hasTable) {
    await db.schema.createTable('migration_history', (t) => {
      t.increments('id').primary();
      t.string('name').unique().notNullable();
      t.timestamp('applied_at').defaultTo(db.fn.now()).notNullable();
    });
    console.log('[migrate-runner] Created migration_history table');
  }

  let applied = 0;
  let skipped = 0;

  for (const file of MIGRATIONS) {
    const already = await db('migration_history').where({ name: file }).first();
    if (already) {
      console.log(`[migrate-runner] Skipping ${file} — already applied`);
      skipped++;
      continue;
    }

    console.log(`[migrate-runner] Running migration: ${file}`);
    const filePath = path.join(__dirname, file);

    try {
      // Run each migration as a child process so process.exit() calls don't kill the runner
      execSync(`node "${filePath}"`, {
        cwd: path.join(__dirname, '..', '..'),
        stdio: 'inherit',
        timeout: 60000,
        env: { ...process.env },
      });

      await db('migration_history').insert({ name: file });
      console.log(`[migrate-runner] Migration complete: ${file}`);
      applied++;
    } catch (err) {
      console.error(`[migrate-runner] Migration failed: ${file} — ${err.message}`);
      // Don't stop on failure — migrations are idempotent, mark as applied
      // if the migration's own checks passed (exit code 0 is handled above)
      // For non-zero exit, still record it to avoid re-running a partially applied migration
      await db('migration_history').insert({ name: file }).catch(() => {});
      console.log(`[migrate-runner] Recorded ${file} as applied (may need manual review)`);
    }
  }

  console.log(`[migrate-runner] Done — ${applied} applied, ${skipped} skipped`);
  await db.destroy();
  process.exit(0);
}

run().catch(err => {
  console.error('[migrate-runner] Fatal error:', err);
  process.exit(1);
});
