const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const upload = require('../upload');

const router = express.Router();

// All file routes require authentication
router.use(authMiddleware);

const VALID_CATEGORIES = ['Correspondence', 'Report', 'Memo', 'Other'];

// Helper to provide both snake_case and camelCase keys
function formatFile(row) {
  if (!row) return null;
  return {
    ...row,
    fileNumber: row.file_number,
    dateLogged: row.date_logged,
    referenceNumber: row.reference_number,
    actionOfficer: row.action_officer,
    scanPath: row.scan_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.created_by_name,
  };
}

function formatReceipt(row) {
  if (!row) return null;
  return {
    ...row,
    fileId: row.file_id,
    receivedBy: row.received_by,
    createdAt: row.created_at,
  };
}

// ─── GET /api/files ───────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      q,
      search,
      type,
      status,
      category,
      date_from,
      startDate,
      date_to,
      endDate,
    } = req.query;

    const searchTerm = (q || search || '').trim();
    const filterDateFrom = date_from || startDate;
    const filterDateTo = date_to || endDate;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build dynamic WHERE clauses
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (searchTerm) {
      conditions.push(
        `(f.title ILIKE $${paramIndex} OR f.file_number ILIKE $${paramIndex} OR f.reference_number ILIKE $${paramIndex} OR f.origin ILIKE $${paramIndex} OR f.action_officer ILIKE $${paramIndex})`
      );
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (type && type.toLowerCase() !== 'all' && ['incoming', 'outgoing'].includes(type.toLowerCase())) {
      conditions.push(`f.type = $${paramIndex}`);
      params.push(type.toLowerCase());
      paramIndex++;
    }

    if (status && status.toLowerCase() !== 'all') {
      const formattedStatus = status.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      if (['Pending', 'In Progress', 'Completed', 'Returned'].includes(formattedStatus)) {
        conditions.push(`f.status = $${paramIndex}`);
        params.push(formattedStatus);
        paramIndex++;
      }
    }

    if (category && VALID_CATEGORIES.includes(category)) {
      conditions.push(`EXISTS (SELECT 1 FROM file_receipts r WHERE r.file_id = f.id AND r.category = $${paramIndex})`);
      params.push(category);
      paramIndex++;
    }

    if (filterDateFrom) {
      conditions.push(`f.date_logged >= $${paramIndex}`);
      params.push(filterDateFrom);
      paramIndex++;
    }

    if (filterDateTo) {
      conditions.push(`f.date_logged <= $${paramIndex}`);
      params.push(filterDateTo);
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

    const formattedRows = rows.map(formatFile);

    return res.json({
      data: formattedRows,
      files: formattedRows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum),
      },
      total,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/files ──────────────────────────────────────────────────────────
router.post('/', upload.single('scan'), async (req, res, next) => {
  try {
    const file_number = req.body.file_number || req.body.fileNumber;
    const title = req.body.title;
    const date_logged = req.body.date_logged || req.body.dateLogged;
    const reference_number = req.body.reference_number || req.body.referenceNumber;
    const type = (req.body.type || '').toLowerCase();
    const origin = req.body.origin;
    const destination = req.body.destination;
    const action_officer = req.body.action_officer || req.body.actionOfficer;
    const status = req.body.status;
    const remarks = req.body.remarks;

    // New receipt fields (inline on form)
    const received_by = req.body.received_by || req.body.receivedBy;
    const subject = req.body.subject;
    const category = req.body.category;

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

    // If receipt info was provided inline, create a receipt record
    if (received_by && received_by.trim()) {
      const receiptId = uuidv4();
      const receiptCategory = VALID_CATEGORIES.includes(category) ? category : 'Other';
      await pool.query(
        `INSERT INTO file_receipts (id, file_id, received_by, subject, category)
         VALUES ($1, $2, $3, $4, $5)`,
        [receiptId, id, received_by.trim(), subject ? subject.trim() : null, receiptCategory]
      );
    }

    // Fetch receipts for the response
    const receipts = await pool.query(
      'SELECT * FROM file_receipts WHERE file_id = $1 ORDER BY created_at DESC',
      [id]
    );

    const fileResult = formatFile(rows[0]);
    fileResult.receipts = receipts.rows.map(formatReceipt);

    return res.status(201).json({ file: fileResult });
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

    // Fetch receipts for this file
    const receipts = await pool.query(
      'SELECT * FROM file_receipts WHERE file_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    const fileResult = formatFile(rows[0]);
    fileResult.receipts = receipts.rows.map(formatReceipt);

    return res.json({ file: fileResult });
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

    const file_number = req.body.file_number || req.body.fileNumber;
    const title = req.body.title;
    const date_logged = req.body.date_logged || req.body.dateLogged;
    const reference_number = req.body.reference_number !== undefined ? req.body.reference_number : req.body.referenceNumber;
    const type = req.body.type ? req.body.type.toLowerCase() : undefined;
    const origin = req.body.origin;
    const destination = req.body.destination;
    const action_officer = req.body.action_officer !== undefined ? req.body.action_officer : req.body.actionOfficer;
    const status = req.body.status;
    const remarks = req.body.remarks;

    // New receipt fields (inline on form)
    const received_by = req.body.received_by || req.body.receivedBy;
    const subject = req.body.subject;
    const category = req.body.category;

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
         updated_at      = DATETIME('now')
       WHERE id = $12
       RETURNING *`,
      [
        file_number ? file_number.trim() : null,
        title ? title.trim() : null,
        date_logged || null,
        reference_number !== undefined ? (reference_number ? reference_number.trim() : null) : null,
        type || null,
        origin !== undefined ? (origin ? origin.trim() : null) : null,
        destination !== undefined ? (destination ? destination.trim() : null) : null,
        action_officer !== undefined ? (action_officer ? action_officer.trim() : null) : null,
        status || null,
        remarks !== undefined ? (remarks ? remarks.trim() : null) : null,
        scan_path,
        id,
      ]
    );

    // If receipt info was provided inline, create a new receipt record
    if (received_by && received_by.trim()) {
      const receiptId = uuidv4();
      const receiptCategory = VALID_CATEGORIES.includes(category) ? category : 'Other';
      await pool.query(
        `INSERT INTO file_receipts (id, file_id, received_by, subject, category)
         VALUES ($1, $2, $3, $4, $5)`,
        [receiptId, id, received_by.trim(), subject ? subject.trim() : null, receiptCategory]
      );
    }

    // Fetch receipts for the response
    const receipts = await pool.query(
      'SELECT * FROM file_receipts WHERE file_id = $1 ORDER BY created_at DESC',
      [id]
    );

    const fileResult = formatFile(rows[0]);
    fileResult.receipts = receipts.rows.map(formatReceipt);

    return res.json({ file: fileResult });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/files/:id/receipts ──────────────────────────────────────────────
router.get('/:id/receipts', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM file_receipts WHERE file_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    return res.json({ receipts: rows.map(formatReceipt) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/files/:id/receipts ─────────────────────────────────────────────
router.post('/:id/receipts', async (req, res, next) => {
  try {
    // Verify file exists
    const file = await pool.query('SELECT id FROM files WHERE id = $1', [req.params.id]);
    if (file.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const received_by = req.body.received_by || req.body.receivedBy;
    const subject = req.body.subject;
    const category = req.body.category;

    if (!received_by || !received_by.trim()) {
      return res.status(400).json({ error: 'received_by is required' });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO file_receipts (id, file_id, received_by, subject, category)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.params.id, received_by.trim(), subject ? subject.trim() : null, category]
    );

    const receipt = await pool.query('SELECT * FROM file_receipts WHERE id = $1', [id]);
    return res.status(201).json({ receipt: formatReceipt(receipt.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/files/:id/receipts/:receiptId ────────────────────────────────
router.delete('/:id/receipts/:receiptId', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM file_receipts WHERE id = $1 AND file_id = $2 RETURNING id',
      [req.params.receiptId, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    return res.json({ message: 'Receipt deleted successfully' });
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
