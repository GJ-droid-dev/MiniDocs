const pool = require('../config/db');

/**
 * Authentication Middleware
 * Validates the X-User-Id request header against the Neon Postgres `users` table.
 * If valid, binds req.user = { id, name } to the request.
 * If missing or invalid, responds with 401 Unauthorized.
 */
async function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please provide a valid X-User-Id header.',
      },
    });
  }

  try {
    const result = await pool.query('SELECT id, name FROM users WHERE id = $1', [userId]);

    if (result.rowCount === 0) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: `User '${userId}' not found or invalid.`,
        },
      });
    }

    req.user = {
      id: result.rows[0].id,
      name: result.rows[0].name,
    };

    next();
  } catch (err) {
    console.error('Auth middleware database error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to authenticate user identity.',
      },
    });
  }
}

module.exports = authMiddleware;
