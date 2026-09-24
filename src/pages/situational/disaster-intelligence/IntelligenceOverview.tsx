import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { ChevronRight, ChevronDown, ChevronUp, BarChart3, AlertCircle, Sparkles } from 'lucide-react';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
import { disasterLevelInfo } from '../../../constants/components/disasterLevels';
import type { IntelligenceOverviewProps } from '../../../types';
import { itemAnim, MINIMAL_STATUS_FILTERS, SEVERITY_COLORS } from '../../../constants';
import { CustomChartTooltip } from '../../../components/ui/situational/CustomChartTooltip';

export const IntelligenceOverview: React.FC<IntelligenceOverviewProps> = ({ onSelectInsight, incidents }) => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'resolved'>('active');
  const [showChart, setShowChart] = useState(false);
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({});

  // Incidents that have moved past Unverified or have impact data
  const tracked = (incidents || []).filter(
    (i) => i && (i.status !== 'Unverified' || (i.impactTimeline && i.impactTimeline.length > 0))
  );

  const activeTracked = tracked.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected');
  const resolvedTracked = tracked.filter((i) => i.status === 'Resolved');

  const filtered = tracked.filter((i) => {
    if (statusFilter === 'active') return i.status !== 'Resolved' && i.status !== 'Rejected';
    if (statusFilter === 'resolved') return i.status === 'Resolved';
    return true;
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
    <motion.div variants={itemAnim} className="space-y-4">
      {/* Minimalist Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          {MINIMAL_STATUS_FILTERS.map((f) => {
            const count =
              f.id === 'active' ? activeTracked.length : f.id === 'resolved' ? resolvedTracked.length : tracked.length;

            return (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${statusFilter === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${statusFilter === f.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                >
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <BarChart3 size={13} className="text-blue-600" />
            <span>{showChart ? 'Hide Chart' : 'Priority Ranking Chart'}</span>
            {showChart ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
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
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-600" /> AI Severity & Priority Score Matrix
                </h3>
                <p className="text-[11px] text-slate-500">Real-time composite urgency ranking across active incident sectors</p>
              </div>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grouped Disaster Levels List */}
      <div className="space-y-4">
        {levelOrder.map((level) => {
          const levelIncidents = ranked.filter((i) => i.disasterLevel === level);
          if (levelIncidents.length === 0) return null;

          const info = disasterLevelInfo[level as keyof typeof disasterLevelInfo];
          const isExpanded = expandedLevels[level] ?? true;

          return (
            <div key={level} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <button
                onClick={() => toggleLevelExpansion(level)}
                className="w-full px-4 py-3 bg-slate-50/75 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${level.includes('3') ? 'bg-red-500' : level.includes('2') ? 'bg-purple-500' : 'bg-blue-500'}`} />
                  <span className="text-xs font-bold text-slate-900">{level}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
                    {levelIncidents.length}
                  </span>
                </div>
                <div className="text-slate-400">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Level description shown below header always */}
              {info?.desc && (
                <div className="px-4 py-2 bg-slate-50/40 border-b border-slate-100">
                  <p className="text-[11px] text-slate-500 leading-relaxed">{info.desc}</p>
                </div>
              )}

              {isExpanded && (
                <div className="divide-y divide-slate-100">
                  {levelIncidents.map((incident) => {
                    const priorityScore = incident.aiPriorityScore || 75;
                    const isHighPriority = priorityScore >= 80;

                    return (
                      <div
                        key={incident.id}
                        onClick={() => onSelectInsight(incident)}
                        className="p-4 hover:bg-blue-50/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {incident.displayId || incident.id}
                            </span>
                            <DisasterBadge type="severity" value={incident.severity} />
                            <span className="text-xs font-semibold text-slate-600">· {incident.type}</span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {incident.title}
                          </h4>

                          <p className="text-xs text-slate-500">
                            {incident.location}, {incident.district}, {incident.state}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 sm:border-l sm:border-slate-100 sm:pl-4">
                          <div className="text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">AI Priority</span>
                              <span
                                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${isHighPriority
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-blue-100 text-blue-700 border border-blue-200'
                                  }`}
                              >
                                {priorityScore.toFixed(1)}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {incident.affectedPopulation.toLocaleString()} people at risk
                            </span>
                          </div>

                          <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-500 transition-colors shrink-0">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
