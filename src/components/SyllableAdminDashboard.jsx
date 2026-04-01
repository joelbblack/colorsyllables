import { useState, useEffect, useCallback } from "react";

// ── Supabase REST helper (no SDK needed) ──────────────────────────────────
function makeSupabase(url, serviceKey) {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  async function from(table, query = "") {
    const res = await fetch(`${url}/rest/v1/${table}${query}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  return { from };
}

// ── Confidence pill color ─────────────────────────────────────────────────
function confidenceColor(pct) {
  if (pct >= 80) return "#22c55e";
  if (pct >= 50) return "#f59e0b";
  return "#ef4444";
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState(null);
  const [flagged, setFlagged] = useState([]);
  const [confidence, setConfidence] = useState([]);
  const [tab, setTab] = useState("flagged");
  const [search, setSearch] = useState("");
  const [selectedWord, setSelectedWord] = useState(null);
  const [copied, setCopied] = useState(false);

  const db = connected ? makeSupabase(url, key) : null;

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError(null);
    try {
      const [statsData, flaggedData, confData] = await Promise.all([
        db.from("correction_stats", "?select=*").catch(() => []),
        db.from("flagged_words", "?select=*&order=total_corrections.desc&limit=200"),
        db.from("word_syllabification_confidence", "?select=*&order=vote_count.desc&limit=500"),
      ]);
      setStats(Array.isArray(statsData) ? statsData[0] : null);
      setFlagged(Array.isArray(flaggedData) ? flaggedData : []);
      setConfidence(Array.isArray(confData) ? confData : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [db]);

  async function connect() {
    if (!url || !key) return;
    setLoading(true);
    setError(null);
    try {
      const test = makeSupabase(url.trim(), key.trim());
      await test.from("correction_stats", "?select=*");
      setConnected(true);
    } catch (e) {
      setError("Connection failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (connected) load();
  }, [connected, load]);

  // Words for selected word detail
  const wordConfidence = selectedWord
    ? confidence.filter((r) => r.word === selectedWord)
    : [];

  // Filtered flagged list
  const filteredFlagged = flagged.filter((r) =>
    r.word.toLowerCase().includes(search.toLowerCase())
  );

  // Export prompt snippet
  function exportPrompt() {
    const lines = flagged.slice(0, 30).map(
      (r) =>
        `"${r.word}" → correct: "${r.top_user_correction}" (AI said: "${r.ai_answer}", ${r.total_corrections} corrections)`
    );
    const text =
      "The following words are frequently mis-syllabified. Please use these corrections:\n\n" +
      lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Login Screen ─────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div style={styles.root}>
        <div style={styles.loginCard}>
          <div style={styles.logoRow}>
            <span style={styles.logoIcon}>◈</span>
            <span style={styles.logoText}>Color Syllables</span>
          </div>
          <h1 style={styles.loginTitle}>Correction Lab</h1>
          <p style={styles.loginSub}>
            Connect to your Supabase project to analyze user corrections.
          </p>

          <label style={styles.label}>Supabase Project URL</label>
          <input
            style={styles.input}
            placeholder="https://xxxx.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <label style={styles.label}>Service Role Key</label>
          <input
            style={{ ...styles.input, fontFamily: "monospace", fontSize: 11 }}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <p style={{ fontSize: 11, color: "#888", margin: "-8px 0 16px" }}>
            Use your <strong>Service Role</strong> key (not anon) to read protected data.
          </p>

          {error && <div style={styles.errorBanner}>{error}</div>}

          <button
            style={{ ...styles.btn, width: "100%", opacity: loading ? 0.6 : 1 }}
            onClick={connect}
            disabled={loading || !url || !key}
          >
            {loading ? "Connecting…" : "Connect →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={styles.logoIcon}>◈</span>
          <span style={{ ...styles.logoText, fontSize: 15 }}>
            Color Syllables — Correction Lab
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={styles.btnOutline} onClick={load} disabled={loading}>
            {loading ? "↻" : "↻ Refresh"}
          </button>
          <button
            style={{ ...styles.btn, fontSize: 12, padding: "6px 14px" }}
            onClick={exportPrompt}
          >
            {copied ? "✓ Copied!" : "⎘ Export to Prompt"}
          </button>
        </div>
      </div>

      {error && <div style={{ ...styles.errorBanner, margin: "0 20px 16px" }}>{error}</div>}

      {/* Stats Row */}
      {stats && (
        <div style={styles.statsRow}>
          {[
            { label: "Total Corrections", val: stats.total_corrections ?? 0 },
            { label: "Unique Words", val: stats.unique_words_corrected ?? 0 },
            { label: "Sessions", val: stats.total_sessions ?? 0 },
            {
              label: "AI Error Rate",
              val: `${stats.error_rate_pct ?? 0}%`,
              accent: parseFloat(stats.error_rate_pct) > 20,
            },
          ].map((s) => (
            <div key={s.label} style={styles.statCard}>
              <div
                style={{
                  ...styles.statVal,
                  color: s.accent ? "#ef4444" : "#e2e8f0",
                }}
              >
                {s.val}
              </div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabRow}>
        {[
          { id: "flagged", label: `🚩 Flagged Words (${flagged.length})` },
          { id: "confidence", label: "📊 Confidence View" },
        ].map((t) => (
          <button
            key={t.id}
            style={{
              ...styles.tab,
              ...(tab === t.id ? styles.tabActive : {}),
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: "12px 20px 0" }}>
        <input
          style={styles.searchInput}
          placeholder="Filter words…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── FLAGGED TAB ── */}
      {tab === "flagged" && (
        <div style={styles.tableWrap}>
          {filteredFlagged.length === 0 ? (
            <div style={styles.empty}>
              {loading ? "Loading…" : "No flagged words yet. Corrections will appear here once users submit them."}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Word", "AI Answer", "Top Correction", "Corrections", "Users"].map(
                    (h) => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredFlagged.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      ...styles.tr,
                      background:
                        selectedWord === row.word
                          ? "rgba(99,179,237,0.08)"
                          : i % 2 === 0
                          ? "transparent"
                          : "rgba(255,255,255,0.02)",
                    }}
                    onClick={() =>
                      setSelectedWord(
                        selectedWord === row.word ? null : row.word
                      )
                    }
                  >
                    <td style={{ ...styles.td, fontWeight: 700, color: "#93c5fd" }}>
                      {row.word}
                    </td>
                    <td style={{ ...styles.td, color: "#fca5a5", fontFamily: "monospace" }}>
                      {row.ai_answer}
                    </td>
                    <td style={{ ...styles.td, color: "#86efac", fontFamily: "monospace" }}>
                      {row.top_user_correction ?? "—"}
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <span style={styles.badge}>{row.total_corrections}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: "center", color: "#94a3b8" }}>
                      {row.unique_users}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Word detail panel */}
          {selectedWord && (
            <div style={styles.detailPanel}>
              <div style={styles.detailTitle}>
                Correction breakdown:{" "}
                <span style={{ color: "#93c5fd" }}>{selectedWord}</span>
              </div>
              {wordConfidence.length === 0 ? (
                <div style={{ color: "#888", fontSize: 13 }}>No data.</div>
              ) : (
                wordConfidence.map((r, i) => (
                  <div key={i} style={styles.confRow}>
                    <span style={{ fontFamily: "monospace", fontSize: 14, minWidth: 120 }}>
                      {r.user_syllabification}
                    </span>
                    <div style={styles.confBarOuter}>
                      <div
                        style={{
                          ...styles.confBarInner,
                          width: `${r.confidence_pct}%`,
                          background: confidenceColor(r.confidence_pct),
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: confidenceColor(r.confidence_pct),
                        minWidth: 44,
                        textAlign: "right",
                      }}
                    >
                      {r.confidence_pct}%
                    </span>
                    <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>
                      ({r.vote_count} votes)
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CONFIDENCE TAB ── */}
      {tab === "confidence" && (
        <div style={styles.tableWrap}>
          {confidence.length === 0 ? (
            <div style={styles.empty}>
              {loading ? "Loading…" : "No confidence data yet."}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Word", "Syllabification", "Confidence", "Votes", "Unique Users"].map(
                    (h) => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {confidence
                  .filter((r) =>
                    r.word.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        ...styles.tr,
                        background:
                          i % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <td style={{ ...styles.td, color: "#93c5fd", fontWeight: 600 }}>
                        {row.word}
                      </td>
                      <td style={{ ...styles.td, fontFamily: "monospace" }}>
                        {row.user_syllabification}
                      </td>
                      <td style={{ ...styles.td }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={styles.confBarOuter}>
                            <div
                              style={{
                                ...styles.confBarInner,
                                width: `${row.confidence_pct}%`,
                                background: confidenceColor(row.confidence_pct),
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: confidenceColor(row.confidence_pct),
                            }}
                          >
                            {row.confidence_pct}%
                          </span>
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <span style={styles.badge}>{row.vote_count}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: "center", color: "#94a3b8" }}>
                        {row.unique_users}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: "100vh",
    background: "#0d1117",
    color: "#e2e8f0",
    fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  loginCard: {
    margin: "auto",
    marginTop: 80,
    width: 400,
    background: "#161b22",
    borderRadius: 16,
    padding: "36px 32px",
    border: "1px solid #30363d",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 22,
    color: "#63b3ed",
  },
  logoText: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 1,
    color: "#63b3ed",
    textTransform: "uppercase",
  },
  loginTitle: {
    margin: "0 0 6px",
    fontSize: 26,
    fontWeight: 800,
    color: "#f1f5f9",
  },
  loginSub: {
    fontSize: 13,
    color: "#94a3b8",
    margin: "0 0 28px",
    lineHeight: 1.5,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    marginBottom: 16,
    background: "#0d1117",
    border: "1px solid #30363d",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  },
  btn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  btnOutline: {
    background: "transparent",
    color: "#94a3b8",
    border: "1px solid #30363d",
    borderRadius: 8,
    padding: "6px 14px",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
  },
  errorBanner: {
    background: "#450a0a",
    border: "1px solid #7f1d1d",
    color: "#fca5a5",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 16,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #21262d",
    background: "#161b22",
  },
  statsRow: {
    display: "flex",
    gap: 12,
    padding: "16px 20px",
    overflowX: "auto",
  },
  statCard: {
    flex: "1 1 120px",
    background: "#161b22",
    border: "1px solid #21262d",
    borderRadius: 10,
    padding: "14px 16px",
    minWidth: 100,
  },
  statVal: {
    fontSize: 28,
    fontWeight: 800,
    color: "#e2e8f0",
    lineHeight: 1,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: 600,
  },
  tabRow: {
    display: "flex",
    padding: "0 20px",
    gap: 4,
    borderBottom: "1px solid #21262d",
    marginTop: 4,
  },
  tab: {
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#64748b",
    padding: "10px 16px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "color 0.15s",
  },
  tabActive: {
    color: "#63b3ed",
    borderBottom: "2px solid #63b3ed",
  },
  searchInput: {
    width: "100%",
    maxWidth: 320,
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 8,
    color: "#e2e8f0",
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  },
  tableWrap: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 20px 32px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    color: "#64748b",
    fontWeight: 600,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottom: "1px solid #21262d",
  },
  tr: {
    cursor: "pointer",
    transition: "background 0.1s",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #161b22",
    color: "#cbd5e1",
  },
  badge: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 20,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 700,
    color: "#94a3b8",
  },
  empty: {
    padding: "48px 0",
    textAlign: "center",
    color: "#475569",
    fontSize: 14,
  },
  detailPanel: {
    background: "#161b22",
    border: "1px solid #21262d",
    borderRadius: 10,
    padding: "18px 20px",
    marginTop: 16,
  },
  detailTitle: {
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 14,
    color: "#94a3b8",
  },
  confRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  confBarOuter: {
    flex: 1,
    height: 8,
    background: "#1e293b",
    borderRadius: 4,
    overflow: "hidden",
  },
  confBarInner: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.4s ease",
  },
};
