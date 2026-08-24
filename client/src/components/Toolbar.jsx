import React, { useState, useEffect } from 'react';

/**
 * Tiptap Formatting Toolbar
 * Synchronously listens to editor transaction and selectionUpdate events
 * so active button highlights toggle immediately with zero perceptible latency.
 */
export default function Toolbar({ editor, disabled = false }) {
  // Local state ticker to trigger instantaneous re-renders on selection / transaction changes
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const handleUpdate = () => {
      setTick((t) => (t + 1) % 1000000);
    };

    editor.on('transaction', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);

    return () => {
      editor.off('transaction', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [editor]);

  if (!editor) return null;

  const isBold = editor.isActive('bold');
  const isItalic = editor.isActive('italic');
  const isUnderline = editor.isActive('underline');
  const isH1 = editor.isActive('heading', { level: 1 });
  const isH2 = editor.isActive('heading', { level: 2 });
  const isBulletList = editor.isActive('bulletList');
  const isOrderedList = editor.isActive('orderedList');

  const buttonStyle = (isActive) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '32px',
    minWidth: '34px',
    padding: '0 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: disabled
      ? 'var(--color-text-disabled)'
      : isActive
      ? '#ffffff'
      : 'var(--color-text-secondary)',
    background: isActive
      ? 'var(--color-accent)'
      : 'transparent',
    border: isActive
      ? '1px solid #9fa8ff'
      : '1px solid transparent',
    boxShadow: isActive ? '0 0 12px rgba(99, 102, 241, 0.45)' : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 100ms ease, color 100ms ease, transform 50ms ease',
    userSelect: 'none',
  });

  const separatorStyle = {
    width: '1px',
    height: '20px',
    background: 'var(--color-border-strong)',
    margin: '0 4px',
  };

  // Helper to execute commands without stealing focus from editor
  const handleAction = (e, callback) => {
    e.preventDefault(); // Prevents button from stealing focus from contenteditable
    if (disabled) return;
    callback();
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
        onMouseDown={(e) =>
          handleAction(e, () => editor.chain().focus().toggleBold().run())
        }
        style={buttonStyle(isBold)}
        title="Bold (Ctrl+B)"
        aria-pressed={isBold}
      >
        <span style={{ fontWeight: '800' }}>B</span>
      </button>

      {/* Italic */}
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(e) =>
          handleAction(e, () => editor.chain().focus().toggleItalic().run())
        }
        style={buttonStyle(isItalic)}
        title="Italic (Ctrl+I)"
        aria-pressed={isItalic}
      >
        <span style={{ fontStyle: 'italic', fontFamily: 'serif' }}>I</span>
      </button>

      {/* Underline */}
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(e) =>
          handleAction(e, () => editor.chain().focus().toggleUnderline().run())
        }
        style={buttonStyle(isUnderline)}
        title="Underline (Ctrl+U)"
        aria-pressed={isUnderline}
      >
        <span style={{ textDecoration: 'underline' }}>U</span>
      </button>

      <div style={separatorStyle} />

      {/* Heading 1 */}
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(e) =>
          handleAction(e, () => editor.chain().focus().toggleHeading({ level: 1 }).run())
        }
        style={buttonStyle(isH1)}
        title="Heading 1"
        aria-pressed={isH1}
      >
        H1
      </button>

      {/* Heading 2 */}
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(e) =>
          handleAction(e, () => editor.chain().focus().toggleHeading({ level: 2 }).run())
        }
        style={buttonStyle(isH2)}
        title="Heading 2"
        aria-pressed={isH2}
      >
        H2
      </button>

      <div style={separatorStyle} />

      {/* Bullet List */}
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(e) =>
          handleAction(e, () => editor.chain().focus().toggleBulletList().run())
        }
        style={buttonStyle(isBulletList)}
        title="Bullet List"
        aria-pressed={isBulletList}
      >
        • List
      </button>

      {/* Numbered List */}
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(e) =>
          handleAction(e, () => editor.chain().focus().toggleOrderedList().run())
        }
        style={buttonStyle(isOrderedList)}
        title="Numbered List"
        aria-pressed={isOrderedList}
      >
        1. List
      </button>
    </div>
  );
}
