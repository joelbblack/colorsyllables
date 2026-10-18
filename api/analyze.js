// POST { text, lang: 'en' | 'es' } → { tokens, stats }
// Splits the text into words/spaces/punctuation here, looks every word up in
// the Supabase word cache, and only asks Claude about words it hasn't seen.

const { createClient } = require('@supabase/supabase-js');
const { takeDailyQuota, callClaude } = require('./_lib');
const { TYPES, SYSTEM, CONTEXT_WORDS } = require('./_prompts');

const MAX_CHARS = 8000;
const AI_CHUNK = 120;      // words per Claude request
const LOOKUP_CHUNK = 200;  // words per cache query

const sbUrl = process.env.SUPABASE_URL || process.env.VITE_CORRECTIONS_SUPABASE_URL || 'https://csqfvnfoqgmjrqngvsxa.supabase.co';
const sbKey = process.env.SUPABASE_SECRET_KEY;
// Without the secret key the app still works, just without caching.
const supabase = sbUrl && sbKey ? createClient(sbUrl, sbKey, { auth: { persistSession: false } }) : null;
if (!supabase) {
  console.warn(`Word cache disabled: missing ${[!sbUrl && 'SUPABASE_URL / VITE_CORRECTIONS_SUPABASE_URL', !sbKey && 'SUPABASE_SECRET_KEY'].filter(Boolean).join(' and ')}`);
}

const TOKEN_RE = /(\p{L}+(?:['’]\p{L}+)*)|(\r?\n)|([^\S\n]+)|([^\p{L}\s]+)/gu;

function tokenize(text) {
  const tokens = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    if (m[1]) tokens.push({ type: 'word', text: m[1], offset: m.index });
    else if (m[2]) tokens.push({ type: 'space', text: '\n' });
    else if (m[3]) for (let i = 0; i < m[3].length; i++) tokens.push({ type: 'space', text: ' ' });
    else tokens.push({ type: 'punct', text: m[4] });
  }
  return tokens;
}

// The sentence around a word, for words whose syllables depend on meaning.
function sentenceAt(text, offset) {
  const before = text.slice(0, offset);
  const start = Math.max(before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?'), before.lastIndexOf('\n')) + 1;
  const rest = text.slice(offset).search(/[.!?\n]/);
  const end = rest === -1 ? text.length : offset + rest + 1;
  return text.slice(start, end).trim().slice(0, 300);
}

function isValid(syllables, word, lang) {
  return Array.isArray(syllables) && syllables.length > 0 &&
    syllables.every(s => s && typeof s.text === 'string' && s.text && TYPES[lang].includes(s.stype)) &&
    syllables.map(s => s.text).join('').toLowerCase() === word.toLowerCase();
}

// Cached syllables are lowercase; give them back the word's own capitals.
function withCase(syllables, original) {
  if (syllables.reduce((n, s) => n + s.text.length, 0) !== original.length) return syllables;
  let i = 0;
  return syllables.map(s => {
    const text = original.slice(i, i + s.text.length);
    i += s.text.length;
    return { text, stype: s.stype };
  });
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function lookupCache(lang, words) {
  const found = new Map();
  if (!supabase || !words.length) return found;
  try {
    const results = await Promise.all(chunk(words, LOOKUP_CHUNK).map(part =>
      supabase.from('word_syllables').select('word,syllables').eq('lang', lang).in('word', part)
    ));
    for (const { data, error } of results) {
      if (error) throw error;
      for (const row of data) found.set(row.word, row.syllables);
    }
  } catch (e) {
    console.error('Cache lookup failed:', e.message);
  }
  return found;
}

// items: [{ word, context? }] → array of syllables (or null) in the same order.
async function askClaude(lang, items) {
  const answers = new Array(items.length).fill(null);
  await Promise.all(chunk(items.map((it, i) => ({ id: i, ...it })), AI_CHUNK).map(async part => {
    try {
      const raw = await callClaude(SYSTEM[lang], JSON.stringify(part), 16000);
      const clean = raw.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
      for (const it of part) {
        const syl = parsed[it.id] ?? parsed[String(it.id)];
        if (isValid(syl, it.word, lang)) answers[it.id] = syl.map(s => ({ text: s.text, stype: s.stype }));
      }
    } catch (e) {
      console.error('Claude batch failed:', e.message);
    }
  }));
  return answers;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const lang = req.body?.lang === 'es' ? 'es' : 'en';
  if (!text.trim()) {
    return res.status(400).json({ error: 'Invalid request: text is required.' });
  }
  if (text.length > MAX_CHARS) {
    return res.status(400).json({ error: `Text is too long (max ${MAX_CHARS} characters).` });
  }

  const tokens = tokenize(text);
  const words = tokens.filter(t => t.type === 'word');
  const contextWords = CONTEXT_WORDS[lang];
  const keys = [...new Set(words.map(t => t.text.toLowerCase()).filter(k => !contextWords.has(k)))];

  const cached = await lookupCache(lang, keys);

  // One AI item per unseen word, plus one per occurrence of a context word.
  const items = [];
  const itemFor = new Map(); // cache key or token index → item index
  for (const k of keys) {
    if (!cached.has(k)) { itemFor.set(k, items.length); items.push({ word: k }); }
  }
  tokens.forEach((t, i) => {
    if (t.type === 'word' && contextWords.has(t.text.toLowerCase())) {
      itemFor.set(i, items.length);
      items.push({ word: t.text, context: sentenceAt(text, t.offset) });
    }
  });

  let answers = [];
  if (items.length) {
    if (!takeDailyQuota(req, res)) return;
    answers = await askClaude(lang, items);
    if (answers.every(a => a === null)) {
      return res.status(502).json({ error: 'Something went wrong. Please try again.' });
    }
  }

  const out = tokens.map((t, i) => {
    if (t.type !== 'word') return { type: t.type, text: t.text };
    const key = t.text.toLowerCase();
    const syllables = contextWords.has(key)
      ? answers[itemFor.get(i)]
      : cached.get(key) ?? answers[itemFor.get(key)];
    return {
      type: 'word',
      syllables: syllables ? withCase(syllables, t.text) : [{ text: t.text, stype: TYPES[lang][0] }],
    };
  });

  if (supabase) {
    const fresh = keys
      .filter(k => !cached.has(k) && answers[itemFor.get(k)])
      .map(k => ({ lang, word: k, syllables: answers[itemFor.get(k)].map(s => ({ text: s.text.toLowerCase(), stype: s.stype })) }));
    const hits = keys.filter(k => cached.has(k));
    await Promise.all([
      fresh.length && supabase.from('word_syllables').upsert(fresh, { onConflict: 'lang,word', ignoreDuplicates: true })
        .then(({ error }) => error && console.error('Cache save failed:', error.message)),
      hits.length && supabase.rpc('bump_word_hits', { p_lang: lang, p_words: hits })
        .then(({ error }) => error && console.error('Hit count failed:', error.message)),
    ]);
  }

  return res.status(200).json({
    tokens: out,
    stats: { uniqueWords: keys.length, cached: cached.size, askedAI: items.length },
  });
};
