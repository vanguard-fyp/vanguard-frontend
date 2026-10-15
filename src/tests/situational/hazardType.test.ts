import { describe, expect, it } from 'vitest';
import { incidentTypeForHazard } from '../../utils/hazardType';

describe('external hazard → incident type', () => {
  it('maps GDACS and prediction hazard names to the nine incident types', () => {
    expect(incidentTypeForHazard('Tropical Cyclone')).toBe('Severe Storm');
    expect(incidentTypeForHazard('Forest Fire / Wildfire')).toBe('Forest Fire');
    expect(incidentTypeForHazard('Flash Flood')).toBe('Flash Flood');
    expect(incidentTypeForHazard('Flood')).toBe('Flood');
    expect(incidentTypeForHazard('Haze')).toBe('Haze');
    expect(incidentTypeForHazard('Drought')).toBe('Drought');
    expect(incidentTypeForHazard('Earthquake')).toBe('Earthquake');
    expect(incidentTypeForHazard('Volcanic Eruption')).toBe('Other');
    expect(incidentTypeForHazard('Tsunami')).toBe('Other');
    expect(incidentTypeForHazard(undefined)).toBe('Other');
  });
});
