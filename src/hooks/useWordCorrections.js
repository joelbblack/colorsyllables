// useWordCorrections.js
// Drop this hook into your Color Syllables src/hooks/ folder.
// Logs user corrections to Supabase anonymously.
//
// SETUP:
//   1. Add to your .env:
//      VITE_CORRECTIONS_SUPABASE_URL=https://YOURPROJECT.supabase.co
//      VITE_CORRECTIONS_SUPABASE_ANON_KEY=your_anon_key
//   2. npm install @supabase/supabase-js  (if not already installed)
//   3. Import and call logCorrection() when user submits a fix.

import { createClient } from '@supabase/supabase-js';
import { useCallback, useRef } from 'react';

// ── Supabase client (corrections project) ──────────────────────────────────
const sbUrl = import.meta.env.VITE_CORRECTIONS_SUPABASE_URL;
const sbKey = import.meta.env.VITE_CORRECTIONS_SUPABASE_ANON_KEY;
const supabase = sbUrl && sbKey ? createClient(sbUrl, sbKey) : null;

// ── Lightweight anonymous session fingerprint ──────────────────────────────
function getSessionId() {
  const KEY = 'cs_session_id';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useWordCorrections() {
  const pendingRef = useRef(new Set()); // prevent duplicate rapid submits

  /**
   * Call this when a user confirms a syllable correction.
   *
   * @param {object} params
   * @param {string} params.word                 - The original word (e.g. "because")
   * @param {string} params.aiSyllabification    - AI's version (e.g. "be-cause")
   * @param {string} params.userSyllabification  - User's correction (e.g. "be·cause")
   * @param {string} [params.syllableRule]       - CLOVER category if applicable
   * @param {string} [params.contextSnippet]     - Surrounding sentence (optional)
   */
  const logCorrection = useCallback(async ({
    word,
    aiSyllabification,
    userSyllabification,
    syllableRule = null,
    contextSnippet = null,
  }) => {
    if (!supabase) return;

    // Normalize
    const normalizedWord = word.toLowerCase().trim();

    // Skip if nothing changed
    if (aiSyllabification === userSyllabification) return;

    // Debounce: skip if this exact correction is already in-flight
    const key = `${normalizedWord}|${userSyllabification}`;
    if (pendingRef.current.has(key)) return;
    pendingRef.current.add(key);

    try {
      const { error } = await supabase
        .from('word_corrections')
        .insert({
          word: normalizedWord,
          ai_syllabification: aiSyllabification,
          user_syllabification: userSyllabification,
          syllable_rule: syllableRule,
          session_id: getSessionId(),
          user_agent: navigator.userAgent.slice(0, 200),
          context_snippet: contextSnippet?.slice(0, 500) ?? null,
        });

      if (error) {
        console.warn('[ColorSyllables] Correction log failed:', error.message);
      }
    } finally {
      pendingRef.current.delete(key);
    }
  }, []);

  return { logCorrection };
}
