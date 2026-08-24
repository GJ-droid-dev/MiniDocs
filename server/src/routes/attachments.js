const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireOwner, requireReadAccess } = require('../middleware/authorize');
const { handleUpload, UPLOAD_DIR } = require('../middleware/upload');

/**
 * POST /api/documents/:id/attachment
 * Upload or replace single file attachment (Owner Only)
 */
router.post(
  '/:id/attachment',
  auth,
  requireOwner,
  handleUpload('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: 'No file provided. Please select a PDF, PNG, or JPG file.',
          },
        });
      }

      const documentId = req.document.id;
      const { originalname, filename, mimetype, size } = req.file;

      // 1. Check if an existing attachment exists on this document
      const existingRes = await pool.query(
        'SELECT id, stored_name FROM attachments WHERE document_id = $1',
        [documentId]
      );

      if (existingRes.rowCount > 0) {
        const oldAttachment = existingRes.rows[0];
        const oldFilePath = path.join(UPLOAD_DIR, oldAttachment.stored_name);
        
        // Remove old disk binary if present
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (unlinkErr) {
            console.warn('Could not delete old attachment file:', unlinkErr.message);
          }
        }

        // Delete old row
        await pool.query('DELETE FROM attachments WHERE id = $1', [oldAttachment.id]);
      }

      // 2. Insert new attachment record
      const insertRes = await pool.query(
        `INSERT INTO attachments (document_id, original_name, stored_name, mime_type, size_bytes, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [documentId, originalname, filename, mimetype, size]
      );

      const row = insertRes.rows[0];

      res.status(201).json({
        attachment: {
          id: row.id,
          documentId: row.document_id,
          originalName: row.original_name,
          mimeType: row.mime_type,
          sizeBytes: row.size_bytes,
          uploadedAt: row.uploaded_at,
        },
        message: 'File attached successfully.',
      });
    } catch (err) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
      }
      next(err);
    }
  }
);

/**
 * GET /api/documents/:id/attachment
 * Download / stream document attachment (Owner or Share Recipient)
 */
router.get('/:id/attachment', auth, requireReadAccess, async (req, res, next) => {
  try {
    const documentId = req.document.id;

    const result = await pool.query(
      'SELECT * FROM attachments WHERE document_id = $1',
      [documentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: {
          code: 'ATTACHMENT_NOT_FOUND',
          message: 'This document does not have any attached file.',
        },
      });
    }

    const attachment = result.rows[0];
    const filePath = path.join(UPLOAD_DIR, attachment.stored_name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND_ON_DISK',
          message: 'The requested file was not found on server storage.',
        },
      });
    }

    // Set download headers
    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${attachment.original_name.replace(/"/g, '')}"`
    );
    res.setHeader('Content-Length', attachment.size_bytes);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/documents/:id/attachment
 * Delete attachment from database and disk storage (Owner Only)
 */
router.delete('/:id/attachment', auth, requireOwner, async (req, res, next) => {
  try {
    const documentId = req.document.id;

    const result = await pool.query(
      'SELECT id, stored_name FROM attachments WHERE document_id = $1',
      [documentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: {
          code: 'ATTACHMENT_NOT_FOUND',
          message: 'No attachment found to delete.',
        },
      });
    }

    const attachment = result.rows[0];
    const filePath = path.join(UPLOAD_DIR, attachment.stored_name);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.warn('Could not delete disk file:', unlinkErr.message);
      }
    }

    await pool.query('DELETE FROM attachments WHERE id = $1', [attachment.id]);

    res.json({
      message: 'Attachment deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
