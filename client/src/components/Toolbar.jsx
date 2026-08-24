import React from 'react';

export default function Toolbar({ editor, disabled = false }) {
  if (!editor) return null;

  const buttonStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '32px',
    minWidth: '32px',
    padding: '0 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: disabled
      ? 'var(--color-text-disabled)'
      : isActive
      ? 'var(--color-accent-text)'
      : 'var(--color-text-secondary)',
    background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
    border: isActive ? '1px solid var(--color-border-accent)' : '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all var(--transition-fast)',
  });

  const separatorStyle = {
    width: '1px',
    height: '20px',
    background: 'var(--color-border-strong)',
    margin: '0 4px',
  };

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 10px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-toolbar)',
        border: '1px solid var(--color-border-strong)',
        boxShadow: 'var(--shadow-md)',
        overflowX: 'auto',
      }}
    >
      {/* Bold */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
        style={buttonStyle(editor.isActive('bold'))}
        title="Bold (Ctrl+B)"
      >
        <span style={{ fontWeight: '800' }}>B</span>
      </button>

      {/* Italic */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        style={buttonStyle(editor.isActive('italic'))}
        title="Italic (Ctrl+I)"
      >
        <span style={{ fontStyle: 'italic', fontFamily: 'serif' }}>I</span>
      </button>

      {/* Underline */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        style={buttonStyle(editor.isActive('underline'))}
        title="Underline (Ctrl+U)"
      >
        <span style={{ textDecoration: 'underline' }}>U</span>
      </button>

      <div style={separatorStyle} />

      {/* Heading 1 */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        style={buttonStyle(editor.isActive('heading', { level: 1 }))}
        title="Heading 1"
      >
        H1
      </button>

      {/* Heading 2 */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        style={buttonStyle(editor.isActive('heading', { level: 2 }))}
        title="Heading 2"
      >
        H2
      </button>

      <div style={separatorStyle} />

      {/* Bullet List */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        style={buttonStyle(editor.isActive('bulletList'))}
        title="Bullet List"
      >
        • List
      </button>

      {/* Numbered List */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        style={buttonStyle(editor.isActive('orderedList'))}
        title="Numbered List"
      >
        1. List
      </button>
    </div>
  );
}
