const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

/**
 * GET /api/users
 * Public: List all seeded users (for login persona selector)
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name, created_at FROM users ORDER BY id ASC');
    const users = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    }));

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/me
 * Authenticated: Get current active user info
 */
router.get('/me', auth, async (req, res, next) => {
  res.json({ user: req.user });
});

/**
 * GET /api/users/:id
 * Authenticated: Get specific user profile by ID
 */
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, name, created_at FROM users WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: `User with ID '${id}' does not exist.`,
        },
      });
    }

    const row = result.rows[0];
    res.json({
      user: {
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
