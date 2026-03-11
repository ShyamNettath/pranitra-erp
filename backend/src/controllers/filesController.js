const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname,'../../uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50*1024*1024 } });

exports.uploadMiddleware = upload.single('file');

exports.list = async (req, res, next) => {
  try {
    const { project_id, task_id } = req.query;
    let q = db('files as f').join('users as u','u.id','f.uploaded_by')
      .where('f.is_deleted',false).select('f.*','u.name as uploader_name');
    if (project_id) q=q.where('f.project_id',project_id);
    if (task_id) q=q.where('f.task_id',task_id);
    return res.json(await q.orderBy('f.created_at','desc'));
  } catch(err){ next(err); }
};

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error:'No file uploaded' });
    const { project_id, task_id } = req.body;
    const [file] = await db('files').insert({
      project_id, task_id:task_id||null, uploaded_by:req.user.id,
      original_name:req.file.originalname, stored_name:req.file.filename,
      mime_type:req.file.mimetype, size_bytes:req.file.size,
      storage_path:`/uploads/${req.file.filename}`
    }).returning('*');
    return res.status(201).json(file);
  } catch(err){ next(err); }
};

exports.softDelete = async (req, res, next) => {
  try {
    await db('files').where({id:req.params.id}).update({is_deleted:true});
    return res.json({ ok:true });
  } catch(err){ next(err); }
};
