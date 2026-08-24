const pool = require('../config/db');

const migrationSql = `
  -- Enable pgcrypto for gen_random_uuid if not built-in
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- 1. Seeded Users Table
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 2. Documents Table (Content stored as JSONB for Tiptap document tree)
  CREATE TABLE IF NOT EXISTS documents (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL DEFAULT 'Untitled Document',
    content    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 3. Attachments Table (Metadata for files stored on volume)
  CREATE TABLE IF NOT EXISTS attachments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    stored_name   TEXT NOT NULL UNIQUE,
    mime_type     TEXT NOT NULL,
    size_bytes    INTEGER NOT NULL,
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 4. Shares Table (Read permissions granted to peer users)
  CREATE TABLE IF NOT EXISTS shares (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    shared_with TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_document_share UNIQUE (document_id, shared_with)
  );

  -- Indexes for query performance
  CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
  CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON shares(shared_with);
  CREATE INDEX IF NOT EXISTS idx_attachments_document ON attachments(document_id);
`;

async function runMigration() {
  console.log('⚡ Starting Neon PostgreSQL migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migrationSql);
    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully.');
    console.log('   - Tables: users, documents, attachments, shares');
    console.log('   - Indexes & Constraints created');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigration;
