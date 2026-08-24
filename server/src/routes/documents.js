const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireOwner, requireReadAccess } = require('../middleware/authorize');

/**
 * Helper: Map database row to clean camelCase document object
 */
function toDocument(row, attachment = null) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasAttachment: row.has_attachment !== undefined ? Boolean(row.has_attachment) : attachment !== null,
    attachment: attachment
      ? {
          id: attachment.id,
          originalName: attachment.original_name,
          mimeType: attachment.mime_type,
          sizeBytes: attachment.size_bytes,
          uploadedAt: attachment.uploaded_at,
        }
      : null,
  };
}

/**
 * POST /api/documents
 * Create a new document (Owner = active user)
 */
router.post('/', auth, async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const documentTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Untitled Document';
    const documentContent = content && typeof content === 'object' ? content : { type: 'doc', content: [] };

    const result = await pool.query(
      `INSERT INTO documents (owner_id, title, content, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [req.user.id, documentTitle, documentContent]
    );

    const doc = result.rows[0];
    doc.owner_name = req.user.name;

    res.status(201).json({
      document: toDocument(doc),
      isOwner: true,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents
 * List owned and shared documents for the active user
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Fetch Owned Documents
    const ownedRes = await pool.query(
      `SELECT d.id, d.owner_id, d.title, d.created_at, d.updated_at,
              (SELECT COUNT(*) FROM attachments a WHERE a.document_id = d.id)::int > 0 AS has_attachment,
              u.name AS owner_name
       FROM documents d
       JOIN users u ON d.owner_id = u.id
       WHERE d.owner_id = $1
       ORDER BY d.updated_at DESC`,
      [userId]
    );

    // 2. Fetch Shared Documents
    const sharedRes = await pool.query(
      `SELECT d.id, d.owner_id, d.title, d.created_at, d.updated_at,
              (SELECT COUNT(*) FROM attachments a WHERE a.document_id = d.id)::int > 0 AS has_attachment,
              u.name AS owner_name,
              s.created_at AS shared_at
       FROM documents d
       JOIN users u ON d.owner_id = u.id
       JOIN shares s ON d.id = s.document_id
       WHERE s.shared_with = $1
       ORDER BY s.created_at DESC`,
      [userId]
    );

    const owned = ownedRes.rows.map((r) => toDocument(r));
    const shared = sharedRes.rows.map((r) => ({
      ...toDocument(r),
      sharedAt: r.shared_at,
    }));

    res.json({
      owned,
      shared,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:id
 * Fetch single document by ID with attachment metadata (Owner or Share Recipient)
 */
router.get('/:id', auth, requireReadAccess, async (req, res, next) => {
  try {
    const doc = req.document;

    // Fetch attachment metadata if exists
    const attachRes = await pool.query(
      `SELECT id, original_name, mime_type, size_bytes, uploaded_at
       FROM attachments
       WHERE document_id = $1`,
      [doc.id]
    );

    const attachment = attachRes.rows[0] || null;

    res.json({
      document: toDocument(doc, attachment),
      isOwner: req.isOwner,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/documents/:id
 * Update document title and/or Tiptap JSONB content (Owner Only)
 */
router.patch('/:id', auth, requireOwner, async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (title === undefined && content === undefined) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'At least title or content must be provided for update.',
        },
      });
    }

    let updatedTitle = null;
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Title must be a non-empty string.',
          },
        });
      }
      updatedTitle = title.trim();
    }

    let updatedContent = null;
    if (content !== undefined) {
      if (!content || typeof content !== 'object') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Content must be a valid JSON object structure.',
          },
        });
      }
      updatedContent = content;
    }

    const result = await pool.query(
      `UPDATE documents
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [updatedTitle, updatedContent, req.document.id]
    );

    const updatedDoc = result.rows[0];
    updatedDoc.owner_name = req.document.owner_name;

    // Fetch attachment if any
    const attachRes = await pool.query(
      `SELECT id, original_name, mime_type, size_bytes, uploaded_at
       FROM attachments
       WHERE document_id = $1`,
      [updatedDoc.id]
    );
    const attachment = attachRes.rows[0] || null;

    res.json({
      document: toDocument(updatedDoc, attachment),
      isOwner: true,
      message: 'Document saved successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/documents/:id
 * Delete document and cascade delete attachments & shares (Owner Only)
 */
router.delete('/:id', auth, requireOwner, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM documents WHERE id = $1', [req.document.id]);
    res.json({
      message: 'Document deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
