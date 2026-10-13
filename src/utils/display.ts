/**
 * Formatting helpers that NEVER render undefined / null / NaN / Infinity.
 * Missing values become an explicit label so officers can tell "unknown"
 * apart from a real zero.
 */
export const UNAVAILABLE = 'Unavailable';

export function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function fmtNumber(v: unknown, fallback = UNAVAILABLE): string {
  return isNum(v) ? v.toLocaleString() : fallback;
}

export function fmtScore(v: unknown, scale = 100, fallback = UNAVAILABLE): string {
  return isNum(v) ? `${Math.round(v)}/${scale}` : fallback;
}

export function fmtDecimal(v: unknown, digits = 1, unit = '', fallback = UNAVAILABLE): string {
  return isNum(v) ? `${v.toFixed(digits)}${unit}` : fallback;
}

export function fmtText(v: unknown, fallback = UNAVAILABLE): string {
  if (typeof v === 'string' && v.trim()) return v;
  return fallback;
}

/** "5 min ago" style freshness; returns null for invalid timestamps. */
export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function newIdempotencyKey(prefix = 'req'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${rand}`;
}
