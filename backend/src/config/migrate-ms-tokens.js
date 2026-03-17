require('dotenv').config();
const db = require('./db');

async function run() {
  console.log('[migrate-ms-tokens] Adding MS OAuth token columns to users table...');

  await db.raw(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ms_access_token TEXT`);
  await db.raw(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ms_refresh_token TEXT`);
  await db.raw(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ms_token_expiry TIMESTAMPTZ`);

  console.log('[migrate-ms-tokens] Done.');
  await db.destroy();
  process.exit(0);
}

run().catch(err => {
  console.error('[migrate-ms-tokens] Error:', err.message);
  process.exit(1);
});
