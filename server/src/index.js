require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const usersRoutes = require('./routes/users');
const documentsRoutes = require('./routes/documents');
const attachmentsRoutes = require('./routes/attachments');
const sharesRoutes = require('./routes/shares');
const versionsRoutes = require('./routes/versions');

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Global Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        CORS_ORIGIN,
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
      ];

      // Also allow Vercel preview and production deployments
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }

      return callback(null, true); // Permissive in dev, can restrict in strict prod
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-User-Id', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (FR6 & Phase 1 verification)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MiniDocs API is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// Mount Resource Routes
app.use('/api/users', usersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/documents', attachmentsRoutes);         // e.g. /api/documents/:id/attachment
app.use('/api/documents', sharesRoutes);              // e.g. /api/documents/:id/shares
app.use('/api/documents/:id/versions', versionsRoutes); // e.g. /api/documents/:id/versions

// Central 404 Handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `API endpoint ${req.method} ${req.originalUrl} not found.`,
    },
  });
});

// Central Error Handler (Conventions §5.4)
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || (status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR'),
      message: err.message || 'An unexpected error occurred.',
    },
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 MiniDocs server listening on http://localhost:${PORT}`);
    console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  });
}

module.exports = app;
