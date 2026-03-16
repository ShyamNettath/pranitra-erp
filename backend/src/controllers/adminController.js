const db = require('../config/db');
const { writeAuditLog } = require('../utils/audit');
const { execSync } = require('child_process');
const path = require('path');

exports.getSettings = async (_req, res, next) => {
  try { return res.json(await db('system_settings').orderBy('key')); }
  catch(err){ next(err); }
};

exports.updateSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    await db('system_settings').where({ key }).update({ value });
    await writeAuditLog(req.user.id,'admin.setting.update','system_setting',null,{ key,value },req);
    return res.json({ ok:true });
  } catch(err){ next(err); }
};

exports.getReportVisibility = async (_req, res, next) => {
  try { return res.json(await db('report_visibility').orderBy('report_key').orderBy('role')); }
  catch(err){ next(err); }
};

exports.updateReportVisibility = async (req, res, next) => {
  try {
    const { report_key, role, visible } = req.body;
    await db('report_visibility').where({ report_key, role }).update({ visible });
    return res.json({ ok:true });
  } catch(err){ next(err); }
};

exports.getAuditLog = async (req, res, next) => {
  try {
    const { user_id, action, entity_type, limit=50, offset=0 } = req.query;
    let q = db('audit_logs as al').leftJoin('users as u','u.id','al.user_id')
      .select('al.*','u.name as actor_name').orderBy('al.created_at','desc').limit(limit).offset(offset);
    if (user_id) q=q.where('al.user_id',user_id);
    if (action) q=q.whereILike('al.action',`%${action}%`);
    if (entity_type) q=q.where('al.entity_type',entity_type);
    return res.json(await q);
  } catch(err){ next(err); }
};

exports.getSystemInfo = async (_req, res, next) => {
  try {
    const users = await db('users').where({is_active:true,is_deleted:false}).count('id as c').first();
    const workspaces = await db('workspaces').where({is_active:true}).count('id as c').first();
    const projects = await db('projects').where({is_deleted:false}).count('id as c').first();
    return res.json({
      version:'1.0.0', users:parseInt(users.c), workspaces:parseInt(workspaces.c),
      projects:parseInt(projects.c), node_version:process.version,
      uptime_seconds:Math.floor(process.uptime())
    });
  } catch(err){ next(err); }
};

exports.getRecycleBin = async (req, res, next) => {
  try {
    const { entity_type, limit=50, offset=0 } = req.query;
    let q = db('recycle_bin as rb').leftJoin('users as u','u.id','rb.deleted_by')
      .select('rb.*','u.name as deleted_by_name').orderBy('rb.created_at','desc').limit(limit).offset(offset);
    if (entity_type) q=q.where('rb.entity_type',entity_type);
    return res.json(await q);
  } catch(err){ next(err); }
};

exports.restoreFromRecycleBin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await db('recycle_bin').where({ id }).first();
    if (!item) return res.status(404).json({ error:'Not found' });
    const snapshot = typeof item.snapshot==='string' ? JSON.parse(item.snapshot) : item.snapshot;
    await db(item.entity_type+'s').where({ id:snapshot.id }).update({ is_deleted:false }).catch(()=>{});
    await db('recycle_bin').where({ id }).delete();
    await writeAuditLog(req.user.id,'recycle.restore',item.entity_type,snapshot.id,null,req);
    return res.json({ ok:true });
  } catch(err){ next(err); }
};

// ── Storage usage ────────────────────────────────────────────────
function getDirSizeMb(dirPath) {
  try {
    const out = execSync(`du -sm "${dirPath}" 2>/dev/null || echo "0\t${dirPath}"`, { encoding: 'utf8' });
    return parseFloat(out.split('\t')[0]) || 0;
  } catch {
    return 0;
  }
}

exports.getStorageUsage = async (_req, res, next) => {
  try {
    const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');

    // Disk usage via df
    let totalDiskGb = 0, freeDiskGb = 0, usedDiskGb = 0, diskUsagePercent = 0;
    try {
      const dfOut = execSync('df -BG / 2>/dev/null | tail -1', { encoding: 'utf8' });
      const parts = dfOut.trim().split(/\s+/);
      totalDiskGb = parseFloat(parts[1]) || 0;
      usedDiskGb = parseFloat(parts[2]) || 0;
      freeDiskGb = parseFloat(parts[3]) || 0;
      diskUsagePercent = parseFloat(parts[4]) || 0;
    } catch { /* Windows or unavailable */ }

    // Per-category sizes
    const uploadsTotalMb = getDirSizeMb(uploadsRoot);
    const logosMb = getDirSizeMb(path.join(uploadsRoot, 'logos')) + getDirSizeMb(path.join(uploadsRoot, 'branding'));
    const projectFilesMb = getDirSizeMb(path.join(uploadsRoot, 'projects'));
    const userAvatarsMb = getDirSizeMb(path.join(uploadsRoot, 'users'));
    const hrFilesMb = getDirSizeMb(path.join(uploadsRoot, 'hr'));

    return res.json({
      total_disk_gb: totalDiskGb,
      free_disk_gb: freeDiskGb,
      used_disk_gb: usedDiskGb,
      disk_usage_percent: diskUsagePercent,
      uploads_total_mb: uploadsTotalMb,
      logos_mb: logosMb,
      project_files_mb: projectFilesMb,
      user_avatars_mb: userAvatarsMb,
      hr_files_mb: hrFilesMb,
      last_calculated_at: new Date().toISOString(),
    });
  } catch (err) { next(err); }
};
