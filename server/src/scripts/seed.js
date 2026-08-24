const pool = require('../config/db');

const SEEDED_USERS = [
  { id: 'user-a', name: 'Alice (Owner)' },
  { id: 'user-b', name: 'Bob (Recipient)' },
];

async function runSeed() {
  console.log('🌱 Seeding users into Neon Postgres...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const user of SEEDED_USERS) {
      await client.query(
        `INSERT INTO users (id, name, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [user.id, user.name]
      );
      console.log(`   - Seeded user: ${user.id} (${user.name})`);
    }
    await client.query('COMMIT');
    console.log('✅ Seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runSeed;
