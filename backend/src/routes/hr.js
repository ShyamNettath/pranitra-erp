const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const db = require('../config/db');

function formatPhone(raw) {
  if (!raw) return raw;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0'))  digits = digits.slice(1);
  if (digits.length !== 10) return raw;
  return `+91 ${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
}

// GET /api/hr/emergency-contacts — all authenticated users
router.get('/emergency-contacts', authenticate, async (_req, res, next) => {
  try {
    const contacts = await db('emergency_contacts')
      .where({ is_active: true })
      .orderBy('display_order', 'asc');

    const result = await Promise.all(contacts.map(async (c) => {
      if (c.contact_type === 'internal' && c.user_id) {
        const user = await db('users').where({ id: c.user_id }).first();
        if (user) {
          const emp = await db('hr_employees').where({ email: user.email }).first();
          const phone = emp?.personal_mobile || emp?.work_phone || c.phone;
          return { ...c, name: user.name, phone };
        }
      }
      return c;
    }));

    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/hr/emergency-contacts — HR and Admin only
router.post('/emergency-contacts', authenticate, requireRole('admin', 'super_user', 'hr'), async (req, res, next) => {
  try {
    const { name, role, phone, display_order, is_active, contact_type, user_id } = req.body;
    if (!name || !role || !phone) {
      return res.status(400).json({ error: 'Name, role, and phone are required' });
    }
    const [contact] = await db('emergency_contacts')
      .insert({
        name,
        role,
        phone: formatPhone(phone),
        display_order: display_order || 0,
        is_active: is_active !== false,
        contact_type: contact_type || 'external',
        user_id: user_id || null,
      })
      .returning('*');
    res.status(201).json(contact);
  } catch (err) { next(err); }
});

// PUT /api/hr/emergency-contacts/:id — HR and Admin only
router.put('/emergency-contacts/:id', authenticate, requireRole('admin', 'super_user', 'hr'), async (req, res, next) => {
  try {
    const { name, role, phone, display_order, is_active, contact_type, user_id } = req.body;
    const [updated] = await db('emergency_contacts')
      .where({ id: req.params.id })
      .update({ name, role, phone: formatPhone(phone), display_order, is_active, contact_type, user_id: user_id || null })
      .returning('*');
    if (!updated) return res.status(404).json({ error: 'Contact not found' });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/hr/emergency-contacts/:id — HR and Admin only
router.delete('/emergency-contacts/:id', authenticate, requireRole('admin', 'super_user', 'hr'), async (req, res, next) => {
  try {
    const deleted = await db('emergency_contacts').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ error: 'Contact not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
