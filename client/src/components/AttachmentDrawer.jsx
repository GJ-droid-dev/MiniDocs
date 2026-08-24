import React, { useState, useRef } from 'react';
import { api } from '../api';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const ALLOWED_EXTS = ['.pdf', '.png', '.jpg', '.jpeg'];

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function AttachmentDrawer({
  documentId,
  attachment,
  isOwner,
  onAttachmentUpdated,
  onError,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const validateAndUpload = async (file) => {
    if (!file) return;

    // 1. Validate Size
    if (file.size > MAX_FILE_SIZE) {
      onError?.('File exceeds the 5 MB limit. Please select a smaller file.');
      return;
    }

    // 2. Validate Type / Extension
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTS.includes(fileExt)) {
      onError?.('Unsupported file type. Only PDF, PNG, and JPG files are supported.');
      return;
    }

    setIsUploading(true);
    try {
      const data = await api.uploadAttachment(documentId, file);
      onAttachmentUpdated?.(data.attachment);
    } catch (err) {
      onError?.(err.message || 'Failed to upload attachment.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (isOwner) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isOwner) return;
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndUpload(file);
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove this attachment from the document?')) return;
    setIsDeleting(true);
    try {
      await api.deleteAttachment(documentId);
      onAttachmentUpdated?.(null);
    } catch (err) {
      onError?.(err.message || 'Failed to delete attachment.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    const url = api.getAttachmentDownloadUrl(documentId);
    // Trigger download via link with auth token in URL or iframe
    // Since backend requires X-User-Id, we can fetch blob and download
    fetch(url, {
      headers: {
        'X-User-Id': localStorage.getItem('minidocs_user_id') || '',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = attachment?.originalName || 'attachment';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => {
        onError?.(err.message || 'Failed to download attachment');
      });
  };

  return (
    <div
      style={{
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid var(--color-border-subtle)',
      }}
    >
      <h3
        style={{
          fontSize: '1rem',
          fontWeight: '600',
          color: 'var(--color-text-primary)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span>📎</span>
        <span>Attached File</span>
      </h3>

      {/* Case 1: Attachment Exists */}
      {attachment ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'var(--surface-container)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--color-accent-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              📄
            </div>
            <div>
              <p
                style={{
                  fontWeight: '600',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9375rem',
                }}
              >
                {attachment.originalName}
              </p>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px',
                }}
              >
                {formatBytes(attachment.sizeBytes)} • {attachment.mimeType}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleDownload}
              className="btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '6px 12px' }}
            >
              <span>↓</span>
              <span>Download</span>
            </button>

            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-danger"
                style={{ fontSize: '0.8125rem', padding: '6px 12px' }}
              >
                <span>🗑</span>
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            )}
          </div>
        </div>
      ) : isOwner ? (
        /* Case 2: No Attachment & Owner -> Dropzone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 24px',
            background: isDragging ? 'var(--color-accent-subtle)' : 'var(--surface-container-lowest)',
            border: `2px dashed ${isDragging ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all var(--transition-fast)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--surface-container-high)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              color: 'var(--color-accent-text)',
              marginBottom: '12px',
            }}
          >
            ↑
          </div>

          <p style={{ fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            {isUploading ? 'Uploading file...' : isDragging ? 'Drop file here' : 'Click or drag file to attach'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            PDF, PNG, JPG supported (Maximum 5 MB)
          </p>
        </div>
      ) : (
        /* Case 3: No Attachment & Guest */
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          No file attached to this document.
        </p>
      )}
    </div>
  );
}
