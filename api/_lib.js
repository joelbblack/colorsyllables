const DAILY_LIMIT = 50;
// Note: ipLog resets on serverless cold starts; not persistent across instances.
const ipLog = new Map();

// Returns false (and sends a 429) once this IP has used its daily AI calls.
function takeDailyQuota(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const key = `${ip}:${new Date().toDateString()}`;
  const count = ipLog.get(key) || 0;

  if (count >= DAILY_LIMIT) {
    res.status(429).json({
      error: `Daily limit of ${DAILY_LIMIT} analyses reached. Please try again tomorrow.`
    });
    return false;
  }

  ipLog.set(key, count + 1);
  return true;
}

// Calls Claude with a fixed system prompt and returns the reply text.
async function callClaude(system, content, maxTokens) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Server misconfiguration: ANTHROPIC_API_KEY is not set.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5-5',
      max_tokens: maxTokens,
      thinking: { type: 'between_tools' },
      system,
      messages: [{ role: 'user', content }],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Claude request failed (${response.status})`);
  }
  return data.content?.find(b => b.type === 'text')?.text || '';
}

module.exports = { takeDailyQuota, callClaude };
