const db = require('../config/db');

async function writeAuditLog(userId, action, entityType, entityId, payload, req) {
  try {
    await db('audit_logs').insert({
      user_id:     userId || null,
      action,
      entity_type: entityType || null,
      entity_id:   entityId   || null,
      payload:     payload ? JSON.stringify(payload) : null,
      ip_address:  req ? (req.ip || req.headers['x-forwarded-for'] || null) : null,
    });
  } catch {
    // Audit log must never break main flow
  }
}

module.exports = { writeAuditLog };
