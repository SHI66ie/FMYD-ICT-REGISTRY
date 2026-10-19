const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const upload = require('../upload');

const router = express.Router();

// All file routes require authentication
router.use(authMiddleware);

// ─── GET /api/files ───────────────────────────────────────────────────────────
// Supports: ?page=1&limit=20&q=search&type=incoming|outgoing&status=Pending&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      q,
      type,
      status,
      date_from,
      date_to,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build dynamic WHERE clauses
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (q && q.trim()) {
      conditions.push(
        `(f.title ILIKE $${paramIndex} OR f.file_number ILIKE $${paramIndex} OR f.reference_number ILIKE $${paramIndex} OR f.origin ILIKE $${paramIndex} OR f.action_officer ILIKE $${paramIndex})`
      );
      params.push(`%${q.trim()}%`);
      paramIndex++;
    }

    if (type && ['incoming', 'outgoing'].includes(type)) {
      conditions.push(`f.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (status && ['Pending', 'In Progress', 'Completed', 'Returned'].includes(status)) {
      conditions.push(`f.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (date_from) {
      conditions.push(`f.date_logged >= $${paramIndex}`);
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      conditions.push(`f.date_logged <= $${paramIndex}`);
      params.push(date_to);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM files f ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query — join creator name
    const dataParams = [...params, limitNum, offset];
    const { rows } = await pool.query(
      `SELECT
         f.id, f.file_number, f.title, f.date_logged, f.reference_number,
         f.type, f.origin, f.destination, f.action_officer, f.status,
         f.remarks, f.scan_path, f.created_at, f.updated_at,
         u.full_name AS created_by_name
       FROM files f
       LEFT JOIN users u ON f.created_by = u.id
       ${whereClause}
       ORDER BY f.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataParams
    );

    return res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/files ──────────────────────────────────────────────────────────
router.post('/', upload.single('scan'), async (req, res, next) => {
  try {
    const {
      file_number,
      title,
      date_logged,
      reference_number,
      type,
      origin,
      destination,
      action_officer,
      status,
      remarks,
    } = req.body;

    // Required field validation
    if (!file_number || !title || !date_logged || !type) {
      return res.status(400).json({
        error: 'file_number, title, date_logged, and type are required',
      });
    }

    if (!['incoming', 'outgoing'].includes(type)) {
      return res.status(400).json({ error: 'type must be "incoming" or "outgoing"' });
    }

    const validStatuses = ['Pending', 'In Progress', 'Completed', 'Returned'];
    const assignedStatus = validStatuses.includes(status) ? status : 'Pending';

    // Check for duplicate file_number
    const existing = await pool.query(
      'SELECT id FROM files WHERE file_number = $1',
      [file_number.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A file with this file_number already exists' });
    }

    const id = uuidv4();
    const scan_path = req.file ? req.file.filename : null;

    const { rows } = await pool.query(
      `INSERT INTO files
         (id, file_number, title, date_logged, reference_number, type, origin, destination,
          action_officer, status, remarks, scan_path, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        id,
        file_number.trim(),
        title.trim(),
        date_logged,
        reference_number ? reference_number.trim() : null,
        type,
        origin ? origin.trim() : null,
        destination ? destination.trim() : null,
        action_officer ? action_officer.trim() : null,
        assignedStatus,
        remarks ? remarks.trim() : null,
        scan_path,
        req.user.id,
      ]
    );

    return res.status(201).json({ file: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/files/:id ───────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         f.id, f.file_number, f.title, f.date_logged, f.reference_number,
         f.type, f.origin, f.destination, f.action_officer, f.status,
         f.remarks, f.scan_path, f.created_by, f.created_at, f.updated_at,
         u.full_name AS created_by_name
       FROM files f
       LEFT JOIN users u ON f.created_by = u.id
       WHERE f.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    return res.json({ file: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/files/:id ───────────────────────────────────────────────────────
router.put('/:id', upload.single('scan'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check file exists
    const existing = await pool.query('SELECT id, scan_path FROM files WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const {
      file_number,
      title,
      date_logged,
      reference_number,
      type,
      origin,
      destination,
      action_officer,
      status,
      remarks,
    } = req.body;

    if (type && !['incoming', 'outgoing'].includes(type)) {
      return res.status(400).json({ error: 'type must be "incoming" or "outgoing"' });
    }

    const validStatuses = ['Pending', 'In Progress', 'Completed', 'Returned'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    // If a new scan file is uploaded, use it; otherwise keep existing
    const scan_path = req.file ? req.file.filename : existing.rows[0].scan_path;

    const { rows } = await pool.query(
      `UPDATE files SET
         file_number     = COALESCE($1, file_number),
         title           = COALESCE($2, title),
         date_logged     = COALESCE($3, date_logged),
         reference_number= COALESCE($4, reference_number),
         type            = COALESCE($5, type),
         origin          = COALESCE($6, origin),
         destination     = COALESCE($7, destination),
         action_officer  = COALESCE($8, action_officer),
         status          = COALESCE($9, status),
         remarks         = COALESCE($10, remarks),
         scan_path       = $11,
         updated_at      = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        file_number ? file_number.trim() : null,
        title ? title.trim() : null,
        date_logged || null,
        reference_number !== undefined ? reference_number.trim() : null,
        type || null,
        origin !== undefined ? origin.trim() : null,
        destination !== undefined ? destination.trim() : null,
        action_officer !== undefined ? action_officer.trim() : null,
        status || null,
        remarks !== undefined ? remarks.trim() : null,
        scan_path,
        id,
      ]
    );

    return res.json({ file: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/files/:id ────────────────────────────────────────────────────
// Admin only
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { rows } = await pool.query(
      'DELETE FROM files WHERE id = $1 RETURNING id, file_number',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    return res.json({ message: 'File deleted successfully', deleted: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
