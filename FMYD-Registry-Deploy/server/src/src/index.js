require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const filesRoutes = require('./routes/files');
const usersRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (both /uploads and /api/uploads)
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const uploadStaticPath = path.join(__dirname, '..', uploadDir);
app.use('/uploads', express.static(uploadStaticPath));
app.use('/api/uploads', express.static(uploadStaticPath));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve Built Frontend in Production ───────────────────────────────────────
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ─── 404 Handler (for unmatched API routes) ──────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack || err.message);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10 MB.' });
  }
  if (err.message === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: 'Invalid file type. Only JPG, PNG, and PDF are allowed.' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅  FMYD ICT Registry API running on http://0.0.0.0:${PORT}`);
  console.log(`   Upload directory: ${path.join(__dirname, '..', uploadDir)}`);
});
