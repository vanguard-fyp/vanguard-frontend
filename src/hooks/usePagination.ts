import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Page } from '../types';

/** offset for a zero-based page index (pure; exported for tests). */
export const pageOffset = (pageIndex: number, pageSize: number) => Math.max(0, pageIndex) * Math.max(1, pageSize);

/** Number of pages for a total (at least 1). */
export const pageCount = (total: number, pageSize: number) => Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));

/** Clamp a page index after the total shrinks (e.g. filters changed or rows deleted). */
export const clampPage = (pageIndex: number, total: number, pageSize: number) =>
  Math.min(Math.max(0, pageIndex), pageCount(total, pageSize) - 1);

/**
 * Server-side pagination: requests one page at a time with {limit, offset} in the
 * query key. `filters` are part of the key; when they change the page resets to 0.
 */
export function usePaginatedQuery<T, F extends Record<string, unknown>>(
  baseKey: readonly unknown[],
  fetchPage: (args: F & { limit: number; offset: number }) => Promise<Page<T>>,
  filters: F,
  pageSize = 25
) {
  const [pageIndex, setPageIndex] = useState(0);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  // Reset to the first page whenever the filter set changes.
  useEffect(() => {
    setPageIndex(0);
  }, [filterKey]);

  const offset = pageOffset(pageIndex, pageSize);
  const query = useQuery({
    queryKey: [...baseKey, 'page', filterKey, pageSize, offset],
    queryFn: () => fetchPage({ ...filters, limit: pageSize, offset }),
    placeholderData: keepPreviousData,
  });

  const total = query.data?.total ?? 0;
  // If the total shrank below the current page, move back to the last valid page.
  useEffect(() => {
    if (query.data && pageIndex > 0 && offset >= total) {
      setPageIndex(clampPage(pageIndex, total, pageSize));
    }
  }, [query.data, total, offset, pageIndex, pageSize]);

  return {
    ...query,
    items: query.data?.items ?? [],
    total,
    pageIndex,
    pageSize,
    pageCount: pageCount(total, pageSize),
    setPageIndex,
  };
}

/** `value`, updated only after it has been stable for `delayMs` (for search boxes). */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Exact filtered total from a paginated endpoint (fetches one row). Used for
 * header counts so they stay correct without downloading the whole list.
 */
export function usePageTotal<F extends Record<string, unknown>>(
  baseKey: readonly unknown[],
  fetchPage: (args: F & { limit: number; offset: number }) => Promise<Page<unknown>>,
  filters: F
) {
  const filterKey = JSON.stringify(filters);
  return useQuery({
    queryKey: [...baseKey, 'total', filterKey],
    queryFn: async () => (await fetchPage({ ...filters, limit: 1, offset: 0 })).total,
  });
}

/** Map "" / "All" select values to undefined so they are not sent as filters. */
export const filterValue = (v: string | null | undefined): string | undefined =>
  v && v !== 'All' ? v : undefined;
