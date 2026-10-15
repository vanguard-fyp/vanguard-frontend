import { describe, expect, it } from 'vitest';
import type { HazardPrediction } from '../../types/intelligence';
import { predictionToDraft } from '../../utils/predictionDraft';

const base: HazardPrediction = {
  id: 'p1', prediction_key: 'landslide:Perak', version: 1, hazard_type: 'Landslide', state: 'Perak', district: 'Kampar',
  lat: 4.31, lng: 101.15, hazard_score: 66, confidence: 40, projected_within_hours: 49, exposed_population: 120000,
  signals: { rainfall_72h_mm: 85.3, rain_past_7d_mm: 92, elevation_m: 206, districts_affected: ['Kampar', 'Selama'] },
  evidence: [], uncertainty: [], advisory: 'Heavy rain on soaked slopes.', advisory_source: 'llm', status: 'active',
  generated_at: '2026-10-15T00:00:00Z',
};

describe('prediction → incident form', () => {
  it('fills type, place, pin, severity, forecast weather and a full description', () => {
    const d = predictionToDraft(base);
    expect(d.type).toBe('Landslide');
    expect(d.title).toBe('Predicted landslide – Kampar, Perak');
    expect([d.state, d.district, d.lat, d.lng]).toEqual(['Perak', 'Kampar', '4.31', '101.15']);
    expect(d.severity).toBe('High');
    expect(d.level).toBe('Level 1: District');
    expect(d.weather).toBe('Forecast: 85.3 mm rain in 72 h, 92 mm rain in the past 7 days');
    expect(d.description).toContain('Heavy rain on soaked slopes.');
    expect(d.description).toContain('within about 49 h');
    expect(d.description).toContain('Districts affected: Kampar, Selama.');
    expect(d.description).toContain('120,000 residents');
  });

  it('maps GDACS names and leaves weather empty when only an alert level is known', () => {
    const d = predictionToDraft({ ...base, hazard_type: 'Tropical Cyclone', hazard_score: 85, signals: { alert_level: 'Orange' } });
    expect(d.type).toBe('Severe Storm');
    expect(d.severity).toBe('Critical');
    expect(d.weather).toBe('');
    expect(d.description).toContain('GDACS Orange alert');
  });
});
