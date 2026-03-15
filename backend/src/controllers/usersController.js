const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const ExcelJS = require('exceljs');
const db = require('../config/db');
const { writeAuditLog } = require('../utils/audit');
const { sendEmail } = require('../services/emailService');

const VALID_ROLES = ['admin', 'director', 'project_manager', 'team_member', 'client'];
const VALID_LOCATIONS = ['Bangalore', 'Gulbarga', 'Coimbatore'];

// GET /api/users
exports.list = async (req, res, next) => {
  try {
    const { workspace_id, role, search, active } = req.query;
    let q = db('users as u')
      .leftJoin('user_roles as ur', 'ur.user_id', 'u.id')
      .where('u.is_deleted', false)
      .select(
        'u.id', 'u.email', 'u.name', 'u.job_title', 'u.department', 'u.is_active', 'u.last_login', 'u.created_at',
        'u.employee_id', 'u.designation', 'u.location', 'u.team', 'u.contact_number'
      )
      .groupBy('u.id')
      .select(db.raw("array_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles"));

    if (workspace_id) {
      q = q.join('workspace_members as wm', function () {
        this.on('wm.user_id', 'u.id').andOn('wm.workspace_id', db.raw('?', [workspace_id]));
      });
    }
    if (role) q = q.havingRaw('? = ANY(array_agg(ur.role))', [role]);
    if (search) q = q.where(function () { this.whereILike('u.name', `%${search}%`).orWhereILike('u.email', `%${search}%`); });
    if (active !== undefined) q = q.where('u.is_active', active === 'true');

    const users = await q.orderBy('u.name');
    return res.json(users);
  } catch (err) { next(err); }
};

// GET /api/users/:id
exports.get = async (req, res, next) => {
  try {
    const user = await db('users').where({ id: req.params.id, is_deleted: false }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const roles = (await db('user_roles').where({ user_id: req.params.id }).select('role')).map(r => r.role);
    const workspaces = await db('workspace_members as wm')
      .join('workspaces as w', 'w.id', 'wm.workspace_id')
      .where({ 'wm.user_id': req.params.id }).select('w.id', 'w.name', 'w.slug');
    const { password_hash, ...safe } = user;
    return res.json({ ...safe, roles, workspaces });
  } catch (err) { next(err); }
};

// POST /api/users
exports.create = async (req, res, next) => {
  try {
    const {
      email, name, job_title, department, roles = ['team_member'],
      employee_id, designation, location, team, contact_number,
    } = req.body;
    if (!email || !name) return res.status(422).json({ error: 'email and name required' });
    const existing = await db('users').where({ email }).first();
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const tempPassword = crypto.randomBytes(5).toString('hex');
    const hash = await bcrypt.hash(tempPassword, 12);
    const [user] = await db('users').insert({
      email, name, password_hash: hash, job_title, department, is_active: true, must_reset_password: true,
      employee_id: employee_id || null,
      designation: designation || null,
      location: location || null,
      team: team || null,
      contact_number: contact_number || null,
    }).returning('*');
    for (const role of roles) {
      await db('user_roles').insert({ user_id: user.id, role }).onConflict().ignore();
    }
    await writeAuditLog(req.user.id, 'user.create', 'user', user.id, { name, email, roles }, req);

    // Send welcome email with temporary credentials
    const loginUrl = 'https://erp.pranitra.com';
    await sendEmail({
      to: email,
      subject: 'Welcome to PRANITRA ERP - Your Login Details',
      html: `
        <div style="font-family:'Times New Roman',Times,serif;max-width:480px;margin:0 auto;padding:32px;">
          <div style="background:#003264;padding:16px 24px;border-radius:8px 8px 0 0;">
            <h1 style="color:#fff;font-size:18px;margin:0;">PRANITRA ERP</h1>
          </div>
          <div style="border:1px solid #D8DDE6;border-top:none;padding:28px 24px;border-radius:0 0 8px 8px;">
            <p style="color:#003264;font-size:15px;">Hello ${name},</p>
            <p style="color:#6B7A90;font-size:14px;">Your PRANITRA ERP account has been created. Here are your login details:</p>
            <table style="margin:20px 0;width:100%;">
              <tr><td style="color:#6B7A90;font-size:13px;padding:6px 0;">Email:</td><td style="color:#003264;font-size:13px;font-weight:700;padding:6px 0;">${email}</td></tr>
              <tr><td style="color:#6B7A90;font-size:13px;padding:6px 0;">Temporary Password:</td><td style="color:#003264;font-size:13px;font-weight:700;padding:6px 0;">${tempPassword}</td></tr>
              <tr><td style="color:#6B7A90;font-size:13px;padding:6px 0;">Login URL:</td><td style="padding:6px 0;"><a href="${loginUrl}" style="color:#003264;font-size:13px;font-weight:700;">${loginUrl}</a></td></tr>
            </table>
            <p style="color:#6B7A90;font-size:13px;font-weight:700;">You will be required to change your password on first login.</p>
            <hr style="border:none;border-top:1px solid #D8DDE6;margin:20px 0;">
            <p style="color:#B0BAC8;font-size:12px;">If you did not expect this email, please contact your IT Administrator.</p>
          </div>
        </div>`,
      text: `Hello ${name},\n\nYour PRANITRA ERP account has been created.\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\nLogin URL: ${loginUrl}\n\nYou will be required to change your password on first login.`,
    }).catch(e => console.error('Welcome email failed:', e.message));

    const { password_hash: _ph, ...safe } = user;
    return res.status(201).json({ ...safe, roles });
  } catch (err) { next(err); }
};

// PUT /api/users/:id
exports.update = async (req, res, next) => {
  try {
    const { name, job_title, department, is_active, employee_id, designation, location, team, contact_number, roles } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (job_title !== undefined) updateData.job_title = job_title;
    if (department !== undefined) updateData.department = department;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (employee_id !== undefined) updateData.employee_id = employee_id || null;
    if (designation !== undefined) updateData.designation = designation || null;
    if (location !== undefined) updateData.location = location || null;
    if (team !== undefined) updateData.team = team || null;
    if (contact_number !== undefined) updateData.contact_number = contact_number || null;

    const [user] = await db('users').where({ id: req.params.id, is_deleted: false })
      .update(updateData).returning('*');
    if (!user) return res.status(404).json({ error: 'Not found' });

    // Update roles if provided
    if (Array.isArray(roles)) {
      await db('user_roles').where({ user_id: req.params.id }).delete();
      for (const role of roles) {
        await db('user_roles').insert({ user_id: req.params.id, role }).onConflict().ignore();
      }
    }

    await writeAuditLog(req.user.id, 'user.update', 'user', req.params.id, req.body, req);
    const { password_hash, ...safe } = user;
    const updatedRoles = (await db('user_roles').where({ user_id: req.params.id }).select('role')).map(r => r.role);
    return res.json({ ...safe, roles: updatedRoles });
  } catch (err) { next(err); }
};

// PUT /api/users/:id/roles
exports.updateRoles = async (req, res, next) => {
  try {
    const { roles } = req.body;
    if (!Array.isArray(roles)) return res.status(422).json({ error: 'roles must be array' });
    await db('user_roles').where({ user_id: req.params.id }).delete();
    for (const role of roles) {
      await db('user_roles').insert({ user_id: req.params.id, role }).onConflict().ignore();
    }
    await writeAuditLog(req.user.id, 'user.roles_updated', 'user', req.params.id, { roles }, req);
    return res.json({ ok: true, roles });
  } catch (err) { next(err); }
};

// POST /api/users/:id/deactivate
exports.deactivate = async (req, res, next) => {
  try {
    await db('users').where({ id: req.params.id }).update({ is_active: false });
    // Remove from all active projects
    await db('project_members').where({ user_id: req.params.id }).update({ is_active: false });
    await writeAuditLog(req.user.id, 'user.deactivate', 'user', req.params.id, null, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// POST /api/users/:id/reactivate
exports.reactivate = async (req, res, next) => {
  try {
    await db('users').where({ id: req.params.id }).update({ is_active: true });
    await writeAuditLog(req.user.id, 'user.reactivate', 'user', req.params.id, null, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// PUT /api/users/me/password
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await db('users').where({ id: req.user.id }).first();
    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await db('users').where({ id: req.user.id }).update({ password_hash: hash, must_reset_password: false });
    // Revoke all refresh tokens (force re-login)
    await db('refresh_tokens').where({ user_id: req.user.id }).update({ revoked: true });
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// DELETE /api/users/:id (soft delete)
exports.softDelete = async (req, res, next) => {
  try {
    await db('users').where({ id: req.params.id }).update({ is_deleted: true, is_active: false });
    await db('project_members').where({ user_id: req.params.id }).update({ is_active: false });
    await writeAuditLog(req.user.id, 'user.delete', 'user', req.params.id, null, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// GET /api/users/bulk-upload-template
exports.bulkUploadTemplate = async (_req, res, next) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Users');
    ws.columns = [
      { header: 'Employee ID', key: 'employee_id', width: 15 },
      { header: 'Full Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Location', key: 'location', width: 15 },
      { header: 'Team', key: 'team', width: 20 },
      { header: 'Contact Number', key: 'contact_number', width: 18 },
      { header: 'Role', key: 'role', width: 18 },
    ];
    // Style header row
    ws.getRow(1).font = { bold: true };
    // Sample row
    ws.addRow({
      employee_id: 'EMP001',
      name: 'John Doe',
      email: 'john.doe@company.com',
      designation: 'Senior Engineer',
      location: 'Bangalore',
      team: 'Design',
      contact_number: '9876543210',
      role: 'team_member',
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=user_upload_template.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

// POST /api/users/bulk-upload
exports.bulkUpload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(req.file.path);
    const ws = wb.worksheets[0];
    if (!ws) return res.status(400).json({ error: 'Empty workbook' });

    const created = [];
    const errors = [];
    const loginUrl = 'https://erp.pranitra.com';

    // Read header row to map columns
    const headerRow = ws.getRow(1);
    const colMap = {};
    headerRow.eachCell((cell, colNum) => {
      const val = String(cell.value || '').trim().toLowerCase();
      if (val.includes('employee')) colMap.employee_id = colNum;
      else if (val.includes('full name') || val === 'name') colMap.name = colNum;
      else if (val.includes('email')) colMap.email = colNum;
      else if (val.includes('designation')) colMap.designation = colNum;
      else if (val.includes('location')) colMap.location = colNum;
      else if (val === 'team') colMap.team = colNum;
      else if (val.includes('contact')) colMap.contact_number = colNum;
      else if (val.includes('role')) colMap.role = colNum;
    });

    for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
      const row = ws.getRow(rowNum);
      const getVal = (key) => {
        const col = colMap[key];
        if (!col) return '';
        const v = row.getCell(col).value;
        if (v && typeof v === 'object' && v.text) return String(v.text).trim();
        return v ? String(v).trim() : '';
      };

      const email = getVal('email');
      const name = getVal('name');
      const employee_id = getVal('employee_id');
      const designation = getVal('designation');
      const location = getVal('location');
      const team = getVal('team');
      const contact_number = getVal('contact_number');
      const role = getVal('role');

      // Skip completely empty rows
      if (!email && !name) continue;

      // Validate
      if (!email) { errors.push({ row: rowNum, reason: 'Email is required' }); continue; }
      if (!name) { errors.push({ row: rowNum, reason: 'Full Name is required' }); continue; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errors.push({ row: rowNum, reason: `Invalid email: ${email}` }); continue; }
      if (location && !VALID_LOCATIONS.includes(location)) { errors.push({ row: rowNum, reason: `Invalid location "${location}". Must be one of: ${VALID_LOCATIONS.join(', ')}` }); continue; }
      const userRole = role || 'team_member';
      if (!VALID_ROLES.includes(userRole)) { errors.push({ row: rowNum, reason: `Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}` }); continue; }

      // Check duplicate email in DB
      const existing = await db('users').where({ email }).first();
      if (existing) { errors.push({ row: rowNum, reason: `Email already exists: ${email}` }); continue; }

      // Check duplicate employee_id if provided
      if (employee_id) {
        const existingEmp = await db('users').where({ employee_id }).first();
        if (existingEmp) { errors.push({ row: rowNum, reason: `Employee ID already exists: ${employee_id}` }); continue; }
      }

      try {
        const tempPassword = crypto.randomBytes(5).toString('hex');
        const hash = await bcrypt.hash(tempPassword, 12);
        const [user] = await db('users').insert({
          email, name, password_hash: hash, is_active: true, must_reset_password: true,
          employee_id: employee_id || null,
          designation: designation || null,
          location: location || null,
          team: team || null,
          contact_number: contact_number || null,
        }).returning('*');

        await db('user_roles').insert({ user_id: user.id, role: userRole }).onConflict().ignore();

        // Send welcome email
        await sendEmail({
          to: email,
          subject: 'Welcome to PRANITRA ERP - Your Login Details',
          html: `
            <div style="font-family:'Times New Roman',Times,serif;max-width:480px;margin:0 auto;padding:32px;">
              <div style="background:#003264;padding:16px 24px;border-radius:8px 8px 0 0;">
                <h1 style="color:#fff;font-size:18px;margin:0;">PRANITRA ERP</h1>
              </div>
              <div style="border:1px solid #D8DDE6;border-top:none;padding:28px 24px;border-radius:0 0 8px 8px;">
                <p style="color:#003264;font-size:15px;">Hello ${name},</p>
                <p style="color:#6B7A90;font-size:14px;">Your PRANITRA ERP account has been created. Here are your login details:</p>
                <table style="margin:20px 0;width:100%;">
                  <tr><td style="color:#6B7A90;font-size:13px;padding:6px 0;">Email:</td><td style="color:#003264;font-size:13px;font-weight:700;padding:6px 0;">${email}</td></tr>
                  <tr><td style="color:#6B7A90;font-size:13px;padding:6px 0;">Temporary Password:</td><td style="color:#003264;font-size:13px;font-weight:700;padding:6px 0;">${tempPassword}</td></tr>
                  <tr><td style="color:#6B7A90;font-size:13px;padding:6px 0;">Login URL:</td><td style="padding:6px 0;"><a href="${loginUrl}" style="color:#003264;font-size:13px;font-weight:700;">${loginUrl}</a></td></tr>
                </table>
                <p style="color:#6B7A90;font-size:13px;font-weight:700;">You will be required to change your password on first login.</p>
                <hr style="border:none;border-top:1px solid #D8DDE6;margin:20px 0;">
                <p style="color:#B0BAC8;font-size:12px;">If you did not expect this email, please contact your IT Administrator.</p>
              </div>
            </div>`,
          text: `Hello ${name},\n\nYour PRANITRA ERP account has been created.\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\nLogin URL: ${loginUrl}\n\nYou will be required to change your password on first login.`,
        }).catch(e => console.error('Bulk welcome email failed:', e.message));

        created.push(user.id);
        await writeAuditLog(req.user.id, 'user.bulk_create', 'user', user.id, { name, email, role: userRole }, req);
      } catch (e) {
        errors.push({ row: rowNum, reason: e.message || 'Unknown error' });
      }
    }

    // Clean up uploaded file
    const fs = require('fs');
    fs.unlink(req.file.path, () => {});

    return res.json({ created: created.length, failed: errors.length, errors });
  } catch (err) { next(err); }
};
