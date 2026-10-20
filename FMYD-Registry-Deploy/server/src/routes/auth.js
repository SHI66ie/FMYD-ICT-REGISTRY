const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { rows } = await pool.query(
      'SELECT id, username, password_hash, full_name, role FROM users WHERE username = $1',
      [username.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'changeme', {
      expiresIn: '8h',
    });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Admin only — creates a new user
router.post('/register', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const username = req.body.username;
    const password = req.body.password;
    const full_name = req.body.full_name || req.body.fullName;
    const role = req.body.role;

    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'username, password, and full_name are required' });
    }

    const validRoles = ['admin', 'staff'];
    const assignedRole = validRoles.includes(role) ? role : 'staff';

    // Check if username already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username.trim().toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const id = uuidv4();

    const { rows } = await pool.query(
      `INSERT INTO users (id, username, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, full_name, role, created_at`,
      [id, username.trim().toLowerCase(), password_hash, full_name.trim(), assignedRole]
    );

    return res.status(201).json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, full_name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
