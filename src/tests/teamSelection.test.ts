import { describe, expect, it } from 'vitest';
import type { RescueTeam } from '../types';
import {
  addTeam,
  availabilityOf,
  availableOf,
  removeTeam,
  setPersonnel,
  toDispatchTeams,
  validateSelection,
} from '../utils/teamSelection';

const team = (id: string, over: Partial<RescueTeam> = {}): RescueTeam =>
  ({ id, name: id, personnel_count: 10, status: 'Available', available_personnel: 10, eligible: true, ...over }) as RescueTeam;

describe('availability (reads backend capacity only)', () => {
  it('classifies teams', () => {
    expect(availabilityOf(team('a'))).toBe('available');
    expect(availabilityOf(team('a', { available_personnel: 4 }))).toBe('partial');
    expect(availabilityOf(team('a', { available_personnel: 0 }))).toBe('committed');
    expect(availabilityOf(team('a', { status: 'Off Duty' }))).toBe('ineligible');
    expect(availabilityOf(team('a', { eligible: false }))).toBe('ineligible');
    expect(availabilityOf(team('a', { available_personnel: undefined }))).toBe('unknown');
  });
  it('never invents a headcount when capacity is unreported', () => {
    expect(availableOf(team('a', { available_personnel: undefined }))).toBeNull();
    expect(availableOf(team('a', { eligible: false }))).toBe(0);
  });
});

describe('selection', () => {
  it('adds a team capped at its available personnel, once', () => {
    let sel = addTeam([], team('a', { available_personnel: 6 }), 'ai', 8);
    expect(sel).toEqual([{ teamId: 'a', personnel: 6, source: 'ai' }]);
    sel = addTeam(sel, team('a'), 'officer');
    expect(sel).toHaveLength(1);
  });
  it('refuses a fully committed team', () => {
    expect(addTeam([], team('a', { available_personnel: 0 }), 'officer')).toEqual([]);
  });
  it('defaults to all available personnel when no suggestion is given', () => {
    expect(addTeam([], team('a', { available_personnel: 7 }), 'officer')[0].personnel).toBe(7);
  });
  it('updates only the targeted team and ignores non-numeric input', () => {
    const sel = [
      { teamId: 'a', personnel: 3, source: 'ai' as const },
      { teamId: 'b', personnel: 5, source: 'officer' as const },
    ];
    const next = setPersonnel(sel, 'a', 4.6);
    expect(next.map((s) => s.personnel)).toEqual([5, 5]);
    expect(setPersonnel(sel, 'a', NaN)).toBe(sel);
    expect(setPersonnel(sel, 'a', -2)[0].personnel).toBe(1);
  });
  it('removes a team', () => {
    expect(removeTeam([{ teamId: 'a', personnel: 1, source: 'ai' }], 'a')).toEqual([]);
  });
});

describe('validateSelection', () => {
  const teams = [team('a', { available_personnel: 4 }), team('b', { status: 'Off Duty' })];
  it('flags over-capacity, ineligible and missing teams per team', () => {
    const v = validateSelection(
      [
        { teamId: 'a', personnel: 5, source: 'ai' },
        { teamId: 'b', personnel: 1, source: 'officer' },
        { teamId: 'gone', personnel: 1, source: 'officer' },
      ],
      teams
    );
    expect(v.ok).toBe(false);
    expect(v.errors.a).toBe('Only 4 available.');
    expect(v.errors.b).toMatch(/off duty/i);
    expect(v.errors.gone).toMatch(/no longer exists/);
    expect(v.totalPersonnel).toBe(7);
  });
  it('accepts a valid selection and rejects an empty one', () => {
    expect(validateSelection([{ teamId: 'a', personnel: 4, source: 'ai' }], teams).ok).toBe(true);
    expect(validateSelection([], teams).ok).toBe(false);
  });
  it('maps to the dispatch payload shape', () => {
    expect(toDispatchTeams([{ teamId: 'a', personnel: 2, source: 'officer' }])).toEqual([
      { team_id: 'a', personnel: 2, source: 'officer' },
    ]);
  });
});
