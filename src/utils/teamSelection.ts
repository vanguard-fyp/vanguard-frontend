/**
 * Pure team-selection model for the dispatch wizard (unit-tested).
 *
 * Each selected team keeps its OWN personnel count and selection source so the
 * backend can persist one assignment row per team. Nothing here decides
 * availability: it only reads the backend-provided capacity fields.
 */
import type { RescueTeam } from '../types';

export type SelectionSource = 'ai' | 'officer';

export interface TeamSelectionItem {
  teamId: string;
  personnel: number;
  source: SelectionSource;
}

export type TeamAvailability = 'available' | 'partial' | 'committed' | 'ineligible' | 'unknown';

/** Available headcount for dispatch; null when the backend did not report capacity. */
export function availableOf(team: RescueTeam): number | null {
  if (team.eligible === false) return 0;
  return typeof team.available_personnel === 'number' ? team.available_personnel : null;
}

export function availabilityOf(team: RescueTeam): TeamAvailability {
  if (team.eligible === false || team.status === 'Off Duty' || team.status === 'Deleted') return 'ineligible';
  const avail = availableOf(team);
  if (avail === null) return 'unknown';
  if (avail <= 0) return 'committed';
  if (avail < team.personnel_count) return 'partial';
  return 'available';
}

export function addTeam(
  selection: TeamSelectionItem[],
  team: RescueTeam,
  source: SelectionSource,
  suggestedPersonnel?: number
): TeamSelectionItem[] {
  if (selection.some((s) => s.teamId === team.id)) return selection;
  const avail = availableOf(team);
  if (avail !== null && avail <= 0) return selection;
  const cap = avail ?? team.personnel_count;
  const wanted = suggestedPersonnel && suggestedPersonnel > 0 ? suggestedPersonnel : cap;
  return [...selection, { teamId: team.id, personnel: Math.max(1, Math.min(cap, wanted)), source }];
}

export function removeTeam(selection: TeamSelectionItem[], teamId: string): TeamSelectionItem[] {
  return selection.filter((s) => s.teamId !== teamId);
}

/** Update ONE team's count; other teams are never touched. Non-numeric input is ignored. */
export function setPersonnel(selection: TeamSelectionItem[], teamId: string, value: number): TeamSelectionItem[] {
  if (!Number.isFinite(value)) return selection;
  return selection.map((s) => (s.teamId === teamId ? { ...s, personnel: Math.max(1, Math.round(value)) } : s));
}

export interface SelectionValidation {
  ok: boolean;
  errors: Record<string, string>;
  totalPersonnel: number;
}

export function validateSelection(selection: TeamSelectionItem[], teams: RescueTeam[]): SelectionValidation {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const errors: Record<string, string> = {};
  for (const s of selection) {
    const team = byId.get(s.teamId);
    if (!team) {
      errors[s.teamId] = 'Team no longer exists.';
      continue;
    }
    const avail = availableOf(team);
    if (availabilityOf(team) === 'ineligible') errors[s.teamId] = 'Team is off duty or inactive.';
    else if (!Number.isInteger(s.personnel) || s.personnel < 1) errors[s.teamId] = 'Enter at least 1 person.';
    else if (avail !== null && s.personnel > avail) errors[s.teamId] = `Only ${avail} available.`;
    else if (s.personnel > team.personnel_count) errors[s.teamId] = `Team has ${team.personnel_count} personnel.`;
  }
  const totalPersonnel = selection.reduce((acc, s) => acc + (Number.isFinite(s.personnel) ? s.personnel : 0), 0);
  return { ok: selection.length > 0 && Object.keys(errors).length === 0, errors, totalPersonnel };
}

export function toDispatchTeams(selection: TeamSelectionItem[]) {
  return selection.map((s) => ({ team_id: s.teamId, personnel: s.personnel, source: s.source }));
}
