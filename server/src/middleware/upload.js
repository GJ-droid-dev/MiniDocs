const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 5 MB maximum file size limit
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes

// Allowed MIME types
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const storedName = `${uuidv4()}${ext}`;
    cb(null, storedName);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(mime) || !ALLOWED_EXTENSIONS.includes(ext)) {
    const error = new Error('Invalid file type. Only PDF, PNG, and JPG files are supported.');
    error.code = 'INVALID_FILE_TYPE';
    error.status = 400;
    return cb(error, false);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

/**
 * Wrapper middleware to handle multer errors gracefully
 */
function handleUpload(fieldName) {
  const uploadSingle = upload.single(fieldName);

  return (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: 'File exceeds the maximum allowed size of 5 MB.',
            },
          });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            error: {
              code: 'INVALID_FILE_TYPE',
              message: err.message,
            },
          });
        }
        return res.status(400).json({
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message || 'An error occurred during file upload.',
          },
        });
      }
      next();
    });
  };
}

module.exports = {
  upload,
  handleUpload,
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
};
