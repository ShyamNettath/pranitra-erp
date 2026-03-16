const router = require('express').Router();
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { syncAllEmployees, decrypt } = require('../services/zohoService');

// All zoho endpoints require authentication + admin/super_user
router.use(authenticate);

// Sensitive financial fields — only super_user can see these
const SENSITIVE_FIELDS = [
  'aadhaar', 'pan', 'bank_account_number',
];

// Fields to strip for non-super_user roles
const FINANCIAL_FIELDS = [
  'aadhaar', 'pan', 'uan', 'existing_bank_account',
  'bank_name', 'bank_account_number', 'ifsc_code',
  'account_holder_name', 'payment_mode', 'account_type',
  'do_you_have_uan',
];

// ── GET /api/zoho/employees ──────────────────────────────────────
router.get('/employees', requireRole('super_user', 'admin'), async (req, res, next) => {
  try {
    const isSuperUser = req.user.roles.includes('super_user');
    const { search, status, department, page = 1, limit = 50 } = req.query;

    let query = db('hr_employees').orderBy('full_name');

    if (search) {
      query = query.where(function () {
        this.whereILike('full_name', `%${search}%`)
            .orWhereILike('employee_id', `%${search}%`)
            .orWhereILike('email', `%${search}%`)
            .orWhereILike('department', `%${search}%`);
      });
    }
    if (status) query = query.where('employee_status', status);
    if (department) query = query.where('department', department);

    const offset = (Number(page) - 1) * Number(limit);
    const [{ count }] = await db('hr_employees').count('* as count').modify((qb) => {
      if (search) {
        qb.where(function () {
          this.whereILike('full_name', `%${search}%`)
              .orWhereILike('employee_id', `%${search}%`)
              .orWhereILike('email', `%${search}%`)
              .orWhereILike('department', `%${search}%`);
        });
      }
      if (status) qb.where('employee_status', status);
      if (department) qb.where('department', department);
    });
    const rows = await query.offset(offset).limit(Number(limit));

    const employees = rows.map(emp => {
      // Decrypt sensitive fields for super_user
      if (isSuperUser) {
        for (const f of SENSITIVE_FIELDS) {
          if (emp[f]) emp[f] = decrypt(emp[f]);
        }
      } else {
        // Strip all financial fields for non-super_user
        for (const f of FINANCIAL_FIELDS) {
          delete emp[f];
        }
      }
      return emp;
    });

    res.json({ employees, total: Number(count), page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
});

// ── GET /api/zoho/employees/:id ──────────────────────────────────
router.get('/employees/:id', requireRole('super_user', 'admin'), async (req, res, next) => {
  try {
    const isSuperUser = req.user.roles.includes('super_user');
    const emp = await db('hr_employees').where({ id: req.params.id }).first();
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    if (isSuperUser) {
      for (const f of SENSITIVE_FIELDS) {
        if (emp[f]) emp[f] = decrypt(emp[f]);
      }
    } else {
      for (const f of FINANCIAL_FIELDS) {
        delete emp[f];
      }
    }

    res.json(emp);
  } catch (err) { next(err); }
});

// ── POST /api/zoho/sync ─────────────────────────────────────────
router.post('/sync', requireRole('super_user'), async (req, res, next) => {
  try {
    const result = await syncAllEmployees();
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});

// ── GET /api/zoho/sync-status ────────────────────────────────────
router.get('/sync-status', requireRole('super_user', 'admin'), async (req, res, next) => {
  try {
    const setting = await db('system_settings').where({ key: 'zoho_last_sync' }).first();
    const count = await db('hr_employees').count('* as count').first();
    res.json({
      last_sync: setting?.value || null,
      total_employees: Number(count?.count || 0),
    });
  } catch (err) { next(err); }
});

// ── GET /api/zoho/departments ────────────────────────────────────
router.get('/departments', requireRole('super_user', 'admin'), async (req, res, next) => {
  try {
    const rows = await db('hr_employees')
      .distinct('department')
      .whereNotNull('department')
      .orderBy('department');
    res.json(rows.map(r => r.department));
  } catch (err) { next(err); }
});

module.exports = router;
