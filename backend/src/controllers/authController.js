const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendOtpEmail } = require('../services/emailService');
const { writeAuditLog } = require('../utils/audit');

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateTokens(user) {
  const payload = { id: user.id, email: user.email, roles: user.roles };
  const access = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' });
  const refresh = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' });
  return { access, refresh };
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(422).json({ error: 'Email and password required' });

    const user = await db('users').where({ email: email.toLowerCase(), is_deleted: false }).first();
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Get user roles
    const roleRows = await db('user_roles').where({ user_id: user.id });
    user.roles = roleRows.map(r => r.role);

    // Check if OTP is enabled
    const otpSetting = await db('system_settings').where({ key: 'otp_enabled' }).first();
    const otpEnabled = otpSetting?.value === 'true';

    if (!otpEnabled) {
      // Skip OTP — issue tokens directly
      const tokens = generateTokens(user);
      await db('refresh_tokens').insert({ user_id: user.id, token: tokens.refresh, expires_at: new Date(Date.now() + 7*24*60*60*1000) });
      await writeAuditLog(user.id, 'auth.login', 'user', user.id, { email }, req);
      return res.json({ step: 'complete', access_token: tokens.access, refresh_token: tokens.refresh, user: { id: user.id, name: user.name, email: user.email, roles: user.roles } });
    }

    // OTP enabled — generate and send OTP
    const code = generateOtp();
    const expires_at = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES || 10)) * 60 * 1000);
    await db('otp_codes').insert({ user_id: user.id, code, expires_at });

    await sendOtpEmail(user.email, user.name, code).catch(e => {
      console.error('OTP email failed:', e.message);
    });

    return res.json({ step: 'otp', user_id: user.id });
  } catch (err) { next(err); }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { user_id, code } = req.body;
    if (!user_id || !code) return res.status(422).json({ error: 'user_id and code required' });

    const otp = await db('otp_codes')
      .where({ user_id, code, used: false })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();

    if (!otp) return res.status(401).json({ error: 'Invalid or expired OTP' });

    await db('otp_codes').where({ id: otp.id }).update({ used: true });

    const user = await db('users').where({ id: user_id }).first();
    const roleRows = await db('user_roles').where({ user_id });
    user.roles = roleRows.map(r => r.role);

    const tokens = generateTokens(user);
    await db('refresh_tokens').insert({ user_id: user.id, token: tokens.refresh, expires_at: new Date(Date.now() + 7*24*60*60*1000) });
    await writeAuditLog(user.id, 'auth.login', 'user', user.id, {}, req);

    return res.json({ step: 'complete', access_token: tokens.access, refresh_token: tokens.refresh, user: { id: user.id, name: user.name, email: user.email, roles: user.roles } });
  } catch (err) { next(err); }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const { user_id } = req.body;
    const user = await db('users').where({ id: user_id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const code = generateOtp();
    const expires_at = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES || 10)) * 60 * 1000);
    await db('otp_codes').insert({ user_id, code, expires_at });

    await sendOtpEmail(user.email, user.name, code).catch(e => {
      console.error('OTP email failed:', e.message);
    });

    return res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.selectWorkspace = async (req, res, next) => {
  try {
    const { workspace_id } = req.body;
    const member = await db('workspace_members').where({ user_id: req.user.id, workspace_id, is_active: true }).first();
    if (!member) return res.status(403).json({ error: 'Not a member of this workspace' });
    const workspace = await db('workspaces').where({ id: workspace_id }).first();
    return res.json({ workspace });
  } catch (err) { next(err); }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(422).json({ error: 'refresh_token required' });
    const stored = await db('refresh_tokens').where({ token: refresh_token }).first();
    if (!stored || new Date(stored.expires_at) < new Date()) return res.status(401).json({ error: 'Invalid refresh token' });
    const payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    const user = await db('users').where({ id: payload.id }).first();
    const roleRows = await db('user_roles').where({ user_id: user.id });
    user.roles = roleRows.map(r => r.role);
    const tokens = generateTokens(user);
    await db('refresh_tokens').where({ token: refresh_token }).delete();
    await db('refresh_tokens').insert({ user_id: user.id, token: tokens.refresh, expires_at: new Date(Date.now() + 7*24*60*60*1000) });
    return res.json({ access_token: tokens.access, refresh_token: tokens.refresh });
  } catch (err) { next(err); }
};

exports.logout = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) await db('refresh_tokens').where({ token: refresh_token }).delete();
    return res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    const user = await db('users').where({ id: req.user.id }).first();
    const roleRows = await db('user_roles').where({ user_id: req.user.id });
    user.roles = roleRows.map(r => r.role);
    const workspaces = await db('workspace_members as wm')
      .join('workspaces as w', 'w.id', 'wm.workspace_id')
      .where({ 'wm.user_id': req.user.id, 'wm.is_active': true })
      .select('w.id', 'w.name', 'w.slug');
    delete user.password_hash;
    return res.json({ ...user, workspaces });
  } catch (err) { next(err); }
};
ENDOFFILE