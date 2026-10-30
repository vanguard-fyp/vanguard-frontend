import { DataRegion } from '../../common/DataRegion';
import React, { useState } from 'react';
import { AlertTriangle, Target } from 'lucide-react';
import { usePredictionAccuracy } from '../../../hooks/useIntelligence';
import type { AccuracyScore } from '../../../services/intelligenceService';
import { relativeTime } from '../../../utils/display';

const PERIODS = [30, 90, 365] as const;

const HAZARD_LABEL: Record<string, string> = {
  flood: 'Flood & flash flood',
  landslide: 'Landslide',
  haze: 'Haze',
  fire: 'Forest fire',
  storm: 'Severe storm',
  drought: 'Drought',
  earthquake: 'Earthquake',
  other: 'Other',
};

const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);

/** "18 h before" / "2 h after" the event. */
const lead = (h: number | null) => {
  if (h == null) return '—';
  const a = Math.abs(h);
  const t = a >= 48 ? `${Math.round(a / 24)} d` : `${Math.round(a)} h`;
  return h >= 0 ? `${t} before` : `${t} after`;
};

const Row: React.FC<{ label: string; s: AccuracyScore }> = ({ label, s }) => (
  <tr className="border-t border-slate-100">
    <td className="py-2 pr-3 font-semibold text-slate-800">{label}</td>
    <td className="py-2 px-2 text-right tabular-nums">{s.warnings}</td>
    <td className="py-2 px-2 text-right tabular-nums text-emerald-700">{s.hits}</td>
    <td className="py-2 px-2 text-right tabular-nums text-red-700">{s.misses}</td>
    <td className="py-2 px-2 text-right tabular-nums text-amber-700">{s.false_alarms}</td>
    <td className="py-2 px-2 text-right tabular-nums text-slate-400">{s.pending}</td>
    <td className="py-2 px-2 text-right tabular-nums">{pct(s.detection_rate)}</td>
    <td className="py-2 pl-2 text-right tabular-nums">{pct(s.false_alarm_rate)}</td>
  </tr>
);

/**
 * Early-warning accuracy: warnings compared with incidents officers confirmed.
 * Sits under the thresholds so the alert lines can be tuned against results.
 */
export const PredictionAccuracyPanel: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const accuracyQuery = usePredictionAccuracy(days);
  const { data, isLoading, isError, refetch } = accuracyQuery;
  const o = data?.overall;

  return (
    <DataRegion queries={[accuracyQuery]} label="Warning accuracy"><div className="bg-white border border-slate-200 rounded-xl shadow-xs">
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/40 rounded-t-xl flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Target size={14} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Early-warning accuracy</p>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Warnings vs confirmed incidents</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {PERIODS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer transition-colors ${
                days === d ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d === 365 ? '1 year' : `${d} days`}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="px-4 py-6 text-xs text-slate-400">Loading…</p>}
      {isError && accuracyQuery.data === undefined && (
        <div className="px-4 py-4 flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle size={13} /> Accuracy could not be loaded.
          <button onClick={() => refetch()} className="font-bold underline cursor-pointer">Retry</button>
        </div>
      )}

      {data && o && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Caught', value: pct(o.detection_rate), sub: `${o.hits} of ${o.hits + o.misses} events` },
              { label: 'False alarms', value: pct(o.false_alarm_rate), sub: `${o.false_alarms} warnings` },
              { label: 'Warning time', value: lead(o.median_lead_hours), sub: 'median, vs the event' },
              { label: 'Still open', value: String(o.pending), sub: 'not judged yet' },
            ].map((t) => (
              <div key={t.label} className="border border-slate-200 rounded-lg px-3 py-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{t.label}</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{t.value}</p>
                <p className="text-[11px] text-slate-500">{t.sub}</p>
              </div>
            ))}
          </div>

          {data.by_hazard.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    <th className="text-left pb-1.5 pr-3">Hazard</th>
                    <th className="text-right pb-1.5 px-2">Warnings</th>
                    <th className="text-right pb-1.5 px-2">Hits</th>
                    <th className="text-right pb-1.5 px-2">Missed</th>
                    <th className="text-right pb-1.5 px-2">False</th>
                    <th className="text-right pb-1.5 px-2">Open</th>
                    <th className="text-right pb-1.5 px-2">Caught</th>
                    <th className="text-right pb-1.5 pl-2">False %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_hazard.map((h) => (
                    <Row key={h.hazard} label={HAZARD_LABEL[h.hazard] ?? h.hazard} s={h} />
                  ))}
                  {data.by_source.map((s) => (
                    <Row key={s.source} label={`Source · ${s.source}`} s={s} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.recent_misses.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Missed (no warning before)</p>
              <ul className="text-xs text-slate-700 space-y-0.5">
                {data.recent_misses.slice(0, 5).map((m) => (
                  <li key={m.incident_id}>
                    {m.title} · {m.state} <span className="text-slate-400">· {relativeTime(m.occurred_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            Counts only incidents officers confirmed, in the same state and hazard, within {data.window_hours} h of a
            warning. An event nobody logged makes its warning look false.
          </p>
        </div>
      )}
    </div></DataRegion>
  );
};
