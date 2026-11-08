/* ============================================================
   Dashboard palette: neutral surfaces, one blue for data and
   interaction, red reserved for Critical. Nothing else gets a hue.
   ============================================================ */

export const DASH = {
  ink: '#0f172a',
  inkSoft: '#475569',
  inkFaint: '#94a3b8',
  rule: '#e2e8f0',
  track: '#eef2f6',
  blue: '#2563eb',
  blueSoft: '#eff4ff',
  blueMid: '#bfd3fb',
  critical: '#dc2626',
  criticalSoft: '#fdf0f0',
} as const;

/**
 * Per-card hues. Three neighbours on the wheel around the app's blue
 * (indigo, blue, cyan) so the cards read as one family; red stays the
 * single warm colour and means "act now".
 */
export const ACCENT = {
  incident: '#dc2626',
  people: '#4f46e5',
  team: '#2563eb',
  mission: '#0891b2',
} as const;

/** Category hues for supplies: the same cool family, plus slate for the rest. */
export const CATEGORY = ['#1e40af', '#3b82f6', '#06b6d4', '#818cf8', '#94a3b8'];

/** Severity as colour, in the app's severity hues. Lists rely on this alone, so the legend must stay beside them. */
export const SEVERITY_TONE: Record<string, string> = {
  Critical: DASH.critical,
  High: '#ea580c',
  Medium: '#f59e0b',
  Low: '#94a3b8',
};

/** Severity as a thin border on an otherwise white row, and the matching legend dot. */
export const SEVERITY_EDGE: Record<string, string> = {
  Critical: '#ef9a9a',
  High: '#f3b37f',
  Medium: '#ecc96a',
  Low: '#d5dde7',
};

export const sevEdge = (s?: string | null) => SEVERITY_EDGE[s ?? ''] ?? SEVERITY_EDGE.Low;

export const sevTone = (s?: string | null) => SEVERITY_TONE[s ?? ''] ?? DASH.inkFaint;

/** Shared recharts tooltip look. */
export const CHART_TOOLTIP = {
  contentStyle: { fontSize: 12, borderRadius: 10, border: `1px solid ${DASH.rule}`, boxShadow: '0 6px 20px -8px rgba(15,23,42,.18)', padding: '6px 10px' },
  labelStyle: { color: DASH.inkSoft, marginBottom: 2 },
  itemStyle: { color: DASH.ink, padding: 0 },
  cursor: { fill: 'rgba(37,99,235,0.06)' },
} as const;
