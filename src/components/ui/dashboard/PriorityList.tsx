import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Incident } from '../../../types';
import { SEVERITY_EDGE, sevEdge } from '../../../constants/dashboard';
import { Bone } from './Panel';

/* ============================================================
   Active incidents ranked by AI priority (0–100), one row each in
   a single column. Rows are white; severity is only the thin
   border. The top few show up front; the rest open on demand.
   ============================================================ */

const TOP_COUNT = 5;

/** Key for the border colours. Lives in the panel header. */
export const SeverityLegend: React.FC = () => (
  <ul className="flex flex-wrap items-center justify-end gap-x-3 gap-y-0.5" aria-label="Severity colours">
    {Object.entries(SEVERITY_EDGE).map(([name, color]) => (
      <li key={name} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />{name}
      </li>
    ))}
  </ul>
);

interface PriorityListProps {
  incidents: Incident[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: Incident) => void;
  loading?: boolean;
}

export const PriorityList: React.FC<PriorityListProps> = ({ incidents, selectedIncidentId, onSelectIncident, loading }) => {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="space-y-2 px-5 pb-5" aria-busy="true" aria-label="Loading priorities">
        {[0, 1, 2, 3, 4].map((i) => <Bone key={i} className="block h-[42px] rounded-xl" />)}
      </div>
    );
  }
  const scored = incidents
    .filter((i) => i.ai_priority_score != null)
    .sort((a, b) => (b.ai_priority_score as number) - (a.ai_priority_score as number));

  if (scored.length === 0) {
    return <p className="px-6 pb-6 text-xs text-slate-400">No incidents scored yet. Scores appear once the hazard scan has run.</p>;
  }

  const shown = expanded ? scored : scored.slice(0, TOP_COUNT);

  return (
    <div className="pb-4">
      <ol className="space-y-2 px-5">
        {shown.map((inc, idx) => {
          const selected = selectedIncidentId === inc.id;
          return (
            <li key={inc.id}>
              <button type="button" onClick={() => onSelectIncident?.(inc)}
                aria-current={selected ? 'true' : undefined}
                title={`${inc.severity} severity`}
                style={{ boxShadow: selected ? '0 0 0 1.5px #2563eb' : `inset 0 0 0 1px ${sevEdge(inc.severity)}` }}
                className="w-full flex items-center gap-3 text-left rounded-xl bg-white hover:bg-slate-50 px-3.5 py-2.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <span className="w-4 shrink-0 text-xs font-semibold text-slate-400 tabular-nums">{idx + 1}</span>
                <span className="flex-1 min-w-0 text-xs font-semibold text-slate-800 truncate">
                  {inc.title}<span className="sr-only">, {inc.severity} severity</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-slate-900 tabular-nums">{inc.ai_priority_score}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-between gap-3 mt-3 px-6">
        <p className="text-[11px] text-slate-400">Score 0–100, highest first</p>
        {scored.length > TOP_COUNT && (
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 rounded cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600">
            {expanded ? 'Show top 5' : `Show all ${scored.length}`}
            <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
};
