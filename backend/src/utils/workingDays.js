const db = require('../config/db');

/**
 * Add N working days to a start date, skipping weekends and tenant holidays.
 * Single source of truth for all working-day calculations.
 *
 * @param {Date|string} startDate - The date to start counting from (not included)
 * @param {number} days - Number of working days to add
 * @param {string} tenantId - Workspace/tenant UUID
 * @returns {Date} The resulting date after adding working days
 */
async function addWorkingDays(startDate, days, tenantId) {
  const holidays = await db('holidays')
    .where({ tenant_id: tenantId, is_active: true, is_deleted: false })
    .select('date');

  const holidayDates = new Set(
    holidays.map(h => new Date(h.date).toISOString().split('T')[0])
  );

  let count = 0;
  let date = new Date(startDate);

  while (count < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    const dateStr = date.toISOString().split('T')[0];
    const isWeekend = day === 0 || day === 6;
    const isHoliday = holidayDates.has(dateStr);
    if (!isWeekend && !isHoliday) count++;
  }

  return date;
}

module.exports = { addWorkingDays };
