const db = require('../config/db');
const { writeAuditLog } = require('../utils/audit');
const path = require('path');

exports.list = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { year, type, is_active } = req.query;

    let q = db('holidays')
      .where({ tenant_id: tenantId, is_deleted: false })
      .orderBy('date', 'asc');

    if (year) {
      q = q.whereRaw('EXTRACT(YEAR FROM date) = ?', [parseInt(year)]);
    }
    if (type) q = q.where('holiday_type', type);
    if (is_active !== undefined) q = q.where('is_active', is_active === 'true');

    const holidays = await q;
    return res.json(holidays);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { name, date, holiday_type, is_active } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Holiday name is required' });
    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!holiday_type || !['Public', 'Company', 'Optional'].includes(holiday_type)) {
      return res.status(400).json({ error: 'Type must be Public, Company, or Optional' });
    }

    const [holiday] = await db('holidays').insert({
      tenant_id: tenantId,
      name: name.trim(),
      date,
      holiday_type,
      is_active: is_active === false ? false : true,
      created_by: req.user.id,
    }).returning('*');

    await writeAuditLog(req.user.id, 'holiday.create', 'holiday', holiday.id, holiday, req);
    return res.status(201).json(holiday);
  } catch (err) {
    if (err?.code === '23505') return res.status(409).json({ error: 'A holiday already exists on this date for this tenant' });
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { tenantId, id } = req.params;
    const { name, date, holiday_type, is_active } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (date !== undefined) data.date = date;
    if (holiday_type !== undefined) {
      if (!['Public', 'Company', 'Optional'].includes(holiday_type)) {
        return res.status(400).json({ error: 'Type must be Public, Company, or Optional' });
      }
      data.holiday_type = holiday_type;
    }
    if (is_active !== undefined) data.is_active = !!is_active;

    const [updated] = await db('holidays')
      .where({ id, tenant_id: tenantId, is_deleted: false })
      .update(data)
      .returning('*');

    if (!updated) return res.status(404).json({ error: 'Holiday not found' });
    await writeAuditLog(req.user.id, 'holiday.update', 'holiday', updated.id, data, req);
    return res.json(updated);
  } catch (err) {
    if (err?.code === '23505') return res.status(409).json({ error: 'A holiday already exists on this date' });
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { tenantId, id } = req.params;
    const updated = await db('holidays')
      .where({ id, tenant_id: tenantId, is_deleted: false })
      .update({ is_deleted: true, is_active: false });
    if (!updated) return res.status(404).json({ error: 'Holiday not found' });
    await writeAuditLog(req.user.id, 'holiday.delete', 'holiday', id, null, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.importExcel = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const ExcelJS = require('exceljs');

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) return res.status(400).json({ error: 'Empty workbook' });

    const results = { imported: 0, failed: 0, errors: [] };
    const validTypes = ['Public', 'Company', 'Optional'];

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const name = row.getCell(1).text?.trim();
      const dateRaw = row.getCell(2).value;
      const type = row.getCell(3).text?.trim();

      if (!name && !dateRaw && !type) continue; // skip empty rows

      // Validate name
      if (!name) {
        results.failed++;
        results.errors.push({ row: rowNum, error: 'Holiday Name is required' });
        continue;
      }

      // Parse date
      let parsedDate;
      if (dateRaw instanceof Date) {
        parsedDate = dateRaw;
      } else if (typeof dateRaw === 'string') {
        // Try DD/MM/YYYY
        const parts = dateRaw.split('/');
        if (parts.length === 3) {
          parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
        } else {
          parsedDate = new Date(dateRaw);
        }
      }
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        results.failed++;
        results.errors.push({ row: rowNum, error: `Invalid date: "${dateRaw}"` });
        continue;
      }

      // Validate type
      if (!type || !validTypes.includes(type)) {
        results.failed++;
        results.errors.push({ row: rowNum, error: `Invalid type: "${type}". Must be Public, Company, or Optional` });
        continue;
      }

      const dateStr = parsedDate.toISOString().split('T')[0];

      try {
        await db('holidays').insert({
          tenant_id: tenantId,
          name,
          date: dateStr,
          holiday_type: type,
          is_active: true,
          created_by: req.user.id,
        });
        results.imported++;
      } catch (err) {
        results.failed++;
        if (err?.code === '23505') {
          results.errors.push({ row: rowNum, error: `Duplicate date: ${dateStr}` });
        } else {
          results.errors.push({ row: rowNum, error: err.message || 'Insert failed' });
        }
      }
    }

    // Clean up uploaded file
    const fs = require('fs');
    fs.unlink(req.file.path, () => {});

    await writeAuditLog(req.user.id, 'holiday.import', 'holiday', null, { imported: results.imported, failed: results.failed }, req);
    return res.json(results);
  } catch (err) { next(err); }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { year } = req.query;
    const ExcelJS = require('exceljs');

    let q = db('holidays')
      .where({ tenant_id: tenantId, is_deleted: false, is_active: true })
      .orderBy('date', 'asc');

    if (year) q = q.whereRaw('EXTRACT(YEAR FROM date) = ?', [parseInt(year)]);

    const holidays = await q;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Holidays');

    sheet.columns = [
      { header: 'Holiday Name', key: 'name', width: 30 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Day', key: 'day', width: 12 },
      { header: 'Type', key: 'type', width: 12 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003264' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    holidays.forEach(h => {
      const d = new Date(h.date);
      sheet.addRow({
        name: h.name,
        date: d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        day: dayNames[d.getDay()],
        type: h.holiday_type,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="holidays_${year || 'all'}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

exports.downloadTemplate = async (_req, res, next) => {
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Holidays');

    sheet.columns = [
      { header: 'Holiday Name', key: 'name', width: 30 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Type', key: 'type', width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003264' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add example row
    sheet.addRow({ name: 'Republic Day', date: '26/01/2026', type: 'Public' });

    // Add data validation for Type column
    for (let i = 2; i <= 100; i++) {
      sheet.getCell(`C${i}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"Public,Company,Optional"'],
      };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="holiday_import_template.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};
