import { describe, expect, it } from 'vitest';
import { activeResponses } from '../../utils/sosResponses';
import type { Incident, Mission } from '../../types';

const inc = (id: string, lat: number, status = 'Verified') =>
  ({ id, display_id: `INC-${id}`, title: id, status, coordinates: [lat, 102] }) as unknown as Incident;
const mission = (incident_id: string, status: string, teams: object[]) =>
  ({ id: `m-${incident_id}`, incident_id, status, teams }) as unknown as Mission;
const en = { name: 'BOMBA', assignment_status: 'En Route' };

describe('active responses for an SOS', () => {
  it('lists responses with a live team, nearest first', () => {
    const out = activeResponses([6.0, 102], [mission('far', 'In Progress', [en]), mission('near', 'Pending', [en])], [inc('far', 7), inc('near', 6.01)]);
    expect(out.map((r) => r.incidentId)).toEqual(['near', 'far']);
    expect(out[0].km).toBeLessThan(2);
    expect(out[0].teams).toEqual(['BOMBA']);
  });
  it('leaves out finished missions, withdrawn teams and closed incidents', () => {
    const out = activeResponses([6, 102], [
      mission('a', 'Completed', [en]),
      mission('b', 'In Progress', [{ name: 'X', assignment_status: 'Withdrawn' }]),
      mission('c', 'In Progress', [en]),
    ], [inc('a', 6), inc('b', 6), inc('c', 6, 'Resolved')]);
    expect(out).toEqual([]);
  });
});
