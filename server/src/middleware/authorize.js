const pool = require('../config/db');

/**
 * Middleware: requireOwner
 * Ensures the requesting user is the document owner.
 * Binds `req.document` to the request.
 */
async function requireOwner(req, res, next) {
  const documentId = req.params.id || req.params.documentId;
  const userId = req.user?.id;

  if (!documentId) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Document ID is required.',
      },
    });
  }

  try {
    const result = await pool.query(
      `SELECT d.*, u.name as owner_name 
       FROM documents d
       JOIN users u ON d.owner_id = u.id
       WHERE d.id = $1`,
      [documentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: `Document with ID '${documentId}' does not exist.`,
        },
      });
    }

    const doc = result.rows[0];

    if (doc.owner_id !== userId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to modify or manage this document.',
        },
      });
    }

    req.document = doc;
    req.isOwner = true;
    next();
  } catch (err) {
    console.error('Authorization error in requireOwner:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify document ownership permissions.',
      },
    });
  }
}

/**
 * Middleware: requireReadAccess
 * Ensures the requesting user is either the document owner OR has a share grant.
 * Binds `req.document` and `req.isOwner` (boolean) to the request.
 */
async function requireReadAccess(req, res, next) {
  const documentId = req.params.id || req.params.documentId;
  const userId = req.user?.id;

  if (!documentId) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Document ID is required.',
      },
    });
  }

  try {
    const result = await pool.query(
      `SELECT d.*, u.name as owner_name 
       FROM documents d
       JOIN users u ON d.owner_id = u.id
       WHERE d.id = $1`,
      [documentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: `Document with ID '${documentId}' does not exist.`,
        },
      });
    }

    const doc = result.rows[0];
    const isOwner = doc.owner_id === userId;

    if (isOwner) {
      req.document = doc;
      req.isOwner = true;
      return next();
    }

    // Check if shared with this user
    const shareResult = await pool.query(
      'SELECT id FROM shares WHERE document_id = $1 AND shared_with = $2',
      [documentId, userId]
    );

    if (shareResult.rowCount === 0) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this document.',
        },
      });
    }

    req.document = doc;
    req.isOwner = false;
    next();
  } catch (err) {
    console.error('Authorization error in requireReadAccess:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify document read permissions.',
      },
    });
  }
}

module.exports = {
  requireOwner,
  requireReadAccess,
};
