import { describe, expect, it } from 'vitest';
import type { Incident } from '../types';
import { editedFieldVerification, factState } from '../utils/facts';

const incident = (over: Partial<Incident> = {}): Incident =>
  ({
    id: 'i1',
    affected_population: 0,
    casualties_count: 2,
    infrastructure_damage: 'None',
    accessibility_score: 50,
    weather_condition: null,
    field_verification: {},
    ...over,
  }) as Incident;

describe('factState (mirrors backend deterministic.fact_state)', () => {
  it('treats fields missing from field_verification as reported (legacy rows)', () => {
    expect(factState(incident(), 'casualties_count')).toBe('reported');
  });
  it('treats a null value as unknown', () => {
    expect(factState(incident(), 'weather_condition')).toBe('unknown');
  });
  it('lets explicit provenance win over the stored default', () => {
    const inc = incident({ field_verification: { affected_population: 'unknown', casualties_count: 'verified' } });
    expect(factState(inc, 'affected_population')).toBe('unknown'); // stored 0 is not a real zero
    expect(factState(inc, 'casualties_count')).toBe('verified');
  });
});

describe('editedFieldVerification', () => {
  it('marks only changed facts as reported and keeps the others', () => {
    const inc = incident({ field_verification: { casualties_count: 'verified' } });
    const out = editedFieldVerification(inc, { affected_population: 120, casualties_count: 2 });
    expect(out.affected_population).toBe('reported');
    expect(out.casualties_count).toBe('verified'); // unchanged value keeps its state
  });
  it('marks a fact cleared to null as unknown', () => {
    const inc = incident({ weather_condition: 'Rain' });
    expect(editedFieldVerification(inc, { weather_condition: null }).weather_condition).toBe('unknown');
  });
  it('does not mutate the incident', () => {
    const inc = incident({ field_verification: { casualties_count: 'verified' } });
    editedFieldVerification(inc, { casualties_count: 9 });
    expect(inc.field_verification).toEqual({ casualties_count: 'verified' });
  });
});
