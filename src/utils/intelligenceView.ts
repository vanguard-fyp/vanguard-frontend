/**
 * Pure view-model helpers for the Disaster Intelligence detail page.
 * Every value comes from the persisted incident / assessment; nothing is
 * interpolated or synthesised here.
 */
import type { ForecastBlock, ImpactSnapshot, PriorityFactor } from '../types';

const HOUR = 3_600_000;

/**
 * Confirmed impact snapshots followed by the assessment's projected points, in
 * the ImpactSnapshot shape used by the Impact Progression chart. Projected points
 * are placed at ``anchorIso + hour_offset`` and flagged ``is_predicted``.
 */
export function buildPredictiveTimeline(
  snapshots: ImpactSnapshot[] | null | undefined,
  forecast: Partial<ForecastBlock> | null | undefined,
  anchorIso: string | null | undefined
): ImpactSnapshot[] {
  const confirmed = (snapshots ?? [])
    .filter((s) => !s.is_predicted && Number.isFinite(Date.parse(s.timestamp)))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const anchor = anchorIso ? Date.parse(anchorIso) : NaN;
  if (forecast?.status !== 'ok' || !Number.isFinite(anchor)) return confirmed;
  const lastConfirmedT = confirmed.length ? Date.parse(confirmed[confirmed.length - 1].timestamp) : -Infinity;
  const projected: ImpactSnapshot[] = (forecast.points ?? [])
    .filter((p) => typeof p.estimated_exposed_population === 'number')
    .map((p) => ({
      timestamp: new Date(anchor + p.hour_offset * HOUR).toISOString(),
      affected_population: p.estimated_exposed_population as number,
      is_predicted: true,
      stage: `+${p.hour_offset} h`,
      note: p.driver_note ?? (p.cumulative_precip_mm != null ? `${p.cumulative_precip_mm} mm forecast rain by then` : undefined),
    }))
    .filter((p) => Date.parse(p.timestamp) > lastConfirmedT);
  return [...confirmed, ...projected];
}

/** Factors ordered by their contribution to the score (largest first). */
export function rankingDrivers(factors: PriorityFactor[] | null | undefined): PriorityFactor[] {
  return [...(factors ?? [])].sort((a, b) => b.points - a.points);
}

/** Plain-language input for a factor, e.g. "34,500 people", "Severe", "not reported (default used)". */
export function factorInputText(f: PriorityFactor): string {
  if (f.source === 'default') return 'not reported (default used)';
  const v = f.input;
  if (v == null || v === '') return 'not reported';
  if (typeof v === 'number') {
    if (f.key === 'population') return `${v.toLocaleString()} people`;
    if (f.key === 'casualties') return `${v.toLocaleString()} casualties`;
    if (f.key === 'access') return `access score ${v}/100`;
    return v.toLocaleString();
  }
  return String(v);
}
