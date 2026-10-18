import React from 'react';
import type { Incident } from '../../../types';
import { DASH, sevTone } from '../../../constants/dashboard';
import { Bone } from './Panel';

/* ============================================================
   Active incidents ranked by AI priority (0–100). Each row shows
   name, score, severity, place and people affected up front.
   ============================================================ */

interface PriorityListProps {
  incidents: Incident[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: Incident) => void;
  loading?: boolean;
}

export const PriorityList: React.FC<PriorityListProps> = ({ incidents, selectedIncidentId, onSelectIncident, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-1 px-4 pb-4" aria-busy="true" aria-label="Loading priorities">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-2.5 py-2.5">
            <Bone className="h-3 w-4" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between gap-4"><Bone className="h-3.5 w-3/5" /><Bone className="h-3.5 w-6" /></div>
              <Bone className="h-2.5 w-2/5" />
              <Bone className="h-1 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  const scored = incidents
    .filter((i) => i.ai_priority_score != null)
    .sort((a, b) => (b.ai_priority_score as number) - (a.ai_priority_score as number));

  if (scored.length === 0) {
    return <p className="px-6 pb-6 text-xs text-slate-400">No incidents scored yet. Scores appear once the hazard scan has run.</p>;
  }

  return (
    <ol className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 px-4 pb-4">
      {scored.map((inc, idx) => {
        const score = inc.ai_priority_score as number;
        const selected = selectedIncidentId === inc.id;
        const critical = inc.severity === 'Critical';
        return (
          <li key={inc.id}>
            <button type="button" onClick={() => onSelectIncident?.(inc)}
              aria-current={selected ? 'true' : undefined}
              className={`w-full text-left px-2.5 py-2.5 rounded-xl transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600
                ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4 shrink-0 tabular-nums">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-slate-900 truncate">{inc.title}</p>
                    <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">{score}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 min-w-0">
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: sevTone(inc.severity) }} />
                      <span className={critical ? 'text-red-700 font-semibold' : ''}>{inc.severity}</span>
                    </span>
                    <span className="truncate">· {inc.district} · {(inc.affected_population ?? 0).toLocaleString()} affected</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: DASH.track }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, score))}%`, background: critical ? DASH.critical : DASH.blue }} />
                  </div>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
};
