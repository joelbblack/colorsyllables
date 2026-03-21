import { useState, useCallback, useRef } from "react";

// ── FONTS ────────────────────────────────────────────────────────────────────
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
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
`;

// ── SYLLABLE TYPES ───────────────────────────────────────────────────────────
const TYPES = {
  "Closed":        { light:"#C0392B", dark:"#E74C3C",  label:"Closed",        pattern:"CVC",   rule:"Vowel is SHORT — closed in by a consonant" },
  "Magic-E":       { light:"#1A6EA8", dark:"#4FA3E0",  label:"Magic-E",       pattern:"CVCe",  rule:"Silent e makes the vowel say its LONG name" },
  "Vowel Team":    { light:"#1B9A59", dark:"#3DC87A",  label:"Vowel Team",    pattern:"CVVC",  rule:"Two vowels work together to make ONE sound" },
  "R-Controlled":  { light:"#7B3FA8", dark:"#B06FE0",  label:"R-Controlled",  pattern:"VR",    rule:"The r takes over and changes the vowel sound" },
  "Open":          { light:"#C49A00", dark:"#F0C430",  label:"Open",          pattern:"CV",    rule:"Ends in a vowel — says its LONG name" },
  "C+le":          { light:"#4A6080", dark:"#8AAAC8",  label:"C+le",          pattern:"Cle",   rule:"Consonant + le found at the END of a word" },
};

// ── SAMPLE PASSAGES ──────────────────────────────────────────────────────────
const SAMPLES = [
  { title:"Morning Message", text:"Good morning, friends! Today we will learn about spring storms. A storm can bring rain, wind, and thunder. Stay safe and stay warm inside." },
  { title:"Science: Water Cycle", text:"Water falls from clouds as rain or snow. It flows into streams and rivers. The sun warms the water and turns it into steam. Steam rises and forms new clouds." },
  { title:"Story Starter", text:"The old lighthouse stood on a steep cliff above the sea. Each night its bright light swept across the dark waves. Ships could sail safely past the sharp rocks below." },
];

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

export default function App() {
  const [inputText, setInputText]     = useState("");
  const [tokens, setTokens]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [fontSize, setFontSize]       = useState(30);
  const [dark, setDark]               = useState(true);
  const [dyslexic, setDyslexic]       = useState(false);
  const [showLegend, setShowLegend]   = useState(true);
  const [focusType, setFocusType]     = useState(null); // single type highlight
  const [library, setLibrary]         = useState(SAMPLES);
  const [saveName, setSaveName]       = useState("");
  const [activeTab, setActiveTab]     = useState("coder"); // coder | library | about
  const [showSaveBar, setShowSaveBar] = useState(false);
  const outputRef = useRef(null);

  // ── THEME ──────────────────────────────────────────────────────────────────
  const D = {
    pageBg:    dark ? "#0D1520" : "#F0F4F8",
    panelBg:   dark ? "#172030" : "#FFFFFF",
    sideBg:    dark ? "#111925" : "#F8FAFC",
    border:    dark ? "#263345" : "#DDE3EA",
    headerBg:  dark ? "#0A1628" : "#1A3E6B",
    legendBg:  dark ? "#111925" : "#EEF1F5",
    text:      dark ? "#E2EAF4" : "#1A2535",
    subText:   dark ? "#7A95B0" : "#5A7080",
    inputBg:   dark ? "#0D1520" : "#FFFFFF",
    inputBdr:  dark ? "#263345" : "#C8D4E0",
    tabActive: dark ? "#172030" : "#FFFFFF",
    tabBg:     dark ? "#0D1520" : "#E8EDF4",
    accent:    dark ? "#4FA3E0" : "#1A6EA8",
    punctText: dark ? "#A0B4C8" : "#444444",
    dimText:   dark ? "#2A3D52" : "#C8D4E0",
  };
  const font = dyslexic ? "'OpenDyslexic', sans-serif" : "'Nunito', system-ui, sans-serif";

  // ── PROCESS ────────────────────────────────────────────────────────────────
  const processText = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true); setError(null); setTokens(null); setShowSaveBar(false);
    try {
    const res  = await fetch("https://api.anthropic.com/v1/messages", {
  method:"POST", headers:{
    "Content-Type":"application/json",
    "x-api-key":"sk-ant-api03-NnD...dwAA",
    "anthropic-version":"2023-06-01",
  },
  body: JSON.stringify({
    model:"claude-sonnet-4-20250514", max_tokens:4000,
    system: SYSTEM_PROMPT,
    messages:[{ role:"user", content:`Analyze this text:\n\n${inputText}` }],
  }),
});
const data  = await res.json();
      const raw   = data.content?.find(b => b.type==="text")?.text || "";
      const clean = raw.replace(/```json|```/gi,"").trim();
      setTokens(JSON.parse(clean));
      setShowSaveBar(true);
    } catch(e) {
      setError("Something went wrong — try again.");
      console.error(e);
    } finally { setLoading(false); }
  }, [inputText]);

  // ── STATS ──────────────────────────────────────────────────────────────────
  const stats = tokens ? (() => {
    const counts = Object.fromEntries(Object.keys(TYPES).map(k => [k, 0]));
    let total = 0;
    tokens.forEach(t => {
      if (t.type === "word") t.syllables?.forEach(s => {
        if (counts[s.stype] !== undefined) { counts[s.stype]++; total++; }
      });
    });
    return { counts, total };
  })() : null;

  // ── SAVE TO LIBRARY ────────────────────────────────────────────────────────
  const saveToLibrary = () => {
    if (!saveName.trim() || !inputText.trim()) return;
    setLibrary(prev => [{ title: saveName.trim(), text: inputText.trim() }, ...prev]);
    setSaveName(""); setShowSaveBar(false);
  };

  // ── PDF ────────────────────────────────────────────────────────────────────
  const downloadPDF = useCallback(() => {
    if (!tokens) return;
    const pw = window.open("", "_blank");
    const tokenHTML = tokens.map(token => {
      if (token.type==="space") return token.text==="\n" ? "<br/>" : " ";
      if (token.type==="punct") return `<span style="color:#444">${token.text}</span>`;
      if (token.type==="word" && token.syllables) {
        return token.syllables.map(syl => {
          const t = TYPES[syl.stype] || TYPES["Closed"];
          const c = dark ? t.dark : t.light;
          const dimmed = focusType && syl.stype !== focusType;
          return `<span style="color:${dimmed?"#ccc":c};font-weight:700;border-bottom:3px solid ${dimmed?"#ccc":c};padding-bottom:1px">${syl.text}</span>`;
        }).join("");
      }
      return token.text || "";
    }).join("");
    const legendHTML = Object.entries(TYPES).map(([,t]) => {
      const c = dark ? t.dark : t.light;
      return `<span style="display:inline-flex;align-items:center;gap:5px;margin:3px 5px;padding:3px 9px;border:2px solid ${c};border-radius:6px">
        <span style="width:11px;height:11px;border-radius:3px;background:${c};display:inline-block"></span>
        <span style="font-size:12px;font-weight:700;color:${c}">${t.label}</span>
      </span>`;
    }).join("");
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Color Syllables Output</title>
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
  }, [tokens, dark, fontSize, focusType]);

  // ── CYCLE SYLLABLE TYPE ON CLICK ──────────────────────────────────────────
  const [fullscreen, setFullscreen] = useState(false);
  const appRef = useRef(null);
  const toggleFullscreen = () => setFullscreen(v => !v);


  const cycleSyllable = (tokenIdx, sylIdx) => {
    setTokens(prev => prev.map((token, ti) => {
      if (ti !== tokenIdx || token.type !== "word") return token;
      const newSyllables = token.syllables.map((syl, si) => {
        if (si !== sylIdx) return syl;
        const currentIdx = TYPE_KEYS.indexOf(syl.stype);
        const nextIdx    = (currentIdx + 1) % TYPE_KEYS.length;
        return { ...syl, stype: TYPE_KEYS[nextIdx] };
      });
      return { ...token, syllables: newSyllables };
    }));
  };

  // ── RENDER TOKEN ───────────────────────────────────────────────────────────
  const renderToken = (token, ti) => {
    if (token.type==="space") return <span key={ti}>{token.text==="\n" ? <br/> : " "}</span>;
    if (token.type==="punct") return <span key={ti} style={{color:D.punctText}}>{token.text}</span>;
    if (token.type==="word" && token.syllables) {
      return (
        <span key={ti}>
          {token.syllables.map((syl, si) => {
            const t      = TYPES[syl.stype] || TYPES["Closed"];
            const c      = dark ? t.dark : t.light;
            const dimmed = focusType && syl.stype !== focusType;
            return (
              <span key={si}
                title={`${syl.stype} — click to change`}
                onClick={() => cycleSyllable(ti, si)}
                style={{
                  color: dimmed ? D.dimText : c,
                  fontWeight: 700,
                  borderBottom: `3px solid ${dimmed ? D.dimText : c}`,
                  paddingBottom: 1,
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                  userSelect: "none",
                }}
              >{syl.text}</span>
            );
          })}
        </span>
      );
    }
    return <span key={ti} style={{color:D.punctText}}>{token.text||""}</span>;
  };

  // ── STYLES ─────────────────────────────────────────────────────────────────
  const btn = (active, color) => ({
    background: active ? color : "transparent",
    border: `2px solid ${color}`,
    color: active ? "white" : color,
    borderRadius: 8, padding:"5px 13px",
    fontSize: 13, fontWeight: 700, cursor:"pointer",
    transition:"all 0.2s",
  });

  const tabStyle = (id) => ({
    padding:"9px 20px", fontSize:14, fontWeight:700, cursor:"pointer",
    background: activeTab===id ? D.tabActive : D.tabBg,
    color: activeTab===id ? D.accent : D.subText,
    border:"none", borderBottom: activeTab===id ? `3px solid ${D.accent}` : "3px solid transparent",
    transition:"all 0.2s", fontFamily: font,
  });

  return (
    <div ref={appRef} style={{minHeight:"100vh", background:D.pageBg, fontFamily:font, color:D.text, transition:"all 0.3s"}}>
      <style>{fontFaceCSS}</style>

      {/* ── NAV ── */}
      <div style={{background:D.headerBg, boxShadow:"0 3px 20px rgba(0,0,0,0.3)"}}>
        <div style={{maxWidth:1200, margin:"0 auto", padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8}}>
          <div style={{padding:"14px 0"}}>
            <div style={{fontSize:22, fontWeight:900, color:"white", letterSpacing:"-0.5px"}}>
              🎨 <span style={{color: dark ? TYPES["Closed"].dark       : TYPES["Closed"].light      }}>col</span><span style={{color: dark ? TYPES["R-Controlled"].dark  : TYPES["R-Controlled"].light }}>or</span><span style={{color: dark ? TYPES["Closed"].dark       : TYPES["Closed"].light      }}>syl</span><span style={{color: dark ? TYPES["Open"].dark         : TYPES["Open"].light        }}>la</span><span style={{color: dark ? TYPES["C+le"].dark         : TYPES["C+le"].light        }}>bles</span>
            </div>
            <div style={{fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:1}}>Science of Reading · Structured Literacy</div>
          </div>
          <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
            <button onClick={()=>setDyslexic(v=>!v)} style={{...btn(dyslexic,"#3DC87A"), fontSize:12}}>
              {dyslexic ? "✓ " : ""}OpenDyslexic Font
            </button>
            <button onClick={()=>setDark(v=>!v)} style={{background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.3)", color:"white", borderRadius:8, padding:"6px 12px", fontSize:13, fontWeight:700, cursor:"pointer"}}>
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button onClick={toggleFullscreen} style={{background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.3)", color:"white", borderRadius:8, padding:"6px 12px", fontSize:13, fontWeight:700, cursor:"pointer"}} title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              {fullscreen ? "⊠ Exit Full" : "⛶ Fullscreen"}
            </button>
          </div>
        </div>

        {/* TABS */}
        <div style={{maxWidth:1200, margin:"0 auto", display:"flex", paddingLeft:20}}>
          {[["coder","⚡ Color Coder"],["library","📚 Passage Library"],["about","ℹ️ About"]].map(([id,label])=>(
            <button key={id} onClick={()=>setActiveTab(id)} style={tabStyle(id)}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── ABOUT TAB ── */}
      {activeTab==="about" && (
        <div style={{maxWidth:760, margin:"40px auto", padding:"0 24px", animation:"fadeIn 0.3s ease"}}>
          <div style={{background:D.panelBg, borderRadius:16, padding:"36px 40px", border:`1px solid ${D.border}`}}>
            <h1 style={{fontSize:28, fontWeight:900, color:D.accent, marginBottom:8}}>Why This Works</h1>
            <p style={{fontSize:16, lineHeight:1.8, color:D.subText, marginBottom:24}}>
              Color Syllables is built on the principles of <strong style={{color:D.text}}>Structured Literacy</strong> and the <strong style={{color:D.text}}>Science of Reading</strong>. By making syllable patterns visible through color, it supports orthographic mapping — the process by which the brain stores written words in long-term memory.
            </p>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:28}}>
              {[
                ["Orthographic Mapping","Color coding accelerates the brain's ability to recognize and store word patterns automatically."],
                ["Phoneme-Grapheme Correspondence","Each color represents a consistent relationship between letters and sounds."],
                ["Structured Literacy","Based on the six syllable types taught in Orton-Gillingham and related approaches (CLOVER)."],
                ["UDL — Multiple Means of Representation","Visual color coding provides an additional representation layer for all learners, especially those with dyslexia."],
              ].map(([title, desc])=>(
                <div key={title} style={{background:D.sideBg, borderRadius:10, padding:"16px 18px", border:`1px solid ${D.border}`}}>
                  <div style={{fontSize:14, fontWeight:800, color:D.accent, marginBottom:6}}>{title}</div>
                  <div style={{fontSize:13, lineHeight:1.7, color:D.subText}}>{desc}</div>
                </div>
              ))}
            </div>
            <div style={{background:D.sideBg, borderRadius:10, padding:"16px 20px", border:`1px solid ${D.border}`}}>
              <div style={{fontSize:13, fontWeight:800, color:D.subText, letterSpacing:1, textTransform:"uppercase", marginBottom:8}}>The CLOVER Framework</div>
              <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
                {Object.entries(TYPES).map(([key,t])=>{
                  const c = dark ? t.dark : t.light;
                  return (
                    <div key={key} style={{display:"flex", alignItems:"center", gap:6, border:`2px solid ${c}`, borderRadius:7, padding:"4px 12px", background:`${c}18`}}>
                      <span style={{width:10, height:10, borderRadius:2, background:c, display:"inline-block"}}/>
                      <span style={{fontSize:13, fontWeight:700, color:c}}>{t.label}</span>
                      <span style={{fontSize:12, color:D.subText}}>— {t.rule}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIBRARY TAB ── */}
      {activeTab==="library" && (
        <div style={{maxWidth:900, margin:"32px auto", padding:"0 20px", animation:"fadeIn 0.3s ease"}}>
          <div style={{fontSize:13, fontWeight:700, color:D.subText, textTransform:"uppercase", letterSpacing:1.5, marginBottom:16}}>
            Saved Passages
          </div>
          <div style={{display:"grid", gap:12}}>
            {library.map((item, i) => (
              <div key={i} style={{background:D.panelBg, border:`1px solid ${D.border}`, borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:15, fontWeight:800, color:D.text, marginBottom:4}}>{item.title}</div>
                  <div style={{fontSize:13, color:D.subText, lineHeight:1.5}}>{item.text.slice(0,120)}{item.text.length>120?"…":""}</div>
                </div>
                <button onClick={()=>{ setInputText(item.text); setActiveTab("coder"); setTokens(null); }}
                  style={{background:D.accent, border:"none", color:"white", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap"}}>
                  Load & Code →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CODER TAB ── */}
      {activeTab==="coder" && (
        <div style={{display:"flex", flex:1, flexWrap:"wrap", maxHeight:"calc(100vh - 130px)"}}>

          {/* INPUT SIDEBAR */}
          <div style={{width:tokens?"260px":"100%", minWidth:220, background:D.sideBg, borderRight:`2px solid ${D.border}`, display:"flex", flexDirection:"column", padding:16, gap:10, overflowY:"auto"}}>
            <label style={{fontSize:11, fontWeight:700, color:D.subText, textTransform:"uppercase", letterSpacing:1.5}}>Your Text</label>
            <textarea value={inputText} onChange={e=>setInputText(e.target.value)}
              placeholder={"Morning message, reading passage,\nstudent writing — paste anything."}
              style={{flex:1, minHeight:tokens?200:180, border:`2px solid ${D.inputBdr}`, borderRadius:9, padding:12,
                      fontSize:14, lineHeight:1.6, resize:"vertical", outline:"none",
                      fontFamily:font, color:D.text, background:D.inputBg}}/>

            {/* Sample loader */}
            <div>
              <div style={{fontSize:11, fontWeight:700, color:D.subText, textTransform:"uppercase", letterSpacing:1, marginBottom:6}}>Try a sample</div>
              <div style={{display:"flex", flexDirection:"column", gap:4}}>
                {SAMPLES.map((s,i)=>(
                  <button key={i} onClick={()=>{ setInputText(s.text); setTokens(null); }}
                    style={{background:"none", border:`1px solid ${D.border}`, borderRadius:6, padding:"5px 10px",
                            fontSize:12, color:D.subText, cursor:"pointer", textAlign:"left", fontFamily:font}}>
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={processText} disabled={loading||!inputText.trim()}
              style={{background:loading||!inputText.trim()?(dark?"#1A2A3A":"#C8D4E0"):"linear-gradient(135deg,#1A3E6B,#2874A6)",
                      color:"white", border:"none", borderRadius:9, padding:"11px 0",
                      fontSize:15, fontWeight:800, cursor:loading||!inputText.trim()?"not-allowed":"pointer", fontFamily:font}}>
              {loading?"Analyzing…":"⚡ Color Code It"}
            </button>

            {error && <div style={{background:dark?"#2D1515":"#FDEDEC", border:"1.5px solid #E74C3C", borderRadius:7, padding:"8px 12px", fontSize:13, color:dark?"#F1948A":"#922B21"}}>{error}</div>}

            {/* Save to library */}
            {showSaveBar && (
              <div style={{display:"flex", gap:6, animation:"fadeIn 0.3s ease"}}>
                <input value={saveName} onChange={e=>setSaveName(e.target.value)}
                  placeholder="Name this passage…"
                  style={{flex:1, border:`1.5px solid ${D.inputBdr}`, borderRadius:7, padding:"6px 10px",
                          fontSize:13, color:D.text, background:D.inputBg, fontFamily:font, outline:"none"}}/>
                <button onClick={saveToLibrary} disabled={!saveName.trim()}
                  style={{background:D.accent, border:"none", color:"white", borderRadius:7, padding:"6px 10px",
                          fontSize:13, fontWeight:700, cursor:"pointer"}}>Save</button>
              </div>
            )}

            {tokens && (
              <div style={{display:"flex", gap:6}}>
                <button onClick={()=>{setTokens(null);setShowSaveBar(false);setFocusType(null);}}
                  style={{flex:1, background:"none", border:`1.5px solid ${D.accent}`, borderRadius:7, padding:"7px 0",
                          fontSize:13, color:D.accent, cursor:"pointer", fontWeight:700, fontFamily:font}}>
                  ↺ New Passage
                </button>
                <button onClick={()=>{setTokens(null);setInputText("");setShowSaveBar(false);setFocusType(null);}}
                  style={{flex:1, background:"none", border:`1.5px solid ${D.border}`, borderRadius:7, padding:"7px 0",
                          fontSize:13, color:D.subText, cursor:"pointer", fontWeight:600, fontFamily:font}}>
                  ✕ Clear All
                </button>
              </div>
            )}
          </div>

          {/* OUTPUT AREA */}
          {tokens && (
            <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden", animation:"fadeIn 0.4s ease"}}>

              {/* LEGEND + CONTROLS BAR */}
              <div style={{background:D.legendBg, borderBottom:`2px solid ${D.border}`, padding:"10px 18px", display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", justifyContent:"space-between"}}>
                <div style={{display:"flex", flexWrap:"wrap", gap:6, alignItems:"center"}}>
                  <span style={{fontSize:11, fontWeight:700, color:D.subText, textTransform:"uppercase", letterSpacing:1, marginRight:4}}>Focus:</span>
                  <button onClick={()=>setFocusType(null)}
                    style={{...btn(!focusType, D.accent), fontSize:12, padding:"3px 10px"}}>All</button>
                  {Object.entries(TYPES).map(([key,t])=>{
                    const c = dark ? t.dark : t.light;
                    const active = focusType===key;
                    return (
                      <button key={key} onClick={()=>setFocusType(active?null:key)}
                        style={{background:active?c:"transparent", border:`2px solid ${c}`,
                                color:active?"white":c, borderRadius:7, padding:"3px 10px",
                                fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.2s"}}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{display:"flex", gap:8, alignItems:"center"}}>
                  <input type="range" min={18} max={72} value={fontSize} onChange={e=>setFontSize(Number(e.target.value))} style={{width:80, accentColor:D.accent}}/>
                  <span style={{fontSize:12, fontWeight:700, color:D.subText, minWidth:28}}>{fontSize}px</span>
                  <button onClick={downloadPDF}
                    style={{background:D.accent, border:"none", color:"white", borderRadius:8, padding:"5px 12px",
                            fontSize:12, fontWeight:800, cursor:"pointer"}}>⬇ PDF</button>
                </div>
              </div>

              {/* TEXT OUTPUT */}
              <div ref={outputRef} style={{
                flex: fullscreen ? undefined : 1,
                padding: fullscreen ? "40px 60px" : "28px 36px",
                overflowY: "auto",
                background: D.panelBg,
                ...(fullscreen ? {
                  position: "fixed", top: 0, left: 0,
                  width: "100vw", height: "100vh",
                  zIndex: 9999,
                } : {}),
              }}>
                <div style={{fontSize:11, fontWeight:600, color:D.subText, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <span style={{textTransform:"uppercase", letterSpacing:1.5, fontWeight:700}}>Color-Coded Output</span>
                  <div style={{display:"flex", gap:12, alignItems:"center"}}>
                    <span style={{opacity:0.7}}>💡 Click any syllable to cycle its type</span>
                    {fullscreen && (
                      <button onClick={toggleFullscreen}
                        style={{background:D.accent, border:"none", color:"white", borderRadius:8,
                                padding:"5px 14px", fontSize:13, fontWeight:700, cursor:"pointer"}}>
                        ⊠ Exit Fullscreen
                      </button>
                    )}
                  </div>
                </div>
                <div style={{fontSize:fontSize, lineHeight:1.9, fontFamily:font}}>
                  {tokens.map(renderToken)}
                </div>
              </div>

              {/* STATS BAR */}
              {stats && stats.total > 0 && (
                <div style={{background:D.sideBg, borderTop:`2px solid ${D.border}`, padding:"14px 24px"}}>
                  <div style={{fontSize:11, fontWeight:700, color:D.subText, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10}}>
                    Passage Analysis — {stats.total} syllables
                  </div>
                  <div style={{display:"flex", flexDirection:"column", gap:6}}>
                    {Object.entries(TYPES).map(([key,t])=>{
                      const count = stats.counts[key] || 0;
                      const pct   = stats.total ? Math.round(count/stats.total*100) : 0;
                      const c     = dark ? t.dark : t.light;
                      if (!count) return null;
                      return (
                        <div key={key} style={{display:"flex", alignItems:"center", gap:10}}>
                          <div style={{width:90, fontSize:12, fontWeight:700, color:c, flexShrink:0}}>{t.label}</div>
                          <div style={{flex:1, height:14, background:dark?"#1A2A3A":"#E8EDF4", borderRadius:7, overflow:"hidden"}}>
                            <div style={{width:`${pct}%`, height:"100%", background:c, borderRadius:7, transition:"width 0.5s ease"}}/>
                          </div>
                          <div style={{width:50, fontSize:12, fontWeight:700, color:D.subText, textAlign:"right", flexShrink:0}}>{count} ({pct}%)</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EMPTY STATE */}
          {!tokens && !loading && (
            <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                          color:D.subText, fontSize:17, fontWeight:600,
                          padding:40, textAlign:"center", flexDirection:"column", gap:12}}>
              <div style={{fontSize:52}}>🎨</div>
              <div>Paste your text and hit Color Code It</div>
              <div style={{fontSize:13, color:D.subText, opacity:0.7}}>or load a sample from the sidebar</div>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16}}>
              <div style={{width:46, height:46, border:`5px solid ${D.border}`, borderTop:`5px solid ${D.accent}`, borderRadius:"50%", animation:"spin 0.8s linear infinite"}}/>
              <div style={{fontSize:15, fontWeight:700, color:D.accent}}>Analyzing syllables…</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
