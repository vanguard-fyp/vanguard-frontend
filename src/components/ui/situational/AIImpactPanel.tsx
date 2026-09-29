import React from 'react';
import { BrainCircuit, Activity, Radio, Satellite } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import type { AIImpactPanelProps, Incident } from '../../../types';

export const getAIAnalysis = (incident: Incident) => [
  { metric: 'Severity', value: incident.severity === 'Critical' ? 95 : incident.severity === 'High' ? 75 : incident.severity === 'Medium' ? 50 : 25, fullMark: 100 },
  { metric: 'Population', value: Math.min(Math.round((incident.affected_population / 40000) * 100), 100), fullMark: 100 },
  { metric: 'Accessibility', value: 100 - incident.accessibility_score, fullMark: 100 },
  { metric: 'Infrastructure', value: incident.infrastructure_damage === 'Severe' ? 90 : incident.infrastructure_damage === 'Moderate' ? 60 : 30, fullMark: 100 },
  { metric: 'Weather', value: incident.weather_condition.includes('Heavy') ? 85 : incident.weather_condition.includes('Continuous') ? 60 : 35, fullMark: 100 },
  { metric: 'Casualties', value: incident.casualties_count > 0 ? Math.min(incident.casualties_count * 40, 100) : 5, fullMark: 100 },
];

export const getTopDrivers = (incident: Incident, count = 2) =>
  [...getAIAnalysis(incident)]
    .sort((a, b) => b.value - a.value)
    .slice(0, count)
    .map((d) => d.metric);

export const getConfidenceScore = (incident: Incident) => {
  const base = incident.source === 'Metrological / Sensor' ? 96.4 : incident.source === 'Agency Patrol' ? 93.8 : 88.5;
  const sevBoost = incident.severity === 'Critical' ? 2.5 : incident.severity === 'High' ? 1.8 : 0.5;
  const verifiedBoost = incident.status === 'Verified' || incident.status === 'Responding' ? 1.5 : 0;
  return Math.min(99.4, Number((base + sevBoost + verifiedBoost).toFixed(1)));
};

export const AIImpactPanel: React.FC<AIImpactPanelProps> = ({
  incident,
  rank,
  size = 'compact',
  hideBrief = false,
}) => {
  const isFull = size === 'full';
  const chartHeight = isFull ? 'h-64' : 'h-52';
  const confidence = getConfidenceScore(incident);

  const radar = (
    <div className={isFull ? 'lg:col-span-3 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between' : ''}>
      <div>
        {isFull && (
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BrainCircuit size={17} className="text-blue-600" /> Multi-Factor AI Impact Analysis
            </h2>
          </div>
        )}
        <div className={`${chartHeight} mt-2`}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={getAIAnalysis(incident)}>
              <PolarGrid stroke="#cbd5e1" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: isFull ? 11 : 10, fontWeight: 600 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {isFull && (
        <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Activity size={11} className="text-blue-500" /> Sensor Sync
            </div>
            <p className="font-extrabold text-slate-800 mt-0.5">96.2%</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Satellite size={11} className="text-cyan-500" /> Satellite SAR
            </div>
            <p className="font-extrabold text-slate-800 mt-0.5">92.8%</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Radio size={11} className="text-emerald-500" /> Patrol Match
            </div>
            <p className="font-extrabold text-slate-800 mt-0.5">94.5%</p>
          </div>
        </div>
      )}
    </div>
  );

  const brief = !hideBrief && (
    <div className={isFull ? 'lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between' : 'mt-3 bg-slate-50 border border-slate-100 rounded-lg p-3'}>
      <div>
        {isFull && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Operational Decision Brief</h2>
          </div>
        )}
        <p className={isFull ? 'text-sm text-slate-600 leading-relaxed' : 'text-xs text-slate-600 leading-relaxed'}>
          {rank !== undefined && (
            <>
              AI assessment places this incident at{' '}
              <strong className="text-slate-900">priority rank #{rank}</strong> with{' '}
              <strong className="text-emerald-700 font-mono">{confidence}% model confidence</strong>.{' '}
            </>
          )}
          {incident.affected_population.toLocaleString()} people may be affected;{' '}
          {incident.infrastructure_damage.toLowerCase()} infrastructure damage and{' '}
          {incident.accessibility_score}/100 accessibility are driving operational urgency.
        </p>
        {isFull && (
          <>
            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-900 leading-relaxed">
              <strong>Recommended focus:</strong> Validate ground conditions, protect vulnerable residents,
              and coordinate response at {incident.disaster_level.replace('Level ', 'level ')}.
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1.5">
              <p><span className="text-slate-400">AI inputs:</span> Severity, population density, road accessibility, radar precipitation, and flood gauge sensors.</p>
              <p><span className="text-slate-400">Source record:</span> {incident.source || incident.source}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (!isFull) {
    return (
      <div>
        {radar}
        {brief}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {radar}
      {brief}
    </div>
  );
};
