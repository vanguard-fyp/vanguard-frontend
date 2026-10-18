import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useWiderEvents } from '../../../hooks/useIntelligence';
import { fmtNumber } from '../../../utils/display';
import { LevelTag, Tag } from '../shared/Tag';

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
    <section className="bg-white border border-slate-200/80 rounded-2xl">
      <header className="px-5 sm:px-6 pt-5 pb-3.5 border-b border-slate-100 flex flex-col items-start justify-between gap-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Wider events</h2>
        <span className="text-[11px] text-slate-400">Related incidents scored together</span>
      </header>
      <ul className="divide-y divide-slate-100">
        {events.map((ev) => {
          const isOpen = open === ev.id;
          return (
            <li key={ev.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : ev.id)}
                className="w-full text-left px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {ev.title} <span className="font-normal text-slate-400">· {ev.incident_count} incidents</span>
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {ev.states.join(', ')}
                    {ev.affected_people ? ` · about ${fmtNumber(ev.affected_people)} people` : ''}
                  </p>
                  {ev.under_declared && (
                    <div className="mt-1.5 flex flex-wrap">
                      <Tag tone="red">Declared {ev.declared_level ?? 'no level'}, spread suggests {ev.suggested_level}</Tag>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  {ev.combined_priority != null && (
                    <div className="text-left sm:text-right">
                      <div className="flex items-baseline gap-1 sm:justify-end">
                        <span className="text-[11px] font-semibold text-slate-400 sm:hidden">Priority:</span>
                        <p className="text-lg font-bold text-slate-900 tabular-nums leading-tight">{Math.round(ev.combined_priority)}</p>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {ev.highest_single_priority != null ? `Top incident priority ${Math.round(ev.highest_single_priority)}` : ''}
                      </p>
                    </div>
                  )}
                  <ChevronDown size={15} className={`text-slate-400 transition-transform ml-auto sm:ml-0 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isOpen && (
                <div className="px-5 sm:px-6 pb-4 space-y-1">
                  {ev.incidents.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => onSelectIncident(i.id)}
                      className="w-full text-left text-xs flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <span className="min-w-0 flex items-center gap-2">
                        <span className="text-slate-400 tabular-nums shrink-0">{i.display_id}</span>
                        <span className="truncate text-slate-700">{i.district}, {i.state} · {i.severity ?? 'severity not set'}</span>
                        {i.disaster_level && <LevelTag level={i.disaster_level} />}
                      </span>
                      {i.priority_score != null && <span className="font-semibold text-slate-700 tabular-nums">{Math.round(i.priority_score)}</span>}
                    </button>
                  ))}
                  <p className="text-[11px] text-slate-400 pt-1.5 px-3">{ev.rule} Advisory only; declared levels are not changed.</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
