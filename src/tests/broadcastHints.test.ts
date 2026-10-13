import { describe, expect, it } from 'vitest';
import { broadcastHints } from '../utils/broadcastHints';

describe('broadcast title hints', () => {
  it('reads hazard, category and severity from the title', () => {
    const h = broadcastHints('MANDATORY EVACUATION ORDER FOR KOTA BHARU FLOOD ZONES')!;
    expect(h.hazard).toBe('flood');
    expect(h.category).toBe('Evacuation Order');
    expect(h.severity).toBe('Critical');
    expect(h.include[0]).toMatch(/what to bring/);
  });

  it('understands Malay keywords', () => {
    const h = broadcastHints('Amaran jerebu di Kuching')!;
    expect(h.hazard).toBe('haze');
    expect(h.category).toBe('Emergency Alert');
    expect(h.include.join(' ')).toMatch(/N95/);
  });

  it('suggests nothing for very short or unclear titles', () => {
    expect(broadcastHints('Hi')).toBeNull();
    const h = broadcastHints('Community briefing')!;
    expect(h.hazard).toBe('other');
    expect(h.category).toBeNull();
    expect(h.severity).toBeNull();
  });
});
