import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Navbar from '../components/Navbar';
import DocCard from '../components/DocCard';
import Toast from '../components/Toast';

export default function Dashboard() {
  const [ownedDocs, setOwnedDocs] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.getDocuments();
      setOwnedDocs(data?.owned || []);
      setSharedDocs(data?.shared || []);
    } catch (err) {
      showToast(err.message || 'Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleNewDocument = async () => {
    try {
      const data = await api.createDocument({ title: 'Untitled Document' });
      if (data?.document?.id) {
        navigate(`/documents/${data.document.id}`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to create new document', 'error');
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      await api.deleteDocument(id);
      setOwnedDocs((prev) => prev.filter((d) => d.id !== id));
      showToast('Document deleted successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete document', 'error');
    }
  };

  const filteredOwned = ownedDocs.filter((d) =>
    (d.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredShared = sharedDocs.filter((d) =>
    (d.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onNewDocument={handleNewDocument} />

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 'var(--max-width-page)',
          margin: '0 auto',
          padding: '32px 24px',
        }}
      >
        {/* Dashboard Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.02em' }}>
              Documents Workspace
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Create, edit rich-text files, attach media, and collaborate with peers.
            </p>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
                fontSize: '14px',
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px 8px 34px',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            <p>Loading documents from Neon PostgreSQL...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {/* Section 1: My Documents */}
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '18px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}
              >
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                  My Documents
                </h2>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-accent-text)',
                    background: 'var(--color-accent-subtle)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {filteredOwned.length}
                </span>
              </div>

              {filteredOwned.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '20px',
                  }}
                >
                  {filteredOwned.map((doc) => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      isShared={false}
                      onDelete={handleDeleteDocument}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '48px 24px',
                    background: 'var(--surface-container-lowest)',
                    border: '1px dashed var(--color-border-strong)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                    No owned documents found.
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                    Get started by creating your first rich-text document.
                  </p>
                  <button onClick={handleNewDocument} className="btn-primary">
                    <span>+</span>
                    <span>Create Document</span>
                  </button>
                </div>
              )}
            </section>

            {/* Section 2: Shared with Me */}
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '18px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}
              >
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                  Shared with Me
                </h2>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-info)',
                    background: 'var(--color-info-subtle)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {filteredShared.length}
                </span>
              </div>

              {filteredShared.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '20px',
                  }}
                >
                  {filteredShared.map((doc) => (
                    <DocCard key={doc.id} doc={doc} isShared={true} />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '36px 24px',
                    background: 'var(--surface-container-lowest)',
                    border: '1px dashed var(--color-border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    No documents have been shared with you yet.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
