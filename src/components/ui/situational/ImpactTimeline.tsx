import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { ImpactSnapshot } from '../../../types';

interface ImpactTimelineProps {
  timeline: ImpactSnapshot[];
  size?: 'compact' | 'full';
  mode?: 'confirmed-only' | 'predictive';
}

const TimelineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const point: ImpactSnapshot = payload[0].payload;
    const isPred = point.isPredicted;
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-xl text-xs max-w-[240px] space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-slate-500 font-mono font-bold text-[10px]">{label}</p>
          <span
            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-1 ${
              isPred
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-blue-100 text-blue-700 border border-blue-200'
            }`}
          >
            {isPred ? <Sparkles size={9} /> : <CheckCircle2 size={9} />}
            {isPred ? 'AI PREDICTION' : 'CONFIRMED'}
          </span>
        </div>
        <p className={`font-black text-sm ${isPred ? 'text-purple-700' : 'text-blue-700'}`}>
          {point.affectedPopulation.toLocaleString()} affected
        </p>
        <p className="text-slate-600 text-[11px] font-medium">
          {point.impactRadiusKm} km radius · {point.severity} Severity
        </p>
        {point.stage && (
          <p className="text-[10px] font-mono text-slate-400">
            Stage: {point.stage}
          </p>
        )}
        {point.note && <p className="text-slate-500 text-[11px] mt-1 italic leading-tight border-t border-slate-100 pt-1">{point.note}</p>}
      </div>
    );
  }
  return null;
};

export const ImpactTimeline: React.FC<ImpactTimelineProps> = ({
  timeline,
  size = 'compact',
  mode = 'predictive',
}) => {
  if (!timeline || timeline.length === 0) return null;

  // Filter if confirmed-only is requested
  const displayTimeline = mode === 'confirmed-only'
    ? timeline.filter((p) => !p.isPredicted)
    : timeline;

  if (displayTimeline.length === 0) return null;

  const latest = displayTimeline[displayTimeline.length - 1];
  const first = displayTimeline[0];
  const growth = first
    ? Math.round(((latest.affectedPopulation - first.affectedPopulation) / Math.max(first.affectedPopulation, 1)) * 100)
    : 0;

  // Prepare chart dataset bridging confirmed and predicted for dual-area visualization
  const lastConfirmedIdx = displayTimeline.findIndex((p, idx) => {
    const next = displayTimeline[idx + 1];
    return !p.isPredicted && next && next.isPredicted;
  });

  const chartData = displayTimeline.map((p, idx) => {
    const isPred = !!p.isPredicted;
    // For smooth visual continuity, the boundary point belongs to both lines
    const isBoundary = idx === lastConfirmedIdx;
    return {
      ...p,
      confirmedPop: !isPred || isBoundary ? p.affectedPopulation : null,
      predictedPop: isPred || isBoundary ? p.affectedPopulation : null,
    };
  });

  const hasPredictions = mode === 'predictive' && displayTimeline.some((p) => p.isPredicted);

  return (
    <div className={size === 'full' ? 'bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4' : 'space-y-2'}>
      {size === 'full' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={17} className={hasPredictions ? 'text-purple-600' : 'text-blue-600'} />
              {mode === 'confirmed-only' ? 'Confirmed Ground Impact Progression' : 'AI Impact Trajectory & Forecast Model'}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {mode === 'confirmed-only'
                ? 'Chronological ground-truth logs from emergency responders and verification teams.'
                : 'Historical ground sensor verification combined with AI 24h predictive flood/disaster propagation.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasPredictions && (
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  <span className="size-2 rounded-full bg-blue-600 inline-block" /> Confirmed History
                </span>
                <span className="flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                  <Sparkles size={10} className="text-purple-600" /> AI Forecast (+24h)
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
            <XAxis dataKey="timestamp" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
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
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {size === 'full' && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <p>
            Current baseline: <span className="font-bold text-slate-800">{first.affectedPopulation.toLocaleString()} affected</span> (logged at {first.timestamp}).
          </p>
          <p>
            {latest.isPredicted ? 'Projected peak' : 'Latest verified reading'}:{' '}
            <span className={`font-bold ${latest.isPredicted ? 'text-purple-700' : 'text-slate-800'}`}>
              {latest.affectedPopulation.toLocaleString()} affected ({latest.impactRadiusKm}km radius)
            </span>
          </p>
        </div>
      )}
    </div>
  );
};