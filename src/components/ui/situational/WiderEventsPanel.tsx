import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { useWiderEvents } from '../../../hooks/useIntelligence';
import { fmtNumber } from '../../../utils/display';

/**
 * Related incidents grouped into one wider event (backend intelligence/events.py).
 * Each incident keeps its own score and declared level; this shows what they add
 * up to, and flags when the spread suggests a higher NADMA level.
 */
export const WiderEventsPanel: React.FC<{ onSelectIncident: (id: string) => void }> = ({ onSelectIncident }) => {
  const { data: events = [] } = useWiderEvents();
  const [open, setOpen] = useState<string | null>(null);
  if (!events.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
      <div className="flex items-center gap-2">
        <Layers size={15} className="text-indigo-600" />
        <h3 className="text-sm font-bold text-slate-900">Wider events</h3>
        <span className="text-[11px] text-slate-500">Related incidents scored together</span>
      </div>
      {events.map((ev) => {
        const isOpen = open === ev.id;
        return (
          <div key={ev.id} className={`border rounded-xl ${ev.under_declared ? 'border-red-200 bg-red-50/40' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : ev.id)}
              className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900">
                  {ev.title} · {ev.incident_count} incidents
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {ev.states.join(', ')}
                  {ev.affected_people ? ` · about ${fmtNumber(ev.affected_people)} people` : ''}
                </p>
                {ev.under_declared && (
                  <p className="text-[11px] font-semibold text-red-700 mt-0.5">
                    Declared {ev.declared_level ?? 'no level'}; its spread suggests {ev.suggested_level}.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {ev.combined_priority != null && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Combined</p>
                    <p className="text-sm font-black font-mono text-slate-900">{Math.round(ev.combined_priority)}</p>
                    {ev.highest_single_priority != null && (
                      <p className="text-[10px] text-slate-400">highest single {Math.round(ev.highest_single_priority)}</p>
                    )}
                  </div>
                )}
                {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </div>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-1">
                {ev.incidents.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => onSelectIncident(i.id)}
                    className="w-full text-left text-[11px] flex items-center justify-between gap-2 px-2 py-1 rounded-md hover:bg-white cursor-pointer"
                  >
                    <span className="truncate">
                      <span className="font-mono text-slate-400 mr-1.5">{i.display_id}</span>
                      {i.district}, {i.state} · {i.severity ?? 'severity not set'} · {i.disaster_level ?? 'no level'}
                    </span>
                    {i.priority_score != null && <span className="font-mono text-slate-600">{Math.round(i.priority_score)}</span>}
                  </button>
                ))}
                <p className="text-[10px] text-slate-400 pt-1">{ev.rule} Advisory only; declared levels are not changed.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
