import type { Incident, Mission } from '../types';
import { distanceKm } from './mapLayers';

export interface ActiveResponse {
  incidentId: string;
  displayId: string;
  title: string;
  teams: string[];
  km: number | null;
}

const ACTIVE_ASSIGNMENTS = new Set(['Assigned', 'Accepted', 'En Route', 'On Scene']);

/** Incidents with a live mission and a committed team, nearest to the SOS first. */
export function activeResponses(
  point: readonly [number, number] | null | undefined,
  missions: Mission[],
  incidents: Incident[],
  limit = 6,
): ActiveResponse[] {
  const byIncident = new Map<string, ActiveResponse>();
  for (const m of missions) {
    if (m.status !== 'Pending' && m.status !== 'In Progress') continue;
    const inc = incidents.find((i) => i.id === m.incident_id);
    if (!inc || inc.status === 'Resolved' || inc.status === 'Rejected') continue;
    const teams = (((m as unknown as { teams?: { name?: string; assignment_status?: string }[] }).teams) ?? [])
      .filter((t) => ACTIVE_ASSIGNMENTS.has(t.assignment_status ?? ''))
      .map((t) => t.name ?? 'Team');
    if (!teams.length) continue;
    const seen = byIncident.get(inc.id);
    if (seen) {
      seen.teams.push(...teams);
      continue;
    }
    const km = point && inc.coordinates
      ? distanceKm({ lat: point[0], lng: point[1] }, { lat: inc.coordinates[0], lng: inc.coordinates[1] })
      : null;
    byIncident.set(inc.id, { incidentId: inc.id, displayId: inc.display_id ?? inc.id, title: inc.title, teams, km });
  }
  return [...byIncident.values()]
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity))
    .slice(0, limit);
}
