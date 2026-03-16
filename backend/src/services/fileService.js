/**
 * File processing service — compression, dedup, organised storage.
 */
const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

// ── Size limits (bytes) ──────────────────────────────────────────
const SIZE_LIMITS = {
  image: 5 * 1024 * 1024,      // 5MB
  pdf: 20 * 1024 * 1024,       // 20MB
  document: 10 * 1024 * 1024,  // 10MB Excel/Word
};

const VIDEO_MIMES = [
  'video/mp4', 'video/mpeg', 'video/avi', 'video/webm',
  'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
];

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const PDF_MIMES = ['application/pdf'];

const DOC_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

// ── Ensure directory exists ──────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Detect file category ─────────────────────────────────────────
function getCategory(mime) {
  if (VIDEO_MIMES.includes(mime)) return 'video';
  if (IMAGE_MIMES.includes(mime)) return 'image';
  if (PDF_MIMES.includes(mime)) return 'pdf';
  if (DOC_MIMES.includes(mime)) return 'document';
  return 'other';
}

// ── Calculate MD5 hash of file ───────────────────────────────────
function md5File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', d => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// ── Validate file size and type ──────────────────────────────────
function validateFile(file) {
  const category = getCategory(file.mimetype);

  if (category === 'video') {
    return { valid: false, error: 'Video files are not supported. Please use a link instead.' };
  }

  const limit = SIZE_LIMITS[category];
  if (limit && file.size > limit) {
    const limitMb = Math.round(limit / 1024 / 1024);
    return { valid: false, error: `File too large. Maximum size for ${category} files is ${limitMb}MB.` };
  }

  return { valid: true };
}

/**
 * Process and save an uploaded file.
 *
 * @param {Object} file - multer file object (already on disk in temp location)
 * @param {Object} opts
 * @param {string} opts.type - 'project' | 'logo' | 'avatar' | 'hr' | 'general'
 * @param {string} [opts.projectId] - for project file subdirectory
 * @returns {{ storedName, storagePath, mimeType, sizeBytes, md5Hash }}
 */
async function processFile(file, opts = {}) {
  const { type = 'general', projectId } = opts;
  const category = getCategory(file.mimetype);

  // Determine destination directory
  let destDir;
  switch (type) {
    case 'logo':
      destDir = path.join(UPLOADS_ROOT, 'logos');
      break;
    case 'avatar':
      destDir = path.join(UPLOADS_ROOT, 'users');
      break;
    case 'project':
      destDir = projectId
        ? path.join(UPLOADS_ROOT, 'projects', projectId)
        : path.join(UPLOADS_ROOT, 'projects');
      break;
    case 'hr':
      destDir = path.join(UPLOADS_ROOT, 'hr');
      break;
    default:
      destDir = UPLOADS_ROOT;
  }
  ensureDir(destDir);

  const uid = crypto.randomUUID();

  // ── Image processing with sharp ────────────────────────────────
  if (category === 'image') {
    let pipeline = sharp(file.path);

    if (type === 'logo') {
      pipeline = pipeline.resize({ width: 400, withoutEnlargement: true });
      pipeline = pipeline.webp({ quality: 85 });
    } else if (type === 'avatar') {
      pipeline = pipeline.resize({ width: 200, height: 200, fit: 'cover' });
      pipeline = pipeline.webp({ quality: 80 });
    } else {
      pipeline = pipeline.resize({ width: 1920, withoutEnlargement: true });
      pipeline = pipeline.webp({ quality: 80 });
    }

    const storedName = `${uid}.webp`;
    const destPath = path.join(destDir, storedName);
    await pipeline.toFile(destPath);

    // Remove original temp file
    fs.unlink(file.path, () => {});

    const stat = fs.statSync(destPath);
    const hash = await md5File(destPath);
    const relPath = '/' + path.relative(UPLOADS_ROOT, destPath).replace(/\\/g, '/');

    return {
      storedName,
      storagePath: `/uploads${relPath}`,
      mimeType: 'image/webp',
      sizeBytes: stat.size,
      md5Hash: hash,
    };
  }

  // ── Non-image files: move to organised directory ───────────────
  const ext = path.extname(file.originalname) || '';
  const storedName = `${uid}${ext}`;
  const destPath = path.join(destDir, storedName);

  // Move from temp to destination
  fs.renameSync(file.path, destPath);

  const stat = fs.statSync(destPath);
  const hash = await md5File(destPath);
  const relPath = '/' + path.relative(UPLOADS_ROOT, destPath).replace(/\\/g, '/');

  return {
    storedName,
    storagePath: `/uploads${relPath}`,
    mimeType: file.mimetype,
    sizeBytes: stat.size,
    md5Hash: hash,
  };
}

/**
 * Check for duplicate file by MD5 hash.
 * Returns existing file record if found, null otherwise.
 */
async function findDuplicate(md5Hash) {
  if (!md5Hash) return null;
  try {
    return await db('files')
      .where({ md5_hash: md5Hash, is_deleted: false })
      .first();
  } catch {
    // md5_hash column might not exist yet — graceful fallback
    return null;
  }
}

module.exports = {
  processFile,
  validateFile,
  findDuplicate,
  md5File,
  ensureDir,
  UPLOADS_ROOT,
};
