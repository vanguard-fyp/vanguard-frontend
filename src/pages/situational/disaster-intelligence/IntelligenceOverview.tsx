import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { ChevronRight, Filter } from 'lucide-react';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
import { ImpactTimeline } from '../../../components/ui/situational/ImpactTimeline';
import { disasterLevelInfo } from '../../../constants/components/disasterLevels';
import type { Incident } from '../../../types';

const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const severityColors: Record<string, string> = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#d97706',
  Low: '#16a34a',
};

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="text-slate-500 font-medium">{label}</p>
        <p className="text-blue-700 font-bold">Priority Score: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const STATUS_FILTERS = ['All Tracked', 'Responding', 'Resolved'] as const;

interface IntelligenceOverviewProps {
  onSelectInsight: (incident: Incident) => void;
  incidents: Incident[];
}

export const IntelligenceOverview: React.FC<IntelligenceOverviewProps> = ({ onSelectInsight, incidents }) => {
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>('All Tracked');

  // Only incidents that have moved past Unverified and have started impact tracking
  const tracked = incidents.filter((i) => i.status !== 'Unverified' && i.impactTimeline?.length);

  const filtered = tracked.filter((i) =>
    statusFilter === 'All Tracked' ? true : i.status === statusFilter
  );

  const ranked = [...filtered].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore);
  const chartData = ranked.map((inc) => ({ name: inc.district, score: inc.aiPriorityScore, severity: inc.severity }));
  const levelOrder = ['Level 3: Federal', 'Level 2: State', 'Level 1: District'];

  if (tracked.length === 0) {
    return (
      <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <p className="text-sm text-slate-500 font-medium">No incidents are being tracked yet.</p>
        <p className="text-xs text-slate-400 mt-1">Verify a report in Incident Management to begin impact tracking here.</p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemAnim} className="space-y-6">
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-slate-400" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${statusFilter === f
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900">Priority Index by District</h3>
            <span className="text-[10px] text-slate-400 font-medium">
              Score = Accessibility + Infrastructure + Population + Weather + Casualties
            </span>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(160, ranked.length * 40)}>
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomChartTooltip />} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={22}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={severityColors[entry.severity] || '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {levelOrder.map((level) => {
        const info = disasterLevelInfo[level];
        const incidentsAtLevel = ranked.filter((i) => i.disasterLevel === level);
        if (incidentsAtLevel.length === 0) return null;

        return (
          <div key={level} className={`border rounded-xl overflow-hidden shadow-xs ${info.color}`}>
            <div className="px-5 py-4 border-b border-slate-200/80 bg-white flex items-center justify-between">
              <div>
                <h3 className={`text-sm font-bold ${info.headerColor}`}>{level}</h3>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed max-w-2xl">{info.desc}</p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 ml-4">
                {incidentsAtLevel.length} active
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {incidentsAtLevel.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => onSelectInsight(incident)}
                  className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          #{ranked.findIndex((r) => r.id === incident.id) + 1}
                        </span>
                        <DisasterBadge type="severity" value={incident.severity} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1.5">{incident.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{incident.location}, {incident.state}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-blue-700">{incident.aiPriorityScore}</p>
                    </div>
                  </div>

                  {incident.impactTimeline && (
                    <div className="mt-3">
                      <ImpactTimeline timeline={incident.impactTimeline} size="compact" />
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-end">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                      Full analysis <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};