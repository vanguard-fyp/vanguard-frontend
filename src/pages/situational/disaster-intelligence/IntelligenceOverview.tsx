import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { ChevronRight, ChevronDown, ChevronUp, Filter, BarChart3, AlertCircle, Sparkles } from 'lucide-react';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
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

const STATUS_FILTERS = ['Active Disasters', 'Responding', 'Verified', 'Resolved (Archived)', 'All Tracked'] as const;

interface IntelligenceOverviewProps {
  onSelectInsight: (incident: Incident) => void;
  incidents: Incident[];
}

export const IntelligenceOverview: React.FC<IntelligenceOverviewProps> = ({ onSelectInsight, incidents }) => {
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>('Active Disasters');
  const [showChart, setShowChart] = useState(false);
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({});

  // Incidents that have moved past Unverified or have impact data
  const tracked = (incidents || []).filter(
    (i) => i && (i.status !== 'Unverified' || (i.impactTimeline && i.impactTimeline.length > 0))
  );

  const activeTracked = tracked.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected');
  const resolvedTracked = tracked.filter((i) => i.status === 'Resolved');

  const filtered = tracked.filter((i) => {
    if (statusFilter === 'Active Disasters') return i.status !== 'Resolved' && i.status !== 'Rejected';
    if (statusFilter === 'Resolved (Archived)') return i.status === 'Resolved';
    if (statusFilter === 'All Tracked') return true;
    return i.status === statusFilter;
  });

  const ranked = [...filtered].sort((a, b) => (b.aiPriorityScore || 0) - (a.aiPriorityScore || 0));
  const chartData = ranked.map((inc) => ({
    name: inc.district || inc.location || 'Unknown',
    score: inc.aiPriorityScore || 0,
    severity: inc.severity || 'Medium',
  }));

  const levelOrder = ['Level 3: Federal', 'Level 2: State', 'Level 1: District'];

  const toggleLevelExpansion = (level: string) => {
    setExpandedLevels((prev) => ({ ...prev, [level]: !prev[level] }));
  };

  if (!tracked || tracked.length === 0) {
    return (
      <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No Disasters Currently Tracked in Intelligence</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
          Reports verified in Incident Management will automatically appear here with AI-computed priority indices and impact projections.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemAnim} className="space-y-5">
      {/* Filter and Chart Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          {STATUS_FILTERS.map((f) => {
            const count =
              f === 'Active Disasters'
                ? activeTracked.length
                : f === 'Resolved (Archived)'
                ? resolvedTracked.length
                : f === 'All Tracked'
                ? tracked.length
                : tracked.filter((i) => i.status === f).length;

            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === f
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{f}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  statusFilter === f ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Collapsible Chart Toggle Button */}
        {chartData.length > 0 && (
          <button
            onClick={() => setShowChart((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <BarChart3 size={14} className="text-blue-600" />
            <span>{showChart ? 'Hide District Priority Chart' : 'Show District Priority Chart'}</span>
            {showChart ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Collapsible Priority Chart */}
      <AnimatePresence>
        {showChart && chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">AI Priority Index by District</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Composite score (0–100)
                </span>
              </div>
              <ResponsiveContainer width="100%" height={Math.min(300, Math.max(160, ranked.length * 36))}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={severityColors[entry.severity] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disaster Level Groups */}
      {levelOrder.map((level) => {
        const info = disasterLevelInfo[level] || {
          color: 'border-slate-200 bg-slate-50',
          headerColor: 'text-slate-800',
          desc: 'Operational management level',
        };
        const incidentsAtLevel = ranked.filter((i) => i.disasterLevel === level);
        if (incidentsAtLevel.length === 0) return null;

        const isExpanded = expandedLevels[level] || false;
        const visibleIncidents = isExpanded ? incidentsAtLevel : incidentsAtLevel.slice(0, 4);

        return (
          <div key={level} className={`border rounded-xl overflow-hidden shadow-xs ${info.color}`}>
            <div className="px-5 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-bold ${info.headerColor}`}>{level}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                    {incidentsAtLevel.length} {incidentsAtLevel.length === 1 ? 'incident' : 'incidents'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5 line-clamp-1">{info.desc}</p>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {visibleIncidents.map((incident) => {
                const isResolved = incident.status === 'Resolved';
                const isInactive = isResolved || incident.status === 'Rejected';

                return (
                  <div
                    key={incident.displayId || incident.id}
                    onClick={() => onSelectInsight(incident)}
                    className={`border rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between group ${
                      isInactive
                        ? 'bg-slate-100/75 border-slate-300 text-slate-500 hover:border-slate-400'
                        : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            isInactive
                              ? 'text-slate-500 bg-slate-200/70 border-slate-300'
                              : 'text-slate-500 bg-slate-100 border-slate-200'
                          }`}>
                            #{ranked.findIndex((r) => r.id === incident.id) + 1}
                          </span>
                          <DisasterBadge type="severity" value={incident.severity} />
                          <span className="text-[10px] font-mono text-slate-400">
                            {incident.displayId || incident.id}
                          </span>
                          {isResolved && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                              Resolved
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-base font-extrabold font-mono leading-none ${
                            isInactive ? 'text-slate-500' : 'text-blue-700'
                          }`}>
                            {incident.aiPriorityScore}
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase font-mono mt-0.5">AI Score</p>
                        </div>
                      </div>

                      <h4 className={`text-xs font-bold transition-colors line-clamp-1 ${
                        isInactive
                          ? 'text-slate-700 group-hover:text-slate-900'
                          : 'text-slate-900 group-hover:text-blue-600'
                      }`}>
                        {incident.title}
                      </h4>
                      <p className={`text-[11px] mt-0.5 line-clamp-1 ${isInactive ? 'text-slate-400' : 'text-slate-500'}`}>
                        📍 {incident.location}, {incident.district}, {incident.state}
                      </p>
                      <p className={`text-[11px] mt-2 line-clamp-2 leading-relaxed ${
                        isInactive ? 'text-slate-500' : 'text-slate-600'
                      }`}>
                        {incident.description}
                      </p>
                    </div>

                    <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${
                      isInactive ? 'border-slate-200 text-slate-400' : 'border-slate-100 text-slate-500'
                    }`}>
                      <span className="font-medium">
                        {(incident.affectedPopulation || 0).toLocaleString()} affected
                      </span>
                      <span className={`flex items-center gap-1 font-bold group-hover:translate-x-0.5 transition-transform ${
                        isInactive ? 'text-slate-600 group-hover:text-slate-800' : 'text-blue-600'
                      }`}>
                        View Analysis <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {incidentsAtLevel.length > 4 && (
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-center">
                <button
                  onClick={() => toggleLevelExpansion(level)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  {isExpanded ? (
                    <>Show Less <ChevronUp size={14} /></>
                  ) : (
                    <>Show {incidentsAtLevel.length - 4} More Disasters <ChevronDown size={14} /></>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </motion.div>
  );
};
