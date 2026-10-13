import { describe, expect, it } from 'vitest';
import { UNAVAILABLE, fmtDecimal, fmtNumber, fmtScore, fmtText, isNum, newIdempotencyKey, relativeTime } from '../utils/display';

const BAD = [undefined, null, NaN, Infinity, -Infinity, '12', {}, []];
const leaks = (s: string) => /undefined|null|NaN|Infinity|\[object/.test(s);

describe('display formatters never leak undefined / null / NaN', () => {
  it('isNum accepts only finite numbers', () => {
    expect(isNum(0)).toBe(true);
    expect(isNum(-3.5)).toBe(true);
    for (const v of BAD) expect(isNum(v)).toBe(false);
  });

  it.each(BAD)('numeric formatters fall back to an explicit label for %p', (v) => {
    for (const out of [fmtNumber(v), fmtScore(v), fmtDecimal(v)]) {
      expect(out).toBe(UNAVAILABLE);
      expect(leaks(out)).toBe(false);
    }
  });

  it.each([undefined, null, NaN, '', '   ', {}, []])('fmtText falls back for %p', (v) => {
    expect(fmtText(v)).toBe(UNAVAILABLE);
  });

  it('keeps a real zero distinct from unknown', () => {
    expect(fmtNumber(0)).toBe('0');
    expect(fmtScore(0)).toBe('0/100');
    expect(fmtNumber(undefined)).toBe(UNAVAILABLE);
  });

  it('formats valid values', () => {
    expect(fmtScore(83.6)).toBe('84/100');
    expect(fmtScore(7, 10)).toBe('7/10');
    expect(fmtDecimal(3.14159, 2, ' km')).toBe('3.14 km');
    expect(fmtNumber(1234567)).toBe((1234567).toLocaleString());
    expect(fmtText('  ', 'Not reported')).toBe('Not reported');
    expect(fmtText('Heavy rain')).toBe('Heavy rain');
  });

  it('uses the supplied fallback', () => {
    expect(fmtScore(null, 100, 'No score')).toBe('No score');
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-10-10T12:00:00Z');
  it('returns null for missing or invalid timestamps', () => {
    expect(relativeTime(null, now)).toBeNull();
    expect(relativeTime(undefined, now)).toBeNull();
    expect(relativeTime('not a date', now)).toBeNull();
  });
  it('buckets elapsed time', () => {
    expect(relativeTime('2026-10-10T11:59:30Z', now)).toBe('just now');
    expect(relativeTime('2026-10-10T11:45:00Z', now)).toBe('15 min ago');
    expect(relativeTime('2026-10-10T09:00:00Z', now)).toBe('3 h ago');
    expect(relativeTime('2026-10-05T12:00:00Z', now)).toBe('5 d ago');
  });
  it('never reports negative time for clock skew', () => {
    expect(relativeTime('2026-10-10T12:05:00Z', now)).toBe('just now');
  });
});

describe('newIdempotencyKey', () => {
  it('is prefixed and unique', () => {
    const a = newIdempotencyKey('dispatch');
    const b = newIdempotencyKey('dispatch');
    expect(a.startsWith('dispatch-')).toBe(true);
    expect(a).not.toBe(b);
  });
});
