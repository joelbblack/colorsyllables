// Pre-fills the word cache by sending a word list through the live /api/analyze.
// Words already cached cost nothing, so this is safe to re-run.
//
//   node scripts/seed-cache.mjs [words-file] [site-url]
//   node scripts/seed-cache.mjs scripts/common-words.txt https://colorsyllables.com

import { readFileSync } from 'node:fs';

const file = process.argv[2] || 'scripts/common-words.txt';
const site = process.argv[3] || 'https://colorsyllables.com';
const BATCH = 120; // one Claude request per batch

const words = [...new Set(readFileSync(file, 'utf8').split(/\s+/).filter(Boolean))];
let cached = 0, asked = 0;

for (let i = 0; i < words.length; i += BATCH) {
  const part = words.slice(i, i + BATCH);
  let res;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(`${site}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: part.join('\n'), lang: 'en' }),
      });
      break;
    } catch (e) {
      if (attempt === 3) throw e;
      console.warn(`Batch ${i / BATCH + 1}: network error (${e.cause?.code || e.message}), retrying...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Batch ${i / BATCH + 1} failed (${res.status}): ${data.error || 'unknown error'}`);
    process.exit(1);
  }
  cached += data.stats.cached;
  asked += data.stats.askedAI;
  console.log(`Batch ${i / BATCH + 1}: ${part.length} words, ${data.stats.cached} already cached, ${data.stats.askedAI} sent to Claude`);
}

console.log(`Done: ${words.length} words, ${cached} were already cached, ${asked} sent to Claude.`);
