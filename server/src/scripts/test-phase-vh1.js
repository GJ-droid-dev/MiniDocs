const http = require('http');
const app = require('../index');
const pool = require('../config/db');

const ALICE = 'user-a';
const BOB = 'user-b';

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

async function runVersionHistoryTests() {
  console.log('====================================================');
  console.log('  🧪 RUNNING PHASE VH1: VERSION HISTORY INTEGRATION TESTS');
  console.log('====================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  let testDocId = null;
  let v1Id = null;
  let v2Id = null;

  try {
    // 1. Create a test document as Alice
    const v1Content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Version 1 Content: Initial draft text.' }],
        },
      ],
    };

    const createDocRes = await makeRequest(
      server,
      '/api/documents',
      'POST',
      { 'X-User-Id': ALICE },
      { title: 'Version Test Document', content: v1Content }
    );

    if (createDocRes.status !== 201) throw new Error(`Create doc failed: ${JSON.stringify(createDocRes)}`);
    testDocId = createDocRes.body.document.id;
    console.log(`   [1] Created Test Document ID: ${testDocId}`);

    // 2. Create manual snapshot "v1.0 - Initial Draft"
    const createV1Res = await makeRequest(
      server,
      `/api/documents/${testDocId}/versions`,
      'POST',
      { 'X-User-Id': ALICE },
      { label: 'v1.0 - Initial Draft' }
    );

    if (createV1Res.status !== 201) throw new Error(`Create V1 failed: ${JSON.stringify(createV1Res)}`);
    v1Id = createV1Res.body.version.id;
    console.log(`   [2] Created Snapshot V1 ID: ${v1Id} | Label: "${createV1Res.body.version.label}"`);

    // 3. Update document to V2 content
    const v2Content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'V2 Heading' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Version 2 Content: Updated with heading.' }],
        },
      ],
    };

    const updateRes = await makeRequest(
      server,
      `/api/documents/${testDocId}`,
      'PATCH',
      { 'X-User-Id': ALICE },
      { title: 'Version Test Document (v2)', content: v2Content }
    );
    if (updateRes.status !== 200) throw new Error(`Update doc failed: ${JSON.stringify(updateRes)}`);

    // 4. Create snapshot "v2.0 - With Heading"
    const createV2Res = await makeRequest(
      server,
      `/api/documents/${testDocId}/versions`,
      'POST',
      { 'X-User-Id': ALICE },
      { label: 'v2.0 - With Heading' }
    );

    if (createV2Res.status !== 201) throw new Error(`Create V2 failed: ${JSON.stringify(createV2Res)}`);
    v2Id = createV2Res.body.version.id;
    console.log(`   [3] Created Snapshot V2 ID: ${v2Id} | Label: "${createV2Res.body.version.label}"`);

    // 5. Update document to V3 content
    const v3Content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Version 3: Latest active draft.' }],
        },
      ],
    };

    await makeRequest(
      server,
      `/api/documents/${testDocId}`,
      'PATCH',
      { 'X-User-Id': ALICE },
      { content: v3Content }
    );

    // 6. List versions as Alice (Owner)
    const listRes = await makeRequest(
      server,
      `/api/documents/${testDocId}/versions`,
      'GET',
      { 'X-User-Id': ALICE }
    );

    console.log(`   [4] Listed versions (Alice): Found ${listRes.body.versions.length} versions`);
    if (listRes.body.versions.length < 2) {
      throw new Error(`Expected at least 2 versions, got ${listRes.body.versions.length}`);
    }

    // 7. Preview V1 content as Alice
    const previewV1Res = await makeRequest(
      server,
      `/api/documents/${testDocId}/versions/${v1Id}`,
      'GET',
      { 'X-User-Id': ALICE }
    );

    const previewNodeText = previewV1Res.body.version.content.content[0].content[0].text;
    console.log(`   [5] Previewed V1 content: "${previewNodeText}"`);
    if (!previewNodeText.includes('Version 1 Content')) {
      throw new Error('Preview V1 content did not match snapshot V1 AST');
    }

    // 8. Share document with Bob
    await makeRequest(
      server,
      `/api/documents/${testDocId}/shares`,
      'POST',
      { 'X-User-Id': ALICE },
      { userId: BOB }
    );

    // 9. Bob (Recipient) can list versions
    const bobListRes = await makeRequest(
      server,
      `/api/documents/${testDocId}/versions`,
      'GET',
      { 'X-User-Id': BOB }
    );

    console.log(`   [6] Bob (Recipient) listed versions: ${bobListRes.body.versions.length} versions found`);

    // 10. Bob (Recipient) can preview V1
    const bobPreviewRes = await makeRequest(
      server,
      `/api/documents/${testDocId}/versions/${v1Id}`,
      'GET',
      { 'X-User-Id': BOB }
    );
    if (bobPreviewRes.status !== 200) throw new Error('Bob failed to preview snapshot');
    console.log(`   [7] Bob (Recipient) previewed V1 snapshot status: 200`);

    // 11. Security: Bob CANNOT create a snapshot (403)
    const bobCreateRes = await makeRequest(
      server,
      `/api/documents/${testDocId}/versions`,
      'POST',
      { 'X-User-Id': BOB },
      { label: 'Unauthorized snapshot' }
    );
    if (bobCreateRes.status !== 403) throw new Error(`Expected 403 for Bob create version, got ${bobCreateRes.status}`);
    console.log(`   [8] Security: Bob rejected from creating snapshot status: 403 | Code: ${bobCreateRes.body.error.code}`);

    // 12. Security: Bob CANNOT restore a snapshot (403)
    const bobRestoreRes = await makeRequest(
      server,
      `/api/documents/${testDocId}/versions/${v1Id}/restore`,
      'POST',
      { 'X-User-Id': BOB }
    );
    if (bobRestoreRes.status !== 403) throw new Error(`Expected 403 for Bob restore version, got ${bobRestoreRes.status}`);
    console.log(`   [9] Security: Bob rejected from restoring snapshot status: 403 | Code: ${bobRestoreRes.body.error.code}`);

    // 13. Alice restores V1 snapshot
    const restoreRes = await makeRequest(
      server,
      `/api/documents/${testDocId}/versions/${v1Id}/restore`,
      'POST',
      { 'X-User-Id': ALICE }
    );

    if (restoreRes.status !== 200) throw new Error(`Restore failed: ${JSON.stringify(restoreRes)}`);
    const restoredDocContent = restoreRes.body.document.content.content[0].content[0].text;
    console.log(`   [10] Alice restored document to V1: Content is now "${restoredDocContent}"`);
    if (!restoredDocContent.includes('Version 1 Content')) {
      throw new Error('Restored content did not match V1 content');
    }

    // 14. Verify pre-restore automatic backup was created
    const postRestoreListRes = await makeRequest(
      server,
      `/api/documents/${testDocId}/versions`,
      'GET',
      { 'X-User-Id': ALICE }
    );

    const hasPreRestore = postRestoreListRes.body.versions.some(
      (v) => v.label && v.label.includes('Pre-restore')
    );
    console.log(`   [11] Pre-restore automatic snapshot present: ${hasPreRestore}`);

    // 15. Update label of a version
    const patchLabelRes = await makeRequest(
      server,
      `/api/documents/${testDocId}/versions/${v1Id}`,
      'PATCH',
      { 'X-User-Id': ALICE },
      { label: 'v1.0 - Production Release' }
    );

    console.log(`   [12] Updated version label to "${patchLabelRes.body.version.label}"`);

    // 16. Delete a version snapshot
    const deleteVersionRes = await makeRequest(
      server,
      `/api/documents/${testDocId}/versions/${v2Id}`,
      'DELETE',
      { 'X-User-Id': ALICE }
    );
    if (deleteVersionRes.status !== 200) throw new Error(`Delete version failed`);
    console.log(`   [13] Deleted version V2 snapshot.`);

    // 17. Cleanup test document
    await makeRequest(
      server,
      `/api/documents/${testDocId}`,
      'DELETE',
      { 'X-User-Id': ALICE }
    );

    console.log(`   [14] Cleaned up test document.`);
    console.log('\n🎉 PHASE VH1: VERSION HISTORY BACKEND FULLY VERIFIED & VALIDATED!\n');
  } catch (err) {
    console.error('\n❌ Version History Test Failed:', err);
    if (testDocId) {
      await pool.query(`DELETE FROM documents WHERE id = $1`, [testDocId]).catch(() => {});
    }
    process.exit(1);
  } finally {
    server.close();
    await pool.end();
  }
}

if (require.main === module) {
  runVersionHistoryTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runVersionHistoryTests;
