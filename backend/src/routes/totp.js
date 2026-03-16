const router = require('express').Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateSecret, verifyToken } = require('../services/totpService');
const jwt = require('jsonwebtoken');
const { writeAuditLog } = require('../utils/audit');

// ── POST /api/totp/setup ────────────────────────────────────────
// Generates a TOTP secret + QR code for the logged-in user.
// Saves the secret to DB but does NOT enable TOTP yet.
router.post('/setup', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const user = await db('users').where({ id: userId }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { secret, otpauthUrl, qrCodeDataUrl } = await generateSecret(user.email);

    await db('users').where({ id: userId }).update({ totp_secret: secret });

    return res.json({ otpauthUrl, qrCodeDataUrl });
  } catch (err) { next(err); }
});

// ── POST /api/totp/verify-setup ─────────────────────────────────
// Verifies a token during initial setup, then enables TOTP.
router.post('/verify-setup', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { token } = req.body;
    if (!token) return res.status(422).json({ error: 'Token required' });

    const user = await db('users').where({ id: userId }).first();
    if (!user || !user.totp_secret) return res.status(400).json({ error: 'TOTP not set up. Call /totp/setup first.' });

    const valid = verifyToken(user.totp_secret, token);
    if (!valid) return res.status(401).json({ error: 'Invalid code. Please try again.' });

    await db('users').where({ id: userId }).update({ totp_enabled: true });
    await writeAuditLog(userId, 'auth.totp_enabled', 'user', userId, {}, req);

    return res.json({ ok: true, message: 'MFA enabled successfully' });
  } catch (err) { next(err); }
});

// ── POST /api/totp/verify ───────────────────────────────────────
// Verifies a TOTP token during login flow (after email+password).
router.post('/verify', async (req, res, next) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(422).json({ error: 'userId and token required' });

    const user = await db('users').where({ id: userId, is_active: true, is_deleted: false }).first();
    if (!user || !user.totp_secret || !user.totp_enabled) {
      return res.status(400).json({ error: 'TOTP not enabled for this user' });
    }

    const valid = verifyToken(user.totp_secret, token);
    if (!valid) return res.status(401).json({ error: 'Invalid code. Please try again.' });

    // Issue JWT tokens (same logic as authController login completion)
    const roles = (await db('user_roles').where({ user_id: userId }).select('role')).map(r => r.role);
    // super_user sees all workspaces; everyone else sees only assigned
    let workspaces;
    if (roles.includes('super_user')) {
      workspaces = await db('workspaces').where({ is_active: true }).select('id', 'name', 'slug', 'color').orderBy('name');
    } else {
      workspaces = await db('workspace_members as wm')
        .join('workspaces as w', 'w.id', 'wm.workspace_id')
        .where({ 'wm.user_id': userId, 'wm.is_active': true, 'w.is_active': true })
        .select('w.id', 'w.name', 'w.slug', 'w.color').orderBy('w.name');
    }

    const accessToken = jwt.sign(
      { sub: userId, roles, ws: null },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );
    const refreshToken = jwt.sign(
      { sub: userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db('refresh_tokens').insert({
      user_id: userId,
      token: refreshToken,
      expires_at: expiresAt,
      revoked: false,
      device_info: req.headers['user-agent'] || null,
    });

    await db('users').where({ id: userId }).update({ last_login: new Date() });
    await writeAuditLog(userId, 'auth.login', 'user', userId, { mfa: 'totp' }, req);

    return res.json({
      step: 'complete',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, name: user.name, email: user.email, roles, must_reset_password: !!user.must_reset_password },
      workspaces,
    });
  } catch (err) { next(err); }
});

module.exports = router;
