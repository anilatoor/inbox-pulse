import React, { useEffect, useMemo, useState, useCallback } from "react";
import { TRIAGE_API } from "./config";
import { VolumeChart, CategoryChart, SentimentChart } from "./Charts";
import {
  PRIORITY_LABEL, PRIORITY_VAR, CATEGORY_LABEL, SENTIMENT_LABEL, SENTIMENT_VAR,
  P, C, S, fmtDate, fmtDateTime, initials, relativeDue,
} from "./lib";

const COLUMNS = [
  { key: "HIGH", title: "Needs you now", sub: "Time-bound, client, or blocking" },
  { key: "MEDIUM", title: "When you can", sub: "Action needed, no rush" },
  { key: "LOW", title: "Handled", sub: "Filed and read" },
];

export default function App() {
  const [data, setData] = useState({ rows: [], stats: null });
  const [state, setState] = useState("loading");
  const [errMsg, setErrMsg] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ALL");
  const [sent, setSent] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("board");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(TRIAGE_API, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`The data service responded with ${res.status}.`);
      const json = await res.json();
      const payload = Array.isArray(json) ? { rows: json, stats: null } : json;
      setData({ rows: payload.rows || [], stats: payload.stats || null });
      setState("ok");
    } catch (e) {
      setErrMsg(e.message || "Could not reach the data service.");
      setState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = data.rows;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (cat !== "ALL" && C(r.category) !== cat) return false;
      if (sent !== "ALL" && S(r.sentiment) !== sent) return false;
      if (!needle) return true;
      return [r.subject, r.from_name, r.from_email, r.summary]
        .some((f) => (f || "").toString().toLowerCase().includes(needle));
    });
  }, [rows, q, cat, sent]);

  const grouped = useMemo(() => {
    const g = { HIGH: [], MEDIUM: [], LOW: [] };
    for (const r of filtered) (g[P(r.priority)] || g.LOW).push(r);
    return g;
  }, [filtered]);

  const stats = data.stats || deriveStats(rows);
  const tasks = useMemo(() => rows.filter((r) => (r.task_title || "").trim()), [rows]);

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 22px 80px" }}>
      <Header onRefresh={load} loading={state === "loading"} />
      {state === "error" && <ErrorBar msg={errMsg} onRetry={load} />}
      <StatLine stats={stats} state={state} />

      <section style={{ display: "grid", gap: 16, marginTop: 20, gridTemplateColumns: "1.3fr 1fr 1fr" }} className="charts-row">
        <VolumeChart byDay={stats.byDay} />
        <CategoryChart byCategory={stats.byCategory} />
        <SentimentChart bySentiment={stats.bySentiment} />
      </section>

      <Tabs tab={tab} setTab={setTab} taskCount={tasks.length} />

      {tab === "board" ? (
        <>
          <FilterBar {...{ q, setQ, cat, setCat, sent, setSent }} count={filtered.length} total={rows.length} />
          {state === "loading" ? <BoardSkeleton /> :
            rows.length === 0 && state === "ok" ? <EmptyAll /> :
            filtered.length === 0 ? <EmptyFiltered onClear={() => { setQ(""); setCat("ALL"); setSent("ALL"); }} /> :
            <Board grouped={grouped} onOpen={setSelected} />}
        </>
      ) : (
        <Tasks tasks={tasks} onOpen={setSelected} loading={state === "loading"} />
      )}

      {selected && <Detail row={selected} onClose={() => setSelected(null)} />}
      <style>{responsiveCss}</style>
    </div>
  );
}

function Header({ onRefresh, loading }) {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
      <img src="/inboxpulse-logo.png" alt="InboxPulse — AI Email Executive Assistant" style={{ height: 52, width: "auto", display: "block" }} />
      <button onClick={onRefresh} disabled={loading} style={{
        background: "var(--bg-raised)", color: "var(--ink-soft)", border: "1px solid var(--line)",
        borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600,
        opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ display: "inline-block", animation: loading ? "spin 0.8s linear infinite" : "none" }}>↻</span>
        {loading ? "Refreshing" : "Refresh"}
      </button>
    </header>
  );
}

function StatLine({ stats, state }) {
  if (state === "loading")
    return <div style={{ marginTop: 18, height: 22, width: "60%", background: "var(--bg-raised)", borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite" }} />;
  const { needReply = 0, dueSoon = 0, high = 0 } = stats;
  return (
    <p style={{ marginTop: 16, fontSize: 17, color: "var(--ink-soft)", maxWidth: 720 }}>
      <strong style={{ color: "var(--now)", fontWeight: 700 }}>{high}</strong> need{high === 1 ? "s" : ""} you now{" · "}
      <strong style={{ color: "var(--ink)", fontWeight: 700 }}>{needReply}</strong> await{needReply === 1 ? "s" : ""} a reply{" · "}
      <strong style={{ color: "var(--ink)", fontWeight: 700 }}>{dueSoon}</strong> task{dueSoon === 1 ? "" : "s"} due within a week.
    </p>
  );
}

function Tabs({ tab, setTab, taskCount }) {
  const Btn = ({ id, label, badge }) => (
    <button onClick={() => setTab(id)} style={{
      background: "none", padding: "10px 2px", fontSize: 15, fontWeight: 600,
      color: tab === id ? "var(--ink)" : "var(--ink-faint)",
      borderBottom: tab === id ? "2px solid var(--brand)" : "2px solid transparent",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      {label}
      {badge != null && <span style={{ fontSize: 11, background: "var(--bg-raised)", color: "var(--ink-soft)", borderRadius: 20, padding: "1px 8px" }}>{badge}</span>}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 24, borderBottom: "1px solid var(--line)", marginTop: 34 }}>
      <Btn id="board" label="Triage board" />
      <Btn id="tasks" label="Tasks" badge={taskCount} />
    </div>
  );
}

function FilterBar({ q, setQ, cat, setCat, sent, setSent, count, total }) {
  const sel = { background: "var(--bg-raised)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 12px", fontSize: 13, fontFamily: "inherit" };
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "18px 0 4px" }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sender, subject, summary…" style={{ ...sel, flex: "1 1 260px", minWidth: 180 }} />
      <select value={cat} onChange={(e) => setCat(e.target.value)} style={sel}>
        <option value="ALL">All categories</option>
        {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select value={sent} onChange={(e) => setSent(e.target.value)} style={sel}>
        <option value="ALL">All sentiment</option>
        {Object.entries(SENTIMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <span style={{ fontSize: 12, color: "var(--ink-faint)", marginLeft: "auto" }}>{count} of {total}</span>
    </div>
  );
}

function Board({ grouped, onOpen }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 18 }} className="board">
      {COLUMNS.map((col) => (
        <div key={col.key}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: PRIORITY_VAR[col.key] }} />
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{col.title}</h3>
              <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{grouped[col.key].length}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginLeft: 16 }}>{col.sub}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {grouped[col.key].length === 0
              ? <div style={{ fontSize: 13, color: "var(--ink-faint)", padding: "18px 0", textAlign: "center", border: "1px dashed var(--line)", borderRadius: 10 }}>Nothing here</div>
              : grouped[col.key].map((r, i) => <Card key={r.id ?? r.message_id ?? i} row={r} idx={i} onOpen={onOpen} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ row, idx, onOpen }) {
  const pr = P(row.priority);
  const opacity = pr === "HIGH" ? 1 : pr === "MEDIUM" ? 0.7 : 0.4;
  return (
    <button onClick={() => onOpen(row)} className="card" style={{
      position: "relative", textAlign: "left", width: "100%",
      background: "var(--bg-card)", border: "1px solid var(--line)",
      borderRadius: 12, padding: "14px 15px 14px 20px", color: "var(--ink)",
      animation: `rise 0.4s ease ${Math.min(idx * 0.04, 0.4)}s both`,
      boxShadow: pr === "HIGH" ? "0 0 0 1px var(--now-glow)" : "none",
    }}>
      <span style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 4, borderRadius: 4, background: PRIORITY_VAR[pr], opacity }} />
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: "var(--bg-raised)", color: "var(--ink-soft)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>
          {initials(row.from_name, row.from_email)}
        </span>
        <span style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.from_name || row.from_email || "Unknown sender"}
        </span>
        {(row.needs_reply === true || row.needs_reply === "true") &&
          <span title="Needs a reply" style={{ marginLeft: "auto", fontSize: 10, color: "var(--now)", border: "1px solid var(--now)", borderRadius: 20, padding: "1px 7px", fontWeight: 600 }}>reply</span>}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, lineHeight: 1.3 }}>{row.subject || "(no subject)"}</div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.45, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {row.summary || "No summary."}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Chip>{CATEGORY_LABEL[C(row.category)] || "—"}</Chip>
        <span style={{ fontSize: 11, color: SENTIMENT_VAR[S(row.sentiment)] }}>● {SENTIMENT_LABEL[S(row.sentiment)]}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-faint)" }}>{fmtDate(row.received_at) || ""}</span>
      </div>
    </button>
  );
}

function Chip({ children }) {
  return <span style={{ fontSize: 11, color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 8px" }}>{children}</span>;
}

function Tasks({ tasks, onOpen, loading }) {
  if (loading) return <BoardSkeleton />;
  if (tasks.length === 0) return <EmptyBox title="No tasks yet" body="When the assistant finds an action item in an email, it appears here." />;
  const buckets = { overdue: [], week: [], later: [], undated: [] };
  for (const t of tasks) buckets[relativeDue(t.task_due).bucket].push(t);
  const order = [["overdue", "Overdue"], ["week", "This week"], ["later", "Later"], ["undated", "Undated"]];
  return (
    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 22 }}>
      {order.map(([k, label]) => buckets[k].length > 0 && (
        <div key={k}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: k === "overdue" ? "var(--now)" : "var(--ink-soft)", marginBottom: 10 }}>
            {label} <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>· {buckets[k].length}</span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {buckets[k].map((t, i) => {
              const rd = relativeDue(t.task_due);
              return (
                <button key={t.id ?? i} onClick={() => onOpen(t)} style={{ textAlign: "left", background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 15px", color: "var(--ink)", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: PRIORITY_VAR[P(t.priority)], flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{t.task_title}</span>
                  <span style={{ fontSize: 12, color: "var(--ink-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {t.subject}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: k === "overdue" ? "var(--now)" : "var(--ink-soft)", flexShrink: 0 }}>{rd.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Detail({ row, onClose }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const draft = row.draft_reply || "";
  const copy = async () => { try { await navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} };
  const pr = P(row.priority);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,26,45,0.5)", backdropFilter: "blur(3px)", display: "flex", justifyContent: "flex-end", zIndex: 50, animation: "fade 0.2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} className="drawer" style={{ width: "min(520px, 100%)", height: "100%", overflowY: "auto", background: "var(--bg-raised)", borderLeft: "1px solid var(--line)", padding: "26px 26px 60px", animation: "slideIn 0.28s cubic-bezier(.2,.7,.2,1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: PRIORITY_VAR[pr] }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_VAR[pr] }}>{PRIORITY_LABEL[pr]}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", color: "var(--ink-faint)", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <h2 className="display" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.2, marginBottom: 6 }}>{row.subject || "(no subject)"}</h2>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 18 }}>
          {row.from_name || "Unknown"} · <span className="mono">{row.from_email || "—"}</span> · {fmtDateTime(row.received_at)}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          <Chip>{CATEGORY_LABEL[C(row.category)] || "—"}</Chip>
          <span style={{ fontSize: 11, color: SENTIMENT_VAR[S(row.sentiment)], border: `1px solid ${SENTIMENT_VAR[S(row.sentiment)]}`, borderRadius: 6, padding: "2px 8px" }}>{SENTIMENT_LABEL[S(row.sentiment)]}</span>
          {(row.needs_reply === true || row.needs_reply === "true") &&
            <span style={{ fontSize: 11, color: "var(--now)", border: "1px solid var(--now)", borderRadius: 6, padding: "2px 8px" }}>Needs a reply</span>}
        </div>
        <Section label="Summary">{row.summary || "No summary."}</Section>
        {(row.task_title || "").trim() && (
          <Section label="Action item">{row.task_title}{row.task_due ? <span style={{ color: "var(--ink-faint)" }}> · due {fmtDate(row.task_due) || row.task_due}</span> : null}</Section>
        )}
        {draft ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Suggested reply</div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, fontSize: 14, color: "var(--ink)", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{draft}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
              <button onClick={copy} style={{ background: "var(--brand)", color: "var(--ink)", fontWeight: 700, fontSize: 13, borderRadius: 9, padding: "10px 18px" }}>{copied ? "Copied ✓" : "Copy reply"}</button>
              <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>Paste into your mail client — nothing sends automatically.</span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 8 }}>No reply drafted for this message.</div>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14.5, color: "var(--ink)", lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

function ErrorBar({ msg, onRetry }) {
  return (
    <div style={{ marginTop: 18, background: "rgba(214,69,69,0.08)", border: "1px solid rgba(214,69,69,0.35)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ color: "var(--negative)", fontSize: 13, flex: 1 }}>{msg} Check that the read-API workflow is active and the URL in your settings is correct.</span>
      <button onClick={onRetry} style={{ background: "var(--bg-raised)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 14px", fontSize: 13 }}>Retry</button>
    </div>
  );
}
function BoardSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 18 }} className="board">
      {[0, 1, 2].map((c) => (
        <div key={c} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ height: 120, background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 12, animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${(c + i) * 0.1}s` }} />)}
        </div>
      ))}
    </div>
  );
}
function EmptyAll() { return <EmptyBox title="No triaged email yet" body="Once the assistant processes your inbox, messages appear here, sorted by how much they need you." />; }
function EmptyFiltered({ onClear }) {
  return (
    <div style={{ textAlign: "center", padding: "50px 0", marginTop: 18 }}>
      <div style={{ fontSize: 15, color: "var(--ink-soft)", marginBottom: 12 }}>No messages match these filters.</div>
      <button onClick={onClear} style={{ background: "var(--bg-raised)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 18px", fontSize: 13 }}>Clear filters</button>
    </div>
  );
}
function EmptyBox({ title, body }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", marginTop: 18, border: "1px dashed var(--line)", borderRadius: 14 }}>
      <div className="display" style={{ fontSize: 22, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: "var(--ink-soft)", maxWidth: 420, margin: "0 auto" }}>{body}</div>
    </div>
  );
}

function deriveStats(rows) {
  const by = (v) => rows.filter((r) => P(r.priority) === v).length;
  const byDay = {}, byCategory = {}, bySentiment = { positive: 0, neutral: 0, negative: 0 };
  const now = new Date(), in7 = new Date(now.getTime() + 7 * 864e5), today = new Date(now.toDateString());
  let needReply = 0, dueSoon = 0;
  for (const r of rows) {
    if (r.received_at) { const d = new Date(r.received_at).toISOString().slice(0, 10); byDay[d] = (byDay[d] || 0) + 1; }
    const c = C(r.category) || "UNKNOWN"; byCategory[c] = (byCategory[c] || 0) + 1;
    const s = S(r.sentiment); if (s in bySentiment) bySentiment[s]++;
    if (r.needs_reply === true || r.needs_reply === "true") needReply++;
    if (r.task_title && r.task_due) { const d = new Date(r.task_due); if (d <= in7 && d >= today) dueSoon++; }
  }
  return { total: rows.length, high: by("HIGH"), medium: by("MEDIUM"), low: by("LOW"), needReply, dueSoon, byDay, byCategory, bySentiment };
}

const responsiveCss = `
@keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
.card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
.card:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
input::placeholder { color: var(--ink-faint); }
@media (max-width: 900px) {
  .charts-row { grid-template-columns: 1fr !important; }
  .board { grid-template-columns: 1fr !important; }
}
`;
