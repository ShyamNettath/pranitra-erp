/**
 * PRANITRA PM Tool — Database Seeds
 * Run: node src/config/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');
const logger = require('./logger');

async function seed() {
  logger.info('Seeding database...');

  // ── Default workspace ────────────────────────────────────────
  const [ws] = await db('workspaces')
    .insert({ name: 'Engineering Division', slug: 'engineering', color: '#003264' })
    .onConflict('slug').ignore()
    .returning('id');

  // ── Admin user ───────────────────────────────────────────────
  const hash = await bcrypt.hash('Admin@1234', 12);
  const [admin] = await db('users')
    .insert({ email: 'admin@pranitra.com', name: 'IT Manager', password_hash: hash, job_title: 'System Administrator' })
    .onConflict('email').ignore()
    .returning('id');

  if (admin) {
    await db('user_roles').insert({ user_id: admin.id, role: 'admin' }).onConflict().ignore();
    if (ws) {
      await db('workspace_members').insert({ workspace_id: ws.id, user_id: admin.id }).onConflict().ignore();
    }
  }

  // ── Default LOP sections (per workspace)
  const defaultLopSections = [
    'Timeline','Budget','Scope','Design','Simulation','Planning','Layout','QC','Resource','Risk','Client','General'
  ];
  for (const section of defaultLopSections) {
    await db('lop_sections').insert({ tenant_id: ws.id, name: section, description: `${section} issues`, is_active: true }).onConflict(['tenant_id','name']).ignore();
  }

  // ── System settings ──────────────────────────────────────────
  const settings = [
    { key: 'session_timeout_minutes',   value: '30',    description: 'Auto-logout after N minutes of inactivity' },
    { key: 'otp_expiry_minutes',        value: '10',    description: 'OTP validity duration' },
    { key: 'otp_max_attempts',          value: '3',     description: 'Max failed OTP attempts before lockout' },
    { key: 'jwt_access_expiry',         value: '15m',   description: 'JWT access token lifetime' },
    { key: 'jwt_refresh_expiry',        value: '7d',    description: 'JWT refresh token lifetime' },
    { key: 'recycle_bin_days',          value: '30',    description: 'Days before soft-deleted items are purged' },
    { key: 'zoho_sync_interval_hours',  value: '24',    description: 'How often to sync from Zoho People' },
    { key: 'project_inactivity_days',   value: '90',    description: 'Days before auto-removal from project' },
    // Complexity defaults (hours)
    { key: 'complexity_simple_hours',   value: '12',    description: 'Baseline hours for Simple units' },
    { key: 'complexity_medium_hours',   value: '16',    description: 'Baseline hours for Medium units' },
    { key: 'complexity_complex_hours',  value: '24',    description: 'Baseline hours for Complex units' },
    { key: 'qc_default_pct',            value: '10',    description: 'Default QC % of sub-category effort' },
    // Branding
    { key: 'company_name',              value: 'PRANITRA', description: 'Company name shown in UI' },
    { key: 'app_name',                  value: 'PRANITRA PM', description: 'Application name' },
  ];
  for (const s of settings) {
    await db('system_settings').insert(s).onConflict('key').merge({ value: s.value });
  }

  // ── Simulation robot categories ──────────────────────────────
  const robotCats = [
    { name: 'Joining',          baseline_hours: 45, stage_count: 3, stage_splits: JSON.stringify([25, 35, 40]), qc_pct: 10 },
    { name: 'Handling',         baseline_hours: 0,  stage_count: 3, stage_splits: JSON.stringify([25, 35, 40]), qc_pct: 10 },
    { name: 'Handling+Joining', baseline_hours: 0,  stage_count: 3, stage_splits: JSON.stringify([25, 35, 40]), qc_pct: 10 },
  ];
  for (const rc of robotCats) {
    await db('simulation_robot_categories').insert(rc).onConflict('name').ignore();
  }

  // ── Report visibility defaults ───────────────────────────────
  // Format: { report_key, roles_that_can_see[] }
  const reportDefs = [
    { key: 'project_performance', roles: ['admin', 'director', 'project_manager'] },
    { key: 'effort_variance',     roles: ['admin', 'director', 'project_manager'] },
    { key: 'schedule_variance',   roles: ['admin', 'director', 'project_manager'] },
    { key: 'budget_variance',     roles: ['admin', 'director'] },
    { key: 'rework_analysis',     roles: ['admin', 'director', 'project_manager'] },
    { key: 'escalations_log',     roles: ['admin', 'director', 'project_manager'] },
    { key: 'associate_productivity', roles: ['admin', 'director', 'project_manager'] },
    { key: 'rework_hours',        roles: ['admin', 'director', 'project_manager'] },
    { key: 'efficiency_analysis', roles: ['admin', 'director', 'project_manager'] },
    { key: 'idle_time',           roles: ['admin', 'director'] },
    { key: 'lessons_learned',     roles: ['admin', 'director', 'project_manager'] },
  ];
  const allRoles = ['super_user', 'admin', 'hr_manager', 'hr_executive', 'director', 'delivery_head', 'project_manager', 'design_leader', 'design_manager', 'simulation_leader', 'simulation_manager', 'layout_planning_leader', 'qc_leader_manager', 'team_member', 'client'];
  for (const rd of reportDefs) {
    for (const role of allRoles) {
      const visible = rd.roles.includes(role);
      await db('report_visibility')
        .insert({ report_key: rd.key, role, visible })
        .onConflict(['report_key', 'role'])
        .merge({ visible });
    }
  }

  logger.info('Seed complete. Default admin: admin@pranitra.com / Admin@1234');
  await db.destroy();
}

seed().catch((e) => { logger.error(e); process.exit(1); });
