-- ============================================================
-- COLOR SYLLABLES — Correction Tracking Schema
-- Run this in your Supabase SQL Editor (new project)
-- ============================================================

-- 1. RAW CORRECTIONS LOG
--    Every correction event a user submits gets one row.
CREATE TABLE IF NOT EXISTS word_corrections (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          timestamptz DEFAULT now(),
  word                text        NOT NULL,   -- original word, lowercased
  ai_syllabification  text        NOT NULL,   -- what the AI returned  e.g. "be-cause"
  user_syllabification text       NOT NULL,   -- what the user changed it to e.g. "be·cause"
  syllable_rule       text,                   -- CLOVER category if tracked (C/L/O/V/E/R)
  session_id          text,                   -- anonymous browser fingerprint
  user_agent          text,                   -- for filtering bots
  context_snippet     text                    -- optional: surrounding sentence
);

-- Index for fast lookups by word
CREATE INDEX idx_word_corrections_word ON word_corrections (word);
CREATE INDEX idx_word_corrections_created ON word_corrections (created_at DESC);

-- ============================================================
-- 2. CONFIDENCE VIEW
--    For each (word, user_syllabification) pair, how many
--    people agreed on that correction, and what % of all
--    corrections for that word does it represent?
-- ============================================================
CREATE OR REPLACE VIEW word_syllabification_confidence AS
SELECT
  word,
  user_syllabification,
  COUNT(*)                                               AS vote_count,
  ROUND(
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY word),
    1
  )                                                      AS confidence_pct,
  COUNT(DISTINCT session_id)                             AS unique_users,
  SUM(COUNT(*)) OVER (PARTITION BY word)                 AS total_word_corrections,
  MIN(created_at)                                        AS first_seen,
  MAX(created_at)                                        AS last_seen
FROM word_corrections
GROUP BY word, user_syllabification;

-- ============================================================
-- 3. FLAGGED WORDS VIEW
--    Words where the AI is consistently wrong.
--    Threshold: 3+ corrections where ai != user answer.
--    Use this as your "fix list" for prompt engineering.
-- ============================================================
CREATE OR REPLACE VIEW flagged_words AS
SELECT
  word,
  ai_syllabification                         AS ai_answer,
  -- Most popular user correction for this word
  (
    SELECT user_syllabification
    FROM word_corrections wc2
    WHERE wc2.word = wc.word
      AND wc2.ai_syllabification != wc2.user_syllabification
    GROUP BY user_syllabification
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )                                          AS top_user_correction,
  COUNT(*)                                   AS total_corrections,
  COUNT(DISTINCT session_id)                 AS unique_users,
  MAX(created_at)                            AS last_corrected
FROM word_corrections wc
WHERE ai_syllabification != user_syllabification
GROUP BY word, ai_syllabification
HAVING COUNT(*) >= 3
ORDER BY total_corrections DESC;

-- ============================================================
-- 4. SUMMARY STATS VIEW (for dashboard header)
-- ============================================================
CREATE OR REPLACE VIEW correction_stats AS
SELECT
  COUNT(*)                                   AS total_corrections,
  COUNT(DISTINCT word)                       AS unique_words_corrected,
  COUNT(DISTINCT session_id)                 AS total_sessions,
  COUNT(*) FILTER (
    WHERE ai_syllabification != user_syllabification
  )                                          AS ai_errors,
  ROUND(
    COUNT(*) FILTER (
      WHERE ai_syllabification != user_syllabification
    ) * 100.0 / NULLIF(COUNT(*), 0),
    1
  )                                          AS error_rate_pct
FROM word_corrections;

-- ============================================================
-- 5. ROW LEVEL SECURITY
--    Anonymous users can INSERT only.
--    Read access requires service role (your admin dashboard).
-- ============================================================
ALTER TABLE word_corrections ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (corrections from the app)
CREATE POLICY "allow_anon_insert" ON word_corrections
  FOR INSERT TO anon
  WITH CHECK (true);

-- Block anonymous reads (only your dashboard with service key can read)
CREATE POLICY "block_anon_select" ON word_corrections
  FOR SELECT TO anon
  USING (false);
