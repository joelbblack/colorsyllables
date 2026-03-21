// api/chat.js — Vercel serverless function
// Proxies requests to Anthropic, keeps API key secret, rate limits by IP

const DAILY_LIMIT = 20;
const ipLog = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const today = new Date().toDateString();
  const key = `${ip}:${today}`;
  const count = ipLog.get(key) || 0;

  if (count >= DAILY_LIMIT) {
    return res.status(429).json({
      error: `Daily limit of ${DAILY_LIMIT} analyses reached. Please try again tomorrow.`
    });
  }

  ipLog.set(key, count + 1);

  try {
    const body = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
