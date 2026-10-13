/**
 * Header search: one ranked list of incidents, resource requests and stock
 * items, each with the URL that opens that specific record.
 */
import type { Incident, ResourceItem, ResourceRequest } from '../types';

export type SearchKind = 'incident' | 'request' | 'stock';

export interface SearchHit {
  kind: SearchKind;
  id: string;
  code: string; // display id
  title: string;
  subtitle: string;
  tag?: string; // severity / status
  href: string;
}

/** 3 = exact id, 2 = id/title starts with, 1 = contains anywhere. */
function score(q: string, code: string, fields: (string | null | undefined)[]): number {
  const c = code.toLowerCase();
  if (c === q) return 3;
  const hay = fields.map((f) => (f ?? '').toLowerCase());
  if (c.startsWith(q) || hay[0]?.startsWith(q)) return 2;
  return c.includes(q) || hay.some((h) => h.includes(q)) ? 1 : 0;
}

export function searchAll(
  query: string,
  data: { incidents: Incident[]; requests: ResourceRequest[]; stock: ResourceItem[] },
  perKind = 5
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const ranked = <T,>(items: T[], s: (t: T) => number, hit: (t: T) => SearchHit) =>
    items
      .map((t) => ({ t, s: s(t) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, perKind)
      .map((x) => hit(x.t));

  const incidents = ranked(
    data.incidents,
    (i) => score(q, i.display_id ?? '', [i.title, i.district, i.state, i.location, i.type]),
    (i) => ({
      kind: 'incident',
      id: i.id,
      code: i.display_id ?? i.id.slice(0, 8).toUpperCase(),
      title: i.title,
      subtitle: `${i.district}, ${i.state} · ${i.status}`,
      tag: i.severity,
      href: `/situational/incidents/${i.id}`,
    })
  );
  const requests = ranked(
    data.requests,
    (r) => score(q, r.display_id ?? '', [r.item_requested, r.agency, r.district, r.warehouse_name, r.incident_display_id, r.supplier]),
    (r) => ({
      kind: 'request',
      id: r.id,
      code: r.display_id,
      title: `${r.item_requested ?? 'Supplies'} · ${r.quantity_requested.toLocaleString()} ${r.unit}`,
      subtitle: `${r.agency} → ${r.incident_display_id ?? r.warehouse_name ?? r.district}`,
      tag: r.status,
      href: `/response/resources?request=${encodeURIComponent(r.id)}`,
    })
  );
  const stock = ranked(
    data.stock,
    (s) => score(q, s.display_id ?? '', [s.name, s.category, s.warehouse_location]),
    (s) => ({
      kind: 'stock',
      id: s.id,
      code: s.display_id,
      title: s.name,
      subtitle: `${s.stock_level.toLocaleString()} ${s.unit} in stock${s.warehouse_location ? ` · ${s.warehouse_location}` : ''}`,
      tag: s.status,
      href: `/response/resources?item=${encodeURIComponent(s.id)}`,
    })
  );
  return [...incidents, ...requests, ...stock];
}
