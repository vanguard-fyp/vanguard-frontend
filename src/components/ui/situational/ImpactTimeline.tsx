import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';
import type { ImpactSnapshot, ImpactTimelineProps } from '../../../types';
import { formatDateTime } from '../../../utils/dateFormatter';

const TimelineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const point: ImpactSnapshot = payload[0].payload;
    const isPred = point.is_predicted;
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-xl text-xs max-w-[240px] space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-slate-500 font-mono font-bold text-[10px]">{formatDateTime(label)}</p>
          <span
            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-1 ${isPred
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}
          >
            {isPred ? <Sparkles size={9} /> : <CheckCircle2 size={9} />}
            {isPred ? 'AI PREDICTION' : 'CONFIRMED'}
          </span>
        </div>
        <p className={`font-black text-sm ${isPred ? 'text-purple-700' : 'text-blue-700'}`}>
          {point.affected_population.toLocaleString()} affected
        </p>
        {!isPred && point.casualties_count != null && (
          <p className="text-slate-600 text-[11px] font-medium">{point.casualties_count} casualties reported</p>
        )}
        {point.stage && (
          <p className="text-[10px] font-mono text-slate-400">
            Stage: {point.stage}
          </p>
        )}
        {point.note && <p className="text-slate-500 text-[11px] mt-1 leading-tight border-t border-slate-100 pt-1">{point.note}</p>}
      </div>
    );
  }
  return null;
};

export const ImpactTimeline: React.FC<ImpactTimelineProps> = ({
  timeline,
  size = 'compact',
  mode = 'predictive',
  joinPrediction = true,
  title,
}) => {
  if (!timeline || timeline.length === 0) return null;

  // Filter if confirmed-only is requested
  const displayTimeline = mode === 'confirmed-only'
    ? timeline.filter((p) => !p.is_predicted)
    : timeline;

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

  return (
    <div className={size === 'full' ? 'bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4' : 'space-y-2'}>
      {size === 'full' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={17} className={hasPredictions ? 'text-purple-600' : 'text-blue-600'} />
              {title ?? (mode === 'confirmed-only' ? 'Confirmed Ground Impact Progression' : 'Impact Progression & AI Forecast')}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {hasPredictions && (
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  <span className="size-2 rounded-full bg-blue-600 inline-block" /> Confirmed History
                </span>
                <span className="flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                  <Sparkles size={10} className="text-purple-600" /> AI projection (dotted)
                </span>
              </div>
            )}
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${growth >= 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {growth >= 0 ? '+' : ''}{growth}% trend
            </span>
          </div>
        </div>
      )}

      <div className={size === 'full' ? 'h-64' : 'h-32'}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="confirmedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="timestamp" tickFormatter={(value) => formatDateTime(value)} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<TimelineTooltip />} />

            {/* Confirmed Series (Solid Blue) */}
            <Area
              type="monotone"
              dataKey="confirmedPop"
              stroke="#2563eb"
              fill="url(#confirmedGrad)"
              strokeWidth={2.5}
              name="Confirmed Ground Impact"
              connectNulls={false}
              dot={{ r: 3.5, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 1.5 }}
            />

            {/* Predicted Forecast Series (Dashed Purple) */}
            {hasPredictions && (
              <Area
                type="monotone"
                dataKey="predictedPop"
                stroke="#8b5cf6"
                fill="url(#predictedGrad)"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                name="AI Predicted Forecast"
                connectNulls={false}
                dot={{ r: 4, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 1.5 }}
              />
            )}
            {mode === 'confirmed-only' && (
              <Area
                type="monotone"
                dataKey="casualties"
                stroke="#dc2626"
                fill="none"
                strokeWidth={2}
                name="Confirmed Casualties"
                connectNulls={false}
                dot={{ r: 3, fill: '#dc2626', stroke: '#ffffff', strokeWidth: 1.5 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {size === 'full' && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <p>
            {lastConfirmed ? (
              <>
                Latest confirmed: <span className="font-bold text-slate-800">{lastConfirmed.affected_population.toLocaleString()} affected</span>{' '}
                ({formatDateTime(lastConfirmed.timestamp)})
                {firstConfirmed && firstConfirmed !== lastConfirmed && <> · first {firstConfirmed.affected_population.toLocaleString()}</>}
              </>
            ) : (
              'No confirmed figures reported yet'
            )}
          </p>
          {lastPredicted && (
            <p>
              Projected by {formatDateTime(lastPredicted.timestamp)}:{' '}
              <span className="font-bold text-purple-700">{lastPredicted.affected_population.toLocaleString()}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
