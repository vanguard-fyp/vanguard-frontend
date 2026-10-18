import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { ImpactSnapshot, ImpactTimelineProps } from '../../../types';
import { formatDateTime } from '../../../utils/dateFormatter';

/* Confirmed figures in blue, AI projection in indigo (dashed), casualties in red.
   Chart text uses the app font (Inter), never a monospace face. */
const C = { confirmed: '#2563eb', predicted: '#4f46e5', casualties: '#dc2626' };
const AXIS_TICK = { fill: '#64748b', fontSize: 11, fontFamily: 'inherit' };
/** Axis label: day and time only ("1 Aug, 22:00"); the tooltip has the full date. */
const shortTick = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
};

const TimelineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const point: ImpactSnapshot = payload[0].payload;
  const isPred = point.is_predicted;
  // Just the numbers for that moment; notes and stages live elsewhere.
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="text-[11px] text-slate-500">{shortTick(label)}{isPred ? ' · projection' : ''}</p>
      <p className="flex items-center gap-1.5 font-semibold text-slate-900 tabular-nums">
        <span className="w-2 h-2 rounded-full" style={{ background: isPred ? C.predicted : C.confirmed }} />
        {point.affected_population.toLocaleString()} affected
      </p>
      {!isPred && point.casualties_count != null && (
        <p className="flex items-center gap-1.5 text-slate-700 tabular-nums">
          <span className="w-2 h-2 rounded-full" style={{ background: C.casualties }} />
          {point.casualties_count} casualties
        </p>
      )}
    </div>
  );
};

const Legend: React.FC<{ color: string; dashed?: boolean; children: React.ReactNode }> = ({ color, dashed, children }) => (
  <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
    <span className="w-4 h-0 border-t-2" style={{ borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }} />
    {children}
  </span>
);

export const ImpactTimeline: React.FC<ImpactTimelineProps> = ({
  timeline,
  size = 'compact',
  mode = 'predictive',
  joinPrediction = true,
  title,
}) => {
  if (!timeline || timeline.length === 0) return null;

  const displayTimeline = mode === 'confirmed-only' ? timeline.filter((p) => !p.is_predicted) : timeline;
  if (displayTimeline.length === 0) return null;

  const latest = displayTimeline[displayTimeline.length - 1];
  const first = displayTimeline[0];
  const growth = first
    ? Math.round(((latest.affected_population - first.affected_population) / Math.max(first.affected_population, 1)) * 100)
    : 0;

  const lastConfirmedIdx = joinPrediction
    ? displayTimeline.findIndex((p, idx) => {
        const next = displayTimeline[idx + 1];
        return !p.is_predicted && next && next.is_predicted;
      })
    : -1;
  const firstConfirmed = displayTimeline.find((p) => !p.is_predicted);
  const lastConfirmed = [...displayTimeline].reverse().find((p) => !p.is_predicted);
  const lastPredicted = [...displayTimeline].reverse().find((p) => p.is_predicted);

  const chartData = displayTimeline.map((p, idx) => {
    const isPred = !!p.is_predicted;
    const isBoundary = idx === lastConfirmedIdx;
    return {
      ...p,
      confirmedPop: !isPred || isBoundary ? p.affected_population : null,
      predictedPop: isPred || isBoundary ? p.affected_population : null,
      casualties: !isPred ? (p.casualties_count ?? 0) : null,
    };
  });

  const hasPredictions = mode === 'predictive' && displayTimeline.some((p) => p.is_predicted);
  const full = size === 'full';
  // Rising impact is bad news (red); falling is good (emerald).
  const trendColor = growth > 0 ? '#b91c1c' : growth < 0 ? '#047857' : '#475569';
  const trendBg = growth > 0 ? '#dc262612' : growth < 0 ? '#05966912' : '#64748b12';

  return (
    <div className={full ? 'bg-white border border-slate-200/80 rounded-2xl px-5 sm:px-6 pt-5 pb-5 space-y-4' : 'space-y-2'}>
      {full && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {title ?? (mode === 'confirmed-only' ? 'Impact over time' : 'Impact and AI projection')}
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <Legend color={C.confirmed}>Confirmed</Legend>
            {hasPredictions && <Legend color={C.predicted} dashed>AI projection</Legend>}
            {mode === 'confirmed-only' && <Legend color={C.casualties}>Casualties</Legend>}
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md tabular-nums" style={{ color: trendColor, background: trendBg }}>
              {growth > 0 ? '+' : ''}{growth}% since first report
            </span>
          </div>
        </div>
      )}

      <div className={full ? 'h-60' : 'h-32'}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="confirmedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.confirmed} stopOpacity={0.18} />
                <stop offset="95%" stopColor={C.confirmed} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.predicted} stopOpacity={0.16} />
                <stop offset="95%" stopColor={C.predicted} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="timestamp" tickFormatter={shortTick} tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => v.toLocaleString()} />
            <Tooltip content={<TimelineTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }} />

            <Area
              type="monotone"
              dataKey="confirmedPop"
              stroke={C.confirmed}
              fill="url(#confirmedGrad)"
              strokeWidth={2}
              name="Confirmed"
              connectNulls={false}
              dot={{ r: 3, fill: C.confirmed, stroke: '#ffffff', strokeWidth: 1.5 }}
            />
            {hasPredictions && (
              <Area
                type="monotone"
                dataKey="predictedPop"
                stroke={C.predicted}
                fill="url(#predictedGrad)"
                strokeWidth={2}
                strokeDasharray="4 4"
                name="AI projection"
                connectNulls={false}
                dot={{ r: 3, fill: C.predicted, stroke: '#ffffff', strokeWidth: 1.5 }}
              />
            )}
            {mode === 'confirmed-only' && (
              <Area
                type="monotone"
                dataKey="casualties"
                stroke={C.casualties}
                fill="none"
                strokeWidth={1.75}
                name="Casualties"
                connectNulls={false}
                dot={{ r: 2.5, fill: C.casualties, stroke: '#ffffff', strokeWidth: 1.5 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {full && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
          {firstConfirmed && firstConfirmed !== lastConfirmed && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Initial:</span>
              <span className="font-semibold text-slate-700 tabular-nums">
                {firstConfirmed.affected_population.toLocaleString()} affected
              </span>
              <span className="text-[11px] text-slate-400">({formatDateTime(firstConfirmed.timestamp)})</span>
            </div>
          )}
          {lastConfirmed ? (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Latest recorded:</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {lastConfirmed.affected_population.toLocaleString()} affected
              </span>
              <span className="text-[11px] text-slate-400">({formatDateTime(lastConfirmed.timestamp)})</span>
            </div>
          ) : (
            <p className="text-slate-400">No confirmed figures recorded</p>
          )}
          {lastPredicted && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">AI Projected:</span>
              <span className="font-semibold tabular-nums" style={{ color: C.predicted }}>
                {lastPredicted.affected_population.toLocaleString()} affected
              </span>
              <span className="text-[11px] text-slate-400">({formatDateTime(lastPredicted.timestamp)})</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
