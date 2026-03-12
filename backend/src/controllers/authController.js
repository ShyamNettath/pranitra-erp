const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendOtpEmail } = require('../services/emailService');
const { writeAuditLog } = require('../utils/audit');
 
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
 
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
 
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(422).json({ error: 'Email and password required' });
 
    const user = await db('users').where({ email: email.toLowerCase(), is_active: true, is_deleted: false }).first();
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
 
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
 
    const roleRows = await db('user_roles').where({ user_id: user.id });
    const roles = roleRows.map(r => r.role);
 
    const otpSetting = await db('system_settings').where({ key: 'otp_enabled' }).first();
    const otpEnabled = otpSetting?.value === 'true';
 
    if (!otpEnabled) {
      const workspaces = await db('workspace_members as wm')
        .join('workspaces as w', 'w.id', 'wm.workspace_id')
        .where({ 'wm.user_id': user.id, 'wm.is_active': true, 'w.is_active': true })
        .select('w.id', 'w.name', 'w.slug', 'w.color');
 
      const accessToken = makeAccessToken(user.id, roles, null);
      const refreshToken = makeRefreshToken(user.id);
 
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await db('refresh_tokens').insert({
        user_id: user.id,
        token: refreshToken,
        expires_at: expiresAt,
        revoked: false,
        device_info: req.headers['user-agent'] || null,
      });
 
      await db('users').where({ id: user.id }).update({ last_login: new Date() });
      await writeAuditLog(user.id, 'auth.login', 'user', user.id, { email }, req);
 
      return res.json({
        step: 'complete',
        access_token: accessToken,
        refresh_token: refreshToken,
        user: { id: user.id, name: user.name, email: user.email, roles },
        workspaces,
      });
    }
 
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db('otp_codes').where({ user_id: user.id, used: false }).update({ used: true });
    await db('otp_codes').insert({ user_id: user.id, code, expires_at: expiresAt });
    await sendOtpEmail(user.email, user.name, code).catch(e => console.error('OTP email failed:', e.message));
 
    return res.json({ step: 'otp', user_id: user.id });
  } catch (err) { next(err); }
};
 
exports.verifyOtp = async (req, res, next) => {
  try {
    const { user_id, code } = req.body;
    if (!user_id || !code) return res.status(422).json({ error: 'user_id and code required' });
 
    const record = await db('otp_codes')
      .where({ user_id, code, used: false })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();
 
    if (!record) return res.status(401).json({ error: 'Invalid or expired OTP' });
    await db('otp_codes').where({ id: record.id }).update({ used: true });
    await db('users').where({ id: user_id }).update({ last_login: new Date() });
 
    const user = await db('users').where({ id: user_id }).first();
    const roles = (await db('user_roles').where({ user_id }).select('role')).map(r => r.role);
    const workspaces = await db('workspace_members as wm')
      .join('workspaces as w', 'w.id', 'wm.workspace_id')
      .where({ 'wm.user_id': user_id, 'wm.is_active': true, 'w.is_active': true })
      .select('w.id', 'w.name', 'w.slug', 'w.color');
 
    const accessToken = makeAccessToken(user_id, roles, null);
    const refreshToken = makeRefreshToken(user_id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db('refresh_tokens').insert({ user_id, token: refreshToken, expires_at: expiresAt, revoked: false, device_info: req.headers['user-agent'] || null });
    await writeAuditLog(user_id, 'auth.login', 'user', user_id, {}, req);
 
    return res.json({ step: 'complete', access_token: accessToken, refresh_token: refreshToken, user: { id: user.id, name: user.name, email: user.email, roles }, workspaces });
  } catch (err) { next(err); }
};
 
exports.resendOtp = async (req, res, next) => {
  try {
    const { user_id } = req.body;
    const user = await db('users').where({ id: user_id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db('otp_codes').where({ user_id, used: false }).update({ used: true });
    await db('otp_codes').insert({ user_id, code, expires_at: expiresAt });
    await sendOtpEmail(user.email, user.name, code).catch(e => console.error(e.message));
    return res.json({ ok: true });
  } catch (err) { next(err); }
};
 
exports.selectWorkspace = async (req, res, next) => {
  try {
    const { workspace_id } = req.body;
    const userId = req.user.sub || req.user.id;
    const ws = await db('workspaces').where({ id: workspace_id, is_active: true }).first();
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });
    const roles = req.user.roles;
    const accessToken = makeAccessToken(userId, roles, workspace_id);
    const refreshToken = makeRefreshToken(userId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db('refresh_tokens').insert({ user_id: userId, token: refreshToken, expires_at: expiresAt, revoked: false, device_info: req.headers['user-agent'] || null });
    return res.json({ access_token: accessToken, refresh_token: refreshToken, workspace: { id: ws.id, name: ws.name, slug: ws.slug, color: ws.color } });
  } catch (err) { next(err); }
};
 
exports.refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'Refresh token required' });
    let payload;
    try { payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET); } catch { return res.status(401).json({ error: 'Invalid refresh token' }); }
    const record = await db('refresh_tokens').where({ token: refresh_token, revoked: false }).where('expires_at', '>', new Date()).first();
    if (!record) return res.status(401).json({ error: 'Refresh token revoked or expired' });
    const user = await db('users').where({ id: payload.sub, is_active: true }).first();
    const roles = (await db('user_roles').where({ user_id: payload.sub }).select('role')).map(r => r.role);
    const accessToken = makeAccessToken(user.id, roles, null);
    return res.json({ access_token: accessToken });
  } catch (err) { next(err); }
};
 
exports.logout = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) await db('refresh_tokens').where({ token: refresh_token }).update({ revoked: true });
    return res.json({ ok: true });
  } catch (err) { next(err); }
};
 
exports.me = async (req, res) => {
  const userId = req.user.sub || req.user.id;
  const user = await db('users').where({ id: userId }).first();
  const roles = req.user.roles;
  const workspaces = await db('workspace_members as wm')
    .join('workspaces as w', 'w.id', 'wm.workspace_id')
    .where({ 'wm.user_id': userId, 'wm.is_active': true, 'w.is_active': true })
    .select('w.id', 'w.name', 'w.slug', 'w.color');
  delete user.password_hash;
  return res.json({ ...user, roles, workspaces });
};
 
exports.forgotPassword = async (req, res) => res.json({ ok: true });
exports.resetPassword = async (req, res) => res.json({ ok: true });
 