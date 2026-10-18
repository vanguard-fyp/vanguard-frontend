import React from 'react';
import { Radio } from 'lucide-react';
import type { MetrologyReading, TriggerAlertPanelProps } from '../../../types';

/**
 * Sensor readings that triggered an incident. In `full` size it sits inside a
 * page section, so it draws no card of its own.
 */
export const TriggerAlertPanel: React.FC<TriggerAlertPanelProps> = ({ alert, size = 'compact' }) => {
  const isFull = size === 'full';

  return (
    <div className={isFull ? 'space-y-3' : 'bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2'}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 min-w-0">
          <Radio size={13} className="shrink-0 text-blue-600" />
          <span className="truncate">{alert.source}</span>
        </span>
        <span className="text-[11px] text-slate-400 tabular-nums shrink-0">{alert.triggered_at}</span>
      </div>

      <ul className={isFull ? 'divide-y divide-slate-100 rounded-xl border border-slate-200/80' : 'space-y-1.5'}>
        {alert.readings.map((r: MetrologyReading, idx: number) => {
          const exceeded = r.value >= r.threshold;
          const pct = r.threshold > 0 ? Math.min(100, (r.value / r.threshold) * 100) : 0;
          return (
            <li key={`${r.metric}-${idx}`} className={isFull ? 'px-3.5 py-2.5' : ''}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-600 min-w-0 truncate">
                  {r.metric} <span className="text-slate-400">· {r.station}</span>
                </span>
                <span className={`font-semibold tabular-nums shrink-0 ${exceeded ? 'text-red-700' : 'text-slate-800'}`}>
                  {r.value}{r.unit} <span className="text-slate-400 font-normal">of {r.threshold}{r.unit}</span>
                </span>
              </div>
              {isFull && (
                <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: exceeded ? '#dc2626' : '#2563eb' }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-slate-600">Predicted onset <span className="font-semibold text-slate-900">{alert.predicted_onset}</span></span>
        <span className="text-slate-600"><span className="font-semibold text-slate-900 tabular-nums">{alert.predicted_probability}%</span> confidence</span>
      </div>
    </div>
  );
};
