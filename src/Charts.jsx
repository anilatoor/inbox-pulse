import React from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";
import { CATEGORY_LABEL, SENTIMENT_LABEL, SENTIMENT_VAR } from "./lib";

const AXIS = { fontSize: 11, fill: "#8298b3", fontFamily: "Inter" };

function Panel({ title, hint, children }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--line)",
      borderRadius: "var(--radius)", padding: "18px 18px 8px", minWidth: 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h3>
        {hint && <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function CustomTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#ffffff", border: "1px solid var(--line)", borderRadius: 8,
      padding: "6px 10px", fontSize: 12, color: "var(--ink)", boxShadow: "var(--shadow)",
    }}>
      <div style={{ color: "var(--ink-soft)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{payload[0].value} email{payload[0].value === 1 ? "" : "s"}</div>
    </div>
  );
}

export function VolumeChart({ byDay }) {
  // last 30 calendar days, zero-filled
  const data = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    data.push({ day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count: byDay?.[key] || 0 });
  }
  const empty = data.every((d) => d.count === 0);
  return (
    <Panel title="Volume" hint="last 30 days">
      {empty ? <Empty /> : (
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={data} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00c2e0" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#00c2e0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={AXIS} interval={6} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
            <Tooltip content={<CustomTip />} cursor={{ stroke: "var(--line)" }} />
            <Area type="monotone" dataKey="count" stroke="#0f2a60" strokeWidth={2} fill="url(#vol)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

export function CategoryChart({ byCategory }) {
  const data = Object.entries(byCategory || {})
    .map(([k, v]) => ({ name: CATEGORY_LABEL[k] || k, value: v }))
    .sort((a, b) => b.value - a.value);
  const empty = data.length === 0;
  // single hue, varying by rank — categories stay quiet, no rainbow
  const shades = ["#0f2a60", "#133f7d", "#0e5f9c", "#0089b8", "#00abcf", "#00c2e0", "#00d9c8", "#00ffc2"];
  return (
    <Panel title="By category">
      {empty ? <Empty /> : (
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 8, bottom: 0 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={64} />
            <Tooltip content={<CustomTip />} cursor={{ fill: "rgba(15,42,96,0.05)" }} />
            <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={13}>
              {data.map((_, i) => <Cell key={i} fill={shades[i % shades.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

export function SentimentChart({ bySentiment }) {
  const data = Object.entries(bySentiment || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: SENTIMENT_LABEL[k], value: v, key: k }));
  const empty = data.length === 0;
  return (
    <Panel title="Sentiment">
      {empty ? <Empty /> : (
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={3} stroke="none">
              {data.map((d) => <Cell key={d.key} fill={SENTIMENT_VAR[d.key]?.replace("var(--positive)", "#00a37e").replace("var(--neutral)", "#5b7290").replace("var(--negative)", "#d64545")} />)}
            </Pie>
            <Tooltip content={<CustomTip />} />
          </PieChart>
        </ResponsiveContainer>
      )}
      {!empty && (
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", padding: "4px 0 10px" }}>
          {data.map((d) => (
            <span key={d.key} style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
              <i style={{ width: 8, height: 8, borderRadius: 2, background: d.key === "positive" ? "#00a37e" : d.key === "negative" ? "#d64545" : "#5b7290" }} />
              {d.name} {d.value}
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Empty() {
  return (
    <div style={{ height: 150, display: "grid", placeItems: "center", color: "var(--ink-faint)", fontSize: 13 }}>
      No data yet
    </div>
  );
}
