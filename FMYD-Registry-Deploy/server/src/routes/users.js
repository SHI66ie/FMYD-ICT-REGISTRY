const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All user management routes require authentication
router.use(authMiddleware);

// Helper: admin guard
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

function formatUser(u) {
  if (!u) return null;
  return {
    ...u,
    fullName: u.full_name,
    createdAt: u.created_at,
  };
}

// ─── GET /api/users ───────────────────────────────────────────────────────────
// Admin only — list all users
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at DESC'
    );
    const users = rows.map(formatUser);
    return res.json({ users, data: users });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
// Admin only — update user details (full_name, role, password)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const full_name = req.body.full_name || req.body.fullName;
    const role = req.body.role;
    const password = req.body.password;

    // Check user exists
    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validRoles = ['admin', 'staff'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'role must be "admin" or "staff"' });
    }

    let password_hash = null;
    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      password_hash = await bcrypt.hash(password.trim(), salt);
    }

    const { rows } = await pool.query(
      `UPDATE users SET
         full_name     = COALESCE($1, full_name),
         role          = COALESCE($2, role),
         password_hash = COALESCE($3, password_hash)
       WHERE id = $4
       RETURNING id, username, full_name, role, created_at`,
      [
        full_name ? full_name.trim() : null,
        role || null,
        password_hash,
        id,
      ]
    );

    return res.json({ user: formatUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
// Admin only — delete user (cannot delete yourself)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const { rows } = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, username',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ message: 'User deleted successfully', deleted: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
