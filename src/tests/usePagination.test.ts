import { describe, expect, it } from 'vitest';
import { clampPage, filterValue, pageCount, pageOffset } from '../hooks/usePagination';

describe('pagination helpers', () => {
  it('computes offsets and guards negative input', () => {
    expect(pageOffset(0, 10)).toBe(0);
    expect(pageOffset(3, 10)).toBe(30);
    expect(pageOffset(-1, 10)).toBe(0);
    expect(pageOffset(2, 0)).toBe(2); // page size is at least 1
  });

  it('always reports at least one page', () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(10, 10)).toBe(1);
    expect(pageCount(11, 10)).toBe(2);
    expect(pageCount(-5, 10)).toBe(1);
  });

  it('clamps the page index after the total shrinks', () => {
    expect(clampPage(5, 23, 10)).toBe(2);
    expect(clampPage(1, 0, 10)).toBe(0);
    expect(clampPage(-2, 50, 10)).toBe(0);
    expect(clampPage(1, 50, 10)).toBe(1);
  });

  it('every row lands on exactly one page', () => {
    const total = 47;
    const size = 10;
    const seen: number[] = [];
    for (let p = 0; p < pageCount(total, size); p++) {
      const start = pageOffset(p, size);
      for (let i = start; i < Math.min(total, start + size); i++) seen.push(i);
    }
    expect(seen).toEqual(Array.from({ length: total }, (_, i) => i));
  });

  it('does not send "All" or empty filters to the API', () => {
    expect(filterValue('All')).toBeUndefined();
    expect(filterValue('')).toBeUndefined();
    expect(filterValue(null)).toBeUndefined();
    expect(filterValue('Critical')).toBe('Critical');
  });
});
