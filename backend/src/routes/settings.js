const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

const uploadsDir = path.join(__dirname, '../../uploads/branding');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpeg|jpg)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG or JPG images are allowed'));
  },
});

// GET /api/settings/branding — public, no auth
router.get('/branding', async (_req, res, next) => {
  try {
    const logoRow = await db('system_settings').where({ key: 'branding_logo' }).first();
    const nameRow = await db('system_settings').where({ key: 'branding_company_name' }).first();
    return res.json({
      logo_url: logoRow?.value || null,
      company_name: nameRow?.value || null,
    });
  } catch (err) { next(err); }
});

// POST /api/settings/branding — admin only
router.post('/branding', authenticate, requireRole('admin'), upload.single('logo'), async (req, res, next) => {
  try {
    const { company_name } = req.body;

    if (req.file) {
      const logoUrl = `/uploads/branding/${req.file.filename}`;
      const existing = await db('system_settings').where({ key: 'branding_logo' }).first();
      if (existing) {
        await db('system_settings').where({ key: 'branding_logo' }).update({ value: logoUrl });
      } else {
        await db('system_settings').insert({ key: 'branding_logo', value: logoUrl });
      }
    }

    if (company_name !== undefined) {
      const existing = await db('system_settings').where({ key: 'branding_company_name' }).first();
      if (existing) {
        await db('system_settings').where({ key: 'branding_company_name' }).update({ value: company_name });
      } else {
        await db('system_settings').insert({ key: 'branding_company_name', value: company_name });
      }
    }

    const logoRow = await db('system_settings').where({ key: 'branding_logo' }).first();
    const nameRow = await db('system_settings').where({ key: 'branding_company_name' }).first();
    return res.json({
      ok: true,
      logo_url: logoRow?.value || null,
      company_name: nameRow?.value || null,
    });
  } catch (err) { next(err); }
});

module.exports = router;
