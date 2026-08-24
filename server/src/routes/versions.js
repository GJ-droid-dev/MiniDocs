const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireOwner, requireReadAccess } = require('../middleware/authorize');

const MAX_VERSIONS_PER_DOC = 50;

function toVersion(row, includeContent = false) {
  const version = {
    id: row.id,
    documentId: row.document_id,
    createdBy: row.created_by,
    authorName: row.author_name || row.created_by,
    label: row.label || null,
    createdAt: row.created_at,
  };
  if (includeContent) {
    version.content = row.content;
  }
  return version;
}

/**
 * GET /api/documents/:id/versions
 * List all historical versions for a document (timeline metadata)
 * Access: Owner or Share Recipient
 */
router.get('/', auth, requireReadAccess, async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const result = await pool.query(
      `SELECT v.id, v.document_id, v.created_by, v.label, v.created_at, u.name as author_name
       FROM versions v
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.document_id = $1
       ORDER BY v.created_at DESC`,
      [documentId]
    );

    res.json({
      versions: result.rows.map((r) => toVersion(r, false)),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/documents/:id/versions
 * Create a new version snapshot from current document content
 * Access: Owner Only
 */
router.post('/', auth, requireOwner, async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const { label } = req.body;
    const versionLabel = typeof label === 'string' && label.trim() ? label.trim() : null;

    // 1. Fetch current document content
    const docResult = await pool.query(
      `SELECT content FROM documents WHERE id = $1`,
      [documentId]
    );

    if (docResult.rowCount === 0) {
      const err = new Error('Document not found.');
      err.status = 404;
      err.code = 'DOCUMENT_NOT_FOUND';
      throw err;
    }

    const currentContent = docResult.rows[0].content;

    // 2. Insert new version snapshot
    const insertResult = await pool.query(
      `INSERT INTO versions (document_id, created_by, label, content, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [documentId, req.user.id, versionLabel, currentContent]
    );

    const newVersion = insertResult.rows[0];
    newVersion.author_name = req.user.name;

    // 3. Enforce bounded retention cap (keep latest 50 versions)
    await pool.query(
      `DELETE FROM versions
       WHERE id IN (
         SELECT id FROM versions
         WHERE document_id = $1
         ORDER BY created_at DESC
         OFFSET $2
       )`,
      [documentId, MAX_VERSIONS_PER_DOC]
    );

    res.status(201).json({
      message: 'Version snapshot created successfully.',
      version: toVersion(newVersion, true),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:id/versions/:versionId
 * Fetch single version content AST for preview
 * Access: Owner or Share Recipient
 */
router.get('/:versionId', auth, requireReadAccess, async (req, res, next) => {
  try {
    const { id: documentId, versionId } = req.params;

    const result = await pool.query(
      `SELECT v.*, u.name as author_name
       FROM versions v
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.id = $1 AND v.document_id = $2`,
      [versionId, documentId]
    );

    if (result.rowCount === 0) {
      const err = new Error('Version snapshot not found.');
      err.status = 404;
      err.code = 'VERSION_NOT_FOUND';
      throw err;
    }

    res.json({
      version: toVersion(result.rows[0], true),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/documents/:id/versions/:versionId/restore
 * Restore document content to a chosen version snapshot
 * Access: Owner Only
 */
router.post('/:versionId/restore', auth, requireOwner, async (req, res, next) => {
  try {
    const { id: documentId, versionId } = req.params;

    // 1. Fetch target version
    const versionResult = await pool.query(
      `SELECT * FROM versions WHERE id = $1 AND document_id = $2`,
      [versionId, documentId]
    );

    if (versionResult.rowCount === 0) {
      const err = new Error('Version snapshot to restore not found.');
      err.status = 404;
      err.code = 'VERSION_NOT_FOUND';
      throw err;
    }

    const targetVersion = versionResult.rows[0];

    // 2. Fetch current document content and save automatic pre-restore backup
    const currentDoc = await pool.query(
      `SELECT content FROM documents WHERE id = $1`,
      [documentId]
    );

    if (currentDoc.rowCount > 0) {
      const preRestoreLabel = targetVersion.label
        ? `Pre-restore (before ${targetVersion.label})`
        : `Pre-restore backup`;

      await pool.query(
        `INSERT INTO versions (document_id, created_by, label, content, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [documentId, req.user.id, preRestoreLabel, currentDoc.rows[0].content]
      );
    }

    // 3. Update documents table content with target version content
    const updateResult = await pool.query(
      `UPDATE documents
       SET content = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [targetVersion.content, documentId]
    );

    const doc = updateResult.rows[0];
    doc.owner_name = req.user.name;

    res.json({
      message: 'Document restored to selected version successfully.',
      document: {
        id: doc.id,
        ownerId: doc.owner_id,
        ownerName: doc.owner_name,
        title: doc.title,
        content: doc.content,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      },
      restoredFromVersionId: versionId,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/documents/:id/versions/:versionId
 * Update version snapshot label
 * Access: Owner Only
 */
router.patch('/:versionId', auth, requireOwner, async (req, res, next) => {
  try {
    const { id: documentId, versionId } = req.params;
    const { label } = req.body;
    const versionLabel = typeof label === 'string' && label.trim() ? label.trim() : null;

    const result = await pool.query(
      `UPDATE versions
       SET label = $1
       WHERE id = $2 AND document_id = $3
       RETURNING *`,
      [versionLabel, versionId, documentId]
    );

    if (result.rowCount === 0) {
      const err = new Error('Version snapshot not found.');
      err.status = 404;
      err.code = 'VERSION_NOT_FOUND';
      throw err;
    }

    res.json({
      message: 'Version label updated.',
      version: toVersion(result.rows[0], false),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/documents/:id/versions/:versionId
 * Delete a specific version snapshot
 * Access: Owner Only
 */
router.delete('/:versionId', auth, requireOwner, async (req, res, next) => {
  try {
    const { id: documentId, versionId } = req.params;

    const result = await pool.query(
      `DELETE FROM versions WHERE id = $1 AND document_id = $2 RETURNING id`,
      [versionId, documentId]
    );

    if (result.rowCount === 0) {
      const err = new Error('Version snapshot not found.');
      err.status = 404;
      err.code = 'VERSION_NOT_FOUND';
      throw err;
    }

    res.json({
      message: 'Version snapshot deleted successfully.',
      deletedVersionId: versionId,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
