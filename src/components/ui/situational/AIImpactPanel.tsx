import React from 'react';
import { BrainCircuit } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import type { Incident } from '../../../types';

export const getAIAnalysis = (incident: Incident) => [
  { metric: 'Severity', value: incident.severity === 'Critical' ? 95 : incident.severity === 'High' ? 75 : incident.severity === 'Medium' ? 50 : 25, fullMark: 100 },
  { metric: 'Population', value: Math.min(Math.round((incident.affectedPopulation / 40000) * 100), 100), fullMark: 100 },
  { metric: 'Accessibility', value: 100 - incident.accessibilityScore, fullMark: 100 },
  { metric: 'Infrastructure', value: incident.infrastructureDamage === 'Severe' ? 90 : incident.infrastructureDamage === 'Moderate' ? 60 : 30, fullMark: 100 },
  { metric: 'Weather', value: incident.weatherCondition.includes('Heavy') ? 85 : incident.weatherCondition.includes('Continuous') ? 60 : 35, fullMark: 100 },
  { metric: 'Casualties', value: incident.casualtiesCount > 0 ? Math.min(incident.casualtiesCount * 40, 100) : 5, fullMark: 100 },
];

export const getTopDrivers = (incident: Incident, count = 2) =>
  [...getAIAnalysis(incident)]
    .sort((a, b) => b.value - a.value)
    .slice(0, count)
    .map((d) => d.metric);

interface AIImpactPanelProps {
  incident: Incident;
  rank?: number;
  size?: 'compact' | 'full';
  hideBrief?: boolean;
}

export const AIImpactPanel: React.FC<AIImpactPanelProps> = ({
  incident,
  rank,
  size = 'compact',
  hideBrief = false,
}) => {
  const isFull = size === 'full';
  const chartHeight = isFull ? 'h-72' : 'h-52';

  const radar = (
    <div className={isFull ? 'lg:col-span-3 bg-white border border-slate-200 rounded-xl p-6 shadow-xs' : ''}>
      {isFull && (
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
          <BrainCircuit size={17} className="text-blue-600" /> AI impact analysis
        </h2>
      )}
      <div className={`${chartHeight} mt-3`}>
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
  );

  const brief = !hideBrief && (
    <div className={isFull ? 'lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs' : 'mt-3 bg-slate-50 border border-slate-100 rounded-lg p-3'}>
      {isFull && <h2 className="text-sm font-bold text-slate-900 mb-3">Decision brief</h2>}
      <p className={isFull ? 'text-sm text-slate-600 leading-relaxed' : 'text-xs text-slate-600 leading-relaxed'}>
        {rank !== undefined && (
          <>
            AI assessment places this incident at{' '}
            <strong className="text-slate-900">priority rank #{rank}</strong>.{' '}
          </>
        )}
        {incident.affectedPopulation.toLocaleString()} people may be affected;{' '}
        {incident.infrastructureDamage.toLowerCase()} infrastructure damage and{' '}
        {incident.accessibilityScore}/100 accessibility are driving operational urgency.
      </p>
      {isFull && (
        <>
          <div className="mt-5 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-900">
            <strong>Recommended focus:</strong> validate ground conditions, protect vulnerable residents,
            and coordinate response at {incident.disasterLevel.replace('Level ', 'level ')}.
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 text-xs space-y-2">
            <p><span className="text-slate-400">AI inputs:</span> severity, population, access, infrastructure, weather and casualty signals.</p>
            <p><span className="text-slate-400">Source record:</span> {incident.source}</p>
          </div>
        </>
      )}
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