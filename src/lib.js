// Map raw DB values to human labels — the UI never shows raw enums
export const PRIORITY_LABEL = { HIGH: "Needs you now", MEDIUM: "When you can", LOW: "Handled" };
export const PRIORITY_VAR = { HIGH: "var(--now)", MEDIUM: "var(--soon)", LOW: "var(--rest)" };
export const CATEGORY_LABEL = {
  CLIENT: "Client", INTERNAL: "Internal", SALES: "Sales", SUPPORT: "Support",
  FINANCE: "Finance", PERSONAL: "Personal", NEWSLETTER: "Newsletter", SPAM: "Spam",
};
export const SENTIMENT_LABEL = { positive: "Positive", neutral: "Neutral", negative: "Negative" };
export const SENTIMENT_VAR = { positive: "var(--positive)", neutral: "var(--neutral)", negative: "var(--negative)" };

export const P = (v) => (v || "LOW").toString().toUpperCase();
export const C = (v) => (v || "").toString().toUpperCase();
export const S = (v) => (v || "neutral").toString().toLowerCase();

export function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
export function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
export function initials(name, email) {
  const s = (name || email || "?").trim();
  const parts = s.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}
export function relativeDue(due) {
  if (!due) return { label: "Undated", bucket: "undated" };
  const d = new Date(due);
  if (isNaN(d)) return { label: "Undated", bucket: "undated" };
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today) / (24*3600*1000));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, bucket: "overdue" };
  if (diff === 0) return { label: "Due today", bucket: "week" };
  if (diff <= 7) return { label: `Due in ${diff}d`, bucket: "week" };
  return { label: fmtDate(due), bucket: "later" };
}
