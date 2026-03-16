const crypto = require('crypto');
const logger = require('../config/logger');
const db = require('../config/db');

const ENCRYPT_KEY = process.env.ZOHO_ENCRYPT_KEY || process.env.JWT_SECRET || 'pranitra-default-key-change-me';

// ── Encryption helpers for sensitive fields ──────────────────────
function deriveKey() {
  return crypto.createHash('sha256').update(ENCRYPT_KEY).digest();
}

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', deriveKey(), iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(data) {
  if (!data || !data.includes(':')) return null;
  try {
    const [ivHex, encrypted] = data.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', deriveKey(), Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

// ── Date conversion ──────────────────────────────────────────────
// Zoho exports dates as Excel serial numbers
function excelSerialToDate(serial) {
  if (!serial || serial === '' || serial === '-') return null;
  const num = Number(serial);
  if (isNaN(num) || num < 1) return null;
  const d = new Date((num - 25569) * 86400 * 1000);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Also handle normal date strings (DD-MMM-YYYY, YYYY-MM-DD, etc.)
function parseZohoDate(val) {
  if (!val || val === '' || val === '-') return null;
  // If it's a number (Excel serial), convert
  if (!isNaN(Number(val)) && Number(val) > 1000) {
    return excelSerialToDate(val);
  }
  // Try parsing as date string
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

function parseZohoTimestamp(val) {
  if (!val || val === '' || val === '-') return null;
  if (!isNaN(Number(val)) && Number(val) > 1000) {
    const d = new Date((Number(val) - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function clean(val) {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  return String(val).trim();
}

// ── Field mapping: Zoho API field name → hr_employees column ─────
function mapRecord(z) {
  return {
    zoho_link_id:                  clean(z['ZOHO_LINK_ID'] || z['Zoho_ID'] || z['recordId']),
    employee_id:                   clean(z['Employee ID'] || z['EmployeeID']),
    first_name:                    clean(z['FirstName'] || z['First Name']),
    last_name:                     clean(z['LastName'] || z['Last Name']),
    full_name:                     clean(z['Full Name'] || z['Employee Name'] || z['Full_Name']),
    email:                         clean(z['Email address'] || z['EmailID'] || z['Email']),
    photo_url:                     clean(z['Photo'] || z['photo']),
    department:                    clean(z['Department']),
    designation:                   clean(z['Designation']),
    zoho_role:                     clean(z['Zoho Role'] || z['Role']),
    employment_type:               clean(z['Employment Type'] || z['Employmenttype']),
    employee_status:               clean(z['Employee Status'] || z['Employeestatus']),
    source_of_hire:                clean(z['Source of Hire'] || z['Source_of_Hire']),
    date_of_joining:               parseZohoDate(z['Date of joining'] || z['Dateofjoining']),
    date_of_confirmation:          parseZohoDate(z['Date of Confirmation'] || z['Confirmation Date']),
    current_experience:            clean(z['Current Experience'] || z['Current_Experience']),
    total_experience:              clean(z['Total Experience'] || z['Total_Experience']),
    reporting_manager:             clean(z['Reporting Manager'] || z['Reporting_To']),
    secondary_reporting_manager:   clean(z['Secondary Reporting Manager']),
    onboarding_status:             clean(z['Onboarding Status']),
    company:                       clean(z['Company']),
    business_unit:                 clean(z['Business Unit'] || z['Business_Unit']),
    division:                      clean(z['Division']),
    teams:                         clean(z['Teams']),
    banding:                       clean(z['Banding']),
    new_joiner:                    clean(z['New Joiner']),
    work_phone:                    clean(z['Work Phone Number'] || z['Work phone number'] || z['Work_phone']),
    seating_location:              clean(z['Seating Location'] || z['Seating_Location']),
    tags:                          clean(z['Tags']),
    work_experience:               clean(z['Work Experience'] || z['Work_Experience']),
    date_of_exit:                  parseZohoDate(z['Date of Exit'] || z['Date_of_exit']),

    // Personal
    date_of_birth:                 parseZohoDate(z['Date of birth'] || z['Dateofbirth']),
    age:                           clean(z['Age']),
    gender:                        clean(z['Gender']),
    marital_status:                clean(z['Marital Status'] || z['Marital_Status']),
    blood_group:                   clean(z['Blood Group'] || z['Blood_Group']),
    about_me:                      clean(z['About Me'] || z['AboutMe']),
    expertise:                     clean(z['Expertise']),
    passport:                      clean(z['Passport']),
    personal_mobile:               clean(z['Personal Mobile Number'] || z['Mobile'] || z['Personal_Mobile']),
    personal_email:                clean(z['Personal Email Address'] || z['Personal_email']),
    present_address:               clean(z['Present Address'] || z['Present_address']),
    permanent_address:             clean(z['Permanent Address'] || z['Permanent_address']),

    // Sensitive — encrypted
    aadhaar:                       encrypt(clean(z['Aadhaar'] || z['Aadhaar Card No'])),
    pan:                           encrypt(clean(z['PAN'] || z['PAN Number'])),
    uan:                           clean(z['UAN'] || z['UAN Number']),
    existing_bank_account:         clean(z['Existing Bank Account']),
    bank_name:                     clean(z['Bank Name'] || z['Bank_Name']),
    bank_account_number:           encrypt(clean(z['Bank Account Number'] || z['Account Number'])),
    ifsc_code:                     clean(z['IFSC Code'] || z['IFSC_Code']),
    account_holder_name:           clean(z['Account Holder Name']),
    payment_mode:                  clean(z['Payment Mode']),
    account_type:                  clean(z['Account Type']),
    do_you_have_uan:               clean(z['Do you have UAN']),

    // Family
    fathers_name:                  clean(z["Father's Name"] || z['Fathers_Name']),
    dob_father:                    parseZohoDate(z["DOB - Father"] || z['DOB_Father']),
    mothers_name:                  clean(z["Mother's Name"] || z['Mothers_Name']),
    dob_mother:                    parseZohoDate(z["DOB - Mother"] || z['DOB_Mother']),
    spouse_name:                   clean(z["Spouse Name"] || z['Spouse_Name']),
    dob_spouse:                    parseZohoDate(z["DOB - Spouse"] || z['DOB_Spouse']),
    having_kids:                   clean(z['Having Kids']),
    number_of_kids:                clean(z['Number of Kids']),
    child1_name:                   clean(z["Child 1 Name"] || z['Child1_Name']),
    child1_dob:                    parseZohoDate(z["Child 1 DOB"] || z['Child1_DOB']),
    child2_name:                   clean(z["Child 2 Name"] || z['Child2_Name']),
    child2_dob:                    parseZohoDate(z["Child 2 DOB"] || z['Child2_DOB']),

    // Emergency
    emergency_contact_name:        clean(z['Emergency Contact Name'] || z['Emergency_Contact_Name']),
    emergency_contact_number:      clean(z['Emergency Contact Number'] || z['Emergency_Contact_Number']),
    emergency_contact_relation:    clean(z['Emergency Contact Relation'] || z['Relation']),

    // Contract
    contract_end_date:             parseZohoDate(z['Contract End Date']),

    // Sync metadata
    last_synced_at:                new Date().toISOString(),
    added_by:                      clean(z['Added By'] || z['addedBy']),
    modified_by:                   clean(z['Modified By'] || z['modifiedBy']),
    added_time:                    parseZohoTimestamp(z['Added Time'] || z['addedTime']),
    modified_time:                 parseZohoTimestamp(z['Modified Time'] || z['modifiedTime']),
  };
}

// ── OAuth token refresh ──────────────────────────────────────────
async function refreshAccessToken() {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Zoho OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(`https://accounts.zoho.in/oauth/v2/token?${params}`, { method: 'POST' });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Zoho token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ── Fetch all employee records (paginated) ───────────────────────
async function fetchAllRecords(accessToken) {
  const records = [];
  let index = 0;
  const limit = 200;

  while (true) {
    const url = `https://people.zoho.in/people/api/forms/P_EmployeeView/records?sIndex=${index}&limit=${limit}`;
    const res = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
    const data = await res.json();

    let batch;
    if (data.response && data.response.result) {
      batch = data.response.result;
    } else if (Array.isArray(data)) {
      batch = data;
    } else if (typeof data === 'object' && data['0']) {
      batch = Object.values(data);
    } else {
      break;
    }
    if (!Array.isArray(batch) || batch.length === 0) break;

    records.push(...batch);
    if (batch.length < limit) break;
    index += limit;
  }

  return records;
}

// ── Main sync function ───────────────────────────────────────────
async function syncAllEmployees() {
  logger.info('Zoho sync: starting full employee sync...');

  const accessToken = await refreshAccessToken();
  logger.info('Zoho sync: OAuth token refreshed');

  const records = await fetchAllRecords(accessToken);
  logger.info(`Zoho sync: fetched ${records.length} employee records`);

  let upserted = 0;
  let skipped = 0;

  for (const raw of records) {
    try {
      const mapped = mapRecord(raw);
      if (!mapped.zoho_link_id) { skipped++; continue; }

      await db('hr_employees')
        .insert(mapped)
        .onConflict('zoho_link_id')
        .merge({
          ...mapped,
          updated_at: db.fn.now(),
        });
      upserted++;
    } catch (err) {
      logger.error(`Zoho sync: failed to upsert record — ${err.message}`);
      skipped++;
    }
  }

  // Log sync timestamp
  await db('system_settings')
    .insert({ key: 'zoho_last_sync', value: new Date().toISOString(), description: 'Last Zoho People sync' })
    .onConflict('key')
    .merge({ value: new Date().toISOString() });

  logger.info(`Zoho sync: complete — ${upserted} upserted, ${skipped} skipped`);
  return { upserted, skipped, total: records.length };
}

module.exports = { syncAllEmployees, decrypt, encrypt };
