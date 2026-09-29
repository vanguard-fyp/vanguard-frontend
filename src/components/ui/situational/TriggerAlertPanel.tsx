import React from 'react';
import { Radio, AlertTriangle, Gauge } from 'lucide-react';
import type { MetrologyReading, TriggerAlertPanelProps } from '../../../types';

export const TriggerAlertPanel: React.FC<TriggerAlertPanelProps> = ({ alert, size = 'compact' }) => {
  const isFull = size === 'full';

  return (
    <div className={isFull ? 'bg-white border border-slate-200 rounded-xl p-6 shadow-xs' : 'bg-slate-50 border border-slate-100 rounded-lg p-3'}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Radio size={isFull ? 16 : 13} className="text-orange-600" />
          <span className={isFull ? 'text-xs font-bold uppercase tracking-wider text-slate-900' : 'text-[10px] font-bold uppercase tracking-wide text-slate-500'}>
            {alert.source}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">{alert.triggered_at}</span>
      </div>

      <div className="space-y-1.5">
        {alert.readings.map((r: MetrologyReading, idx: number) => {
          const exceeded = r.value >= r.threshold;
          return (
            <div key={`${r.metric}-${idx}`} className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <Gauge size={12} className={exceeded ? 'text-red-500' : 'text-slate-400'} />
                {r.metric} ({r.station})
              </span>
              <span className={`font-bold font-mono ${exceeded ? 'text-red-600' : 'text-slate-700'}`}>
                {r.value}{r.unit} <span className="text-slate-400 font-normal">/ {r.threshold}{r.unit}</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <AlertTriangle size={13} /> Predicted onset: {alert.predicted_onset}
        </span>
        <span className="text-xs font-bold text-slate-900">{alert.predicted_probability}% confidence</span>
      </div>
    </div>
  );
};