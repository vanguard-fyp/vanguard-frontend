import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataRegion } from '../../components/common/DataRegion';
import { SkeletonKPICard } from '../../components/ui/shared/SkeletonLoader';

describe('honest data states', () => {
  const render = (data: unknown, isError = false, isLoading = false) => renderToStaticMarkup(
    <DataRegion label="Inventory" queries={[{ data, isError, isLoading, refetch: vi.fn(), dataUpdatedAt: 1000 }]}>
      {isLoading ? <SkeletonKPICard /> : <p>Stored result</p>}
    </DataRegion>,
  );
  it('preserves the page skeleton during the first load', () => {
    expect(render(undefined, false, true)).toContain('shimmer_1.5s_infinite');
    expect(render(undefined, false, true)).not.toContain('Loading inventory');
    expect(render(undefined, false, true)).not.toContain('Stored result');
  });
  it('keeps a successful empty result distinct from an outage', () => {
    expect(render([])).toContain('Stored result');
    expect(render(undefined, true)).toContain('Inventory unavailable');
    expect(render(undefined, true)).not.toContain('Stored result');
  });
  it('labels retained results as stale and offers retry', () => {
    expect(render([{ count: 0 }], true)).toContain('may be out of date');
    expect(render([{ count: 0 }], true)).toContain('Stored result');
    expect(render([{ count: 0 }], true)).toContain('Retry');
  });
});
