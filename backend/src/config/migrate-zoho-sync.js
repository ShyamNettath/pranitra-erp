/**
 * Migration: Create hr_employees table for Zoho People sync.
 *
 * Run: node src/config/migrate-zoho-sync.js
 */
require('dotenv').config();
const db = require('./db');

async function run() {
  const has = await db.schema.hasTable('hr_employees');
  if (!has) {
    await db.schema.createTable('hr_employees', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));

      // ── BASIC INFO ──────────────────────────────────────────
      t.text('zoho_link_id').unique();
      t.text('employee_id');
      t.text('first_name');
      t.text('last_name');
      t.text('full_name');
      t.text('email');
      t.text('photo_url');
      t.text('department');
      t.text('designation');
      t.text('zoho_role');
      t.text('employment_type');
      t.text('employee_status');
      t.text('source_of_hire');
      t.date('date_of_joining');
      t.date('date_of_confirmation');
      t.text('current_experience');
      t.text('total_experience');
      t.text('reporting_manager');
      t.text('secondary_reporting_manager');
      t.text('onboarding_status');
      t.text('company');
      t.text('business_unit');
      t.text('division');
      t.text('teams');
      t.text('banding');
      t.text('new_joiner');
      t.text('work_phone');
      t.text('seating_location');
      t.text('tags');
      t.text('work_experience');
      t.date('date_of_exit');

      // ── PERSONAL INFO ───────────────────────────────────────
      t.date('date_of_birth');
      t.text('age');
      t.text('gender');
      t.text('marital_status');
      t.text('blood_group');
      t.text('about_me');
      t.text('expertise');
      t.text('passport');
      t.text('personal_mobile');
      t.text('personal_email');
      t.text('present_address');
      t.text('permanent_address');

      // ── SENSITIVE FINANCIAL / IDENTITY ──────────────────────
      t.text('aadhaar');          // stored encrypted
      t.text('pan');              // stored encrypted
      t.text('uan');
      t.text('existing_bank_account');
      t.text('bank_name');
      t.text('bank_account_number'); // stored encrypted
      t.text('ifsc_code');
      t.text('account_holder_name');
      t.text('payment_mode');
      t.text('account_type');
      t.text('do_you_have_uan');

      // ── FAMILY INFO ─────────────────────────────────────────
      t.text('fathers_name');
      t.date('dob_father');
      t.text('mothers_name');
      t.date('dob_mother');
      t.text('spouse_name');
      t.date('dob_spouse');
      t.text('having_kids');
      t.text('number_of_kids');
      t.text('child1_name');
      t.date('child1_dob');
      t.text('child2_name');
      t.date('child2_dob');

      // ── EMERGENCY CONTACT ───────────────────────────────────
      t.text('emergency_contact_name');
      t.text('emergency_contact_number');
      t.text('emergency_contact_relation');

      // ── CONTRACT ────────────────────────────────────────────
      t.date('contract_end_date');

      // ── SYNC METADATA ───────────────────────────────────────
      t.timestamp('last_synced_at');
      t.text('added_by');
      t.text('modified_by');
      t.timestamp('added_time');
      t.timestamp('modified_time');
      t.timestamps(true, true);
    });
    console.log('✔ hr_employees table created');
  } else {
    console.log('— hr_employees table already exists');
  }

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
