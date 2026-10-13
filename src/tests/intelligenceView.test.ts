import { describe, expect, it } from 'vitest';
import type { ForecastBlock, PriorityFactor } from '../types';
import { buildPredictiveTimeline, factorInputText, rankingDrivers } from '../utils/intelligenceView';

const snaps = [
  { timestamp: '2026-08-01T13:22:00Z', affected_population: 4200 },
  { timestamp: '2026-08-01T15:00:00Z', affected_population: 12000 },
];
const forecast = (over: Partial<ForecastBlock> = {}): ForecastBlock => ({
  status: 'ok',
  baseline_source: 'reported',
  baseline_population: 12000,
  points: [
    { hour_offset: 0, estimated_exposed_population: 12000 },
    { hour_offset: 24, estimated_exposed_population: 18000, cumulative_precip_mm: 30 },
  ],
  ...over,
});

describe('ranking drivers', () => {
  const f = (key: string, points: number, extra: Partial<PriorityFactor> = {}): PriorityFactor => ({
    key, label: key, factor: 0.5, weight: 0.1, points, ...extra,
  });

  it('orders factors by contribution', () => {
    expect(rankingDrivers([f('a', 3), f('b', 25), f('c', 10)]).map((x) => x.key)).toEqual(['b', 'c', 'a']);
    expect(rankingDrivers(undefined)).toEqual([]);
  });

  it('describes inputs plainly and flags defaults', () => {
    expect(factorInputText(f('population', 1, { input: 34500, source: 'reported' }))).toBe('34,500 people');
    expect(factorInputText(f('access', 1, { input: 35 }))).toBe('access score 35/100');
    expect(factorInputText(f('urgency', 1, { input: 'Medium', source: 'default' }))).toBe('not reported (default used)');
    expect(factorInputText(f('weather', 1, { input: null }))).toBe('not reported');
  });
});

describe('buildPredictiveTimeline', () => {
  it('appends projected points after the confirmed history, flagged as predicted', () => {
    const t = buildPredictiveTimeline(snaps, forecast(), '2026-08-01T16:00:00Z');
    expect(t.map((p) => [p.affected_population, !!p.is_predicted])).toEqual([
      [4200, false],
      [12000, false],
      [12000, true],
      [18000, true],
    ]);
    expect(t[3].timestamp).toBe('2026-08-02T16:00:00.000Z');
    expect(t[3].note).toBe('30 mm forecast rain by then');
  });

  it('returns only confirmed history when there is no usable forecast', () => {
    expect(buildPredictiveTimeline(snaps, forecast({ status: 'unavailable' }), '2026-08-01T16:00:00Z')).toHaveLength(2);
    expect(buildPredictiveTimeline(snaps, forecast(), null)).toHaveLength(2);
  });
});
