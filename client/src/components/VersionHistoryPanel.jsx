import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function VersionHistoryPanel({
  documentId,
  isOwner,
  isOpen,
  onClose,
  currentVersionContent,
  selectedVersionId,
  onSelectVersion,
  onRestoreVersion,
  onSaveCurrentVersion,
}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState(null);
  const [editLabelText, setEditLabelText] = useState('');

  useEffect(() => {
    if (isOpen && documentId) {
      fetchVersions();
    }
  }, [isOpen, documentId]);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVersions(documentId);
      setVersions(data.versions || []);
    } catch (err) {
      console.error('Failed to fetch versions:', err);
      setError(err.message || 'Could not load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      await api.createVersion(documentId, saveLabel.trim() || null);
      setSaveLabel('');
      setShowSaveModal(false);
      await fetchVersions();
      if (onSaveCurrentVersion) onSaveCurrentVersion();
    } catch (err) {
      console.error('Failed to create version snapshot:', err);
      alert(err.message || 'Failed to save version snapshot');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLabel = async (versionId) => {
    try {
      await api.updateVersionLabel(documentId, versionId, editLabelText.trim() || null);
      setEditingVersionId(null);
      setEditLabelText('');
      await fetchVersions();
    } catch (err) {
      console.error('Failed to update version label:', err);
      alert(err.message || 'Failed to update label');
    }
  };

  const handleDeleteVersion = async (e, versionId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this version snapshot?')) return;
    try {
      await api.deleteVersion(documentId, versionId);
      if (selectedVersionId === versionId) {
        onSelectVersion(null); // Return to current
      }
      await fetchVersions();
    } catch (err) {
      console.error('Failed to delete version snapshot:', err);
      alert(err.message || 'Failed to delete snapshot');
    }
  };

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="version-drawer" aria-label="Version history">
      {/* Drawer Header */}
      <div className="drawer-header">
        <div className="drawer-header-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <h3>Version history</h3>
        </div>
        <button className="btn-icon" onClick={onClose} title="Close version history">
          ✕
        </button>
      </div>

      {/* Save Version CTA (Owner only) */}
      {isOwner && (
        <div className="drawer-actions">
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setShowSaveModal(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Name current version
          </button>
        </div>
      )}

      {/* Save Modal Popup */}
      {showSaveModal && (
        <div className="version-save-form glass-card">
          <form onSubmit={handleCreateVersion}>
            <label className="input-label" style={{ fontSize: '0.8rem' }}>
              Version name (optional)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Initial proposal, Final draft"
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              autoFocus
              style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Timeline List */}
      <div className="drawer-body">
        {loading && <div className="loading-state">Loading timeline...</div>}
        {error && <div className="error-banner" style={{ margin: '0.5rem 0' }}>{error}</div>}

        {!loading && (
          <div className="version-timeline">
            {/* Current Active Version Item */}
            <div
              className={`version-item ${selectedVersionId === null ? 'version-item-active' : ''}`}
              onClick={() => onSelectVersion(null)}
            >
              <div className="version-item-main">
                <div className="version-author-badge">
                  <span>●</span>
                </div>
                <div className="version-info">
                  <div className="version-title-row">
                    <span className="version-label-tag">Current version</span>
                  </div>
                  <span className="version-timestamp">Live editable state</span>
                </div>
              </div>
            </div>

            {/* Historical Snapshots */}
            {versions.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem 1rem', fontSize: '0.85rem' }}>
                No named versions saved yet. Click "Name current version" to create your first milestone snapshot.
              </div>
            ) : (
              versions.map((ver) => {
                const isSelected = selectedVersionId === ver.id;
                const isEditing = editingVersionId === ver.id;

                return (
                  <div
                    key={ver.id}
                    className={`version-item ${isSelected ? 'version-item-active' : ''}`}
                    onClick={() => onSelectVersion(ver.id)}
                  >
                    <div className="version-item-main">
                      <div className="version-author-avatar" title={`Saved by ${ver.authorName}`}>
                        {(ver.authorName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="version-info">
                        {isEditing ? (
                          <div
                            className="version-edit-box"
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}
                          >
                            <input
                              type="text"
                              className="input-field"
                              value={editLabelText}
                              onChange={(e) => setEditLabelText(e.target.value)}
                              placeholder="Name version"
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                              autoFocus
                            />
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                              onClick={() => handleUpdateLabel(ver.id)}
                            >
                              ✓
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                              onClick={() => setEditingVersionId(null)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="version-title-row">
                              <span className="version-name">
                                {ver.label || 'Unnamed version'}
                              </span>
                            </div>
                            <div className="version-meta-row">
                              <span className="version-timestamp">{formatDate(ver.createdAt)}</span>
                              <span className="version-author">• {ver.authorName}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Owner Options */}
                    {isOwner && !isEditing && (
                      <div className="version-item-actions">
                        <button
                          className="btn-icon btn-icon-xs"
                          title="Rename version"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingVersionId(ver.id);
                            setEditLabelText(ver.label || '');
                          }}
                        >
                          ✎
                        </button>
                        <button
                          className="btn-icon btn-icon-xs"
                          title="Delete version"
                          onClick={(e) => handleDeleteVersion(e, ver.id)}
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Drawer Footer Preview / Restore Controls */}
      {selectedVersionId !== null && (
        <div className="drawer-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Viewing snapshot in preview mode.
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ flex: 1 }}
                onClick={() => onSelectVersion(null)}
              >
                Exit preview
              </button>
              {isOwner && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1.2 }}
                  onClick={() => onRestoreVersion(selectedVersionId)}
                >
                  Restore version
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
