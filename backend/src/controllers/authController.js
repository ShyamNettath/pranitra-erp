const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { validationResult } = require('express-validator');
const db      = require('../config/db');
const logger  = require('../config/logger');
const { sendOtpEmail } = require('../services/emailService');
const { writeAuditLog } = require('../utils/audit');

// ── helpers ──────────────────────────────────────────────────────
function makeAccessToken(userId, roles, workspaceId) {
  return jwt.sign(
    { sub: userId, roles, ws: workspaceId || null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
}

function makeRefreshToken(userId) {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getSetting(key, fallback) {
  const row = await db('system_settings').where({ key }).first();
  return row ? row.value : fallback;
}

// ── POST /api/auth/login ──────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { email, password } = req.body;

    const user = await db('users').where({ email, is_active: true, is_deleted: false }).first();
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    // Generate & store OTP
    const otp = generateOtp();
    const expiryMinutes = parseInt(await getSetting('otp_expiry_minutes', '10'));
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Invalidate old codes
    await db('otp_codes').where({ user_id: user.id, used: false }).update({ used: true });

    await db('otp_codes').insert({
      user_id: user.id,
      code: otp,
      expires_at: expiresAt,
    });

    // Send OTP email (fire-and-forget in prod; await in dev for easier debugging)
    try {
      await sendOtpEmail(user.email, user.name, otp);
    } catch (emailErr) {
      logger.error('OTP email failed:', emailErr.message);
    }

    await writeAuditLog(user.id, 'auth.otp_sent', 'user', user.id, null, req);

    return res.json({
      step: 'otp',
      user_id: user.id,
      email_hint: email.replace(/(.{2}).+(@.+)/, '$1***$2'),
    });
  } catch (err) { next(err); }
};

// ── POST /api/auth/verify-otp ─────────────────────────────────────
exports.verifyOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { user_id, otp } = req.body;
    const maxAttempts = parseInt(await getSetting('otp_max_attempts', '3'));

    const record = await db('otp_codes')
      .where({ user_id, used: false })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();

    if (!record) return res.status(401).json({ error: 'OTP expired or not found. Please log in again.' });

    if (record.attempts >= maxAttempts) {
      return res.status(429).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    if (record.code !== otp) {
      await db('otp_codes').where({ id: record.id }).increment('attempts', 1);
      return res.status(401).json({
        error: 'Invalid OTP',
        remaining: maxAttempts - record.attempts - 1,
      });
    }

    // Mark used
    await db('otp_codes').where({ id: record.id }).update({ used: true });

    // Update last login
    await db('users').where({ id: user_id }).update({ last_login: new Date() });

    const user  = await db('users').where({ id: user_id }).first();
    const roles = (await db('user_roles').where({ user_id }).select('role')).map((r) => r.role);

    // Get workspaces this user belongs to
    const workspaces = await db('workspace_members as wm')
      .join('workspaces as w', 'w.id', 'wm.workspace_id')
      .where({ 'wm.user_id': user_id, 'wm.is_active': true, 'w.is_active': true })
      .select('w.id', 'w.name', 'w.slug', 'w.color');

    // Issue a pre-workspace token (no ws claim yet)
    const accessToken = makeAccessToken(user_id, roles, null);

    await writeAuditLog(user_id, 'auth.login', 'user', user_id, null, req);

    return res.json({
      step: workspaces.length === 1 ? 'workspace_auto' : 'workspace_select',
      access_token: accessToken,
      user: { id: user.id, name: user.name, email: user.email, roles },
      workspaces,
    });
  } catch (err) { next(err); }
};

// ── POST /api/auth/resend-otp ─────────────────────────────────────
exports.resendOtp = async (req, res, next) => {
  try {
    const { user_id } = req.body;
    const user = await db('users').where({ id: user_id, is_active: true }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = generateOtp();
    const expiryMinutes = parseInt(await getSetting('otp_expiry_minutes', '10'));
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await db('otp_codes').where({ user_id, used: false }).update({ used: true });
    await db('otp_codes').insert({ user_id, code: otp, expires_at: expiresAt });

    await sendOtpEmail(user.email, user.name, otp).catch((e) => logger.error(e));

    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── POST /api/auth/select-workspace ──────────────────────────────
exports.selectWorkspace = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { workspace_id } = req.body;
    const userId = req.user.id;

    // Admins/Directors can access any workspace
    if (!req.user.roles.includes('admin') && !req.user.roles.includes('director')) {
      const member = await db('workspace_members')
        .where({ workspace_id, user_id: userId, is_active: true })
        .first();
      if (!member) return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    const ws = await db('workspaces').where({ id: workspace_id, is_active: true }).first();
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const roles = req.user.roles;
    const accessToken  = makeAccessToken(userId, roles, workspace_id);
    const refreshToken = makeRefreshToken(userId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db('refresh_tokens').insert({
      user_id: userId,
      token: refreshToken,
      expires_at: expiresAt,
      device_info: req.headers['user-agent'] || null,
    });

    return res.json({
      access_token:  accessToken,
      refresh_token: refreshToken,
      workspace: { id: ws.id, name: ws.name, slug: ws.slug, color: ws.color },
    });
  } catch (err) { next(err); }
};

// ── POST /api/auth/refresh ────────────────────────────────────────
exports.refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'Refresh token required' });

    let payload;
    try {
      payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const record = await db('refresh_tokens')
      .where({ token: refresh_token, revoked: false })
      .where('expires_at', '>', new Date())
      .first();
    if (!record) return res.status(401).json({ error: 'Refresh token revoked or expired' });

    const user  = await db('users').where({ id: payload.sub, is_active: true }).first();
    const roles = (await db('user_roles').where({ user_id: payload.sub }).select('role')).map((r) => r.role);

    const accessToken = makeAccessToken(user.id, roles, null);
    return res.json({ access_token: accessToken });
  } catch (err) { next(err); }
};

// ── POST /api/auth/logout ─────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      await db('refresh_tokens').where({ token: refresh_token }).update({ revoked: true });
    }
    await writeAuditLog(req.user.id, 'auth.logout', 'user', req.user.id, null, req);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── GET /api/auth/me ──────────────────────────────────────────────
exports.me = async (req, res) => {
  const workspaces = await db('workspace_members as wm')
    .join('workspaces as w', 'w.id', 'wm.workspace_id')
    .where({ 'wm.user_id': req.user.id, 'wm.is_active': true, 'w.is_active': true })
    .select('w.id', 'w.name', 'w.slug', 'w.color');
  return res.json({ ...req.user, workspaces });
};

// ── POST /api/auth/forgot-password ───────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await db('users').where({ email, is_active: true }).first();
    // Always respond OK to avoid user enumeration
    if (!user) return res.json({ ok: true });
    // In production: generate a secure reset token, store it, send email
    // For now: stub
    logger.info(`Password reset requested for ${email}`);
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.resetPassword = async (_req, res) => res.json({ ok: true }); // stub
