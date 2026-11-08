import React from 'react';
import { useReliefCentres } from '../../../hooks';

/** One line (with an expandable list) when JKM has relief centres open in this district. */
export const ReliefCentresLine: React.FC<{ state?: string | null; district?: string | null }> = ({ state, district }) => {
  const { data } = useReliefCentres({ state: state ?? undefined, district: district ?? undefined }, !!state && !!district);
  const summary = data?.summary;
  if (!data?.available || !summary?.open) return null;
  return (
    <details className="rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 text-xs text-slate-600">
      <summary className="cursor-pointer">
        <span className="font-semibold text-slate-900">JKM: </span>
        {summary.open} relief centre{summary.open === 1 ? '' : 's'} open · {summary.victims.toLocaleString()} victims in centres
        {summary.nearly_full > 0 && <span className="text-red-700"> · {summary.nearly_full} nearly full</span>}
      </summary>
      <ul className="mt-2 space-y-1">
        {data.centres.map((c) => (
          <li key={c.id} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">{c.name}</span>
            <span className="shrink-0 tabular-nums">{c.victims} · {c.capacity_pct}% full</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-400">Counts only people who reached a centre. Source: {data.source}.</p>
    </details>
  );
};
