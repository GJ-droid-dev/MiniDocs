const http = require('http');
const app = require('../index');

function makeRequest(server, path, method = 'GET', headers = {}, body = null) {
  const port = server.address().port;
  return new Promise((resolve, reject) => {
    const payload = body && typeof body === 'object' && !Buffer.isBuffer(body) ? JSON.stringify(body) : body;
    const reqHeaders = {
      Origin: 'http://localhost:5173',
      ...headers,
    };
    if (payload && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.isBuffer(payload) ? payload.length : Buffer.byteLength(payload);
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
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          let parsed = null;
          try {
            parsed = JSON.parse(raw.toString());
          } catch (e) {
            parsed = raw.toString();
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, rawBuffer: raw });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function createMultipartPayload(fieldName, filename, mimeType, fileBuffer) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const payload = Buffer.concat([
    Buffer.from(header, 'utf8'),
    fileBuffer,
    Buffer.from(footer, 'utf8'),
  ]);

  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    payload,
  };
}

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('  🧪 RUNNING PHASE 5: ATTACHMENT & SHARING TESTS');
  console.log('====================================================\n');

  const server = app.listen(0);
  let docId = null;

  try {
    // 1. Create a test document as Alice
    const docRes = await makeRequest(
      server,
      '/api/documents',
      'POST',
      { 'x-user-id': 'user-a' },
      { title: 'Collaboration & Files Test Doc' }
    );
    docId = docRes.body.document?.id;
    console.log('   [1] Created Test Document ID:', docId);

    // 2. Upload valid PDF attachment (1 KB dummy PDF)
    const pdfContent = Buffer.from('%PDF-1.4 Mock PDF binary content for testing attachments in MiniDocs', 'utf8');
    const { contentType: pdfType, payload: pdfPayload } = createMultipartPayload('file', 'Specification.pdf', 'application/pdf', pdfContent);
    
    const uploadRes = await makeRequest(
      server,
      `/api/documents/${docId}/attachment`,
      'POST',
      { 'x-user-id': 'user-a', 'Content-Type': pdfType },
      pdfPayload
    );
    console.log('   [2] Upload PDF status:', uploadRes.status, '| Filename:', uploadRes.body.attachment?.originalName);
    if (uploadRes.status !== 201 || uploadRes.body.attachment?.originalName !== 'Specification.pdf') {
      throw new Error('Test 2 failed: Valid PDF upload failed');
    }

    // 3. Download attachment as Alice
    const dlRes = await makeRequest(server, `/api/documents/${docId}/attachment`, 'GET', { 'x-user-id': 'user-a' });
    console.log('   [3] Download PDF status:', dlRes.status, '| Content-Type:', dlRes.headers['content-type']);
    if (dlRes.status !== 200 || !dlRes.rawBuffer.includes(Buffer.from('Mock PDF binary'))) {
      throw new Error('Test 3 failed: Download attachment binary content mismatch');
    }

    // 4. Reject invalid file type (e.g. .exe / text/plain)
    const badContent = Buffer.from('executable binary code', 'utf8');
    const { contentType: badType, payload: badPayload } = createMultipartPayload('file', 'virus.exe', 'application/x-msdownload', badContent);
    const rejectRes = await makeRequest(
      server,
      `/api/documents/${docId}/attachment`,
      'POST',
      { 'x-user-id': 'user-a', 'Content-Type': badType },
      badPayload
    );
    console.log('   [4] Reject invalid file type status:', rejectRes.status, '| Code:', rejectRes.body.error?.code);
    if (rejectRes.status !== 400 || rejectRes.body.error?.code !== 'INVALID_FILE_TYPE') {
      throw new Error('Test 4 failed: Server did not reject disallowed MIME type');
    }

    // 5. Reject file exceeding 5 MB limit (5.5 MB dummy buffer)
    const largeBuffer = Buffer.alloc(5.5 * 1024 * 1024);
    const { contentType: largeType, payload: largePayload } = createMultipartPayload('file', 'huge_doc.pdf', 'application/pdf', largeBuffer);
    const largeRes = await makeRequest(
      server,
      `/api/documents/${docId}/attachment`,
      'POST',
      { 'x-user-id': 'user-a', 'Content-Type': largeType },
      largePayload
    );
    console.log('   [5] Reject oversized file status:', largeRes.status, '| Code:', largeRes.body.error?.code);
    if (largeRes.status !== 413 || largeRes.body.error?.code !== 'PAYLOAD_TOO_LARGE') {
      throw new Error('Test 5 failed: Server did not return 413 PAYLOAD_TOO_LARGE for >5MB file');
    }

    // 6. Share document with Bob (user-b)
    const shareRes = await makeRequest(
      server,
      `/api/documents/${docId}/shares`,
      'POST',
      { 'x-user-id': 'user-a' },
      { userId: 'user-b' }
    );
    console.log('   [6] Share with Bob status:', shareRes.status, '| Recipient:', shareRes.body.share?.recipientName);
    if (shareRes.status !== 201 || shareRes.body.share?.sharedWith !== 'user-b') {
      throw new Error('Test 6 failed: Sharing document with user-b failed');
    }

    // 7. Duplicate share rejection
    const dupShare = await makeRequest(
      server,
      `/api/documents/${docId}/shares`,
      'POST',
      { 'x-user-id': 'user-a' },
      { userId: 'user-b' }
    );
    console.log('   [7] Duplicate share status:', dupShare.status, '| Code:', dupShare.body.error?.code);
    if (dupShare.status !== 409 || dupShare.body.error?.code !== 'ALREADY_SHARED') {
      throw new Error('Test 7 failed: Duplicate share should return 409 ALREADY_SHARED');
    }

    // 8. Self share rejection
    const selfShare = await makeRequest(
      server,
      `/api/documents/${docId}/shares`,
      'POST',
      { 'x-user-id': 'user-a' },
      { userId: 'user-a' }
    );
    console.log('   [8] Self share status:', selfShare.status, '| Code:', selfShare.body.error?.code);
    if (selfShare.status !== 400 || selfShare.body.error?.code !== 'CANNOT_SHARE_WITH_SELF') {
      throw new Error('Test 8 failed: Self share should return 400 CANNOT_SHARE_WITH_SELF');
    }

    // 9. Bob lists documents and sees shared document
    const bobList = await makeRequest(server, '/api/documents', 'GET', { 'x-user-id': 'user-b' });
    const sharedFound = bobList.body.shared?.find((d) => d.id === docId);
    console.log('   [9] Bob document list: Shared count:', bobList.body.shared?.length, '| Found shared doc:', Boolean(sharedFound));
    if (!sharedFound || sharedFound.hasAttachment !== true) {
      throw new Error('Test 9 failed: Shared document with attachment not found in Bob shared list');
    }

    // 10. Bob reads shared document & downloads attachment
    const bobRead = await makeRequest(server, `/api/documents/${docId}`, 'GET', { 'x-user-id': 'user-b' });
    console.log('   [10] Bob read access status:', bobRead.status, '| isOwner:', bobRead.body.isOwner);
    if (bobRead.status !== 200 || bobRead.body.isOwner !== false || !bobRead.body.document?.attachment) {
      throw new Error('Test 10 failed: Bob should have read access to document and attachment metadata');
    }

    const bobDownload = await makeRequest(server, `/api/documents/${docId}/attachment`, 'GET', { 'x-user-id': 'user-b' });
    console.log('   [11] Bob download attachment status:', bobDownload.status);
    if (bobDownload.status !== 200) {
      throw new Error('Test 11 failed: Bob should be allowed to download attachment on shared document');
    }

    // 12. Alice revokes share with Bob
    const revokeRes = await makeRequest(
      server,
      `/api/documents/${docId}/shares/user-b`,
      'DELETE',
      { 'x-user-id': 'user-a' }
    );
    console.log('   [12] Revoke share status:', revokeRes.status, '| Message:', revokeRes.body.message);
    if (revokeRes.status !== 200) {
      throw new Error('Test 12 failed: Revoke share failed');
    }

    // 13. Bob now denied access -> 403
    const bobDenied = await makeRequest(server, `/api/documents/${docId}`, 'GET', { 'x-user-id': 'user-b' });
    console.log('   [13] Bob access after revoke status:', bobDenied.status, '| Code:', bobDenied.body.error?.code);
    if (bobDenied.status !== 403) {
      throw new Error('Test 13 failed: Bob should receive 403 after share is revoked');
    }

    // 14. Delete attachment
    const delAttachRes = await makeRequest(
      server,
      `/api/documents/${docId}/attachment`,
      'DELETE',
      { 'x-user-id': 'user-a' }
    );
    console.log('   [14] Delete attachment status:', delAttachRes.status);
    if (delAttachRes.status !== 200) {
      throw new Error('Test 14 failed: Delete attachment failed');
    }

    // Cleanup document
    await makeRequest(server, `/api/documents/${docId}`, 'DELETE', { 'x-user-id': 'user-a' });
    console.log('   [15] Cleaned up test document.');

    console.log('\n🎉 PHASE 5: ATTACHMENT & SHARING API FULLY VERIFIED & VALIDATED!');
  } catch (err) {
    console.error('❌ Phase 5 Test Failed:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runPhase5Tests();
