import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

type DataQuery = {
  data: unknown;
  isError: boolean;
  isLoading?: boolean;
  dataUpdatedAt?: number;
  refetch: () => unknown;
};

export function DataRegion({ queries, label, children, keepContent = false }: { queries: DataQuery[]; label: string; children?: ReactNode; keepContent?: boolean }) {
  const failures = queries.filter((query) => query.isError);
  // Pages retain their own skeleton layouts; this guard handles failed reads.
  if (!failures.length) return <>{children}</>;
  const missing = failures.some((query) => query.data === undefined);
  const updated = Math.min(...failures.map((query) => query.dataUpdatedAt || 0));
  return (
    <section className="space-y-3 min-w-0" aria-label={label}>
      <div role="alert" className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <AlertCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-48">
          <p className="font-semibold text-sm">{label} {missing ? 'unavailable' : 'may be out of date'}</p>
          <p className="mt-1 text-sm leading-relaxed">{missing ? 'The server could not load this information. This does not mean that no records exist.' : 'Showing previously loaded information while updates are unavailable.'}</p>
          {!missing && updated > 0 && <p className="mt-1 text-xs">Last loaded: {new Date(updated).toLocaleString()}</p>}
        </div>
        <button type="button" onClick={() => failures.forEach((query) => { void query.refetch(); })} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-700 text-sm font-semibold hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2"><RefreshCw size={14} />Retry</button>
      </div>
      {(!missing || keepContent) && children}
    </section>
  );
}
