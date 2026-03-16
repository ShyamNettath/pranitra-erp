const multer = require('multer');
const path = require('path');
const os = require('os');
const db = require('../config/db');
const { processFile, validateFile, findDuplicate } = require('../services/fileService');

// Upload to temp — fileService handles final placement and compression
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tmp = path.join(os.tmpdir(), 'pranitra-uploads');
    require('fs').mkdirSync(tmp, { recursive: true });
    cb(null, tmp);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

exports.uploadMiddleware = upload.single('file');

exports.list = async (req, res, next) => {
  try {
    const { project_id, task_id } = req.query;
    let q = db('files as f').join('users as u', 'u.id', 'f.uploaded_by')
      .where('f.is_deleted', false).select('f.*', 'u.name as uploader_name');
    if (project_id) q = q.where('f.project_id', project_id);
    if (task_id) q = q.where('f.task_id', task_id);
    return res.json(await q.orderBy('f.created_at', 'desc'));
  } catch (err) { next(err); }
};

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Validate size and type
    const check = validateFile(req.file);
    if (!check.valid) {
      require('fs').unlink(req.file.path, () => {});
      return res.status(422).json({ error: check.error });
    }

    const { project_id, task_id } = req.body;

    // Process file (compress images, organise storage)
    const result = await processFile(req.file, {
      type: 'project',
      projectId: project_id,
    });

    // Check for duplicate
    const duplicate = await findDuplicate(result.md5Hash);
    if (duplicate) {
      // Reuse existing file path, remove the new copy
      const fs = require('fs');
      const fullPath = path.join(__dirname, '..', '..', 'uploads', result.storagePath.replace('/uploads/', ''));
      fs.unlink(fullPath, () => {});

      const [file] = await db('files').insert({
        project_id, task_id: task_id || null, uploaded_by: req.user.id,
        original_name: req.file.originalname, stored_name: duplicate.stored_name,
        mime_type: duplicate.mime_type, size_bytes: duplicate.size_bytes,
        storage_path: duplicate.storage_path, md5_hash: result.md5Hash,
      }).returning('*');
      return res.status(201).json(file);
    }

    const [file] = await db('files').insert({
      project_id, task_id: task_id || null, uploaded_by: req.user.id,
      original_name: req.file.originalname, stored_name: result.storedName,
      mime_type: result.mimeType, size_bytes: result.sizeBytes,
      storage_path: result.storagePath, md5_hash: result.md5Hash,
    }).returning('*');
    return res.status(201).json(file);
  } catch (err) { next(err); }
};

exports.softDelete = async (req, res, next) => {
  try {
    await db('files').where({ id: req.params.id }).update({ is_deleted: true });
    return res.json({ ok: true });
  } catch (err) { next(err); }
};
