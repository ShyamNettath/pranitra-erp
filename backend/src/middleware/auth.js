const jwt  = require('jsonwebtoken');
const db   = require('../config/db');

/**
 * Verify JWT access token.
 * Attaches req.user = { id, email, name, roles: [] }
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = header.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await db('users').where({ id: payload.sub, is_active: true, is_deleted: false }).first();
    if (!user) return res.status(401).json({ error: 'User not found or inactive' });

    const roleRows = await db('user_roles').where({ user_id: user.id }).select('role');
    req.user = {
      id:    user.id,
      email: user.email,
      name:  user.name,
      roles: roleRows.map((r) => r.role),
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role guard — pass one or more allowed roles.
 * Usage: requireRole('admin'), requireRole('director', 'project_manager')
 */
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    const hasRole = req.user.roles.some((r) => allowed.includes(r));
    if (!hasRole) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

/**
 * Workspace membership guard.
 * Expects :workspaceId param or req.body.workspace_id or req.query.workspace_id.
 * super_user bypasses all workspace checks.
 * Everyone else must be in workspace_members.
 */
async function requireWorkspaceMember(req, res, next) {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspace_id || req.query.workspace_id || req.query.workspaceId;
    if (!workspaceId) return next();  // skip if no workspace context

    // super_user can access any workspace
    if (req.user.roles.includes('super_user')) return next();

    const member = await db('workspace_members')
      .where({ workspace_id: workspaceId, user_id: req.user.id, is_active: true })
      .first();
    if (!member) return res.status(403).json({ error: 'Not a member of this workspace' });
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate, requireRole, requireWorkspaceMember };
