import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { ImpactSnapshot } from '../../../types';

interface ImpactTimelineProps {
  timeline: ImpactSnapshot[];
  size?: 'compact' | 'full';
}

const TimelineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const point: ImpactSnapshot = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-xs max-w-[220px]">
        <p className="text-slate-500 font-medium">{label}</p>
        <p className="text-blue-700 font-bold">{point.affectedPopulation.toLocaleString()} affected</p>
        <p className="text-slate-600">{point.impactRadiusKm} km radius · {point.severity}</p>
        {point.note && <p className="text-slate-500 mt-1 italic">{point.note}</p>}
      </div>
    );
  }
  return null;
};

export const ImpactTimeline: React.FC<ImpactTimelineProps> = ({ timeline, size = 'compact' }) => {
  if (!timeline || timeline.length === 0) return null;

  const latest = timeline[timeline.length - 1];
  const first = timeline[0];
  const growth = first
    ? Math.round(((latest.affectedPopulation - first.affectedPopulation) / Math.max(first.affectedPopulation, 1)) * 100)
    : 0;

  return (
    <div className={size === 'full' ? 'bg-white border border-slate-200 rounded-xl p-6 shadow-xs' : ''}>
      {size === 'full' && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp size={17} className="text-blue-600" /> Impact growth over time
          </h2>
          <span className={`text-xs font-bold ${growth >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {growth >= 0 ? '+' : ''}{growth}% since first reading
          </span>
        </div>
      )}
      <div className={size === 'full' ? 'h-64' : 'h-32'}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="timestamp" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<TimelineTooltip />} />
            <Area type="monotone" dataKey="affectedPopulation" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {size === 'full' && (
        <p className="text-xs text-slate-500 mt-3">
          Latest reading: {latest.affectedPopulation.toLocaleString()} affected, {latest.impactRadiusKm}km radius,
          {' '}logged at {latest.timestamp}{latest.note ? ` — ${latest.note}` : ''}.
        </p>
      )}
    </div>
  );
};