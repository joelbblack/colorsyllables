// CorrectionModal.jsx
// Shown when a user clicks a mis-syllabified word.
// Lets them type the correct syllabification and submit.
//
// USAGE in your word component:
//
//   import CorrectionModal from './CorrectionModal';
//   import { useWordCorrections } from '../hooks/useWordCorrections';
//
//   const { logCorrection } = useWordCorrections();
//
//   <CorrectionModal
//     open={modalOpen}
//     word={clickedWord}
//     aiSyllabification={currentSyllabification}
//     syllableRule={currentRule}
//     onSubmit={(corrected) => {
//       logCorrection({
//         word: clickedWord,
//         aiSyllabification: currentSyllabification,
//         userSyllabification: corrected,
//         syllableRule: currentRule,
//       });
//       setModalOpen(false);
//     }}
//     onClose={() => setModalOpen(false)}
//   />

import { useState, useEffect, useRef } from 'react';

export default function CorrectionModal({
  open,
  word = '',
  aiSyllabification = '',
  syllableRule = null,
  onSubmit,
  onClose,
}) {
  const [value, setValue] = useState(aiSyllabification);
  const inputRef = useRef(null);

  // Reset input when modal opens
  useEffect(() => {
    if (open) {
      setValue(aiSyllabification);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, aiSyllabification]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Correct syllabification for "${word}"`}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '24px 28px',
        width: 340,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        fontFamily: 'inherit',
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>
          Correct syllabification
        </h2>
        <p style={{ margin: '0 0 16px', color: '#666', fontSize: 14 }}>
          Word: <strong>{word}</strong>
          {syllableRule && <span style={{ marginLeft: 8, color: '#888' }}>({syllableRule})</span>}
        </p>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Current (AI)
        </label>
        <div style={{
          background: '#FFF3CD',
          border: '1px solid #FFCA2C',
          borderRadius: 6,
          padding: '8px 12px',
          marginBottom: 14,
          fontSize: 16,
          letterSpacing: 1,
        }}>
          {aiSyllabification}
        </div>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="correction-input"
            style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}
          >
            Your correction
          </label>
          <input
            id="correction-input"
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. be·cause"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 16,
              borderRadius: 6,
              border: '2px solid #4A90D9',
              outline: 'none',
              marginBottom: 16,
              boxSizing: 'border-box',
              letterSpacing: 1,
            }}
          />
          <p style={{ fontSize: 11, color: '#aaa', margin: '-10px 0 16px' }}>
            Use · or - to separate syllables
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 6,
                border: '2px solid #ddd', background: '#fff',
                cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#555',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim() || value.trim() === aiSyllabification}
              style={{
                flex: 2, padding: '10px 0', borderRadius: 6,
                border: 'none', background: '#4A90D9',
                color: '#fff', cursor: 'pointer',
                fontSize: 14, fontWeight: 700,
                opacity: (!value.trim() || value.trim() === aiSyllabification) ? 0.5 : 1,
              }}
            >
              Submit Correction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
