const logger = require('../config/logger');

/**
 * Zoho People one-way sync — reads employee data and updates users table.
 * Requires ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN in .env
 */
async function syncFromZoho() {
  logger.info('Zoho sync: starting...');
  // Full implementation in NOTIFY_BLOCK / ZOHO_BLOCK
  // Steps:
  // 1. Refresh OAuth access token using refresh token
  // 2. GET /api/forms/P_EmployeeView/records
  // 3. Upsert users by zoho_employee_id
  // 4. Update associate_profiles with department, location, joined_date
  // 5. Log sync timestamp in system_settings
  logger.info('Zoho sync: stub — configure credentials to enable');
}

module.exports = { syncFromZoho };
