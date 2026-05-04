import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useWordCorrections } from "./hooks/useWordCorrections";
import SyllableAdminDashboard from "./components/SyllableAdminDashboard";
import CorrectionModal from "./components/CorrectionModal";

// ── FONTS ─────────────────────────────────────────────────────────────────────
const fontFaceCSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
@font-face {
  font-family: 'OpenDyslexic';
  src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/fonts/OpenDyslexic-Regular.otf') format('opentype');
  font-weight: normal;
}
@font-face {
  font-family: 'OpenDyslexic';
  src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/fonts/OpenDyslexic-Bold.otf') format('opentype');
  font-weight: bold;
}
@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes fadeIn  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
`;

// ── ENGLISH SYLLABLE TYPES ────────────────────────────────────────────────────
const TYPES = {
  "Closed":       { light:"#C0392B", dark:"#E74C3C", label:"Closed",       rule:"Vowel is SHORT — closed in by a consonant" },
  "Magic-E":      { light:"#1A6EA8", dark:"#4FA3E0", label:"Magic-E",      rule:"Silent e makes the vowel say its LONG name" },
  "Vowel Team":   { light:"#1B9A59", dark:"#3DC87A", label:"Vowel Team",   rule:"Two vowels work together to make ONE sound" },
  "R-Controlled": { light:"#7B3FA8", dark:"#B06FE0", label:"R-Controlled", rule:"The r takes over and changes the vowel sound" },
  "Open":         { light:"#C49A00", dark:"#F0C430", label:"Open",         rule:"Ends in a vowel — says its LONG name" },
  "C+le":         { light:"#4A6080", dark:"#8AAAC8", label:"C+le",         rule:"Consonant + le found at the END of a word" },
};
const TYPE_KEYS = Object.keys(TYPES);

// ── SPANISH SYLLABLE TYPES ────────────────────────────────────────────────────
const TYPES_ES = {
  "Abierta":            { light:"#C49A00", dark:"#F0C430", label:"Abierta",      rule:"Termina en vocal — la más común en español (ca·sa, me·sa)" },
  "Cerrada":            { light:"#C0392B", dark:"#E74C3C", label:"Cerrada",      rule:"Termina en consonante — vocal corta (pan, sol, cam·po)" },
  "Diptongo":           { light:"#1B9A59", dark:"#3DC87A", label:"Diptongo",     rule:"Vocal fuerte + débil en una sílaba (bue·no, rei·na, au·la)" },
  "Hiato":              { light:"#1A6EA8", dark:"#4FA3E0", label:"Hiato",        rule:"Dos vocales fuertes en sílabas separadas (ma·es·tro, po·e·ma)" },
  "Grupo Consonántico": { light:"#7B3FA8", dark:"#B06FE0", label:"Grupo Cons.",  rule:"Grupo bl,br,cl,cr… inseparable (bra·zo, pla·to, flo·res)" },
};
const TYPE_KEYS_ES = Object.keys(TYPES_ES);

// ── NAV ITEMS ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"coder",     icon:"⚡", label:"Color Coder"    },
  { id:"library",   icon:"📚", label:"Passage Library" },
  { id:"howto",     icon:"📖", label:"How To Use"      },
  { id:"resources", icon:"🔗", label:"Resources"       },
  { id:"social",    icon:"🌎", label:"Social Studies"  },
  { id:"math",      icon:"🔢", label:"Math Vocab"      },
  { id:"science",   icon:"🔬", label:"Science Vocab"   },
  { id:"blog",      icon:"✍️", label:"Blog"            },
  { id:"parents",   icon:"👨‍👩‍👧", label:"For Parents"    },
  { id:"coaches",   icon:"🏫", label:"For Coaches"     },
  { id:"ell",       icon:"🌐", label:"ELL Strategies"  },
  { id:"about",     icon:"ℹ️", label:"About"           },
  { id:"corrections", icon:"🔬", label:"Correction Lab" },
];

// ── SAMPLE PASSAGES ───────────────────────────────────────────────────────────
const QUICK_SAMPLES = [
  { title:"Morning Message",    text:"Good morning, friends! Today we will learn about spring storms. A storm can bring rain, wind, and thunder. Stay safe and stay warm inside." },
  { title:"Science: Water Cycle", text:"Water falls from clouds as rain or snow. It flows into streams and rivers. The sun warms the water and turns it into steam. Steam rises and forms new clouds." },
  { title:"Story Starter",     text:"The old lighthouse stood on a steep cliff above the sea. Each night its bright light swept across the dark waves. Ships could sail safely past the sharp rocks below." },
];

const SOCIAL_SAMPLES = [
  { title:"California Missions", text:"The missions of California were built by Spanish settlers beginning in 1769. Each mission had a church, gardens, and workshops. Native people were brought to live and work at the missions. The missions changed the land and the lives of the people who lived there." },
  { title:"Rancho Life",          text:"After Mexico won independence from Spain, the missions were closed. Large ranchos took their place. Families raised cattle on wide open land. Cowhands called vaqueros rounded up the cattle each year. The rancho system shaped the culture of early California." },
  { title:"Native Peoples of California", text:"California was home to many native groups before settlers arrived. The Chumash people lived along the coast and fished the ocean. The Miwok people lived in the forests and valleys. Each group had its own language, traditions, and way of life." },
  { title:"Spanish Colonization", text:"Spain claimed California as part of its empire. Soldiers and priests traveled north from Mexico. They built a chain of missions along the coast. The goal was to convert native people to Christianity and expand Spanish territory." },
];

const MATH_SAMPLES = [
  { title:"Place Value",        text:"In the number 3,456 the digit 3 is in the thousands place. The digit 4 is in the hundreds place. The digit 5 is in the tens place. The digit 6 is in the ones place. Each place is ten times greater than the one to its right." },
  { title:"Fractions",          text:"A fraction names part of a whole. The bottom number is called the denominator. It tells how many equal parts the whole is divided into. The top number is called the numerator. It tells how many parts we are talking about." },
  { title:"Multiplication",     text:"Multiplication is repeated addition. When we multiply 4 times 6 we add four groups of six together. The answer is called the product. Knowing multiplication facts helps us solve problems faster and builds number sense." },
  { title:"Perimeter and Area", text:"Perimeter is the distance around the outside of a shape. We find perimeter by adding the lengths of all the sides. Area measures the space inside a shape. We find the area of a rectangle by multiplying the length times the width." },
];

const SCIENCE_SAMPLES = [
  { title:"The Water Cycle",  text:"Water moves through the environment in a cycle. Evaporation turns liquid water into water vapor. Condensation forms clouds when water vapor cools. Precipitation brings water back to earth as rain or snow. The cycle begins again as water flows into rivers and oceans." },
  { title:"Plant Cells",      text:"Plant cells have a rigid cell wall that gives them structure. Inside is a membrane that controls what enters and exits. The nucleus contains the genetic information of the cell. Chloroplasts capture sunlight and produce energy through photosynthesis." },
  { title:"Forces and Motion", text:"A force is a push or a pull on an object. Gravity is a force that pulls objects toward the center of the earth. Friction is a force that slows objects when surfaces rub together. The greater the force applied, the faster an object will accelerate." },
  { title:"Ecosystems",       text:"An ecosystem includes all the living and nonliving things in an area. Producers like plants make their own food using sunlight. Consumers eat plants or other animals to get energy. Decomposers break down dead material and return nutrients to the soil." },
];

// ── BLOG POSTS ────────────────────────────────────────────────────────────────
const BLOG_POSTS = [
  {
    id:1, pinned:true,
    title:"How Color Coding Syllables Supports Orthographic Mapping",
    date:"March 2026",
    preview:"Orthographic mapping is not a strategy — it's what happens in the brain when phonics instruction actually works. Color makes the patterns stick faster because students can see them before they can explain them.",
    content:`Orthographic mapping is not a strategy — it's what happens in the brain when phonics instruction actually works. It's the process by which words move from conscious decoding into automatic recognition. Color makes that happen faster because students can see the patterns before they can fully explain them.

Here's what that looks like in practice. A student sees the word 'story' broken into two syllables — sto in yellow, ry in blue. They haven't memorized the open syllable rule yet. But they've now seen that yellow syllable ending in a vowel enough times that something is starting to click. The color is doing work the rule hasn't finished doing yet.

That's the mechanism. The color becomes a retrieval cue before the explicit knowledge becomes automatic. You're building the scaffold while the brain is still constructing the wall.

This is why I don't think of Color Syllables as a supplement to phonics instruction. It's a visual layer on top of it. The teacher still has to name the rule, model it, practice it. But every time a student reads a color-coded passage, they're getting another repetition of the pattern without it feeling like a drill. That matters for students who need more exposures than a typical lesson can provide — which in a special education classroom is most of them.

The research on orthographic mapping comes largely from David Kilpatrick's work. If you haven't read Equipped for Reading Success, it's worth your time. The short version: phonemic awareness plus letter-sound knowledge equals words stored in long-term memory. Color coding is a way to keep both of those active while students are reading connected text.`,
  },
  {
    id:2, pinned:true,
    title:"Using Color Syllables with California History Vocabulary",
    date:"March 2026",
    preview:"One look at the California history curriculum and you'll see it's a goldmine for word study. The word 'California' itself has four syllable types in it. That's your entry point.",
    content:`One look at the California history curriculum and you'll see it's a goldmine for word study. The vocabulary that comes out of that period — colonization, agriculture, genocide, vaquero, pueblo, rancho — is long, Latinate, Spanish-origin, and structurally predictable. That combination is almost ideal for syllable instruction.

The word 'California' itself: Cal (closed), i (open), for (r-controlled), ni (open), a (open). Four syllable types in a word students already know and care about. That's your entry point.

Color Syllables works especially well at the single-word level for vocabulary study. Bump the font size up and put one word on the screen — colonization, missions, indigenous. The colors spread across the screen and students can actually see the structure of the word before they're asked to read or define it.

My routine goes like this. I put up one word. I call on a student. What color is this syllable? What is its syllable type? How does that affect the sound of the vowel? That third question is for students who already have the syllable types internalized — it's the extension move. The first two questions are for everyone.

For slightly longer passages, Color Syllables helps students pre-hearse. They can see what's coming in a paragraph before they're asked to read it aloud — which vowel sounds to expect, where the stress might land, what the long words are actually made of. That's meaningful for students who shut down when they hit unfamiliar academic vocabulary.

One thing worth saying directly: California history contains some of the most difficult content in the elementary curriculum. The Gold Rush and the California genocide are not separate stories. Teaching the vocabulary of that history honestly — including the word genocide — is part of the work. The syllable colors don't sanitize the meaning. They just help students access the words so the conversation can happen.`,
  },
  {
    id:3, pinned:false,
    title:"A Note on Spanish Syllables and Bilingual Learners",
    date:"March 2026",
    preview:"Spanish is more phonetically consistent than English. Students who speak it already have strong intuition for patterns that English learners have to be explicitly taught. That's an asset, not a gap.",
    content:`Spanish is more phonetically consistent than English. Students who speak it already have strong phonological intuition for patterns that English learners have to be explicitly taught. That's an asset, not a gap — and it's one that structured literacy instruction doesn't always know how to use.

The dominant syllable type in Spanish is the open syllable. A consonant followed by a vowel, vowel says its name. Mesa. Casa. Libro. Numero. Spanish-speaking students have heard and produced thousands of open syllables before they ever sat in a phonics lesson. When you show them that pattern in yellow on a screen and tell them that's called an open syllable and English has it too — something connects.

Color Syllables has a Spanish mode that uses a different five-type system built for Spanish phonology: Abierta, Cerrada, Diptongo, Hiato, and Grupo Consonantico. Same colors as English where the types correspond — Abierta is yellow like Open, Cerrada is red like Closed — so students moving between languages don't lose the visual framework they already know.

The cognate angle is worth building out deliberately. Run 'nation' through the coder in English, then run 'nacion' in Spanish. The syllable structures are close enough that students can see the relationship in the colors, not just recognize it from the spelling. That's a different kind of knowing.

The goal is not to treat Spanish and English as two separate systems running on parallel tracks in the same brain. The goal is to make the connections between them visible. The color is a tool for that.`,
  },
  {
    id:4, pinned:false,
    title:"ELL Bridge Strategies in a Structured Literacy Classroom",
    date:"March 2026",
    preview:"Most ELL support frameworks and most structured literacy frameworks were built independently of each other. Teachers working with both populations feel that gap every day. Here's how I think about closing it.",
    content:`Most ELL support frameworks and most structured literacy frameworks were built independently of each other. Teachers working with both populations feel that gap every day — you're essentially running two programs for students who need them to be one program.

The place where they can connect is at the level of language structure. Both frameworks care about how sounds work, how words are built, how meaning is carried by form. Structured literacy just has more explicit tools for making that visible. Color coding is one of them.

In a classroom with Spanish-speaking ELL students, I think about three entry points specifically.

The first is cognate awareness. Spanish-English cognates are often the longest, most academic words in a passage — exactly the words ELL students are most likely to skip or guess at. Running a cognate pair through the coder in both languages shows students the structural overlap. 'Education' and 'educacion' aren't just similar in meaning — they're built from the same parts in a similar pattern. The colors make that argument without requiring students to already know the vocabulary to understand it.

The second is the open syllable transfer. Spanish-dominant students already know how open syllables sound. They don't know the English term for it, and they may not know it applies to English words too, but the phonological knowledge is there. Naming it and showing it in color gives them credit for what they already know while building toward the English rule.

The third is pre-reading exposure. Before a student reads a content-area passage aloud — social studies, science, anything with dense vocabulary — running it through Color Syllables gives them a visual map of what they're about to encounter. Where the long words are. What the vowels are doing. Which syllables carry the stress. For a student who is simultaneously decoding in a second language and processing new content, that preview matters.

None of this replaces direct language instruction. But it gives students one more access point, and in my experience that's often the one that makes the difference.`,
  },
];

// ── SYSTEM PROMPTS ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a precise phonics expert trained in the six syllable types used in structured literacy.

Break every word into its syllables and classify EACH syllable as exactly one of:
- Closed (vowel closed in by consonant, short vowel — snap, clap, lev·el)
- Magic-E (silent e makes vowel long — smile, skate, trade)
- Vowel Team (two vowels one sound — teach, sail, cool, out, snow)
- R-Controlled (vowel+r changes sound — storm, start, search)
- Open (ends in vowel, long sound — sto·ry, sta·ble, go, me)
- C+le (consonant+le end of word — sta·ble, set·tle, sim·ple)

Return ONLY valid JSON array. No markdown, no explanation.
Each token: word={"type":"word","syllables":[{"text":"snap","stype":"Closed"}]}, space={"type":"space","text":" "}, newline={"type":"space","text":"\\n"}, punct={"type":"punct","text":"."}
Preserve all spaces/newlines/punctuation. Concatenated syllable texts must equal original word exactly.`;

const SPANISH_SYSTEM_PROMPT = `Eres un experto en fonética del español estructurado.

Divide cada palabra en sílabas y clasifica CADA sílaba como exactamente uno de estos 5 tipos:
- Abierta (sílaba que termina en vocal — ca, me, si, no, lu) — la más común en español
- Cerrada (sílaba que termina en consonante — pan, sol, es, cam, ten)
- Diptongo (vocal fuerte+débil O débil+fuerte en UNA sílaba — bue·no, rei·na, au·la, tie·rra, cua·tro)
- Hiato (dos vocales fuertes en sílabas SEPARADAS — ma·es·tro, po·e·ma, le·er, ca·os)
- Grupo Consonántico (sílaba que contiene grupo bl,br,cl,cr,dr,fl,fr,gl,gr,pl,pr,tr inseparable — bra·zo, pla·to, flo·res, cla·se)

Reglas de división: consonante sola entre vocales va con la vocal siguiente (ca-sa no cas-a). Los grupos consonánticos bl,br,cl,cr,dr,fl,fr,gl,gr,pl,pr,tr son inseparables. Otras combinaciones consonánticas se dividen (ac-ción, car-ta).

Return ONLY valid JSON array. No markdown, no explanation.
Each token: word={"type":"word","syllables":[{"text":"ca","stype":"Abierta"},{"text":"sa","stype":"Abierta"}]}, space={"type":"space","text":" "}, newline={"type":"space","text":"\\n"}, punct={"type":"punct","text":"."}
Las sílabas concatenadas deben igualar exactamente la palabra original.`;

// ── ROUTE → PAGE ID MAPPING ───────────────────────────────────────────────────
const PATH_TO_PAGE = {
  "/": "coder",
  "/library": "library",
  "/how-to-use": "howto",
  "/resources": "resources",
  "/social-studies": "social",
  "/math-vocab": "math",
  "/science-vocab": "science",
  "/blog": "blog",
  "/for-parents": "parents",
  "/for-coaches": "coaches",
  "/ell-strategies": "ell",
  "/about": "about",
  "/corrections": "corrections",
};
const PAGE_TO_PATH = Object.fromEntries(Object.entries(PATH_TO_PAGE).map(([k, v]) => [v, k]));

const PAGE_TITLES = {
  coder:       "Color Syllables — Structured Literacy Syllable Tool for Teachers",
  library:     "Passage Library — Color Syllables",
  howto:       "How To Use — Color Syllables",
  resources:   "Science of Reading Resources — Color Syllables",
  social:      "Social Studies Passages — Color Syllables",
  math:        "Math Vocabulary — Color Syllables",
  science:     "Science Vocabulary — Color Syllables",
  blog:        "Blog — Color Syllables",
  parents:     "For Parents — Color Syllables",
  coaches:     "For Instructional Coaches — Color Syllables",
  ell:         "ELL Strategies — Color Syllables",
  about:       "About — Color Syllables",
  corrections: "Correction Lab — Color Syllables",
};

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {

  const location = useLocation();
  const navigate = useNavigate();
  const { logCorrection } = useWordCorrections();

  // Derive activePage from URL
  const activePage = PATH_TO_PAGE[location.pathname] || "coder";
  const setActivePage = (pageId) => navigate(PAGE_TO_PATH[pageId] || "/");

  // Update document title when page changes
  useEffect(() => {
    document.title = PAGE_TITLES[activePage] || PAGE_TITLES.coder;
  }, [activePage]);

  // ── STATE ─────────────────────────────────────────────────────────────────
  const [inputText, setInputText]       = useState("");
  const [tokens, setTokens]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [fontSize, setFontSize]         = useState(30);
  const [dark, setDark]                 = useState(true);
  const [dyslexic, setDyslexic]         = useState(false);
  const [focusType, setFocusType]       = useState(null);
  const [library, setLibrary]           = useState(QUICK_SAMPLES);
  const [saveName, setSaveName]         = useState("");
  const [showSaveBar, setShowSaveBar]   = useState(false);
  const [fullscreen, setFullscreen]     = useState(false);
  const [spanishMode, setSpanishMode]   = useState(false);
  const [translating, setTranslating]   = useState(false);
  const [speakMode, setSpeakMode]       = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);

  // Word editor
  const [editingToken, setEditingToken] = useState(null);
  const [editSplit, setEditSplit]       = useState("");
  const [editTypes, setEditTypes]       = useState([]);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const editorInputRef                  = useRef(null);
  const editorBarRef                    = useRef(null);
  const outputRef                       = useRef(null);
  const appRef                          = useRef(null);

  // ── THEME ─────────────────────────────────────────────────────────────────
  const D = {
    pageBg:   dark ? "#0D1520" : "#F0F4F8",
    panelBg:  dark ? "#172030" : "#FFFFFF",
    sideBg:   dark ? "#111925" : "#F8FAFC",
    navBg:    dark ? "#0A1220" : "#1A3E6B",
    border:   dark ? "#263345" : "#DDE3EA",
    headerBg: dark ? "#0A1628" : "#1A3E6B",
    legendBg: dark ? "#111925" : "#EEF1F5",
    text:     dark ? "#E2EAF4" : "#1A2535",
    subText:  dark ? "#7A95B0" : "#5A7080",
    inputBg:  dark ? "#0D1520" : "#FFFFFF",
    inputBdr: dark ? "#263345" : "#C8D4E0",
    accent:   dark ? "#4FA3E0" : "#1A6EA8",
    punctText:dark ? "#A0B4C8" : "#444444",
    dimText:  dark ? "#2A3D52" : "#C8D4E0",
    editorBg: dark ? "#0A1628" : "#1A3E6B",
    navText:  "rgba(255,255,255,0.65)",
    navActive:"#FFFFFF",
  };
  const font = dyslexic ? "'OpenDyslexic', sans-serif" : "'Nunito', system-ui, sans-serif";

  // Active type system — switches between English and Spanish
  const activeTypes    = spanishMode ? TYPES_ES : TYPES;
  const activeTypeKeys = spanishMode ? TYPE_KEYS_ES : TYPE_KEYS;

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = useCallback((text) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = spanishMode ? "es-ES" : "en-US";
    utter.rate = 0.85;
    utter.onend  = () => setIsSpeaking(false);
    utter.onerror= () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, [spanishMode]);

  const stopSpeaking = () => { window.speechSynthesis.cancel(); setIsSpeaking(false); };

  const readPassage = useCallback(() => {
    if (!tokens) return;
    if (isSpeaking) { stopSpeaking(); return; }
    const text = tokens.map(t => {
      if (t.type === "word")  return t.syllables.map(s => s.text).join("");
      if (t.type === "space") return " ";
      if (t.type === "punct") return t.text;
      return "";
    }).join("");
    speak(text);
  }, [tokens, speak, isSpeaking]);

  // ── TRANSLATE ─────────────────────────────────────────────────────────────
  const translatePassage = useCallback(async () => {
    if (!inputText.trim()) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:"Translate the following English text to Spanish. Return ONLY the translated text. Preserve all line breaks and punctuation.",
          messages:[{ role:"user", content: inputText }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Translation failed (${res.status})`);
      }
      const data = await res.json();
      const translated = data.content?.find(b => b.type === "text")?.text || "";
      setInputText(translated);
      setSpanishMode(true);
      setTokens(null);
      setShowSaveBar(false);
    } catch(e) { setError("Translation failed — try again."); console.error(e); }
    finally { setTranslating(false); }
  }, [inputText]);

  // ── WORD EDITOR ───────────────────────────────────────────────────────────
  const openEditor = (tokenIdx) => {
    const token = tokens[tokenIdx];
    if (!token || token.type !== "word") return;
    setEditingToken({ tokenIdx });
    setEditSplit(token.syllables.map(s => s.text).join("/"));
    setEditTypes(token.syllables.map(s => s.stype));
    setTimeout(() => editorInputRef.current?.focus(), 50);
  };
  const closeEditor = () => { setEditingToken(null); setEditSplit(""); setEditTypes([]); };
  const handleSplitChange = (val) => {
    setEditSplit(val);
    const chunks = val.split("/").filter(c => c.length > 0);
    setEditTypes(prev => chunks.map((_, i) => prev[i] || activeTypeKeys[0]));
  };
  const setChunkType = (ci, stype) => setEditTypes(prev => prev.map((t, i) => i === ci ? stype : t));
  const confirmEdit = () => {
    if (!editingToken) return;
    const chunks = editSplit.split("/").filter(c => c.length > 0);
    if (!chunks.length) { closeEditor(); return; }
    const original = tokens[editingToken.tokenIdx];
    const aiSyll = original.syllables.map(s => s.text).join("·");
    const userSyll = chunks.join("·");
    logCorrection({
      word: original.syllables.map(s => s.text).join(""),
      aiSyllabification: aiSyll,
      userSyllabification: userSyll,
    });
    setTokens(prev => prev.map((token, ti) =>
      ti !== editingToken.tokenIdx ? token
        : { ...token, syllables: chunks.map((text, i) => ({ text, stype: editTypes[i] || activeTypeKeys[0] })) }
    ));
    closeEditor();
  };

  useEffect(() => {
    if (!editingToken) return;
    const h = (e) => {
      if (e.key === "Escape") closeEditor();
      if (e.key === "Enter" && e.target.tagName !== "BUTTON") confirmEdit();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [editingToken, editSplit, editTypes]);

  useEffect(() => {
    if (!editingToken || !editorBarRef.current) return;
    const focusable = editorBarRef.current.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0], last = focusable[focusable.length - 1];
    const trap = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    };
    editorBarRef.current.addEventListener("keydown", trap);
    return () => editorBarRef.current?.removeEventListener("keydown", trap);
  }, [editingToken, editSplit]);

  // ── PROCESS ───────────────────────────────────────────────────────────────
  const processText = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true); setError(null); setTokens(null); setShowSaveBar(false);
    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:4000,
          system: spanishMode ? SPANISH_SYSTEM_PROMPT : SYSTEM_PROMPT,
          messages:[{ role:"user", content:`Analyze this text:\n\n${inputText}` }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      const data  = await res.json();
      const raw   = data.content?.find(b => b.type === "text")?.text || "";
      const clean = raw.replace(/```json|```/gi, "").trim();
      setTokens(JSON.parse(clean));
      setShowSaveBar(true);
    } catch(e) { setError("Something went wrong — try again."); console.error(e); }
    finally { setLoading(false); }
  }, [inputText, spanishMode]);

  // ── STATS ─────────────────────────────────────────────────────────────────
  const stats = tokens ? (() => {
    const counts = Object.fromEntries(activeTypeKeys.map(k => [k, 0]));
    let total = 0;
    tokens.forEach(t => {
      if (t.type === "word") t.syllables?.forEach(s => {
        if (counts[s.stype] !== undefined) { counts[s.stype]++; total++; }
      });
    });
    return { counts, total };
  })() : null;

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const saveToLibrary = () => {
    if (!saveName.trim() || !inputText.trim()) return;
    setLibrary(prev => [{ title:saveName.trim(), text:inputText.trim() }, ...prev]);
    setSaveName(""); setShowSaveBar(false);
  };

  // ── PDF ───────────────────────────────────────────────────────────────────
  const downloadPDF = useCallback(() => {
    if (!tokens) return;
    const pw = window.open("", "_blank");
    const tokenHTML = tokens.map(token => {
      if (token.type === "space") return token.text === "\n" ? "<br/>" : " ";
      if (token.type === "punct") return `<span style="color:#444">${token.text}</span>`;
      if (token.type === "word" && token.syllables) {
        return token.syllables.map(syl => {
          const t = activeTypes[syl.stype] || activeTypes[activeTypeKeys[0]];
          const c = dark ? t.dark : t.light;
          const dimmed = focusType && syl.stype !== focusType;
          return `<span style="color:${dimmed?"#ccc":c};font-weight:700;border-bottom:3px solid ${dimmed?"#ccc":c};padding-bottom:1px">${syl.text}</span>`;
        }).join("");
      }
      return token.text || "";
    }).join("");
    const legendHTML = Object.entries(activeTypes).map(([,t]) => {
      const c = dark ? t.dark : t.light;
      return `<span style="display:inline-flex;align-items:center;gap:5px;margin:3px 5px;padding:3px 9px;border:2px solid ${c};border-radius:6px"><span style="width:11px;height:11px;border-radius:3px;background:${c};display:inline-block"></span><span style="font-size:12px;font-weight:700;color:${c}">${t.label}</span></span>`;
    }).join("");
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Color Syllables</title>
      <style>body{margin:.5in;font-family:sans-serif;background:white;color:#222}
      .legend{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:18px;padding:10px;border-radius:8px;background:#F0F2F5}
      .output{font-size:${fontSize}px;line-height:1.9}
      h2{color:#1A3E6B;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px}
      .brand{color:#888;font-size:11px;margin-bottom:16px}</style></head><body>
      <div class="brand">colorsyllables.com</div>
      <h2>Syllable Pattern Key</h2><div class="legend">${legendHTML}</div>
      <h2>Color-Coded Passage</h2><div class="output">${tokenHTML}</div>
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    pw.document.close();
  }, [tokens, dark, fontSize, focusType, spanishMode, activeTypes, activeTypeKeys]);

  // ── CYCLE SYLLABLE ────────────────────────────────────────────────────────
  const cycleSyllable = (tokenIdx, sylIdx, e) => {
    e.stopPropagation();
    setTokens(prev => prev.map((token, ti) => {
      if (ti !== tokenIdx || token.type !== "word") return token;
      return { ...token, syllables: token.syllables.map((syl, si) => {
        if (si !== sylIdx) return syl;
        const next = (activeTypeKeys.indexOf(syl.stype) + 1) % activeTypeKeys.length;
        return { ...syl, stype: activeTypeKeys[next] };
      })};
    }));
  };

  // ── RENDER TOKEN ──────────────────────────────────────────────────────────
  const renderToken = (token, ti) => {
    if (token.type === "space") return <span key={ti}>{token.text === "\n" ? <br/> : " "}</span>;
    if (token.type === "punct") return <span key={ti} style={{color:D.punctText}}>{token.text}</span>;
    if (token.type === "word" && token.syllables) {
      const wordText  = token.syllables.map(s => s.text).join("");
      const isEditing = editingToken?.tokenIdx === ti;
      return (
        <span key={ti} role="button" tabIndex={0}
          title={speakMode ? `Click to hear "${wordText}"` : "Double-click to edit syllable breaks"}
          onClick={speakMode ? () => speak(wordText) : undefined}
          onDoubleClick={() => !speakMode && openEditor(ti)}
          onKeyDown={e => { if (e.key === "Enter") speakMode ? speak(wordText) : openEditor(ti); }}
          style={{ outline: isEditing ? `3px solid ${D.accent}` : "none", borderRadius:3, cursor:"pointer" }}>
          {token.syllables.map((syl, si) => {
            const t        = activeTypes[syl.stype] || activeTypes[activeTypeKeys[0]];
            const c        = dark ? t.dark : t.light;
            const dimmed   = focusType && syl.stype !== focusType;
            const prevSyl  = token.syllables[si - 1];
            const sameAsPrev = prevSyl && prevSyl.stype === syl.stype;
            return (
              <span key={si} style={{display:"inline"}}>
                {sameAsPrev && (
                  <span aria-hidden="true" style={{
                    color: dimmed ? D.dimText : c,
                    fontWeight:900,
                    fontSize:"0.6em",
                    verticalAlign:"middle",
                    margin:"0 1px",
                    userSelect:"none",
                    borderBottom: `3px solid ${dimmed ? D.dimText : c}`,
                    paddingBottom:1,
                  }}>·</span>
                )}
                <span role="button" tabIndex={-1}
                  title={speakMode ? `Hear "${wordText}"` : `${syl.stype} — click to cycle`}
                  onClick={speakMode ? undefined : e => cycleSyllable(ti, si, e)}
                  style={{ color: dimmed ? D.dimText : c, fontWeight:700,
                    borderBottom: `3px solid ${dimmed ? D.dimText : c}`,
                    paddingBottom:1, cursor:"pointer",
                    transition:"color 0.15s, border-color 0.15s", userSelect:"none" }}>
                  {syl.text}
                </span>
              </span>
            );
          })}
        </span>
      );
    }
    return <span key={ti} style={{color:D.punctText}}>{token.text || ""}</span>;
  };

  // ── SHARED BUTTON STYLE ───────────────────────────────────────────────────
  const btn = (active, color) => ({
    background: active ? color : "transparent",
    border: `2px solid ${color}`, color: active ? "white" : color,
    borderRadius:8, padding:"5px 13px", fontSize:13, fontWeight:700, cursor:"pointer", transition:"all 0.2s",
  });

  // ── WORD EDITOR BAR ───────────────────────────────────────────────────────
  const editChunks = editSplit.split("/").filter(c => c.length > 0);
  const wordEditorBar = editingToken && (
    <div ref={editorBarRef} role="dialog" aria-modal="true" aria-label="Syllable editor"
      style={{ position:"fixed", bottom:0, left:0, right:0, background:D.editorBg,
        borderTop:`3px solid ${D.accent}`, padding:"16px 24px",
        display:"flex", flexWrap:"wrap", gap:16, alignItems:"flex-start",
        zIndex:10000, animation:"slideUp 0.2s ease", boxShadow:"0 -4px 30px rgba(0,0,0,0.4)", fontFamily:font }}>
      <div style={{display:"flex", flexDirection:"column", gap:6, minWidth:220}}>
        <label htmlFor="syl-split" style={{fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.6)", textTransform:"uppercase", letterSpacing:1.5}}>Split with /</label>
        <input id="syl-split" ref={editorInputRef} value={editSplit}
          onChange={e => handleSplitChange(e.target.value)}
          placeholder="e.g. puz/zle"
          style={{ background:"rgba(255,255,255,0.1)", border:`2px solid ${D.accent}`, borderRadius:8,
            padding:"8px 12px", fontSize:18, fontWeight:800, color:"white",
            fontFamily:font, outline:"none", width:180, letterSpacing:1 }}/>
      </div>
      <div style={{display:"flex", flexWrap:"wrap", gap:14, flex:1, alignItems:"flex-start"}}>
        {editChunks.map((chunk, ci) => {
          const at = editTypes[ci] || "Closed";
          const ac = dark ? activeTypes[at]?.dark : activeTypes[at]?.light;
          return (
            <div key={ci} style={{display:"flex", flexDirection:"column", gap:6}}>
              <div style={{ fontSize:20, fontWeight:900, color:ac, borderBottom:`3px solid ${ac}`,
                paddingBottom:2, letterSpacing:1, minWidth:32, textAlign:"center" }}>{chunk}</div>
              <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
                {activeTypeKeys.map(key => {
                  const t = activeTypes[key]; const c = dark ? t.dark : t.light; const active = at === key;
                  return (
                    <button key={key} onClick={() => setChunkType(ci, key)} aria-pressed={active}
                      style={{ background: active ? c : "transparent", border:`2px solid ${c}`,
                        color: active ? "white" : c, borderRadius:6, padding:"3px 9px",
                        fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s", outline:"none" }}>
                      {spanishMode ? t.labelES : t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:8, justifyContent:"center", alignSelf:"center"}}>
        <button onClick={confirmEdit}
          style={{ background:D.accent, border:"none", color:"white", borderRadius:8, padding:"9px 20px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:font }}>
          ✓ Done
        </button>
        <button onClick={() => setCorrectionModalOpen(true)}
          style={{ background:"transparent", border:"2px solid #f59e0b", color:"#f59e0b", borderRadius:8, padding:"7px 20px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:font }}>
          ✎ Report Correction
        </button>
        <button onClick={closeEditor}
          style={{ background:"transparent", border:"2px solid rgba(255,255,255,0.3)", color:"rgba(255,255,255,0.6)", borderRadius:8, padding:"7px 20px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:font }}>
          ✕ Cancel
        </button>
        <div style={{fontSize:11, color:"rgba(255,255,255,0.35)", textAlign:"center"}}>Esc to close</div>
      </div>
    </div>
  );

  // ── PAGE COMPONENTS ───────────────────────────────────────────────────────

  // CODER PAGE
  const renderCoder = () => (
    <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
      {/* Input Sidebar */}
      <div style={{ width: tokens ? "230px" : "100%", minWidth:200, background:D.sideBg,
        borderRight:`2px solid ${D.border}`, display:"flex", flexDirection:"column",
        padding:14, gap:10, overflowY:"auto", flexShrink:0 }}>

        {spanishMode && (
          <div style={{ background:"#1B6B3A22", border:"1.5px solid #3DC87A", borderRadius:7,
            padding:"6px 10px", fontSize:12, fontWeight:700, color:"#3DC87A",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            🇪🇸 Modo Español
            <button onClick={() => { setSpanishMode(false); setTokens(null); }}
              style={{background:"none", border:"none", color:"#3DC87A", cursor:"pointer", fontSize:11, fontWeight:700}}>✕ EN</button>
          </div>
        )}

        <label style={{fontSize:11, fontWeight:700, color:D.subText, textTransform:"uppercase", letterSpacing:1.5}}>
          {spanishMode ? "Tu Texto" : "Your Text"}
        </label>
        <textarea value={inputText} onChange={e => setInputText(e.target.value)}
          placeholder={spanishMode ? "Pega tu pasaje aquí…" : "Morning message, passage,\nstudent writing — paste anything."}
          style={{ flex:1, minHeight: tokens ? 150 : 180, border:`2px solid ${D.inputBdr}`, borderRadius:9,
            padding:12, fontSize:14, lineHeight:1.6, resize:"vertical", outline:"none",
            fontFamily:font, color:D.text, background:D.inputBg }}/>

        {/* Translate button */}
        {inputText.trim() && !spanishMode && (
          <button onClick={translatePassage} disabled={translating}
            style={{ background:"none", border:"2px solid #3DC87A", color:"#3DC87A", borderRadius:8,
              padding:"7px 0", fontSize:13, fontWeight:700, cursor: translating ? "not-allowed":"pointer", fontFamily:font }}>
            {translating ? "Translating…" : "🇪🇸 Translate to Spanish"}
          </button>
        )}
        {spanishMode && inputText.trim() && (
          <button onClick={translatePassage} disabled={translating}
            style={{ background:"none", border:"2px solid #4FA3E0", color:"#4FA3E0", borderRadius:8,
              padding:"7px 0", fontSize:13, fontWeight:700, cursor: translating ? "not-allowed":"pointer", fontFamily:font }}>
            {translating ? "Translating…" : "🇺🇸 Translate to English"}
          </button>
        )}

        {/* Quick samples */}
        <div>
          <div style={{fontSize:11, fontWeight:700, color:D.subText, textTransform:"uppercase", letterSpacing:1, marginBottom:6}}>Quick Samples</div>
          <div style={{display:"flex", flexDirection:"column", gap:4}}>
            {QUICK_SAMPLES.map((s, i) => (
              <button key={i} onClick={() => { setInputText(s.text); setTokens(null); setSpanishMode(false); }}
                style={{ background:"none", border:`1px solid ${D.border}`, borderRadius:6, padding:"5px 10px",
                  fontSize:12, color:D.subText, cursor:"pointer", textAlign:"left", fontFamily:font }}>
                {s.title}
              </button>
            ))}
          </div>
        </div>

        <button onClick={processText} disabled={loading || !inputText.trim()}
          style={{ background: loading || !inputText.trim() ? (dark?"#1A2A3A":"#C8D4E0") : "linear-gradient(135deg,#1A3E6B,#2874A6)",
            color:"white", border:"none", borderRadius:9, padding:"11px 0",
            fontSize:15, fontWeight:800, cursor: loading || !inputText.trim() ? "not-allowed":"pointer", fontFamily:font }}>
          {loading ? (spanishMode ? "Analizando…" : "Analyzing…") : (spanishMode ? "⚡ Codificar" : "⚡ Color Code It")}
        </button>

        {error && (
          <div role="alert" style={{ background:dark?"#2D1515":"#FDEDEC", border:"1.5px solid #E74C3C",
            borderRadius:7, padding:"8px 12px", fontSize:13, color:dark?"#F1948A":"#922B21" }}>{error}</div>
        )}

        {showSaveBar && (
          <div style={{display:"flex", gap:6, animation:"fadeIn 0.3s ease"}}>
            <input value={saveName} onChange={e => setSaveName(e.target.value)}
              placeholder={spanishMode ? "Nombrar pasaje…" : "Name this passage…"}
              style={{ flex:1, border:`1.5px solid ${D.inputBdr}`, borderRadius:7, padding:"6px 10px",
                fontSize:13, color:D.text, background:D.inputBg, fontFamily:font, outline:"none" }}/>
            <button onClick={saveToLibrary} disabled={!saveName.trim()}
              style={{ background:D.accent, border:"none", color:"white", borderRadius:7, padding:"6px 10px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {spanishMode ? "Guardar" : "Save"}
            </button>
          </div>
        )}

        {tokens && (
          <div style={{display:"flex", gap:6}}>
            <button onClick={() => { setTokens(null); setShowSaveBar(false); setFocusType(null); closeEditor(); }}
              style={{ flex:1, background:"none", border:`1.5px solid ${D.accent}`, borderRadius:7, padding:"7px 0",
                fontSize:13, color:D.accent, cursor:"pointer", fontWeight:700, fontFamily:font }}>
              ↺ {spanishMode ? "Nuevo" : "New"}
            </button>
            <button onClick={() => { setTokens(null); setInputText(""); setShowSaveBar(false); setFocusType(null); closeEditor(); }}
              style={{ flex:1, background:"none", border:`1.5px solid ${D.border}`, borderRadius:7, padding:"7px 0",
                fontSize:13, color:D.subText, cursor:"pointer", fontWeight:600, fontFamily:font }}>
              ✕ {spanishMode ? "Borrar" : "Clear"}
            </button>
          </div>
        )}
      </div>

      {/* Output Area */}
      {tokens && (
        <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden", animation:"fadeIn 0.4s ease"}}>
          {/* Controls Bar */}
          <div style={{ background:D.legendBg, borderBottom:`2px solid ${D.border}`, padding:"8px 14px",
            display:"flex", flexWrap:"wrap", gap:7, alignItems:"center", justifyContent:"space-between" }}>
            <div style={{display:"flex", flexWrap:"wrap", gap:5, alignItems:"center"}}>
              <span style={{fontSize:11, fontWeight:700, color:D.subText, textTransform:"uppercase", letterSpacing:1, marginRight:2}}>Focus:</span>
              <button onClick={() => setFocusType(null)} style={{...btn(!focusType, D.accent), fontSize:12, padding:"3px 9px"}}>All</button>
              {Object.entries(activeTypes).map(([key, t]) => {
                const c = dark ? t.dark : t.light; const active = focusType === key;
                return (
                  <button key={key} onClick={() => setFocusType(active ? null : key)}
                    style={{ background:active?c:"transparent", border:`2px solid ${c}`, color:active?"white":c,
                      borderRadius:7, padding:"3px 9px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.2s" }}>
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div style={{display:"flex", gap:6, alignItems:"center", flexWrap:"wrap"}}>
              <button onClick={() => setSpeakMode(v => !v)} style={{...btn(speakMode, "#B06FE0"), fontSize:12, padding:"3px 9px"}}>
                🔊 {speakMode ? "Speak ON" : "Speak"}
              </button>
              <button onClick={readPassage} style={{...btn(isSpeaking, D.accent), fontSize:12, padding:"3px 9px"}}>
                {isSpeaking ? "⏹ Stop" : "▶ Read"}
              </button>
              <label style={{fontSize:11, fontWeight:700, color:D.subText}}>Size</label>
              <input type="range" min={18} max={72} value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                style={{width:70, accentColor:D.accent}}/>
              <span style={{fontSize:12, fontWeight:700, color:D.subText, minWidth:28}}>{fontSize}px</span>
              <button onClick={() => setFullscreen(v => !v)}
                style={{ background:"none", border:`1.5px solid ${D.border}`, color:D.subText, borderRadius:7,
                  padding:"3px 9px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {fullscreen ? "⊠ Exit" : "⛶ Full"}
              </button>
              <button onClick={downloadPDF}
                style={{ background:D.accent, border:"none", color:"white", borderRadius:8, padding:"5px 11px", fontSize:12, fontWeight:800, cursor:"pointer" }}>
                ⬇ PDF
              </button>
            </div>
          </div>

          {/* Text Output */}
          <div ref={outputRef} style={{
            flex: fullscreen ? undefined : 1,
            padding: fullscreen ? "40px 60px" : "24px 32px",
            overflowY:"auto", background:D.panelBg,
            paddingBottom: editingToken ? 200 : undefined,
            ...(fullscreen ? { position:"fixed", top:0, left:0, width:"100vw", height:"100vh", zIndex:9999 } : {}),
          }}>
            <div style={{ fontSize:11, fontWeight:600, color:D.subText, marginBottom:12,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{textTransform:"uppercase", letterSpacing:1.5, fontWeight:700}}>
                {spanishMode ? "Salida con Colores" : "Color-Coded Output"}
              </span>
              <span style={{opacity:0.6, fontSize:11}}>
                {speakMode ? "🔊 Click word to hear it" : "💡 Click syllable to cycle · Double-click word to edit"}
              </span>
              {fullscreen && (
                <button onClick={() => setFullscreen(false)}
                  style={{ background:D.accent, border:"none", color:"white", borderRadius:8, padding:"5px 14px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  ⊠ Exit Fullscreen
                </button>
              )}
            </div>
            <div style={{fontSize:fontSize, lineHeight:1.9, fontFamily:font}} role="region" aria-label="Color-coded syllable output">
              {tokens.map(renderToken)}
            </div>
          </div>

          {/* Stats Bar */}
          {stats && stats.total > 0 && (
            <div style={{background:D.sideBg, borderTop:`2px solid ${D.border}`, padding:"12px 20px"}}>
              <div style={{fontSize:11, fontWeight:700, color:D.subText, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8}}>
                {stats.total} syllables analyzed
              </div>
              <div style={{display:"flex", flexDirection:"column", gap:5}}>
                {Object.entries(activeTypes).map(([key, t]) => {
                  const count = stats.counts[key] || 0;
                  if (!count) return null;
                  const pct = Math.round(count / stats.total * 100);
                  const c = dark ? t.dark : t.light;
                  return (
                    <div key={key} style={{display:"flex", alignItems:"center", gap:8}}>
                      <div style={{width:88, fontSize:12, fontWeight:700, color:c, flexShrink:0}}>{t.label}</div>
                      <div style={{flex:1, height:12, background:dark?"#1A2A3A":"#E8EDF4", borderRadius:6, overflow:"hidden"}}>
                        <div style={{width:`${pct}%`, height:"100%", background:c, borderRadius:6, transition:"width 0.5s ease"}}/>
                      </div>
                      <div style={{width:52, fontSize:12, fontWeight:700, color:D.subText, textAlign:"right", flexShrink:0}}>{count} ({pct}%)</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!tokens && !loading && (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          color:D.subText, padding:40, textAlign:"center", flexDirection:"column", gap:12 }}>
          <div style={{fontSize:52}}>🎨</div>
          <div style={{fontSize:17, fontWeight:600}}>
            {spanishMode ? "Pega tu texto y haz clic en Codificar" : "Paste your text and hit Color Code It"}
          </div>
          <div style={{fontSize:13, opacity:0.7}}>
            {spanishMode ? "o carga un ejemplo del panel lateral" : "or load a sample from the sidebar"}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16}}>
          <div style={{width:46, height:46, border:`5px solid ${D.border}`, borderTop:`5px solid ${D.accent}`, borderRadius:"50%", animation:"spin 0.8s linear infinite"}}/>
          <div style={{fontSize:15, fontWeight:700, color:D.accent}}>
            {spanishMode ? "Analizando sílabas…" : "Analyzing syllables…"}
          </div>
        </div>
      )}
    </div>
  );

  // LIBRARY PAGE
  const renderLibrary = () => (
    <div style={{maxWidth:860, margin:"28px auto", padding:"0 20px 40px", animation:"fadeIn 0.3s ease"}}>
      <div style={{fontSize:13, fontWeight:700, color:D.subText, textTransform:"uppercase", letterSpacing:1.5, marginBottom:16}}>Saved Passages</div>
      <div style={{display:"flex", flexDirection:"column", gap:10}}>
        {library.map((item, i) => (
          <div key={i} style={{ background:D.panelBg, border:`1px solid ${D.border}`, borderRadius:12,
            padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:14, flexWrap:"wrap" }}>
            <div style={{flex:1}}>
              <div style={{fontSize:15, fontWeight:800, color:D.text, marginBottom:3}}>{item.title}</div>
              <div style={{fontSize:13, color:D.subText, lineHeight:1.5}}>{item.text.slice(0, 115)}{item.text.length > 115 ? "…" : ""}</div>
            </div>
            <button onClick={() => { setInputText(item.text); setActivePage("coder"); setTokens(null); setSpanishMode(false); }}
              style={{ background:D.accent, border:"none", color:"white", borderRadius:8, padding:"8px 15px",
                fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
              Load & Code →
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // HOW TO PAGE
  const renderHowTo = () => {
    const steps = [
      { n:"1", title:"Paste or Type Your Text",
        body:"In the Color Coder, paste any passage — a morning message, a social studies excerpt, student writing, or a vocabulary list. You can also load a quick sample from the sidebar, or visit the Social Studies, Math, or Science pages for curriculum-aligned passages." },
      { n:"2", title:"Hit Color Code It",
        body:"The app analyzes every syllable in your text and assigns it to one of the six syllable types. Each type appears in its own color, matching your classroom poster key. The analysis takes just a few seconds." },
      { n:"3", title:"Read It Together",
        body:'Use the "▶ Read" button to have the passage read aloud at a measured pace — great for whole-class projection. Turn on "🔊 Speak" mode and click any word to hear it spoken individually. Works in English and Spanish.' },
      { n:"4", title:"Adjust and Correct",
        body:"Click any syllable to cycle through the six types if the model made an error. Double-click any word to open the syllable editor — retype the breaks and assign each chunk its own type manually." },
      { n:"5", title:"Focus on One Type",
        body:'Use the Focus filter in the controls bar to dim everything except the syllable type you are teaching. Perfect for saying: "Today we are looking at all the open syllables — notice how they all end in a vowel."' },
      { n:"6", title:"Switch to Spanish Mode",
        body:'Click "🇪🇸 Translate to Spanish" in the sidebar to translate and re-analyze any passage using Spanish syllabification rules. The same color scheme applies — same type, same color — in both languages.' },
      { n:"7", title:"Save, Print, or Share",
        body:"Save any passage to your Passage Library for quick recall. Use the PDF button to export a print-ready version with the legend included. The font size slider scales the display for projection or low-vision use." },
    ];
    return (
      <div style={{maxWidth:760, margin:"28px auto", padding:"0 20px 40px", animation:"fadeIn 0.3s ease"}}>
        <h1 style={{fontSize:26, fontWeight:900, color:D.accent, marginBottom:6}}>How To Use Color Syllables</h1>
        <p style={{fontSize:15, color:D.subText, marginBottom:28, lineHeight:1.7}}>
          Everything you need to get started — from a 5-minute warm-up to a full structured literacy lesson.
        </p>
        <div style={{display:"flex", flexDirection:"column", gap:12}}>
          {steps.map(s => (
            <div key={s.n} style={{ background:D.panelBg, border:`1px solid ${D.border}`, borderRadius:12,
              padding:"16px 20px", display:"flex", gap:14 }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:D.accent, color:"white",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:900, fontSize:14, flexShrink:0 }}>{s.n}</div>
              <div>
                <div style={{fontSize:15, fontWeight:800, color:D.text, marginBottom:4}}>{s.title}</div>
                <div style={{fontSize:14, color:D.subText, lineHeight:1.7}}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:D.panelBg, border:`1px solid ${D.border}`, borderRadius:12,
          padding:"18px 22px", marginTop:18 }}>
          <div style={{fontSize:15, fontWeight:800, color:D.accent, marginBottom:12}}>The Six Syllable Types — Quick Reference</div>
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {Object.entries(TYPES).map(([key, t]) => {
              const c = dark ? t.dark : t.light;
              return (
                <div key={key} style={{display:"flex", alignItems:"center", gap:12}}>
                  <div style={{width:10, height:10, borderRadius:2, background:c, flexShrink:0}}/>
                  <div style={{width:112, fontSize:14, fontWeight:800, color:c}}>{t.label}</div>
                  <div style={{fontSize:13, color:D.subText}}>{t.rule}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // RESOURCES PAGE
  const renderResources = () => {
    const sections = [
      {
        title:"Free Teacher Training",
        links:[
          { label:"UFLI Literacy Hub — University of Florida", url:"https://ufli.education.ufl.edu/", desc:"Free downloadable resources for structured literacy including phonemic awareness, phonics, decoding, encoding, and morphology." },
          { label:"Hill Learning Center — Science of Reading Course", url:"https://www.hillcenter.org/professional-learning/science-of-reading/", desc:"Self-paced 15–20 hour introduction to the science of reading for teachers, coaches, and school leaders. 2.0 CEUs." },
          { label:"Lindsay Kemeny — Free SOR PD", url:"https://sites.google.com/view/scienceofreadingpd/home", desc:"Seven self-paced modules covering all five components of reading. Approximately six hours. Completely free." },
          { label:"Waterford.org — Free SOR Summit", url:"https://www.waterford.org/blog/science-of-reading-training-guide-administrators/", desc:"Free virtual summit with live sessions and on-demand recordings on the neuroscience of how children learn to read." },
        ],
      },
      {
        title:"Foundational Research & Explainers",
        links:[
          { label:"Reading Rockets — Structured Literacy: The Basics", url:"https://www.readingrockets.org/topics/about-reading/articles/structured-literacy-instruction-basics", desc:"Clear explanation of all structured literacy components including the six syllable types, morphology, phonics, and syntax." },
          { label:"International Dyslexia Association", url:"https://dyslexiaida.org/", desc:"Source of the structured literacy framework. Position papers, research summaries, and practitioner resources." },
          { label:"Lexia LETRS — Language Essentials for Teachers", url:"https://www.lexialearning.com/letrs", desc:"The most widely-used science of reading professional development, developed by Dr. Louisa Moats. Used in 23 states." },
        ],
      },
      {
        title:"Syllable Types Specifically",
        links:[
          { label:"Lead in Literacy — The Six Syllable Types", url:"https://leadinliteracy.com/the-six-syllable-types/", desc:"Defines all six types, explains how they help students decode and spell, and includes free teaching posters." },
          { label:"Jodi Durgin — Science of Reading and Syllable Types", url:"https://jodidurgin.com/syllable-types/", desc:"Practical classroom breakdown with coding strategies. Notes that 90%+ of one-syllable English words fit the six types." },
          { label:"Savvas — Structured Literacy and the Science of Reading", url:"https://www.savvas.com/resource-center/blogs-and-podcasts/savvas-insights/2024/structured-literacy-and-the-science-of-reading", desc:"Overview of phoneme-grapheme mapping, syllable instruction, and morphology in a structured literacy context." },
        ],
      },
    ];
    return (
      <div style={{maxWidth:800, margin:"28px auto", padding:"0 20px 40px", animation:"fadeIn 0.3s ease"}}>
        <h1 style={{fontSize:26, fontWeight:900, color:D.accent, marginBottom:6}}>Science of Reading Resources</h1>
        <p style={{fontSize:15, color:D.subText, marginBottom:28, lineHeight:1.7}}>
          Free training, foundational research, and syllable-specific resources for teachers and instructional coaches.
        </p>
        {sections.map(sec => (
          <div key={sec.title} style={{marginBottom:28}}>
            <div style={{fontSize:12, fontWeight:700, color:D.subText, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10}}>{sec.title}</div>
            <div style={{display:"flex", flexDirection:"column", gap:10}}>
              {sec.links.map(link => (
                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{ background:D.panelBg, border:`1px solid ${D.border}`, borderRadius:10,
                    padding:"14px 18px", textDecoration:"none", display:"block", transition:"border-color 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.borderColor = D.accent}
                  onMouseOut={e => e.currentTarget.style.borderColor = D.border}>
                  <div style={{fontSize:14, fontWeight:800, color:D.accent, marginBottom:4}}>{link.label} →</div>
                  <div style={{fontSize:13, color:D.subText, lineHeight:1.6}}>{link.desc}</div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // SAMPLE LESSON PAGE (reused for Social, Math, Science)
  const renderSampleLesson = (title, subtitle, samples, icon, tip) => (
    <div style={{maxWidth:800, margin:"28px auto", padding:"0 20px 40px", animation:"fadeIn 0.3s ease"}}>
      <div style={{fontSize:32, marginBottom:4}}>{icon}</div>
      <h1 style={{fontSize:26, fontWeight:900, color:D.accent, marginBottom:6}}>{title}</h1>
      <p style={{fontSize:15, color:D.subText, marginBottom:24, lineHeight:1.7}}>{subtitle}</p>
      <div style={{display:"flex", flexDirection:"column", gap:14}}>
        {samples.map((item, i) => (
          <div key={i} style={{ background:D.panelBg, border:`1px solid ${D.border}`, borderRadius:12, padding:"18px 22px" }}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:15, fontWeight:800, color:D.text, marginBottom:6}}>{item.title}</div>
                <div style={{fontSize:14, color:D.subText, lineHeight:1.7}}>{item.text}</div>
              </div>
              <button onClick={() => { setInputText(item.text); setActivePage("coder"); setTokens(null); setSpanishMode(false); }}
                style={{ background:D.accent, border:"none", color:"white", borderRadius:8, padding:"8px 15px",
                  fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                Load & Code →
              </button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:D.panelBg, border:`1px solid ${D.accent}33`, borderRadius:12,
        padding:"16px 20px", marginTop:20 }}>
        <div style={{fontSize:13, fontWeight:800, color:D.accent, marginBottom:8}}>Instructional Tip</div>
        <div style={{fontSize:13, color:D.subText, lineHeight:1.7}}>{tip}</div>
      </div>
    </div>
  );

  // BLOG PAGE
  const renderBlog = () => (
    <div style={{maxWidth:760, margin:"28px auto", padding:"0 20px 40px", animation:"fadeIn 0.3s ease"}}>
      <h1 style={{fontSize:26, fontWeight:900, color:D.accent, marginBottom:6}}>Blog</h1>
      <p style={{fontSize:15, color:D.subText, marginBottom:24, lineHeight:1.7}}>
        Research, classroom practice, and notes from the field on color-coded syllable instruction.
      </p>
      {expandedPost ? (
        <div style={{background:D.panelBg, border:`1px solid ${D.border}`, borderRadius:14, padding:"28px 32px"}}>
          <button onClick={() => setExpandedPost(null)}
            style={{background:"none", border:"none", color:D.accent, cursor:"pointer", fontSize:13, fontWeight:700, marginBottom:16, padding:0}}>
            ← Back to Blog
          </button>
          {BLOG_POSTS.filter(p => p.id === expandedPost).map(post => (
            <div key={post.id}>
              <div style={{fontSize:11, color:D.subText, textTransform:"uppercase", letterSpacing:1, marginBottom:8}}>
                {post.date}{post.pinned ? " · 📌 Pinned" : ""}
              </div>
              <h2 style={{fontSize:22, fontWeight:900, color:D.text, marginBottom:18, lineHeight:1.3}}>{post.title}</h2>
              {post.content.split("\n\n").map((para, i) => (
                <p key={i} style={{fontSize:15, color:D.subText, lineHeight:1.85, marginBottom:16}}>{para}</p>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          {[...BLOG_POSTS].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map(post => (
            <div key={post.id}
              style={{ background:D.panelBg, border:`1px solid ${post.pinned ? D.accent : D.border}`,
                borderRadius:12, padding:"18px 22px", cursor:"pointer", transition:"border-color 0.2s" }}
              onClick={() => setExpandedPost(post.id)}
              onMouseOver={e => e.currentTarget.style.borderColor = D.accent}
              onMouseOut={e => e.currentTarget.style.borderColor = post.pinned ? D.accent : D.border}>
              <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:6}}>
                {post.pinned && <span style={{fontSize:11, background:`${D.accent}22`, color:D.accent, borderRadius:5, padding:"2px 7px", fontWeight:700}}>📌 Pinned</span>}
                <span style={{fontSize:11, color:D.subText}}>{post.date}</span>
              </div>
              <div style={{fontSize:16, fontWeight:800, color:D.text, marginBottom:7}}>{post.title}</div>
              <div style={{fontSize:13, color:D.subText, lineHeight:1.6}}>{post.preview}</div>
              <div style={{fontSize:12, fontWeight:700, color:D.accent, marginTop:10}}>Read more →</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // FOR PARENTS PAGE
  const renderParents = () => (
    <div style={{maxWidth:720, margin:"28px auto", padding:"0 20px 40px", animation:"fadeIn 0.3s ease"}}>
      <h1 style={{fontSize:26, fontWeight:900, color:D.accent, marginBottom:6}}>For Parents</h1>
      <p style={{fontSize:15, color:D.subText, marginBottom:24, lineHeight:1.7}}>
        Your child is learning to read using a research-based approach called Structured Literacy. Here is what the colors mean and how you can support at home.
      </p>
      <div style={{background:D.panelBg, border:`1px solid ${D.border}`, borderRadius:12, padding:"20px 24px", marginBottom:16}}>
        <div style={{fontSize:15, fontWeight:800, color:D.text, marginBottom:12}}>What are the colors?</div>
        <div style={{fontSize:14, color:D.subText, lineHeight:1.8, marginBottom:16}}>
          Every syllable in English fits into one of six types. Each type follows a rule that tells a reader how the vowel should sound. In our classroom, each syllable type has its own color so students can see the patterns as they read.
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {Object.entries(TYPES).map(([key, t]) => {
            const c = dark ? t.dark : t.light;
            return (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:12,
                background:`${c}11`, borderRadius:8, padding:"8px 12px", border:`1px solid ${c}33` }}>
                <div style={{width:12, height:12, borderRadius:3, background:c, flexShrink:0}}/>
                <div style={{fontSize:14, fontWeight:800, color:c, width:110, flexShrink:0}}>{t.label}</div>
                <div style={{fontSize:13, color:D.subText}}>{t.rule}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{background:D.panelBg, border:`1px solid ${D.border}`, borderRadius:12, padding:"20px 24px", marginBottom:16}}>
        <div style={{fontSize:15, fontWeight:800, color:D.text, marginBottom:12}}>How to support at home</div>
        {[
          ["Ask about the colors", "When your child reads aloud, ask them to point out syllable types they recognize. \"Is that an open syllable? What does the vowel say?\""],
          ["Look for patterns together", "On signs, menus, or books — spot words with open syllables (ending in a vowel) or closed syllables (ending in a consonant). Make it a game."],
          ["Celebrate decoding", "When your child successfully breaks a long word into parts, that is exactly the skill they are building. Recognize it out loud."],
          ["Read together daily", "Consistent time with books is the single best support you can offer. Let your child choose. Read to them. Read together."],
        ].map(([title, body]) => (
          <div key={title} style={{marginBottom:14}}>
            <div style={{fontSize:14, fontWeight:800, color:D.text, marginBottom:3}}>{title}</div>
            <div style={{fontSize:13, color:D.subText, lineHeight:1.6}}>{body}</div>
          </div>
        ))}
      </div>
      <div style={{background:D.panelBg, border:`1px solid ${D.border}`, borderRadius:12, padding:"18px 22px"}}>
        <div style={{fontSize:14, fontWeight:800, color:D.accent, marginBottom:8}}>Accessibility Features</div>
        <div style={{fontSize:13, color:D.subText, lineHeight:1.7}}>
          Color Syllables includes a dyslexia-friendly font option, adjustable text size, dark and light modes, and a read-aloud button that speaks words and passages clearly in English or Spanish. All features are available on the Color Coder page.
        </div>
      </div>
    </div>
  );

  // FOR COACHES PAGE
  const renderCoaches = () => (
    <div style={{maxWidth:760, margin:"28px auto", padding:"0 20px 40px", animation:"fadeIn 0.3s ease"}}>
      <h1 style={{fontSize:26, fontWeight:900, color:D.accent, marginBottom:6}}>For Instructional Coaches & Administrators</h1>
      <p style={{fontSize:15, color:D.subText, marginBottom:24, lineHeight:1.7}}>
        Color Syllables is a classroom-tested structured literacy tool built by a special education teacher in active use. Here is how it fits into professional development, observation, and district literacy initiatives.
      </p>
      {[
        { title:"As a PD Demonstration Tool",
          body:"Color Syllables can be used in professional development sessions to make abstract syllable type concepts concrete and visual. Run a passage from your current curriculum through the coder live — teachers immediately see how the six types distribute across real instructional text. The Stats bar shows the proportional breakdown of syllable types in any passage, which is useful for curriculum analysis and selection discussions." },
        { title:"As a Classroom Observation Anchor",
          body:"When observing a structured literacy lesson, Color Syllables gives observers a shared visual reference. If a teacher is working on open syllables, you can verify the instructional text contains sufficient examples by running it through the coder before the observation. The Focus filter isolates any one syllable type at a time." },
        { title:"Alignment with Structured Literacy Mandates",
          body:"The six syllable types reflect Orton-Gillingham and structured literacy research, and align with the LETRS framework used in professional development across 23 states. The CLOVER mnemonic — Closed, C+le, Open, Vowel Team, Magic-E, R-Controlled — is the standard teaching sequence, and this tool reflects that framework exactly." },
        { title:"Multilingual Classroom Support",
          body:"Spanish mode applies the same phonics framework to Spanish-language text using the same color coding. Designed for California classrooms with high ELL populations where bilingual phonics transfer is an instructional priority. A dedicated ELL Strategies page outlines how to use the tool for explicit language transfer instruction." },
        { title:"Technical Notes",
          body:"Color Syllables runs entirely in the browser. There is no login, no data collection, and no student information is transmitted. The AI analysis happens via API call and returns structured data. The app works on any device with a modern browser — including classroom projector computers and tablets — and requires no installation." },
      ].map(s => (
        <div key={s.title} style={{background:D.panelBg, border:`1px solid ${D.border}`, borderRadius:12, padding:"18px 22px", marginBottom:14}}>
          <div style={{fontSize:15, fontWeight:800, color:D.text, marginBottom:8}}>{s.title}</div>
          <div style={{fontSize:14, color:D.subText, lineHeight:1.7}}>{s.body}</div>
        </div>
      ))}
      <div style={{background:D.panelBg, border:`1px solid ${D.accent}`, borderRadius:12, padding:"18px 22px"}}>
        <div style={{fontSize:14, fontWeight:800, color:D.accent, marginBottom:8}}>Support This Tool</div>
        <div style={{fontSize:13, color:D.subText, lineHeight:1.7, marginBottom:12}}>
          Color Syllables is built and maintained by a classroom teacher and runs on AI API credits. If your school or district finds value in it, consider supporting it via the About page.
        </div>
        <button onClick={() => setActivePage("about")}
          style={{background:D.accent, border:"none", color:"white", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer"}}>
          Go to About Page →
        </button>
      </div>
    </div>
  );

  // ELL STRATEGIES PAGE
  const renderELL = () => (
    <div style={{maxWidth:760, margin:"28px auto", padding:"0 20px 40px", animation:"fadeIn 0.3s ease"}}>
      <h1 style={{fontSize:26, fontWeight:900, color:D.accent, marginBottom:6}}>ELL Strategies</h1>
      <p style={{fontSize:15, color:D.subText, marginBottom:24, lineHeight:1.7}}>
        Using Color Syllables as a bridge between home language phonology and English structured literacy instruction.
      </p>
      {[
        { accent:true, title:"Cognate Awareness Through Color Coding",
          body:"Spanish-English cognates — words that share Latin roots — tend to be multisyllabic, Latinate, and structurally analyzable. Run a cognate pair through the coder in both languages. Words like 'nation / nación', 'education / educación', and 'mission / misión' share syllable type patterns across languages. Students see the structural relationship, not just the surface similarity." },
        { accent:false, title:"The Transfer Bridge",
          body:"Open syllables dominate Spanish. Spanish-speaking students already have strong phonological intuition for the pattern — a syllable ending in a vowel that says its long sound — because they encounter it constantly in their home language. Naming that pattern explicitly and showing it in the same color in both languages makes the transfer visible and affirming rather than incidental." },
        { accent:false, title:"Side-by-Side Analysis",
          body:"Load an English passage in the Color Coder and analyze it. Then use the Translate to Spanish button to generate a Spanish version and analyze that. Compare where the syllable types align and where they diverge. This is a rich metalinguistic activity for intermediate ELL students ready to discuss language structure explicitly." },
        { accent:false, title:"Stress, Accent Marks, and the Schwa",
          body:"Spanish uses written accent marks to show syllable stress when it deviates from the default pattern. English uses syllable type to predict stress. The schwa — that reduced, unstressed vowel common in English — does not exist in Spanish the same way, which explains many ELL pronunciation patterns. Teaching both systems alongside each other builds metalinguistic awareness that benefits students in both languages." },
        { accent:false, title:"California History as Bilingual Content",
          body:"The California history curriculum is naturally bilingual. Words like 'rancho,' 'pueblo,' 'vaquero,' 'adobe,' and 'California' are analyzable in both languages using the same color framework. Students with Spanish home language backgrounds may recognize these words phonologically even before they can read them — that prior knowledge is the instructional entry point." },
        { accent:true, title:"Using Spanish Mode",
          body:'Spanish mode is available on the Color Coder. Type or paste Spanish text and hit Color Code It, or click "🇪🇸 Translate to Spanish" to convert an English passage first. The app uses Spanish syllabification rules. The same six colors apply in both languages — same syllable type, same color — so students can move between languages without losing the visual framework they already know.' },
      ].map(s => (
        <div key={s.title} style={{ background:D.panelBg, border:`1px solid ${s.accent ? D.accent : D.border}`,
          borderRadius:12, padding:"18px 22px", marginBottom:14 }}>
          <div style={{fontSize:15, fontWeight:800, color: s.accent ? D.accent : D.text, marginBottom:8}}>{s.title}</div>
          <div style={{fontSize:14, color:D.subText, lineHeight:1.7}}>{s.body}</div>
        </div>
      ))}
    </div>
  );

  // ABOUT PAGE
  const renderAbout = () => (
    <div style={{maxWidth:760, margin:"40px auto", padding:"0 24px 40px", animation:"fadeIn 0.3s ease"}}>
      <div style={{background:D.panelBg, borderRadius:16, padding:"36px 40px", border:`1px solid ${D.border}`}}>
        <h1 style={{fontSize:28, fontWeight:900, color:D.accent, marginBottom:8}}>The Reading Research</h1>
        <p style={{fontSize:16, lineHeight:1.8, color:D.subText, marginBottom:28}}>
          Color Syllables is built on the principles of <strong style={{color:D.text}}>Structured Literacy</strong> and the{" "}
          <strong style={{color:D.text}}>Science of Reading</strong>. By making syllable patterns visible through color, it supports orthographic mapping — the process by which the brain stores written words in long-term memory.
        </p>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:28}}>
          {[
            ["Orthographic Mapping", "When readers connect letters, sounds, and meaning repeatedly, words get stored in long-term memory. Color coding reinforces those connections by making sound-spelling patterns instantly visible."],
            ["Phoneme-Grapheme Correspondence", "Each syllable color represents a consistent relationship between how letters look and how they sound — the foundation of systematic phonics instruction."],
            ["Structured Literacy", "The six syllable types come from Orton-Gillingham and structured literacy research. Teaching them explicitly and in sequence is one of the most evidence-based approaches to reading instruction."],
            ["UDL — Multiple Means of Representation", "Color coding gives students an additional visual channel for information usually available only as abstract text. This benefits all learners, and is especially meaningful for students with dyslexia or reading disabilities."],
          ].map(([title, desc]) => (
            <div key={title} style={{background:D.sideBg, borderRadius:10, padding:"16px 18px", border:`1px solid ${D.border}`}}>
              <div style={{fontSize:14, fontWeight:800, color:D.accent, marginBottom:6}}>{title}</div>
              <div style={{fontSize:13, lineHeight:1.7, color:D.subText}}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{background:D.sideBg, borderRadius:10, padding:"16px 20px", border:`1px solid ${D.border}`, marginBottom:24}}>
          <div style={{fontSize:13, fontWeight:800, color:D.subText, letterSpacing:1, textTransform:"uppercase", marginBottom:4}}>The CLOVER Framework</div>
          <div style={{fontSize:13, color:D.subText, lineHeight:1.6, marginBottom:12}}>
            CLOVER is the mnemonic used in Orton-Gillingham instruction:{" "}
            <strong style={{color:D.text}}>C</strong>losed · <strong style={{color:D.text}}>L</strong> (C+le) · <strong style={{color:D.text}}>O</strong>pen · <strong style={{color:D.text}}>V</strong>owel Team · <strong style={{color:D.text}}>E</strong> (Magic-E) · <strong style={{color:D.text}}>R</strong>-Controlled
          </div>
          <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
            {Object.entries(TYPES).map(([key, t]) => {
              const c = dark ? t.dark : t.light;
              return (
                <div key={key} style={{ display:"flex", alignItems:"center", gap:6, border:`2px solid ${c}`,
                  borderRadius:7, padding:"5px 12px", background:`${c}18` }}>
                  <span style={{width:10, height:10, borderRadius:2, background:c, display:"inline-block"}}/>
                  <span style={{fontSize:13, fontWeight:700, color:c}}>{t.label}</span>
                  <span style={{fontSize:12, color:D.subText}}>— {t.rule}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{background:D.sideBg, borderRadius:10, padding:"16px 20px", border:`1px solid ${D.border}`, marginBottom:24}}>
          <div style={{fontSize:13, fontWeight:800, color:D.subText, letterSpacing:1, textTransform:"uppercase", marginBottom:6}}>Accessibility</div>
          <div style={{fontSize:13, lineHeight:1.7, color:D.subText}}>
            The <strong style={{color:D.text}}>read-aloud button</strong> uses the browser's built-in Web Speech API in English and Spanish. A <strong style={{color:D.text}}>speak mode</strong> lets students click any word to hear it pronounced. An <strong style={{color:D.text}}>OpenDyslexic font toggle</strong>, <strong style={{color:D.text}}>font size slider</strong>, and <strong style={{color:D.text}}>dark/light mode</strong> support all learners. Color pairs were selected to remain distinguishable for the most common forms of color vision deficiency.
          </div>
        </div>
        <div style={{marginTop:24, display:"flex", flexDirection:"column", alignItems:"center", gap:12}}>
          <div style={{fontSize:12, color:D.subText, opacity:0.7}}>© 2025 Joel Black. All rights reserved.</div>
          <a href="https://buymeacoffee.com/joelbblack" target="_blank" rel="noopener noreferrer"
            style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#FFDD00", color:"#000",
              borderRadius:10, padding:"11px 28px", fontSize:15, fontWeight:800, textDecoration:"none",
              boxShadow:"0 3px 12px rgba(0,0,0,0.15)", transition:"transform 0.15s, box-shadow 0.15s" }}
            onMouseOver={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 18px rgba(0,0,0,0.2)"; }}
            onMouseOut={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 3px 12px rgba(0,0,0,0.15)"; }}>
            ☕ Buy me a coffee
          </a>
        </div>
      </div>
    </div>
  );

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <div ref={appRef} style={{ minHeight:"100vh", background:D.pageBg, fontFamily:font, color:D.text,
      display:"flex", flexDirection:"column", transition:"background 0.3s" }}>
      <style>{fontFaceCSS}</style>

      {/* HEADER */}
      <div style={{background:D.headerBg, boxShadow:"0 3px 20px rgba(0,0,0,0.3)", flexShrink:0}}>
        <div style={{ padding:"0 20px", display:"flex", alignItems:"center",
          justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div style={{padding:"12px 0"}}>
            <div style={{fontSize:22, fontWeight:900, color:"white", letterSpacing:"-0.5px"}}>
              🎨{" "}
              <span style={{color:dark?TYPES["Closed"].dark:TYPES["Closed"].light}}>col</span>
              <span style={{color:dark?TYPES["R-Controlled"].dark:TYPES["R-Controlled"].light}}>or</span>
              <span style={{color:dark?TYPES["Closed"].dark:TYPES["Closed"].light}}>syl</span>
              <span style={{color:dark?TYPES["Open"].dark:TYPES["Open"].light}}>la</span>
              <span style={{color:dark?TYPES["C+le"].dark:TYPES["C+le"].light}}>bles</span>
            </div>
            <div style={{fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:1}}>Science of Reading · Structured Literacy</div>
          </div>
          <div style={{display:"flex", gap:7, alignItems:"center", flexWrap:"wrap", padding:"8px 0"}}>
            <button onClick={() => { setSpanishMode(v => !v); setTokens(null); setShowSaveBar(false); }}
              style={{ background: spanishMode ? "#1B6B3A" : "rgba(255,255,255,0.12)",
                border: `1.5px solid ${spanishMode ? "#3DC87A" : "rgba(255,255,255,0.3)"}`,
                color:"white", borderRadius:8, padding:"6px 12px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              🇪🇸 {spanishMode ? "ES Mode ON" : "Spanish Mode"}
            </button>
            <button onClick={() => setDyslexic(v => !v)}
              style={{ background: dyslexic ? "rgba(61,200,122,0.3)" : "rgba(255,255,255,0.12)",
                border: `1.5px solid ${dyslexic ? "#3DC87A" : "rgba(255,255,255,0.3)"}`,
                color:"white", borderRadius:8, padding:"6px 12px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {dyslexic ? "✓ " : ""}OpenDyslexic
            </button>
            <button onClick={() => setDark(v => !v)}
              style={{ background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.3)",
                color:"white", borderRadius:8, padding:"6px 12px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>
        </div>
      </div>

      {/* BODY: LEFT NAV + MAIN */}
      <div style={{display:"flex", flex:1, overflow:"hidden"}}>

        {/* LEFT NAV */}
        <nav style={{ width:175, background:D.navBg, display:"flex", flexDirection:"column",
          overflowY:"auto", flexShrink:0, borderRight:"1px solid rgba(255,255,255,0.07)" }}>
          {NAV_ITEMS.map(item => {
            const active = activePage === item.id;
            const path = PAGE_TO_PATH[item.id] || "/";
            return (
              <Link key={item.id} to={path}
                aria-current={active ? "page" : undefined}
                style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"12px 14px", textDecoration:"none",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  borderLeft: active ? `3px solid ${D.accent}` : "3px solid transparent",
                  borderTop:"none", borderRight:"none", borderBottom:"none",
                  color: active ? "#FFFFFF" : "rgba(255,255,255,0.6)",
                  fontSize:13, fontWeight: active ? 800 : 500,
                  cursor:"pointer", textAlign:"left", fontFamily:font,
                  transition:"all 0.15s", whiteSpace:"nowrap",
                }}>
                <span style={{fontSize:15}}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* MAIN CONTENT */}
        <main style={{ flex:1, display:"flex", flexDirection:"column",
          overflowY: activePage === "coder" ? "hidden" : "auto" }}>
          {activePage === "coder"     && renderCoder()}
          {activePage === "library"   && renderLibrary()}
          {activePage === "howto"     && renderHowTo()}
          {activePage === "resources" && renderResources()}
          {activePage === "social"    && renderSampleLesson(
            "Social Studies", "California history passages built for syllable type analysis — from Native peoples through colonization, missions, and rancho life.", SOCIAL_SAMPLES, "🌎",
            "Spanish-origin and Latinate vocabulary in California history tends to be heavily multisyllabic with predictable patterns. Try loading a passage then using the Focus filter to highlight open syllables specifically — you will find them everywhere in Spanish-origin words."
          )}
          {activePage === "math"      && renderSampleLesson(
            "Math Vocab", "Latinate math vocabulary is multisyllabic and phonetically predictable — showing students that academic language follows the same decoding rules as any other word.", MATH_SAMPLES, "🔢",
            "Math terms like 'denominator,' 'multiplication,' and 'perimeter' are long but structurally regular. Running them through the color coder demystifies academic vocabulary and reinforces that decoding strategies apply everywhere, not just in reading class."
          )}
          {activePage === "science"   && renderSampleLesson(
            "Science Vocab", "Science terminology is dense with open syllables, r-controlled vowels, and vowel teams. Use the Stats bar to see which syllable types dominate your content area.", SCIENCE_SAMPLES, "🔬",
            "Words like 'photosynthesis,' 'condensation,' and 'ecosystem' are long but follow predictable rules. Use the Stats bar after coding a science passage to show students the pattern breakdown — it is often dominated by open syllables, which is a great teaching moment."
          )}
          {activePage === "blog"      && renderBlog()}
          {activePage === "parents"   && renderParents()}
          {activePage === "coaches"   && renderCoaches()}
          {activePage === "ell"       && renderELL()}
          {activePage === "about"     && renderAbout()}
          {activePage === "corrections" && <SyllableAdminDashboard />}
        </main>
      </div>

      {/* WORD EDITOR BAR */}
      {wordEditorBar}

      {/* CORRECTION MODAL */}
      {editingToken && (
        <CorrectionModal
          open={correctionModalOpen}
          word={tokens[editingToken.tokenIdx]?.syllables.map(s => s.text).join("") || ""}
          aiSyllabification={tokens[editingToken.tokenIdx]?.syllables.map(s => s.text).join("·") || ""}
          syllableRule={tokens[editingToken.tokenIdx]?.syllables[0]?.stype || null}
          onSubmit={(corrected) => {
            const original = tokens[editingToken.tokenIdx];
            logCorrection({
              word: original.syllables.map(s => s.text).join(""),
              aiSyllabification: original.syllables.map(s => s.text).join("·"),
              userSyllabification: corrected,
              syllableRule: original.syllables[0]?.stype || null,
            });
            setCorrectionModalOpen(false);
          }}
          onClose={() => setCorrectionModalOpen(false)}
        />
      )}
    </div>
  );
}
