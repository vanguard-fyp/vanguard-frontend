import type { DisasterType } from '../types';

/**
 * Map an external hazard name (GDACS "Tropical Cyclone", "Forest Fire / Wildfire",
 * a prediction's hazard_type, …) to one of the incident disaster types.
 * Mirrors the backend's hazard families (app/services/intelligence/hazard_evidence.py).
 */
const RULES: [RegExp, DisasterType][] = [
  [/flash\s*flood/i, 'Flash Flood'],
  [/flood|banjir/i, 'Flood'],
  [/landslide|mudslide|tanah runtuh/i, 'Landslide'],
  [/haze|smoke|jerebu/i, 'Haze'],
  [/fire|wildfire|kebakaran/i, 'Forest Fire'],
  [/cyclone|typhoon|hurricane|storm|ribut/i, 'Severe Storm'],
  [/earthquake|seismic|gempa/i, 'Earthquake'],
  [/drought|kemarau/i, 'Drought'],
];

export function incidentTypeForHazard(name: string | null | undefined): DisasterType {
  const n = name ?? '';
  return RULES.find(([re]) => re.test(n))?.[1] ?? 'Other';
}
