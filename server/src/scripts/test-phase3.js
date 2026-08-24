const http = require('http');
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
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Running Phase 3 Auth & Users Tests...');
  const server = app.listen(0);

  try {
    // Test 1: GET /api/users (Public)
    const test1 = await makeRequest(server, '/api/users');
    console.log('   [1] GET /api/users status:', test1.status);
    console.log('       Users found:', test1.body.users?.map((u) => u.name).join(', '));
    if (test1.status !== 200 || !test1.body.users || test1.body.users.length < 2) {
      throw new Error('Test 1 failed: GET /api/users did not return expected user list');
    }

    // Test 2: GET /api/users/me with X-User-Id: user-a
    const test2 = await makeRequest(server, '/api/users/me', 'GET', { 'x-user-id': 'user-a' });
    console.log('   [2] GET /api/users/me (valid auth) status:', test2.status, '| User:', test2.body.user?.name);
    if (test2.status !== 200 || test2.body.user?.id !== 'user-a') {
      throw new Error('Test 2 failed: Valid auth failed to authenticate user-a');
    }

    // Test 3: GET /api/users/user-b with X-User-Id: user-a
    const test3 = await makeRequest(server, '/api/users/user-b', 'GET', { 'x-user-id': 'user-a' });
    console.log('   [3] GET /api/users/user-b (valid auth) status:', test3.status, '| Target User:', test3.body.user?.name);
    if (test3.status !== 200 || test3.body.user?.id !== 'user-b') {
      throw new Error('Test 3 failed: Fetching user-b profile failed');
    }

    // Test 4: Missing X-User-Id header -> 401
    const test4 = await makeRequest(server, '/api/users/me');
    console.log('   [4] GET /api/users/me (missing auth) status:', test4.status, '| Code:', test4.body.error?.code);
    if (test4.status !== 401 || test4.body.error?.code !== 'UNAUTHORIZED') {
      throw new Error('Test 4 failed: Expected 401 UNAUTHORIZED for missing header');
    }

    // Test 5: Invalid X-User-Id header -> 401
    const test5 = await makeRequest(server, '/api/users/me', 'GET', { 'x-user-id': 'fake-user-xyz' });
    console.log('   [5] GET /api/users/me (invalid auth) status:', test5.status, '| Code:', test5.body.error?.code);
    if (test5.status !== 401 || test5.body.error?.code !== 'UNAUTHORIZED') {
      throw new Error('Test 5 failed: Expected 401 UNAUTHORIZED for non-existent user');
    }

    console.log('🎉 Phase 3 Auth & Users Route Verification PASSED!');
  } catch (err) {
    console.error('❌ Phase 3 Test Failed:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
