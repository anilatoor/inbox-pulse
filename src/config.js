// ── Point this at your n8n read-API webhook ──
// Set VITE_TRIAGE_API in Vercel (Project → Settings → Environment Variables)
// to override without editing code. Falls back to the value below.
export const TRIAGE_API =
  import.meta.env.VITE_TRIAGE_API ||
  "https://anila092.app.n8n.cloud/webhook/triage-data";
