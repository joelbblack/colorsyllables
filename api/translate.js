// POST { text } → { text } (English → Spanish)

const { takeDailyQuota, callClaude } = require('./_lib');
const { TRANSLATE_SYSTEM } = require('./_prompts');

const MAX_CHARS = 8000;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  if (!text.trim()) {
    return res.status(400).json({ error: 'Invalid request: text is required.' });
  }
  if (text.length > MAX_CHARS) {
    return res.status(400).json({ error: `Text is too long (max ${MAX_CHARS} characters).` });
  }

  if (!takeDailyQuota(req, res)) return;

  try {
    const translated = await callClaude(TRANSLATE_SYSTEM, text, 4000);
    return res.status(200).json({ text: translated });
  } catch (err) {
    console.error('Translate error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
