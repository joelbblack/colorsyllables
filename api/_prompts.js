// Server-side prompts and syllable types. The browser never sends a prompt,
// so /api/analyze and /api/translate can't be used as a general Claude proxy.

const TYPES = {
  en: ['Closed', 'Magic-E', 'Vowel Team', 'R-Controlled', 'Open', 'C+le'],
  es: ['Abierta', 'Cerrada', 'Diptongo', 'Hiato', 'Grupo Consonántico'],
};

const OUTPUT_RULES = `Input: a JSON array of items {"id":number,"word":string,"context"?:string}. When "context" is given, the word's pronunciation depends on that sentence (e.g. REC·ord vs re·CORD) — use it.

Return ONLY a JSON object mapping each id to that word's syllables, e.g. {"0":[{"text":"snap","stype":"Closed"}],"1":[...]}. No markdown, no explanation.
Concatenated syllable texts must equal the word exactly (same letters, same case, keep apostrophes).`;

const SYSTEM = {
  en: `You are a precise phonics expert trained in the six syllable types used in structured literacy.

Break each word into its syllables and classify EACH syllable as exactly one of:
- Closed (vowel closed in by consonant, short vowel — snap, clap, lev·el)
- Magic-E (silent e makes vowel long — smile, skate, trade)
- Vowel Team (two vowels one sound — teach, sail, cool, out, snow)
- R-Controlled (vowel+r changes sound — storm, start, search)
- Open (ends in vowel, long sound — sto·ry, sta·ble, go, me)
- C+le (consonant+le end of word — sta·ble, set·tle, sim·ple)

${OUTPUT_RULES}`,

  es: `Eres un experto en fonética del español estructurado.

Divide cada palabra en sílabas y clasifica CADA sílaba como exactamente uno de estos 5 tipos:
- Abierta (sílaba que termina en vocal — ca, me, si, no, lu) — la más común en español
- Cerrada (sílaba que termina en consonante — pan, sol, es, cam, ten)
- Diptongo (vocal fuerte+débil O débil+fuerte en UNA sílaba — bue·no, rei·na, au·la, tie·rra, cua·tro)
- Hiato (dos vocales fuertes en sílabas SEPARADAS — ma·es·tro, po·e·ma, le·er, ca·os)
- Grupo Consonántico (sílaba que contiene grupo bl,br,cl,cr,dr,fl,fr,gl,gr,pl,pr,tr inseparable — bra·zo, pla·to, flo·res, cla·se)

Reglas de división: consonante sola entre vocales va con la vocal siguiente (ca-sa no cas-a). Los grupos consonánticos bl,br,cl,cr,dr,fl,fr,gl,gr,pl,pr,tr son inseparables. Otras combinaciones consonánticas se dividen (ac-ción, car-ta).

${OUTPUT_RULES}`,
};

const TRANSLATE_SYSTEM =
  'Translate the following English text to Spanish. Return ONLY the translated text. Preserve all line breaks and punctuation.';

// English heteronyms whose split or syllable type depends on the sentence.
// These are always sent to the AI with their sentence and never cached.
const CONTEXT_WORDS = {
  en: new Set([
    'record', 'present', 'object', 'project', 'produce', 'permit', 'content',
    'desert', 'refuse', 'conduct', 'contract', 'subject', 'minute', 'invalid',
    'live', 'close', 'wound', 'rebel', 'convert', 'insert', 'increase',
    'decrease', 'export', 'import', 'progress', 'protest', 'separate',
    'estimate', 'graduate', 'moderate', 'alternate', 'address', 'perfect',
    'compound', 'attribute', 'console', 'contest', 'digest', 'entrance',
    'extract', 'incline', 'invite', 'combat', 'conflict', 'escort',
  ]),
  es: new Set(),
};

module.exports = { TYPES, SYSTEM, TRANSLATE_SYSTEM, CONTEXT_WORDS };
