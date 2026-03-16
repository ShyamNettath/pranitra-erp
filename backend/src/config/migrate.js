/**
 * PRANITRA PM Tool — Complete Database Schema
 * Migration v1.0.0
 * Run: node src/config/migrate.js
 */
const db = require('./db');
const logger = require('./logger');

async function migrate() {
  logger.info('Running migration v1.0.0...');

  await db.schema

    // ── WORKSPACES ────────────────────────────────────────────────
    .createTableIfNotExists('workspaces', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.string('name').notNullable();
      t.string('slug').unique().notNullable();
      t.string('description');
      t.string('color', 7).defaultTo('#003264');
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
    })

    // ── USERS ─────────────────────────────────────────────────────
    .createTableIfNotExists('users', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.string('email').unique().notNullable();
      t.string('name').notNullable();
      t.string('password_hash').notNullable();
      t.string('department');
      t.string('location');
      t.string('job_title');
      t.string('employee_id');           // Zoho People ID
      t.string('zoho_employee_id');
      t.timestamp('zoho_last_synced');
      t.boolean('is_active').defaultTo(true);
      t.boolean('is_deleted').defaultTo(false);
      t.string('avatar_url');
      t.timestamp('last_login');
      t.timestamps(true, true);
    })

    // ── USER ROLES (global — users can hold multiple) ─────────────
    // roles: super_user | admin | hr_manager | hr_executive | director | delivery_head | project_manager | design_leader | design_manager | simulation_leader | simulation_manager | layout_planning_leader | qc_leader_manager | team_member | client
    .createTableIfNotExists('user_roles', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      t.string('role').notNullable();    // super_user | admin | hr_manager | hr_executive | director | delivery_head | project_manager | design_leader | design_manager | simulation_leader | simulation_manager | layout_planning_leader | qc_leader_manager | team_member | client
      t.timestamps(true, true);
      t.unique(['user_id', 'role']);
    })

    // ── WORKSPACE MEMBERS ─────────────────────────────────────────
    .createTableIfNotExists('workspace_members', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('workspace_id').references('id').inTable('workspaces').onDelete('CASCADE').notNullable();
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
      t.unique(['workspace_id', 'user_id']);
    })

    // ── OTP CODES ─────────────────────────────────────────────────
    .createTableIfNotExists('otp_codes', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      t.string('code', 6).notNullable();
      t.integer('attempts').defaultTo(0);
      t.boolean('used').defaultTo(false);
      t.timestamp('expires_at').notNullable();
      t.timestamps(true, true);
    })

    // ── REFRESH TOKENS ────────────────────────────────────────────
    .createTableIfNotExists('refresh_tokens', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      t.string('token').unique().notNullable();
      t.timestamp('expires_at').notNullable();
      t.boolean('revoked').defaultTo(false);
      t.string('device_info');
      t.timestamps(true, true);
    })

    // ── SYSTEM SETTINGS ───────────────────────────────────────────
    .createTableIfNotExists('system_settings', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.string('key').unique().notNullable();
      t.text('value');
      t.string('description');
      t.timestamps(true, true);
    })

    // ── PROJECTS ──────────────────────────────────────────────────
    .createTableIfNotExists('projects', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('workspace_id').references('id').inTable('workspaces').onDelete('CASCADE').notNullable();
      t.string('name').notNullable();
      t.text('description');
      t.string('color', 7).defaultTo('#003264');
      // status: draft | pending_approval | approved | active | on_hold | completed | archived
      t.string('status').defaultTo('draft');
      t.uuid('project_manager_id').references('id').inTable('users');
      t.date('start_date');
      t.date('end_date');
      t.date('baseline_start_date');
      t.date('baseline_end_date');
      t.decimal('budget', 15, 2);
      t.decimal('baseline_hours', 10, 2).defaultTo(0);
      t.decimal('actual_hours', 10, 2).defaultTo(0);
      // Director approval fields
      t.uuid('approved_by').references('id').inTable('users');
      t.timestamp('approved_at');
      t.text('approval_comment');
      t.integer('approval_version').defaultTo(1);
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    // ── HOLIDAYS (tenant-level) ───────────────────────────────────
    .createTableIfNotExists('holidays', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('tenant_id').references('id').inTable('workspaces').onDelete('CASCADE').notNullable();
      t.string('name').notNullable();
      t.date('date').notNullable();
      t.string('holiday_type').notNullable().defaultTo('Public'); // Public | Company | Optional
      t.boolean('is_active').defaultTo(true);
      t.uuid('created_by').references('id').inTable('users');
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
      t.unique(['tenant_id', 'date']);
    })

    // ── LOP SECTIONS (tenant-level) ───────────────────────────────
    .createTableIfNotExists('lop_sections', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('tenant_id').references('id').inTable('workspaces').onDelete('CASCADE').notNullable();
      t.string('name').notNullable();
      t.text('description');
      t.boolean('is_active').defaultTo(true);
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
      t.unique(['tenant_id', 'name']);
    })

    // ── LOP ITEMS (per project) ──────────────────────────────────
    .createTableIfNotExists('lop_items', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('tenant_id').references('id').inTable('workspaces').onDelete('CASCADE').notNullable();
      t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
      t.integer('si').notNullable();
      t.date('date_raised').notNullable();
      t.uuid('section_id').references('id').inTable('lop_sections');
      t.text('description').notNullable();
      t.uuid('raised_by').references('id').inTable('users');
      t.uuid('owner').references('id').inTable('users');
      t.string('impact').notNullable();
      t.string('status').notNullable().defaultTo('Open');
      t.date('target_date').notNullable();
      t.date('closed_date');
      t.uuid('closed_by').references('id').inTable('users');
      t.text('comments');
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
      t.unique(['project_id', 'si']);
    })

    // ── PROJECT MEMBERS ───────────────────────────────────────────
    .createTableIfNotExists('project_members', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      t.string('role');                  // project role within this project
      t.decimal('allocation_pct', 5, 2).defaultTo(0);
      t.date('added_date');
      t.date('last_active_date');
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
      t.unique(['project_id', 'user_id']);
    })

    // ── MILESTONES ────────────────────────────────────────────────
    .createTableIfNotExists('milestones', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
      t.string('category').notNullable();  // design | simulation | planning | layout
      t.string('name').notNullable();
      t.date('due_date');
      // status: pending | achieved | missed
      t.string('status').defaultTo('pending');
      t.uuid('owner_id').references('id').inTable('users');
      t.decimal('budget_checkpoint', 15, 2);
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    // ── DESIGN HIERARCHY ──────────────────────────────────────────
    // Sub-categories: concept_design | finish_3d | drawings_2d
    .createTableIfNotExists('design_subcategories', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
      t.string('name').notNullable();   // concept_design | finish_3d | drawings_2d
      t.decimal('effort_share_pct', 5, 2).notNullable();  // default 30/40/30
      t.decimal('qc_pct', 5, 2).defaultTo(10);
      t.decimal('baseline_hours', 10, 2).defaultTo(0);
      t.decimal('actual_hours', 10, 2).defaultTo(0);
      t.integer('sort_order').defaultTo(0);
      t.timestamps(true, true);
    })

    .createTableIfNotExists('design_zones', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('subcategory_id').references('id').inTable('design_subcategories').onDelete('CASCADE').notNullable();
      t.string('name').notNullable();
      t.decimal('baseline_hours', 10, 2).defaultTo(0);
      t.decimal('actual_hours', 10, 2).defaultTo(0);
      t.integer('sort_order').defaultTo(0);
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    .createTableIfNotExists('design_stations', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('zone_id').references('id').inTable('design_zones').onDelete('CASCADE').notNullable();
      t.string('name').notNullable();
      t.decimal('baseline_hours', 10, 2).defaultTo(0);
      t.decimal('actual_hours', 10, 2).defaultTo(0);
      t.integer('sort_order').defaultTo(0);
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    .createTableIfNotExists('design_units', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('station_id').references('id').inTable('design_stations').onDelete('CASCADE').notNullable();
      t.string('name').notNullable();
      // complexity: simple | medium | complex — LOCKED after creation
      t.string('complexity').notNullable();
      t.decimal('baseline_hours', 10, 2).notNullable(); // set from complexity on creation
      t.decimal('actual_hours', 10, 2).defaultTo(0);
      t.uuid('assignee_id').references('id').inTable('users');
      // status: not_started | in_progress | qc_pending | qc_failed | complete
      t.string('status').defaultTo('not_started');
      t.integer('sort_order').defaultTo(0);
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    .createTableIfNotExists('design_unit_qc', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('unit_id').references('id').inTable('design_units').onDelete('CASCADE').notNullable();
      t.uuid('reviewer_id').references('id').inTable('users');
      // result: pending | pass | fail
      t.string('result').defaultTo('pending');
      t.text('notes');
      t.decimal('qc_hours', 8, 2).defaultTo(0);
      t.timestamps(true, true);
    })

    // ── SIMULATION HIERARCHY ──────────────────────────────────────
    .createTableIfNotExists('simulation_robot_categories', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.string('name').notNullable();           // joining | handling | handling_joining
      t.decimal('baseline_hours', 10, 2).defaultTo(0);
      t.integer('stage_count').defaultTo(3);
      // stage splits stored as JSON array [25, 35, 40]
      t.jsonb('stage_splits').defaultTo('[25,35,40]');
      t.decimal('qc_pct', 5, 2).defaultTo(10);
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
    })

    .createTableIfNotExists('simulation_safety_zones', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
      t.string('name').notNullable();
      t.integer('sort_order').defaultTo(0);
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    .createTableIfNotExists('simulation_robots', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('safety_zone_id').references('id').inTable('simulation_safety_zones').onDelete('CASCADE').notNullable();
      t.uuid('robot_category_id').references('id').inTable('simulation_robot_categories');
      t.string('name').notNullable();
      t.decimal('baseline_hours', 10, 2).defaultTo(0);
      t.decimal('actual_hours', 10, 2).defaultTo(0);
      t.integer('sort_order').defaultTo(0);
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    .createTableIfNotExists('simulation_stages', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('robot_id').references('id').inTable('simulation_robots').onDelete('CASCADE').notNullable();
      t.string('name').notNullable();           // Stage 01 | Stage 02 | Stage 03
      t.decimal('split_pct', 5, 2).notNullable();
      t.decimal('baseline_hours', 10, 2).defaultTo(0);
      t.decimal('actual_hours', 10, 2).defaultTo(0);
      t.integer('stage_number').notNullable();
      // qc result: pending | pass | fail
      t.string('qc_result').defaultTo('pending');
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    // ── PLANNING HIERARCHY (free-form) ────────────────────────────
    .createTableIfNotExists('planning_nodes', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
      t.uuid('parent_id').references('id').inTable('planning_nodes');
      t.string('name').notNullable();
      t.integer('sort_order').defaultTo(0);
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    .createTableIfNotExists('planning_metrics', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('node_id').references('id').inTable('planning_nodes').onDelete('CASCADE').notNullable();
      t.string('metric_name').notNullable();
      t.decimal('target_value', 15, 4);
      t.string('unit');
      // auto_calculated: true = derived, false = manual entry
      t.boolean('auto_calculated').defaultTo(false);
      t.timestamps(true, true);
    })

    .createTableIfNotExists('planning_metric_entries', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('metric_id').references('id').inTable('planning_metrics').onDelete('CASCADE').notNullable();
      t.date('week_ending').notNullable();
      t.decimal('value', 15, 4);
      t.uuid('entered_by').references('id').inTable('users');
      t.timestamps(true, true);
      t.unique(['metric_id', 'week_ending']);
    })

    // ── LAYOUT HIERARCHY (identical model to planning) ────────────
    .createTableIfNotExists('layout_nodes', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
      t.uuid('parent_id').references('id').inTable('layout_nodes');
      t.string('name').notNullable();
      t.integer('sort_order').defaultTo(0);
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    .createTableIfNotExists('layout_metrics', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('node_id').references('id').inTable('layout_nodes').onDelete('CASCADE').notNullable();
      t.string('metric_name').notNullable();
      t.decimal('target_value', 15, 4);
      t.string('unit');
      t.boolean('auto_calculated').defaultTo(false);
      t.timestamps(true, true);
    })

    .createTableIfNotExists('layout_metric_entries', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('metric_id').references('id').inTable('layout_metrics').onDelete('CASCADE').notNullable();
      t.date('week_ending').notNullable();
      t.decimal('value', 15, 4);
      t.uuid('entered_by').references('id').inTable('users');
      t.timestamps(true, true);
      t.unique(['metric_id', 'week_ending']);
    })

    // ── TASKS ─────────────────────────────────────────────────────
    // Tasks attach to the lowest-level node in any category
    .createTableIfNotExists('tasks', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
      t.uuid('parent_task_id').references('id').inTable('tasks');  // sub-tasks unlimited depth
      // entity_type / entity_id = the lowest-level node this task belongs to
      t.string('entity_type');   // design_unit | simulation_stage | planning_node | layout_node
      t.uuid('entity_id');
      t.string('name').notNullable();
      t.text('description');
      // status: todo | in_progress | in_review | done
      t.string('status').defaultTo('todo');
      t.string('priority').defaultTo('medium');  // low | medium | high | critical
      t.uuid('assignee_id').references('id').inTable('users');
      t.date('start_date');
      t.date('due_date');
      t.date('baseline_due_date');
      t.decimal('progress_pct', 5, 2).defaultTo(0);
      t.decimal('baseline_hours', 10, 2).defaultTo(0);
      t.decimal('actual_hours', 10, 2).defaultTo(0);
      t.boolean('is_deleted').defaultTo(false);
      t.integer('sort_order').defaultTo(0);
      t.timestamps(true, true);
    })

    // ── TASK DEPENDENCIES ─────────────────────────────────────────
    .createTableIfNotExists('task_dependencies', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('task_id').references('id').inTable('tasks').onDelete('CASCADE').notNullable();
      t.uuid('depends_on_id').references('id').inTable('tasks').onDelete('CASCADE').notNullable();
      t.unique(['task_id', 'depends_on_id']);
    })

    // ── TIME ENTRIES ──────────────────────────────────────────────
    .createTableIfNotExists('time_entries', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
      t.uuid('task_id').references('id').inTable('tasks');
      t.uuid('user_id').references('id').inTable('users').notNullable();
      t.uuid('logged_by').references('id').inTable('users').notNullable(); // PM can log for others
      t.date('date').notNullable();
      t.decimal('hours', 8, 2).notNullable();
      t.string('description');
      t.text('notes');
      t.boolean('is_billable').defaultTo(false);
      // approval_status: pending | approved | rejected (only for billable)
      t.string('approval_status').defaultTo('na');  // na | pending | approved | rejected
      t.uuid('approved_by').references('id').inTable('users');
      t.timestamp('approved_at');
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    // ── FILES ─────────────────────────────────────────────────────
    .createTableIfNotExists('files', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
      t.uuid('task_id').references('id').inTable('tasks');
      t.uuid('uploaded_by').references('id').inTable('users').notNullable();
      t.string('original_name').notNullable();
      t.string('stored_name').notNullable();
      t.string('mime_type');
      t.bigInteger('size_bytes');
      t.string('storage_path').notNullable();
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    // ── COMMENTS ──────────────────────────────────────────────────
    .createTableIfNotExists('comments', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
      t.uuid('task_id').references('id').inTable('tasks');
      t.uuid('parent_comment_id').references('id').inTable('comments');
      t.uuid('author_id').references('id').inTable('users').notNullable();
      t.text('body').notNullable();
      t.jsonb('mentions').defaultTo('[]');  // array of user_ids mentioned
      t.boolean('is_deleted').defaultTo(false);
      t.timestamps(true, true);
    })

    // ── NOTIFICATIONS ─────────────────────────────────────────────
    .createTableIfNotExists('notifications', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      t.string('type').notNullable();      // e.g. task_overdue | approval_required | comment_mention
      t.string('title').notNullable();
      t.text('body');
      t.string('entity_type');             // project | task | time_entry etc.
      t.uuid('entity_id');
      t.boolean('is_read').defaultTo(false);
      t.timestamps(true, true);
    })

    // ── NOTIFICATION PREFERENCES ──────────────────────────────────
    .createTableIfNotExists('notification_preferences', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      t.string('event_type').notNullable();
      t.boolean('email_enabled').defaultTo(true);
      t.boolean('teams_enabled').defaultTo(false);
      t.timestamps(true, true);
      t.unique(['user_id', 'event_type']);
    })

    // ── REPORT VISIBILITY SETTINGS ────────────────────────────────
    .createTableIfNotExists('report_visibility', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.string('report_key').notNullable();   // e.g. project_performance | budget_variance
      t.string('role').notNullable();         // admin | director | project_manager | team_member | client
      t.boolean('visible').defaultTo(false);
      t.timestamps(true, true);
      t.unique(['report_key', 'role']);
    })

    // ── RESOURCE POOL — ASSOCIATE PROFILES ────────────────────────
    .createTableIfNotExists('associate_profiles', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').unique().notNullable();
      t.string('zoho_employee_id');
      t.string('department');
      t.string('location');
      t.date('joined_date');
      // costing — visible to admin only
      t.decimal('hourly_rate', 10, 2);
      t.string('currency', 3).defaultTo('EUR');
      t.timestamps(true, true);
    })

    // ── SKILLS ────────────────────────────────────────────────────
    .createTableIfNotExists('skills', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.string('name').unique().notNullable();
      t.string('category');
      t.timestamps(true, true);
    })

    .createTableIfNotExists('associate_skills', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('profile_id').references('id').inTable('associate_profiles').onDelete('CASCADE').notNullable();
      t.uuid('skill_id').references('id').inTable('skills').onDelete('CASCADE').notNullable();
      // level: strong | proficient | learning
      t.string('level').defaultTo('proficient');
      t.unique(['profile_id', 'skill_id']);
    })

    // ── AUDIT LOG ─────────────────────────────────────────────────
    .createTableIfNotExists('audit_logs', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.uuid('user_id').references('id').inTable('users');
      t.string('action').notNullable();        // e.g. user.login | project.approve | task.status_change
      t.string('entity_type');
      t.uuid('entity_id');
      t.jsonb('payload');                      // before/after snapshot
      t.string('ip_address');
      t.timestamp('created_at').defaultTo(db.fn.now());
    })

    // ── RECYCLE BIN ───────────────────────────────────────────────
    .createTableIfNotExists('recycle_bin', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      t.string('entity_type').notNullable();
      t.uuid('entity_id').notNullable();
      t.jsonb('snapshot').notNullable();       // full row at time of deletion
      t.uuid('deleted_by').references('id').inTable('users');
      t.timestamp('expires_at');               // null = never purge
      t.timestamps(true, true);
    });

  logger.info('Migration v1.0.0 complete.');
  await db.destroy();
}

async function rollback() {
  logger.info('Rolling back migration v1.0.0...');
  const tables = [
    'recycle_bin', 'audit_logs', 'associate_skills', 'skills',
    'associate_profiles', 'report_visibility', 'notification_preferences',
    'notifications', 'comments', 'files', 'time_entries',
    'task_dependencies', 'tasks',
    'layout_metric_entries', 'layout_metrics', 'layout_nodes',
    'planning_metric_entries', 'planning_metrics', 'planning_nodes',
    'simulation_stages', 'simulation_robots', 'simulation_safety_zones',
    'simulation_robot_categories',
    'design_unit_qc', 'design_units', 'design_stations',
    'design_zones', 'design_subcategories',
    'lop_items', 'lop_sections', 'holidays',
    'milestones', 'project_members', 'projects',
    'system_settings', 'refresh_tokens', 'otp_codes',
    'workspace_members', 'user_roles', 'users', 'workspaces',
  ];
  for (const table of tables) {
    await db.schema.dropTableIfExists(table);
    logger.info(`Dropped: ${table}`);
  }
  logger.info('Rollback complete.');
  await db.destroy();
}

if (process.argv[2] === 'rollback') {
  rollback().catch((e) => { logger.error(e); process.exit(1); });
} else {
  migrate().catch((e) => { logger.error(e); process.exit(1); });
}
