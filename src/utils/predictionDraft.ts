/**
 * Turn a hazard prediction into a pre-filled "Report incident" form.
 * Only values the prediction actually carries are filled; modelled figures
 * (exposed population) go into the description, never into reported facts.
 */
import type { DisasterLevel, DisasterType, SeverityLevel } from '../types';
import type { HazardPrediction } from '../types/intelligence';
import { incidentTypeForHazard } from './hazardType';

export interface PredictionDraft {
  title: string;
  type: DisasterType;
  state: string;
  district: string;
  location: string;
  lat: string;
  lng: string;
  severity: SeverityLevel;
  level: DisasterLevel;
  weather: string;
  description: string;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The measured / forecast readings behind the prediction, as short phrases. */
export function predictionReadings(p: Pick<HazardPrediction, 'hazard_type' | 'signals'>): string[] {
  const s = (p.signals ?? {}) as Record<string, unknown>;
  const out: string[] = [];
  if (num(s.peak_aqi) != null) out.push(`AQI ${s.peak_aqi}${s.aqi_category ? ` (${s.aqi_category})` : ''}`);
  if (num(s.peak_pm25_24h_ugm3) != null) out.push(`PM2.5 ${s.peak_pm25_24h_ugm3} µg/m³`);
  if (num(s.rainfall_24h_mm) != null) out.push(`${s.rainfall_24h_mm} mm rain in 24 h`);
  if (num(s.rainfall_72h_mm) != null) out.push(`${s.rainfall_72h_mm} mm rain in 72 h`);
  if (num(s.heaviest_hour_mm) != null) out.push(`heaviest hour ${s.heaviest_hour_mm} mm`);
  if (num(s.river_peak_vs_today) != null) out.push(`river flow forecast ${s.river_peak_vs_today}× today`);
  if (num(s.rain_past_7d_mm) != null) out.push(`${s.rain_past_7d_mm} mm rain in the past 7 days`);
  if (num(s.max_gust_kmh) != null) out.push(`gusts up to ${Math.round(s.max_gust_kmh as number)} km/h`);
  if (num(s.fire_detections_24h) != null && (s.fire_detections_24h as number) > 0) out.push(`${s.fire_detections_24h} satellite fire detections in 24 h`);
  if (num(s.hot_dry_hours) != null) out.push(`${s.hot_dry_hours} hot, dry hours`);
  if (num(s.rain_past_30d_mm) != null) out.push(`${s.rain_past_30d_mm} mm rain in the past 30 days`);
  if (num(s.river_vs_usual) != null) out.push(`river at ${Math.round((s.river_vs_usual as number) * 100)}% of usual`);
  if (s.alert_level) out.push(`GDACS ${String(s.alert_level)} alert`);
  return out;
}

export function predictionToDraft(p: HazardPrediction): PredictionDraft {
  const type = incidentTypeForHazard(p.hazard_type);
  const s = (p.signals ?? {}) as Record<string, unknown>;
  const districts = Array.isArray(s.districts_affected) ? (s.districts_affected as string[]).filter(Boolean) : [];
  const score = num(p.hazard_score) ?? 0;
  const readings = predictionReadings(p);
  const place = [p.district, p.state].filter(Boolean).join(', ');
  const when = num(p.projected_within_hours);

  const lines = [
    p.advisory?.trim() || `Early warning: ${type.toLowerCase()} forecast for ${place || 'the area'}.`,
    '',
    `Prediction basis: ${readings.length ? readings.join('; ') : 'see the prediction record'}.`,
    when != null ? `Expected: ${when === 0 ? 'now' : `within about ${when} h`}.` : '',
    districts.length > 1 ? `Districts affected: ${districts.join(', ')}.` : '',
    num(p.exposed_population) != null
      ? `About ${(p.exposed_population as number).toLocaleString()} residents in the affected district(s) (population figure, not a count of victims).`
      : '',
    `Hazard score ${Math.round(score)}/100, confidence ${num(p.confidence) ?? 'unknown'}%. To be confirmed on the ground.`,
  ];

  return {
    title: `Predicted ${type.toLowerCase()} – ${place || 'unconfirmed location'}`,
    type,
    state: p.state ?? '',
    district: p.district ?? '',
    location: place,
    lat: p.lat != null ? String(p.lat) : '',
    lng: p.lng != null ? String(p.lng) : '',
    severity: score >= 80 ? 'Critical' : score >= 65 ? 'High' : 'Medium',
    // Suggested from spread; the officer confirms the declared level.
    level: score >= 80 || districts.length >= 3 ? 'Level 2: State' : 'Level 1: District',
    weather: readings.some((r) => !r.startsWith('GDACS'))
      ? `Forecast: ${readings.filter((r) => !r.startsWith('GDACS')).slice(0, 3).join(', ')}`
      : '',
    description: lines.filter((l, i) => l !== '' || i === 1).join('\n'),
  };
}
