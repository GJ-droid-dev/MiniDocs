const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const isProduction = process.env.NODE_ENV === 'production';
const isRemote = connectionString && (connectionString.includes('neon.tech') || connectionString.includes('sslmode=require'));

const pool = new Pool({
  connectionString: connectionString || 'postgres://postgres:postgres@localhost:5432/minidocs',
  ssl: isRemote || isProduction ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = pool;
