import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Toolbar from '../components/Toolbar';
import AttachmentDrawer from '../components/AttachmentDrawer';
import ShareModal from '../components/ShareModal';
import VersionHistoryPanel from '../components/VersionHistoryPanel';
import Toast from '../components/Toast';

// Safely normalize any raw content into a valid ProseMirror doc structure
function normalizeDocContent(raw) {
  if (
    raw &&
    typeof raw === 'object' &&
    raw.type === 'doc' &&
    Array.isArray(raw.content) &&
    raw.content.length > 0
  ) {
    return raw;
  }
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [],
      },
    ],
  };
}

// Note: Underline is already bundled in Tiptap v3 StarterKit — do not re-register it.
const EXTENSIONS = [
  StarterKit.configure({
    heading: {
      levels: [1, 2],
    },
  }),
];

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [documentData, setDocumentData] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved' | 'error'
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [previewVersionData, setPreviewVersionData] = useState(null);
  const [toast, setToast] = useState(null);

  const saveTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  const headDocContentRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    editable: true,
    onUpdate: () => {
      if (!isInitialMount.current && selectedVersionId === null) {
        triggerAutosave();
      }
    },
  });

  // Autosave function (only active when not in preview mode)
  const triggerAutosave = useCallback(() => {
    if (!isOwner || !editor || selectedVersionId !== null) return;

    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const contentJson = editor.getJSON();
        headDocContentRef.current = contentJson;
        await api.updateDocument(id, {
          title: title.trim() || 'Untitled Document',
          content: contentJson,
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('error');
        showToast('Failed to save changes.', 'error');
      }
    }, 1000);
  }, [id, title, editor, isOwner, selectedVersionId]);

  // Fetch document details from API
  useEffect(() => {
    let isCancelled = false;

    async function loadDoc() {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.getDocument(id);
        if (isCancelled) return;

        const doc = data?.document;
        setDocumentData(doc);
        setIsOwner(Boolean(data?.isOwner));
        setTitle(doc?.title || 'Untitled Document');

        if (editor && !editor.isDestroyed) {
          const safeContent = normalizeDocContent(doc?.content);
          editor.commands.setContent(safeContent, { emitUpdate: false });
          editor.setEditable(Boolean(data?.isOwner));
        }

        setTimeout(() => {
          if (!isCancelled) {
            isInitialMount.current = false;
          }
        }, 300);
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Failed to load document.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (id && user) {
      loadDoc();
    }

    return () => {
      isCancelled = true;
    };
  }, [id, editor, user?.id]);

  // Sync editor content if editor was initialized after documentData was fetched
  useEffect(() => {
    if (editor && !editor.isDestroyed && documentData && isInitialMount.current) {
      const safeContent = normalizeDocContent(documentData.content);
      editor.commands.setContent(safeContent, { emitUpdate: false });
      editor.setEditable(isOwner);
    }
  }, [editor, documentData, isOwner]);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (isOwner && !isInitialMount.current) {
      setSaveStatus('saving');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await api.updateDocument(id, {
            title: newTitle.trim() || 'Untitled Document',
          });
          setSaveStatus('saved');
        } catch (err) {
          setSaveStatus('error');
        }
      }, 1000);
    }
  };

  const handleAttachmentUpdated = (newAttachment) => {
    setDocumentData((prev) => (prev ? { ...prev, attachment: newAttachment } : prev));
    showToast(newAttachment ? 'File attached successfully.' : 'Attachment removed.', 'success');
  };

  // Version History Selection (Non-Destructive Preview)
  const handleSelectVersion = async (versionId) => {
    if (!editor) return;

    if (versionId === null) {
      // Exit Preview Mode -> Return to Head
      setSelectedVersionId(null);
      setPreviewVersionData(null);
      const activeContent = headDocContentRef.current || documentData?.content;
      editor.commands.setContent(normalizeDocContent(activeContent), { emitUpdate: false });
      editor.setEditable(isOwner);
      return;
    }

    try {
      // Cache current head before loading snapshot
      if (selectedVersionId === null) {
        headDocContentRef.current = editor.getJSON();
      }

      const res = await api.getVersion(id, versionId);
      const ver = res?.version;
      setSelectedVersionId(versionId);
      setPreviewVersionData(ver);

      // Load snapshot AST into Tiptap canvas in read-only preview mode
      editor.commands.setContent(normalizeDocContent(ver?.content), { emitUpdate: false });
      editor.setEditable(false);
    } catch (err) {
      console.error('Failed to preview version:', err);
      showToast(err.message || 'Could not load version snapshot', 'error');
    }
  };

  // Version Restore Action
  const handleRestoreVersion = async (versionId) => {
    if (!isOwner) return;
    try {
      const res = await api.restoreVersion(id, versionId);
      const restoredDoc = res?.document;
      setDocumentData(restoredDoc);
      headDocContentRef.current = restoredDoc?.content;

      setSelectedVersionId(null);
      setPreviewVersionData(null);

      if (editor) {
        editor.commands.setContent(normalizeDocContent(restoredDoc?.content), { emitUpdate: false });
        editor.setEditable(true);
      }

      showToast('Document restored to version successfully.', 'success');
    } catch (err) {
      console.error('Failed to restore version:', err);
      showToast(err.message || 'Failed to restore version', 'error');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
        <p>Loading document from Neon...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          className="glass-card"
          style={{
            maxWidth: '480px',
            padding: '36px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-danger)',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
            Unable to open document
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '24px' }}>
            {error}
          </p>
          <button onClick={() => navigate('/documents')} className="btn-primary">
            ← Back to Documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Header */}
      <header
        className="glass-nav"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        {/* Left: Back & Editable Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
          <Link
            to="/documents"
            className="btn-ghost"
            style={{ padding: '6px 10px', fontSize: '14px' }}
            title="Back to Dashboard"
          >
            ← Back
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            {isOwner ? (
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Untitled Document"
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  outline: 'none',
                  width: '100%',
                  maxWidth: '400px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'background var(--transition-fast)',
                }}
                onFocus={(e) => (e.target.style.background = 'var(--surface-container-high)')}
                onBlur={(e) => (e.target.style.background = 'transparent')}
              />
            ) : (
              <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#ffffff' }}>
                {title}
              </span>
            )}

            {/* Live Save Status Badge */}
            {isOwner && selectedVersionId === null && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background:
                    saveStatus === 'saved'
                      ? 'var(--color-success-subtle)'
                      : saveStatus === 'saving'
                      ? 'var(--color-warning-subtle)'
                      : saveStatus === 'error'
                      ? 'var(--color-danger-subtle)'
                      : 'var(--surface-container-high)',
                  color:
                    saveStatus === 'saved'
                      ? 'var(--color-success-text)'
                      : saveStatus === 'saving'
                      ? 'var(--color-warning-text)'
                      : saveStatus === 'error'
                      ? 'var(--color-danger-text)'
                      : 'var(--color-text-muted)',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'currentColor',
                    animation: saveStatus === 'saving' ? 'pulseGlow 1s infinite' : 'none',
                  }}
                />
                {saveStatus === 'saved'
                  ? 'Saved ✓'
                  : saveStatus === 'saving'
                  ? 'Saving...'
                  : saveStatus === 'error'
                  ? 'Save error'
                  : 'Unsaved'}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Version History Toggle */}
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`btn ${isHistoryOpen ? 'btn-primary' : 'btn-secondary'}`}
            id="toggle-version-history-btn"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            title="View document version history"
          >
            <span>🕒</span>
            <span>History</span>
          </button>

          {/* Share Modal Trigger (Owner only) */}
          {isOwner && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="btn-primary"
              id="open-share-modal-btn"
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              <span>👥</span>
              <span>Share</span>
            </button>
          )}
        </div>
      </header>

      {/* Non-Destructive Preview Mode Banner */}
      {selectedVersionId !== null && (
        <div className="preview-mode-banner">
          <div className="preview-mode-banner-info">
            <span>⚠️</span>
            <span>
              <strong>Preview Mode:</strong> Viewing snapshot from{' '}
              {new Date(previewVersionData?.createdAt).toLocaleString()}
              {previewVersionData?.label ? ` ("${previewVersionData.label}")` : ''}
              {previewVersionData?.authorName ? ` • Saved by ${previewVersionData.authorName}` : ''}
            </span>
          </div>
          <div className="preview-mode-banner-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handleSelectVersion(null)}
            >
              Exit preview
            </button>
            {isOwner && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleRestoreVersion(selectedVersionId)}
              >
                Restore this version
              </button>
            )}
          </div>
        </div>
      )}

      {/* Guest Access Banner */}
      {!isOwner && selectedVersionId === null && (
        <div
          style={{
            background: 'var(--color-info-subtle)',
            borderBottom: '1px solid rgba(6, 182, 212, 0.25)',
            padding: '8px 24px',
            textAlign: 'center',
            fontSize: '0.8125rem',
            color: 'var(--color-info)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>ℹ</span>
          <span>
            You are viewing this document in <strong>read-only mode</strong> (Shared by {documentData?.ownerName}).
          </span>
        </div>
      )}

      {/* Sticky Toolbar */}
      <div
        style={{
          position: 'sticky',
          top: isOwner ? '64px' : '96px',
          zIndex: 30,
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 24px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <Toolbar editor={editor} disabled={!isOwner || selectedVersionId !== null} />
        </div>
      </div>

      {/* Main Writing Canvas */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 'var(--max-width-editor)',
          margin: '0 auto',
          padding: '16px 24px 64px 24px',
        }}
      >
        <div
          className="glass-card"
          style={{
            borderRadius: 'var(--radius-xl)',
            padding: '36px 40px',
            background: 'var(--color-bg-editor)',
            border: '1px solid var(--color-border-strong)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <div className="tiptap-container">
            <EditorContent editor={editor} />
          </div>

          {/* Single File Attachment Drawer */}
          <AttachmentDrawer
            documentId={id}
            attachment={documentData?.attachment}
            isOwner={isOwner && selectedVersionId === null}
            onAttachmentUpdated={handleAttachmentUpdated}
            onError={(msg) => showToast(msg, 'error')}
          />
        </div>
      </main>

      {/* Version History Slide-Over Drawer */}
      <VersionHistoryPanel
        documentId={id}
        isOwner={isOwner}
        isOpen={isHistoryOpen}
        onClose={() => {
          setIsHistoryOpen(false);
          if (selectedVersionId !== null) {
            handleSelectVersion(null); // Exit preview when closing drawer
          }
        }}
        selectedVersionId={selectedVersionId}
        onSelectVersion={handleSelectVersion}
        onRestoreVersion={handleRestoreVersion}
        onSaveCurrentVersion={() => showToast('Version snapshot saved.', 'success')}
      />

      {/* Share Modal Dialog */}
      {isShareModalOpen && (
        <ShareModal
          documentId={id}
          documentTitle={title}
          onClose={() => setIsShareModalOpen(false)}
          onShareSuccess={(msg) => showToast(msg, 'success')}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

