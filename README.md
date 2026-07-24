# Inbox Command — AI Email Executive Assistant UI

A React dashboard for the AI Email Executive Assistant. It reads triage results from an n8n webhook (which queries Supabase) and presents them as a priority board with charts, a tasks view, and a per-email detail drawer with the AI's suggested reply.

The app is a **pure frontend**. It holds no database credentials — it only calls one n8n webhook that returns JSON. Your Supabase keys stay inside n8n.

## Architecture

Gmail -> n8n triage workflow -> Supabase (email_triage table)
Supabase <- n8n Read-API workflow (GET /webhook/triage-data) <- this React app on Vercel

## The data contract

The app calls one endpoint and expects `{ rows: [...], stats: {...} }`.
`stats` is optional — if the endpoint returns only an array of rows or omits `stats`, the app computes everything client-side. So it works even against a plain Supabase-rows response.

Each row uses these fields: id, message_id, thread_id, from_email, from_name, subject,
priority (HIGH|MEDIUM|LOW), category (CLIENT|INTERNAL|SALES|SUPPORT|FINANCE|PERSONAL|NEWSLETTER|SPAM),
summary, sentiment (positive|neutral|negative), needs_reply, draft_reply, task_title, task_due, received_at.

## Configure the endpoint

The webhook URL is read from an environment variable, with a fallback in `src/config.js`.

Set it in Vercel: Project -> Settings -> Environment Variables
  VITE_TRIAGE_API = https://anila092.app.n8n.cloud/webhook/triage-data

For local dev, create `.env`:
  VITE_TRIAGE_API=https://anila092.app.n8n.cloud/webhook/triage-data

## Run locally

  npm install
  npm run dev      # http://localhost:5173

## Deploy to Vercel

Option A — from GitHub (recommended)
  1. Push this folder to a GitHub repo.
  2. In Vercel, "Add New -> Project", import the repo.
  3. Framework preset: Vite. Build: npm run build. Output: dist.
  4. Add the VITE_TRIAGE_API env var.
  5. Deploy.

Option B — Vercel CLI
  npm i -g vercel
  vercel
  vercel --prod

## The two n8n workflows

1. AI Email Executive Assistant — the triage workflow (writes to Supabase).
2. Email Triage — Read API — the GET webhook this UI reads. Path: /webhook/triage-data.
   Must be active/published for the UI to load data.

## Notes

- Priority is the only place saturated colour appears — the coral spine down each card's
  left edge encodes urgency at a glance.
- The app never sends email. The reply is a draft to copy into your mail client, matching
  the workflow's non-destructive design (SRS BR-01 / FR-20).
- Fully responsive; charts and board collapse to a single column under 900px.
