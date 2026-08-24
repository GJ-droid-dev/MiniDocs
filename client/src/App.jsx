import React, { useState, useEffect } from 'react';

function App() {
  const [health, setHealth] = useState({ status: 'checking...' });

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => setHealth({ status: 'error', error: err.message }));
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          MiniDocs <span style={{ color: 'var(--accent-primary)', fontSize: '1rem' }}>v1.0 (Core Slice)</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Minimal Document Workspace — Rich-text editing, file attachments, and sharing.
        </p>
      </header>

      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Phase 1 Scaffold Health Check
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor:
                health.status === 'ok'
                  ? 'var(--color-success)'
                  : health.status === 'error'
                  ? 'var(--color-danger)'
                  : 'var(--color-warning)',
            }}
          />
          <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            Backend API Health: {JSON.stringify(health)}
          </span>
        </div>
      </section>
    </div>
  );
}

export default App;
