const fs = require('fs');
const path = require('path');
const http = require('http');
const pool = require('../config/db');
const app = require('../index');

function makeRequest(server, path, method = 'GET', headers = {}) {
  const port = server.address().port;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          Origin: 'http://localhost:5173',
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let body = data;
          try {
            body = JSON.parse(data);
          } catch (e) {
            // Keep as string if not JSON
          }
          resolve({ status: res.statusCode, headers: res.headers, body });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function validateAll() {
  console.log('====================================================');
  console.log('  🔍 VALIDATION SUITE: PHASES 1 TO 3');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${testName}`);
      if (details) console.log(`     └─ ${details}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     └─ ${details}`);
    }
  }

  // ----------------------------------------------------
  // SECTION 1: PHASE 1 SCAFFOLD & STRUCTURE VALIDATION
  // ----------------------------------------------------
  console.log('📁 SECTION 1: Phase 1 Workspace & Configuration');

  const rootDir = path.join(__dirname, '../../../');
  const clientDir = path.join(rootDir, 'client');
  const serverDir = path.join(rootDir, 'server');

  assert(fs.existsSync(path.join(rootDir, 'package.json')), 'Root package.json exists');
  assert(fs.existsSync(path.join(rootDir, '.gitignore')), 'Root .gitignore exists');
  assert(fs.existsSync(path.join(rootDir, '.prettierrc')), 'Root .prettierrc exists');
  assert(fs.existsSync(path.join(rootDir, 'README.md')), 'Root README.md exists');
  
  assert(fs.existsSync(path.join(clientDir, 'package.json')), 'Client package.json exists');
  assert(fs.existsSync(path.join(clientDir, 'vercel.json')), 'Client vercel.json (SPA rewrite) exists');
  assert(fs.existsSync(path.join(clientDir, 'vite.config.js')), 'Client vite.config.js (API proxy) exists');
  assert(fs.existsSync(path.join(clientDir, 'src/index.css')), 'Client index.css (Design system tokens) exists');
  
  assert(fs.existsSync(path.join(serverDir, 'package.json')), 'Server package.json exists');
  assert(fs.existsSync(path.join(serverDir, '.env')), 'Server .env exists');
  assert(fs.existsSync(path.join(serverDir, '.env.example')), 'Server .env.example exists');
  assert(fs.existsSync(path.join(serverDir, 'src/config/db.js')), 'Server db.js connection pool exists');
  assert(fs.existsSync(path.join(serverDir, 'src/index.js')), 'Server index.js entrypoint exists');

  // ----------------------------------------------------
  // SECTION 2: PHASE 2 DATABASE & SEED VALIDATION (NEON)
  // ----------------------------------------------------
  console.log('\n🗄️  SECTION 2: Phase 2 Neon Postgres Database & Seeds');

  const client = await pool.connect();
  try {
    // 2.1 Table Existence
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);
    const requiredTables = ['attachments', 'documents', 'shares', 'users'];
    
    assert(
      requiredTables.every((t) => tables.includes(t)),
      'Database Schema: 4 core tables exist in Neon Postgres',
      `Found tables: [${tables.join(', ')}]`
    );

    // 2.2 Documents table column inspection (JSONB & UUID)
    const docColsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents';
    `);
    const docCols = Object.fromEntries(docColsRes.rows.map((r) => [r.column_name, r.data_type]));
    
    assert(docCols.content === 'jsonb', 'Documents Schema: content column is native JSONB for Tiptap trees', `type=${docCols.content}`);
    assert(docCols.id === 'uuid', 'Documents Schema: primary key id is UUID', `type=${docCols.id}`);

    // 2.3 Foreign Keys and Cascades
    const fkRes = await client.query(`
      SELECT tc.constraint_name, rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'documents';
    `);
    assert(
      fkRes.rows.some((r) => r.delete_rule === 'CASCADE'),
      'Relational Integrity: Foreign keys configured with ON DELETE CASCADE'
    );

    // 2.4 Seeded Users
    const usersRes = await client.query('SELECT id, name, created_at FROM users ORDER BY id ASC;');
    assert(usersRes.rowCount >= 2, 'Seeded Personas: At least 2 personas exist in Neon', `Found ${usersRes.rowCount} users`);
    
    const userA = usersRes.rows.find((u) => u.id === 'user-a');
    const userB = usersRes.rows.find((u) => u.id === 'user-b');
    assert(userA && userA.name.includes('Alice'), 'Persona A: Alice (Owner) is seeded (id: user-a)');
    assert(userB && userB.name.includes('Bob'), 'Persona B: Bob (Recipient) is seeded (id: user-b)');

  } catch (dbErr) {
    assert(false, 'Neon Postgres Database Connection & Inspection', dbErr.message);
  } finally {
    client.release();
  }

  // ----------------------------------------------------
  // SECTION 3: PHASE 1 & 3 API SERVER & AUTH VALIDATION
  // ----------------------------------------------------
  console.log('\n🌐 SECTION 3: Phase 1 & 3 API Endpoints & Auth Middleware');

  const server = app.listen(0);

  try {
    // 3.1 Health Check (Phase 1)
    const health = await makeRequest(server, '/api/health');
    assert(
      health.status === 200 && health.body.status === 'ok',
      'API Health: GET /api/health responds with status 200 OK',
      JSON.stringify(health.body)
    );
    assert(
      health.headers['access-control-allow-origin'] !== undefined,
      'CORS: Access-Control-Allow-Origin header is present for allowed frontend origin',
      `Allow-Origin: ${health.headers['access-control-allow-origin']}`
    );

    // 3.2 Public Users Endpoint (Phase 3)
    const publicUsers = await makeRequest(server, '/api/users');
    assert(
      publicUsers.status === 200 && Array.isArray(publicUsers.body.users) && publicUsers.body.users.length >= 2,
      'Users API: GET /api/users is public and returns persona list',
      `Users: ${publicUsers.body.users?.map((u) => u.id).join(', ')}`
    );

    // 3.3 Authenticated User Profile (Phase 3)
    const authMe = await makeRequest(server, '/api/users/me', 'GET', { 'x-user-id': 'user-a' });
    assert(
      authMe.status === 200 && authMe.body.user?.id === 'user-a',
      'Auth Middleware: Authenticated request with X-User-Id resolves active persona',
      `Resolved user: ${authMe.body.user?.name}`
    );

    // 3.4 Target User Profile
    const targetUser = await makeRequest(server, '/api/users/user-b', 'GET', { 'x-user-id': 'user-a' });
    assert(
      targetUser.status === 200 && targetUser.body.user?.id === 'user-b',
      'Users API: GET /api/users/:id fetches peer persona profile'
    );

    // 3.5 Auth Guard Rejection (Missing Header)
    const unauthReq = await makeRequest(server, '/api/users/me', 'GET', { 'x-user-id': '' });
    assert(
      unauthReq.status === 401 && unauthReq.body.error?.code === 'UNAUTHORIZED',
      'Auth Guard: Request without X-User-Id rejected with 401 UNAUTHORIZED',
      `Error code: ${unauthReq.body.error?.code}`
    );

    // 3.6 Auth Guard Rejection (Invalid Persona)
    const invalidAuthReq = await makeRequest(server, '/api/users/me', 'GET', { 'x-user-id': 'hacker-persona-999' });
    assert(
      invalidAuthReq.status === 401 && invalidAuthReq.body.error?.code === 'UNAUTHORIZED',
      'Auth Guard: Request with invalid persona ID rejected with 401 UNAUTHORIZED'
    );

    // 3.7 Central 404 Handler
    const notFoundReq = await makeRequest(server, '/api/unknown-endpoint');
    assert(
      notFoundReq.status === 404 && notFoundReq.body.error?.code === 'NOT_FOUND',
      'Error Handling: Central 404 handler returns consistent error shape',
      `Error: ${notFoundReq.body.error?.message}`
    );

  } catch (apiErr) {
    assert(false, 'API Server Integration Tests', apiErr.message);
  } finally {
    server.close();
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`  🏁 VALIDATION COMPLETE: ${passed}/${total} TESTS PASSED`);
  if (passed === total) {
    console.log('  🎉 PHASES 1, 2, AND 3 ARE FULLY VERIFIED & VALIDATED!');
  } else {
    console.log('  ⚠️ SOME TESTS FAILED. PLEASE REVIEW THE LOGS ABOVE.');
  }
  console.log('====================================================\n');

  await pool.end();
  process.exit(passed === total ? 0 : 1);
}

validateAll();
