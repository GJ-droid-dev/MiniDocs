const pool = require('../config/db');

async function verifyDatabase() {
  console.log('🔍 Verifying Neon PostgreSQL schema & records...');
  const client = await pool.connect();
  try {
    // 1. Check Tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);
    console.log('   - Existing Tables in DB:', tables.join(', '));

    const requiredTables = ['users', 'documents', 'attachments', 'shares'];
    for (const t of requiredTables) {
      if (!tables.includes(t)) {
        throw new Error(`Missing expected table: ${t}`);
      }
    }

    // 2. Check Users
    const usersRes = await client.query('SELECT id, name, created_at FROM users ORDER BY id;');
    console.log('   - Seeded Users count:', usersRes.rowCount);
    usersRes.rows.forEach((u) => {
      console.log(`     * ID: ${u.id} | Name: ${u.name} | CreatedAt: ${u.created_at}`);
    });

    if (usersRes.rowCount < 2) {
      throw new Error('Expected at least 2 seeded users (user-a, user-b)');
    }

    console.log('🎉 Phase 2 Database Verification PASSED!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyDatabase();
