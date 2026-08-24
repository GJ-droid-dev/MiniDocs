import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { availableUsers, login } = useAuth();
  const navigate = useNavigate();

  const handleSelectPersona = (userId) => {
    login(userId);
    navigate('/documents');
  };

  const personas = [
    {
      id: 'user-a',
      name: 'Alice',
      role: 'Owner',
      roleColor: 'var(--color-warning)',
      badgeBg: 'rgba(245, 158, 11, 0.12)',
      avatarClass: 'avatar-alice',
      desc: 'Owner persona — creates, formats rich-text documents, attaches files, and manages shares.',
      initial: 'A',
    },
    {
      id: 'user-b',
      name: 'Bob',
      role: 'Recipient',
      roleColor: 'var(--color-info)',
      badgeBg: 'rgba(6, 182, 212, 0.12)',
      avatarClass: 'avatar-bob',
      desc: 'Recipient persona — views shared documents in read-only mode and downloads attached files.',
      initial: 'B',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <main style={{ width: '100%', maxWidth: '840px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Brand Header */}
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--color-accent), #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 16px auto',
              boxShadow: 'var(--shadow-glow-accent)',
            }}
          >
            📄
          </div>
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              letterSpacing: '-0.03em',
              color: '#ffffff',
              marginBottom: '8px',
            }}
          >
            MiniDocs
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '480px',
              margin: '0 auto',
            }}
          >
            Minimal Document Workspace with Rich-Text Editing, Attachments & Sharing
          </p>
        </header>

        {/* Persona Switcher Prompt */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <p
            style={{
              fontSize: '0.8125rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Select a persona to sign in
          </p>
        </div>

        {/* Persona Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            width: '100%',
          }}
        >
          {personas.map((p) => (
            <div
              key={p.id}
              className="glass-card"
              style={{
                borderRadius: 'var(--radius-xl)',
                padding: '36px 28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: 'var(--shadow-lg)',
                transition: 'all var(--transition-normal)',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.boxShadow = 'var(--shadow-glow-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
            >
              {/* Avatar Circle */}
              <div
                className={p.avatarClass}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: '800',
                  marginBottom: '16px',
                  boxShadow: 'var(--shadow-md)',
                  border: '3px solid var(--surface-container-highest)',
                }}
              >
                {p.initial}
              </div>

              {/* Title & Role */}
              <h2
                style={{
                  fontSize: '1.375rem',
                  fontWeight: '700',
                  color: 'var(--color-text-primary)',
                  marginBottom: '6px',
                }}
              >
                {p.name}
              </h2>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  fontFamily: 'var(--font-mono)',
                  color: p.roleColor,
                  background: p.badgeBg,
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: '16px',
                }}
              >
                ● {p.role}
              </span>

              {/* Description */}
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.5',
                  marginBottom: '28px',
                  flex: 1,
                }}
              >
                {p.desc}
              </p>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectPersona(p.id)}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '0.9375rem',
                }}
                id={`sign-in-${p.id}`}
              >
                Sign in as {p.name} →
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
