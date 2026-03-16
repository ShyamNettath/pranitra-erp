require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
const logger  = require('./config/logger');

const app = express();

// ── Security middleware ─────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost',
  credentials: true,
}));

// ── Logging ──────────────────────────────────────────────────────
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Body parsers ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static uploads with cache headers ────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '30d',
  etag: true,
  lastModified: true,
}));

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/workspaces',  require('./routes/workspaces'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/projects',    require('./routes/projects'));
app.use('/api/tasks',       require('./routes/tasks'));
app.use('/api/time',        require('./routes/time'));
app.use('/api/files',       require('./routes/files'));
app.use('/api/comments',    require('./routes/comments'));
app.use('/api/reports',     require('./routes/reports'));
app.use('/api/resources',   require('./routes/resources'));
app.use('/api/admin',       require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/categories',   require('./routes/categories'));
app.use('/api/settings',     require('./routes/settings'));
app.use('/api/totp',         require('./routes/totp'));
app.use('/api', require('./routes/lop'));
app.use('/api', require('./routes/holidays'));
app.use('/api/zoho',        require('./routes/zoho'));
app.use('/api/dashboard',   require('./routes/dashboard'));
// ── 404 ───────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => logger.info(`PRANITRA API running on port ${PORT}`));

// ── Background jobs ──────────────────────────────────────────────
require('./utils/scheduler');

module.exports = app;
