/**
 * Readable action-log details. New entries are written by the backend as
 * "Label: value · Label: value"; older entries were raw "field → value, …"
 * text that could contain Python/JSON objects. Both become a list of
 * {label, value} pairs; anything else stays plain text.
 */

export type LogDetail = { kind: 'text'; text: string } | { kind: 'changes'; items: { label: string; value: string }[] };

const LABELS: Record<string, string> = {
  title: 'Title',
  status: 'Status',
  severity: 'Severity',
  disaster_level: 'Disaster level',
  disaster_type_id: 'Disaster type',
  location: 'Location',
  district: 'District',
  state: 'State',
  affected_population: 'Affected people',
  casualties_count: 'Casualties',
  infrastructure_damage: 'Infrastructure damage',
  accessibility_score: 'Accessibility',
  weather_condition: 'Weather',
  rejection_reason: 'Rejection reason',
  description: 'Description',
  media_urls: 'Photos',
  field_verification: 'Fact checks',
  occurred_at: 'Occurred at',
  source: 'Source',
};
const HIDDEN = new Set(['updated_at', 'verified_by_user_id', 'resolved_by_user_id', 'administrative_area_id', 'resolved_at', 'verified_at']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_SPLIT = /,\s*(?=[a-z_]+ → )/;

const humanKey = (k: string) => LABELS[k] ?? k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Parse a Python repr or JSON object/array; null if it is not one. */
function parseObject(raw: string): unknown {
  const t = raw.trim();
  if (!/^[{[]/.test(t)) return null;
  try {
    return JSON.parse(t.replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false'));
  } catch {
    return null;
  }
}

function legacyValue(key: string, raw: string): string {
  const v = raw.trim();
  if (v === '' || v === 'None' || v === 'null') return 'cleared';
  if (key === 'description') return 'updated';
  if (UUID.test(v)) return 'changed';
  const obj = parseObject(v);
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    if (key === 'field_verification') {
      const groups: Record<string, string[]> = {};
      Object.entries(obj as Record<string, unknown>).forEach(([f, s]) => (groups[String(s)] ??= []).push(f.replace(/_/g, ' ')));
      return Object.entries(groups).map(([s, fs]) => `${s} ${fs.join(', ')}`).join('; ');
    }
    return 'updated';
  }
  if (Array.isArray(obj)) return key === 'media_urls' ? `${obj.length} attached` : `${obj.length} item(s)`;
  const n = Number(v);
  if (Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(v)) return key === 'accessibility_score' ? `${n}/100` : n.toLocaleString();
  return v.length > 80 ? `${v.slice(0, 77)}…` : v;
}

export function formatLogDetail(detail: string | null | undefined): LogDetail | null {
  const text = (detail ?? '').trim();
  if (!text) return null;

  // New format: "Severity: Critical · Status: Verified · Map pin moved"
  if (text.includes(' · ')) {
    return {
      kind: 'changes',
      items: text.split(' · ').map((part) => {
        const i = part.indexOf(': ');
        return i > 0 ? { label: part.slice(0, i), value: part.slice(i + 2) } : { label: part, value: '' };
      }),
    };
  }

  // Legacy format: "severity → Critical, field_verification → {...}, lat → 3.1"
  if (/^[a-z_]+ → /.test(text)) {
    const items: { label: string; value: string }[] = [];
    let pin = false;
    text.split(LEGACY_SPLIT).forEach((pair) => {
      const i = pair.indexOf(' → ');
      if (i < 0) return;
      const key = pair.slice(0, i).trim();
      if (HIDDEN.has(key)) return;
      if (key === 'lat' || key === 'lng') {
        pin = true;
        return;
      }
      items.push({ label: humanKey(key), value: legacyValue(key, pair.slice(i + 3)) });
    });
    if (pin) items.push({ label: 'Map pin moved', value: '' });
    return items.length ? { kind: 'changes', items } : null;
  }

  // A whole JSON / Python object.
  const obj = parseObject(text);
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const items = Object.entries(obj as Record<string, unknown>)
      .filter(([k]) => !HIDDEN.has(k))
      .map(([k, v]) => ({ label: humanKey(k), value: legacyValue(k, typeof v === 'string' ? v : JSON.stringify(v)) }));
    return items.length ? { kind: 'changes', items } : null;
  }
  return { kind: 'text', text };
}
