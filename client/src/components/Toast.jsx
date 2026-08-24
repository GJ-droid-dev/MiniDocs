import React from 'react';

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;

  const bgColors = {
    success: 'rgba(16, 185, 129, 0.15)',
    error: 'rgba(239, 68, 68, 0.15)',
    info: 'rgba(6, 182, 212, 0.15)',
  };

  const borderColors = {
    success: 'var(--color-success)',
    error: 'var(--color-danger)',
    info: 'var(--color-info)',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 18px',
        background: 'var(--color-bg-surface-raised)',
        border: `1px solid var(--color-border-strong)`,
        borderLeft: `4px solid ${borderColors[type] || borderColors.info}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        color: 'var(--color-text-primary)',
        fontSize: '0.875rem',
        animation: 'slideInRight 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: bgColors[type] || bgColors.info,
          color: borderColors[type] || borderColors.info,
          fontWeight: 'bold',
          fontSize: '12px',
        }}
      >
        {icons[type]}
      </span>
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            marginLeft: '8px',
            color: 'var(--color-text-muted)',
            fontSize: '14px',
            lineHeight: 1,
            padding: '2px',
          }}
          title="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
