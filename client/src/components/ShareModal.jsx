import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function ShareModal({ documentId, documentTitle, onClose, onShareSuccess, onError }) {
  const { user, availableUsers } = useAuth();
  const [shares, setShares] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Eligible users to share with (exclude self/owner and already shared users)
  const eligibleUsers = availableUsers.filter(
    (u) => u.id !== user?.id && !shares.some((s) => s.sharedWith === u.id)
  );

  useEffect(() => {
    async function loadShares() {
      try {
        const data = await api.getShares(documentId);
        setShares(data?.shares || []);
      } catch (err) {
        onError?.(err.message || 'Failed to load share settings.');
      } finally {
        setLoading(false);
      }
    }
    loadShares();
  }, [documentId]);

  // Set default selected recipient when eligible users change
  useEffect(() => {
    if (eligibleUsers.length > 0 && (!selectedUserId || !eligibleUsers.some((u) => u.id === selectedUserId))) {
      setSelectedUserId(eligibleUsers[0].id);
    } else if (eligibleUsers.length === 0) {
      setSelectedUserId('');
    }
  }, [eligibleUsers, selectedUserId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setSubmitting(true);
    try {
      const data = await api.shareDocument(documentId, selectedUserId);
      setShares((prev) => [...prev, data.share]);
      onShareSuccess?.(data.message || 'Document shared successfully.');
    } catch (err) {
      onError?.(err.message || 'Failed to share document.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (recipientId) => {
    try {
      await api.revokeShare(documentId, recipientId);
      setShares((prev) => prev.filter((s) => s.sharedWith !== recipientId));
      onShareSuccess?.('Share access revoked.');
    } catch (err) {
      onError?.(err.message || 'Failed to revoke share access.');
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '16px',
        animation: 'fadeIn 200ms ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 'var(--max-width-modal)',
          background: 'var(--color-bg-surface-raised)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--color-border-strong)',
          animation: 'fadeInScale 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>👥</span>
              <span>Share "{documentTitle || 'Untitled'}"</span>
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Grant read-only view access to peer personas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '4px 8px', fontSize: '1.125rem' }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Share Form */}
        <form onSubmit={handleShare} style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-muted)',
              marginBottom: '8px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Add Recipient
          </label>

          {eligibleUsers.length > 0 ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--color-bg-input)',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id} style={{ background: '#181a24', color: '#f1f5f9' }}>
                    {u.name} ({u.id})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={submitting || !selectedUserId}
                className="btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {submitting ? 'Sharing...' : 'Share'}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              This document is already shared with all available personas.
            </p>
          )}
        </form>

        {/* Active Shares List */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-muted)',
              marginBottom: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            People with access
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Owner Entry */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--surface-container)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  className="avatar-alice"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '13px',
                  }}
                >
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div>
                  <p style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                    {user?.name} (You)
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Document Owner</p>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--color-accent-text)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-accent-subtle)',
                }}
              >
                Owner
              </span>
            </div>

            {/* Recipient Shares */}
            {loading ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Loading shares...</p>
            ) : (
              shares.map((share) => (
                <div
                  key={share.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      className="avatar-bob"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '13px',
                      }}
                    >
                      {share.recipientName?.charAt(0) || 'B'}
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                        {share.recipientName}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-info)' }}>Can view & download</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevoke(share.sharedWith)}
                    className="btn-danger"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    title="Revoke access"
                  >
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border-subtle)',
          }}
        >
          <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 20px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
