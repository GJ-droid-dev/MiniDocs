import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DocCard({ doc, isShared = false, onDelete }) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = (e) => {
    // Prevent navigation when clicking delete button
    if (e.target.closest('.delete-doc-btn')) return;
    navigate(`/documents/${doc.id}`);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${doc.title || 'Untitled Document'}"?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(doc.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '180px',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-strong)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      {/* Top Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '18px', color: isShared ? 'var(--color-info)' : 'var(--color-accent)' }}>
              {isShared ? '👥' : '📄'}
            </span>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={doc.title}
            >
              {doc.title || 'Untitled Document'}
            </h3>
          </div>

          {!isShared && onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="delete-doc-btn"
              style={{
                padding: '4px 6px',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--color-text-muted)',
                fontSize: '14px',
                transition: 'color var(--transition-fast)',
                opacity: 0.7,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-danger)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)';
                e.currentTarget.style.opacity = '0.7';
              }}
              title="Delete document"
            >
              🗑
            </button>
          )}
        </div>

        {/* Badges / Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          {doc.hasAttachment && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: '500',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--color-accent-text)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              📎 Attachment
            </span>
          )}

          {isShared && doc.ownerName && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: '500',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(6, 182, 212, 0.12)',
                color: 'var(--color-info)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
              }}
            >
              Shared by {doc.ownerName}
            </span>
          )}
        </div>
      </div>

      {/* Footer Timestamp */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          borderTop: '1px solid var(--color-border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>Updated {formatRelativeTime(doc.updatedAt)}</span>
        <span style={{ color: 'var(--color-accent)', fontSize: '0.8125rem' }}>Open →</span>
      </div>
    </div>
  );
}
