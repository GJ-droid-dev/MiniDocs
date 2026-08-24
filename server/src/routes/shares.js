const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireOwner } = require('../middleware/authorize');

/**
 * POST /api/documents/:id/shares
 * Grant read access to another user (Owner Only)
 */
router.post('/:id/shares', auth, requireOwner, async (req, res, next) => {
  try {
    const documentId = req.document.id;
    const { userId } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'Recipient userId is required to share document.',
        },
      });
    }

    // Disallow sharing with self
    if (userId === req.user.id) {
      return res.status(400).json({
        error: {
          code: 'CANNOT_SHARE_WITH_SELF',
          message: 'You already own this document and cannot share it with yourself.',
        },
      });
    }

    // Verify recipient user exists
    const userRes = await pool.query('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({
        error: {
          code: 'RECIPIENT_NOT_FOUND',
          message: `User '${userId}' does not exist.`,
        },
      });
    }

    const recipient = userRes.rows[0];

    // Check if already shared
    const existingShare = await pool.query(
      'SELECT id FROM shares WHERE document_id = $1 AND shared_with = $2',
      [documentId, userId]
    );

    if (existingShare.rowCount > 0) {
      return res.status(409).json({
        error: {
          code: 'ALREADY_SHARED',
          message: `This document is already shared with ${recipient.name}.`,
        },
      });
    }

    // Insert share grant
    const insertRes = await pool.query(
      `INSERT INTO shares (document_id, shared_with, created_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [documentId, userId]
    );

    const share = insertRes.rows[0];

    res.status(201).json({
      share: {
        id: share.id,
        documentId: share.document_id,
        sharedWith: share.shared_with,
        recipientName: recipient.name,
        createdAt: share.created_at,
      },
      message: `Document successfully shared with ${recipient.name}.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:id/shares
 * List all users this document is shared with (Owner Only)
 */
router.get('/:id/shares', auth, requireOwner, async (req, res, next) => {
  try {
    const documentId = req.document.id;

    const result = await pool.query(
      `SELECT s.id, s.document_id, s.shared_with, u.name AS recipient_name, s.created_at
       FROM shares s
       JOIN users u ON s.shared_with = u.id
       WHERE s.document_id = $1
       ORDER BY s.created_at ASC`,
      [documentId]
    );

    const shares = result.rows.map((r) => ({
      id: r.id,
      documentId: r.document_id,
      sharedWith: r.shared_with,
      recipientName: r.recipient_name,
      createdAt: r.created_at,
    }));

    res.json({ shares });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/documents/:id/shares/:userId
 * Revoke share access from a recipient (Owner Only)
 */
router.delete('/:id/shares/:userId', auth, requireOwner, async (req, res, next) => {
  try {
    const documentId = req.document.id;
    const { userId } = req.params;

    const result = await pool.query(
      'DELETE FROM shares WHERE document_id = $1 AND shared_with = $2 RETURNING id',
      [documentId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: {
          code: 'SHARE_NOT_FOUND',
          message: 'No active share found for this user.',
        },
      });
    }

    res.json({
      message: 'Share access revoked successfully.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
