import { describe, expect, it } from 'vitest';
import { sortSosQueue } from '../../utils/sosQueue';

const at = (status: string, created_at: string, id: string) => ({ status, created_at, id });

describe('sortSosQueue', () => {
  it('puts unhandled requests first and the longest wait on top', () => {
    const out = sortSosQueue([
      at('Dispatched', '2026-11-10T01:00:00Z', 'd'),
      at('Pending', '2026-11-10T03:00:00Z', 'newer'),
      at('Acknowledged', '2026-11-10T00:00:00Z', 'a'),
      at('Pending', '2026-11-10T02:00:00Z', 'older'),
    ]);
    expect(out.map((r) => r.id)).toEqual(['older', 'newer', 'a', 'd']);
  });

  it('leaves closed requests last with the newest first', () => {
    const out = sortSosQueue([
      at('Resolved', '2026-11-09T00:00:00Z', 'old'),
      at('Cancelled', '2026-11-10T00:00:00Z', 'new'),
      at('Dispatched', '2026-11-01T00:00:00Z', 'open'),
    ]);
    expect(out.map((r) => r.id)).toEqual(['open', 'new', 'old']);
  });

  it('does not reorder the array it was given', () => {
    const input = [at('Resolved', '2026-11-09T00:00:00Z', 'x'), at('Pending', '2026-11-09T00:00:00Z', 'y')];
    sortSosQueue(input);
    expect(input[0].id).toBe('x');
  });
});
