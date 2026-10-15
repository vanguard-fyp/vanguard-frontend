import { describe, expect, it } from 'vitest';
import { searchAll } from '../../utils/globalSearch';

const inc = (over: Record<string, unknown>) =>
  ({ id: 'i1', display_id: 'INC-2026-001', title: 'River flooding', district: 'Kota Bharu', state: 'Kelantan', status: 'Responding', severity: 'Critical', location: '', type: 'Flood', ...over }) as never;
const req = (over: Record<string, unknown>) =>
  ({ id: 'r1', display_id: 'REQ-2026-001', item_requested: 'Food packs', quantity_requested: 1500, unit: 'boxes', agency: 'APM', district: 'Kota Bharu', status: 'Pending Approval', incident_display_id: 'INC-2026-001', ...over }) as never;
const item = (over: Record<string, unknown>) =>
  ({ id: 's1', display_id: 'RES-001', name: 'Rescue boats', category: 'Vehicles', unit: 'boats', stock_level: 4, status: 'Low Stock', warehouse_location: 'Temerloh', ...over }) as never;

describe('header search', () => {
  it('links every hit to its specific record', () => {
    const hits = searchAll('kota', { incidents: [inc({})], requests: [req({})], stock: [] });
    expect(hits.map((h) => h.href)).toEqual(['/situational/incidents/i1', '/response/resources?request=r1']);
  });

  it('ranks an exact id above partial matches', () => {
    const hits = searchAll('req-2026-002', {
      incidents: [],
      requests: [req({}), req({ id: 'r2', display_id: 'REQ-2026-002' })],
      stock: [],
    });
    expect(hits[0].id).toBe('r2');
  });

  it('finds stock items and ignores 1-letter queries', () => {
    expect(searchAll('boat', { incidents: [], requests: [], stock: [item({})] })[0].href).toBe('/response/resources?item=s1');
    expect(searchAll('b', { incidents: [inc({})], requests: [], stock: [item({})] })).toEqual([]);
  });
});
