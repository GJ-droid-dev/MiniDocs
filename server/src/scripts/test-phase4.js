const http = require('http');
const app = require('../index');

function makeRequest(server, path, method = 'GET', headers = {}, body = null) {
  const port = server.address().port;
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch (e) {}
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('  🧪 RUNNING PHASE 4: DOCUMENT CRUD TESTS');
  console.log('====================================================\n');

  const server = app.listen(0);
  let createdDocId = null;

  try {
    // 1. POST /api/documents (as User A - Alice)
    const postRes = await makeRequest(
      server,
      '/api/documents',
      'POST',
      { 'x-user-id': 'user-a' },
      { title: 'Initial Draft' }
    );
    console.log('   [1] POST /api/documents (Alice) status:', postRes.status);
    console.log('       Created Doc ID:', postRes.body.document?.id, '| Title:', postRes.body.document?.title);
    
    if (postRes.status !== 201 || !postRes.body.document?.id || postRes.body.document.ownerId !== 'user-a') {
      throw new Error('Test 1 failed: Could not create document as user-a');
    }
    createdDocId = postRes.body.document.id;

    // 2. GET /api/documents (as User A - Alice)
    const listResAlice = await makeRequest(server, '/api/documents', 'GET', { 'x-user-id': 'user-a' });
    console.log('   [2] GET /api/documents (Alice) status:', listResAlice.status);
    console.log('       Owned docs count:', listResAlice.body.owned?.length, '| Shared count:', listResAlice.body.shared?.length);
    
    const foundDoc = listResAlice.body.owned?.find((d) => d.id === createdDocId);
    if (listResAlice.status !== 200 || !foundDoc) {
      throw new Error('Test 2 failed: Newly created document not found in Alice owned list');
    }

    // 3. GET /api/documents/:id (as User A - Alice)
    const getDocAlice = await makeRequest(server, `/api/documents/${createdDocId}`, 'GET', { 'x-user-id': 'user-a' });
    console.log('   [3] GET /api/documents/:id (Alice) status:', getDocAlice.status, '| isOwner:', getDocAlice.body.isOwner);
    if (getDocAlice.status !== 200 || getDocAlice.body.isOwner !== true) {
      throw new Error('Test 3 failed: Alice could not read owned document');
    }

    // 4. PATCH /api/documents/:id with Tiptap JSONB content (as User A - Alice)
    const tiptapContent = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'MiniDocs Project Plan' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Rich-text editing ' },
            { type: 'text', marks: [{ type: 'italic' }], text: 'with full persistence ' },
            { type: 'text', marks: [{ type: 'underline' }], text: 'in Neon Postgres.' },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Feature 1: Document Editing' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Feature 2: File Upload' }] }],
            },
          ],
        },
      ],
    };

    const patchRes = await makeRequest(
      server,
      `/api/documents/${createdDocId}`,
      'PATCH',
      { 'x-user-id': 'user-a' },
      {
        title: 'MiniDocs Architecture Plan',
        content: tiptapContent,
      }
    );
    console.log('   [4] PATCH /api/documents/:id (Alice) status:', patchRes.status, '| Title:', patchRes.body.document?.title);
    if (
      patchRes.status !== 200 ||
      patchRes.body.document?.title !== 'MiniDocs Architecture Plan' ||
      patchRes.body.document?.content?.content?.length !== 3
    ) {
      throw new Error('Test 4 failed: Failed to patch title and rich-text JSONB content');
    }

    // 5. Re-fetch document and verify JSONB persistence
    const refetchDoc = await makeRequest(server, `/api/documents/${createdDocId}`, 'GET', { 'x-user-id': 'user-a' });
    console.log('   [5] Re-fetch verification: Content nodes stored:', refetchDoc.body.document?.content?.content?.length);
    if (refetchDoc.body.document?.content?.content?.[0]?.content?.[0]?.text !== 'MiniDocs Project Plan') {
      throw new Error('Test 5 failed: JSONB content persistence verification failed');
    }

    // 6. Security: PATCH /api/documents/:id (as User B - Bob) -> 403 Forbidden
    const patchBob = await makeRequest(
      server,
      `/api/documents/${createdDocId}`,
      'PATCH',
      { 'x-user-id': 'user-b' },
      { title: 'Bob Attempted Rename' }
    );
    console.log('   [6] Security: PATCH by non-owner Bob status:', patchBob.status, '| Code:', patchBob.body.error?.code);
    if (patchBob.status !== 403 || patchBob.body.error?.code !== 'FORBIDDEN') {
      throw new Error('Test 6 failed: Non-owner should receive 403 FORBIDDEN on PATCH');
    }

    // 7. Security: GET /api/documents/:id (as User B - Bob without share) -> 403 Forbidden
    const getBob = await makeRequest(server, `/api/documents/${createdDocId}`, 'GET', { 'x-user-id': 'user-b' });
    console.log('   [7] Security: GET by unauthorized Bob status:', getBob.status, '| Code:', getBob.body.error?.code);
    if (getBob.status !== 403 || getBob.body.error?.code !== 'FORBIDDEN') {
      throw new Error('Test 7 failed: Unauthorized user without share should receive 403 FORBIDDEN on GET');
    }

    // 8. Security: DELETE /api/documents/:id (as User B - Bob) -> 403 Forbidden
    const deleteBob = await makeRequest(server, `/api/documents/${createdDocId}`, 'DELETE', { 'x-user-id': 'user-b' });
    console.log('   [8] Security: DELETE by non-owner Bob status:', deleteBob.status, '| Code:', deleteBob.body.error?.code);
    if (deleteBob.status !== 403 || deleteBob.body.error?.code !== 'FORBIDDEN') {
      throw new Error('Test 8 failed: Non-owner should receive 403 FORBIDDEN on DELETE');
    }

    // 9. DELETE /api/documents/:id (as User A - Alice) -> 200 OK
    const deleteAlice = await makeRequest(server, `/api/documents/${createdDocId}`, 'DELETE', { 'x-user-id': 'user-a' });
    console.log('   [9] DELETE by Owner Alice status:', deleteAlice.status, '| Message:', deleteAlice.body.message);
    if (deleteAlice.status !== 200) {
      throw new Error('Test 9 failed: Owner could not delete document');
    }

    // Verify deletion: GET -> 404 NOT_FOUND
    const getDeleted = await makeRequest(server, `/api/documents/${createdDocId}`, 'GET', { 'x-user-id': 'user-a' });
    console.log('   [10] GET deleted document status:', getDeleted.status, '| Code:', getDeleted.body.error?.code);
    if (getDeleted.status !== 404) {
      throw new Error('Test 10 failed: Deleted document still returned from API');
    }

    console.log('\n🎉 PHASE 4: DOCUMENT CRUD API FULLY VERIFIED & VALIDATED!');
  } catch (err) {
    console.error('❌ Phase 4 Test Failed:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runPhase4Tests();
