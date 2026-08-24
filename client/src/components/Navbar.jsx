import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onNewDocument }) {
  const { user, availableUsers, login, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchPersona = (e) => {
    const targetUserId = e.target.value;
    if (targetUserId && targetUserId !== user?.id) {
      login(targetUserId);
      navigate('/documents');
    }
  };

  const isAlice = user?.id === 'user-a';

  return (
    <header
      className="glass-nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 'var(--max-width-page)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand */}
        <Link
          to="/documents"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--color-accent), #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            📄
          </div>
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            MiniDocs
          </span>
        </Link>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onNewDocument && (
            <button
              onClick={onNewDocument}
              className="btn-primary"
              id="new-document-btn"
            >
              <span>+</span>
              <span>New Document</span>
            </button>
          )}

          {/* Persona Switcher Dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--surface-container-high)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            <div
              className={isAlice ? 'avatar-alice' : 'avatar-bob'}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '12px',
              }}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>

            <select
              value={user?.id || ''}
              onChange={handleSwitchPersona}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontSize: '0.8125rem',
                fontWeight: '500',
                cursor: 'pointer',
                outline: 'none',
                paddingRight: '4px',
              }}
              title="Switch Persona"
            >
              {availableUsers.map((u) => (
                <option
                  key={u.id}
                  value={u.id}
                  style={{ background: '#181a24', color: '#f1f5f9' }}
                >
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="btn-ghost"
            style={{ fontSize: '0.8125rem' }}
            title="Sign out of current persona"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
