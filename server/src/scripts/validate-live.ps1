$base = 'http://localhost:5000/api'
$alice = @{ 'X-User-Id' = 'user-a'; 'Content-Type' = 'application/json' }
$bob = @{ 'X-User-Id' = 'user-b'; 'Content-Type' = 'application/json' }

# 1. Auth required
try {
  Invoke-RestMethod "$base/documents" | Out-Null
  "AUTH-CHECK: FAIL (no 401)"
} catch {
  "AUTH-CHECK: HTTP $($_.Exception.Response.StatusCode.value__) (expected 401)"
}

# 2. Create document as Alice
$doc = Invoke-RestMethod -Method Post "$base/documents" -Headers $alice -Body '{"title":"Validation Test Doc"}'
"CREATE: id=$($doc.document.id) title='$($doc.document.title)' isOwner=$($doc.isOwner)"
$docId = $doc.document.id

# 3. Patch rich-text content as Alice
$contentObj = @{
  type    = 'doc'
  content = @(
    @{ type = 'heading'; attrs = @{ level = 1 }; content = @(@{ type = 'text'; text = 'Hello' }) },
    @{ type = 'paragraph'; content = @(
        @{ type = 'text'; text = 'Bold'; marks = @(@{ type = 'bold' }) },
        @{ type = 'text'; text = ' and ' },
        @{ type = 'text'; text = 'underline'; marks = @(@{ type = 'underline' }) }
      ) },
    @{ type = 'bulletList'; content = @(
        @{ type = 'listItem'; content = @(@{ type = 'paragraph'; content = @(@{ type = 'text'; text = 'Item 1' }) }) }
      ) }
  )
}
$body = @{ content = $contentObj } | ConvertTo-Json -Depth 20 -Compress
$patch = Invoke-RestMethod -Method Patch "$base/documents/$docId" -Headers $alice -Body $body
"PATCH: updatedAt=$($patch.document.updatedAt) topLevelNodes=$($patch.document.content.content.Count)"

# 4. Bob cannot read before share
try {
  Invoke-RestMethod "$base/documents/$docId" -Headers $bob | Out-Null
  "BOB-READ-PRESHARE: FAIL (should be 403)"
} catch {
  "BOB-READ-PRESHARE: HTTP $($_.Exception.Response.StatusCode.value__) (expected 403)"
}

# 5. Share with Bob
$share = Invoke-RestMethod -Method Post "$base/documents/$docId/shares" -Headers $alice -Body '{"userId":"user-b"}'
"SHARE: $($share.message)"

# 6. Bob reads now; formatting preserved
$bobRead = Invoke-RestMethod "$base/documents/$docId" -Headers $bob
$markList = $bobRead.document.content.content[1].content | ForEach-Object {
  if ($_.marks) { ($_.marks | ForEach-Object { $_.type }) -join '+' } else { 'plain' }
}
"BOB-READ: isOwner=$($bobRead.isOwner) node0=$($bobRead.document.content.content[0].type) marks=[$($markList -join ',')] node2=$($bobRead.document.content.content[2].type)"

# 7. Bob tries to edit -> 403
try {
  Invoke-RestMethod -Method Patch "$base/documents/$docId" -Headers $bob -Body '{"title":"Hacked"}' | Out-Null
  "BOB-EDIT: FAIL (should be 403)"
} catch {
  "BOB-EDIT: HTTP $($_.Exception.Response.StatusCode.value__) (expected 403)"
}

# 8. Lists: Bob shared vs Alice owned
$bobDocs = Invoke-RestMethod "$base/documents" -Headers $bob
$aliceDocs = Invoke-RestMethod "$base/documents" -Headers $alice
"BOB-LIST: owned=$($bobDocs.owned.Count) shared=$($bobDocs.shared.Count)"
"ALICE-LIST: owned=$($aliceDocs.owned.Count) shared=$($aliceDocs.shared.Count)"

# 9. Duplicate share -> 409
try {
  Invoke-RestMethod -Method Post "$base/documents/$docId/shares" -Headers $alice -Body '{"userId":"user-b"}' | Out-Null
  "DUP-SHARE: FAIL (should be 409)"
} catch {
  "DUP-SHARE: HTTP $($_.Exception.Response.StatusCode.value__) (expected 409)"
}

# 10. File upload: small valid PNG then an invalid .txt
$pngPath = "$env:TEMP\minidocs-test.png"
[Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==') | Set-Content -Path $pngPath -Encoding Byte -Force
try {
  $upload = curl.exe -s -X POST "$base/documents/$docId/attachment" -H "X-User-Id: user-a" -F "file=@$pngPath;type=image/png"
  "UPLOAD-PNG: $upload"
} catch { "UPLOAD-PNG FAIL: $($_.Exception.Message)" }

$txtPath = "$env:TEMP\minidocs-test.txt"
"hello" | Set-Content -Path $txtPath
$badUpload = curl.exe -s -X POST "$base/documents/$docId/attachment" -H "X-User-Id: user-a" -F "file=@$txtPath;type=text/plain"
"UPLOAD-TXT: $badUpload"

# 11. Bob can download attachment (read access)
$dl = curl.exe -s -o "$env:TEMP\minidocs-dl.png" -w "%{http_code}" "$base/documents/$docId/attachment" -H "X-User-Id: user-b"
"BOB-DOWNLOAD: HTTP $dl"

# 12. Revoke share -> Bob 403 again
Invoke-RestMethod -Method Delete "$base/documents/$docId/shares/user-b" -Headers $alice | Out-Null
try {
  Invoke-RestMethod "$base/documents/$docId" -Headers $bob | Out-Null
  "BOB-AFTER-REVOKE: FAIL"
} catch {
  "BOB-AFTER-REVOKE: HTTP $($_.Exception.Response.StatusCode.value__) (expected 403)"
}

# 13. Cleanup
Invoke-RestMethod -Method Delete "$base/documents/$docId" -Headers $alice | Out-Null
"CLEANUP: test doc deleted"
Remove-Item $pngPath, $txtPath -ErrorAction SilentlyContinue
