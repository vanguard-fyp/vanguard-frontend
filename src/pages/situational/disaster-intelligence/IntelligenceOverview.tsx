import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { ChevronRight, ChevronDown, ChevronUp, BarChart3, AlertCircle, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { AssessmentStatusBadge } from '../../../components/ui/situational/AssessmentStatus';
import { PaginationBar } from '../../../components/ui/shared/PaginationBar';
import { useIntelligenceOverview } from '../../../hooks';
import { useAssessPending } from '../../../hooks/useIntelligence';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { clampPage, pageCount, pageOffset } from '../../../hooks/usePagination';
import { fmtNumber, isNum, relativeTime } from '../../../utils/display';
import { factState } from '../../../utils/facts';
import type { IntelligenceOverviewProps } from '../../../types';
import { itemAnim, MINIMAL_STATUS_FILTERS, SEVERITY_COLORS } from '../../../constants';
import { CustomChartTooltip } from '../../../components/ui/situational/CustomChartTooltip';
import { disasterLevelInfo } from '../../../constants/components/disasterLevels';

const PAGE_SIZE = 30;
const UNCLASSIFIED = 'Level not declared';
const LEVEL_ORDER = ['Level 3: Federal', 'Level 2: State', 'Level 1: District', UNCLASSIFIED] as const;

/** The officer-declared NADMA level; never inferred from the AI score. */
function declaredLevel(incident: { disaster_level?: string | null }): string {
  return incident.disaster_level && disasterLevelInfo[incident.disaster_level] ? incident.disaster_level : UNCLASSIFIED;
}

/**
 * Ranked incident overview organized by NADMA operational levels (Level 3, 2, 1).
 */
export const IntelligenceOverview: React.FC<IntelligenceOverviewProps> = ({ onSelectInsight }) => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'resolved'>('active');
  const [pageIndex, setPageIndex] = useState(0);
  const [showChart, setShowChart] = useState(false);
  const [collapsedLevels, setCollapsedLevels] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError, isFetching, refetch } = useIntelligenceOverview(
    statusFilter,
    PAGE_SIZE,
    pageOffset(pageIndex, PAGE_SIZE)
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const { hasPermission } = useAuth();
  const toast = useToast();
  const assessPending = useAssessPending();
  // Incidents on this page that have never produced a usable assessment.
  const unassessed = items.filter((it) => it.analysis_state === 'not_analysed' || it.analysis_state === 'failed').length;
  const runAssessPending = () =>
    assessPending.mutate(false, {
      onSuccess: (r) =>
        r.queued > 0
          ? toast.success(`Analysing ${r.queued} incident${r.queued === 1 ? '' : 's'}`, 'Runs one at a time; scores appear as each finishes.')
          : toast.success('Nothing to analyse', 'Every active incident already has a usable assessment.'),
      onError: (e) => toast.error('Could not start the analysis', e instanceof Error ? e.message : 'Please retry.'),
    });

  React.useEffect(() => {
    if (data && pageIndex > 0) {
      const clamped = clampPage(pageIndex, total, PAGE_SIZE);
      if (clamped !== pageIndex) setPageIndex(clamped);
    }
  }, [data, pageIndex, total]);

  const chartData = items
    .filter((it) => isNum(it.assessment?.priority_score))
    .map((it) => ({
      name: it.incident.display_id || it.incident.district || 'Incident',
      detail: `${it.incident.title} · ${it.incident.district}`,
      score: it.assessment!.priority_score as number,
      severity: it.incident.severity ?? 'Medium',
    }));

  const changeFilter = (f: typeof statusFilter) => {
    setStatusFilter(f);
    setPageIndex(0);
  };

  return (
    <motion.div variants={itemAnim} className="space-y-5 max-w-[1400px]">
      {/* Filter and Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          {MINIMAL_STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => changeFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === f.id ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[10px] text-slate-400 font-medium">
              Updated {relativeTime(data.generated_at) ?? '—'}
            </span>
          )}
          {hasPermission('MANAGE_INCIDENTS') && unassessed > 0 && (
            <button
              onClick={runAssessPending}
              disabled={assessPending.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {assessPending.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Analyse {unassessed} unassessed
            </button>
          )}
          <button
            onClick={() => refetch()}
            title="Refresh"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin text-slate-400' : 'text-slate-600'} />
          </button>
          {chartData.length > 0 && (
            <button
              onClick={() => setShowChart((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <BarChart3 size={13} className="text-blue-600" />
              <span>{showChart ? 'Hide Chart' : 'Priority Chart'}</span>
              {showChart ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Priority Bar Chart (Collapsible) */}
      <AnimatePresence>
        {showChart && chartData.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">AI Priority Score by Incident</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">0–100</span>
              </div>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="score" name="Priority" radius={[4, 4, 0, 0]} barSize={26}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={SEVERITY_COLORS[entry.severity] || '#2563eb'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grouped by Disaster Operational Level: Level 3, Level 2, Level 1 */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading ranked incidents…
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-xs text-red-800">
          The intelligence overview could not be loaded.{' '}
          <button onClick={() => refetch()} className="underline font-semibold cursor-pointer">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No active incidents in this view</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            Incidents are tracked and categorized under NADMA Operational Levels (Level 1 District, Level 2 State, Level 3 Federal) once reported and verified.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {LEVEL_ORDER.map((level) => {
            const info = disasterLevelInfo[level] ?? { desc: 'No NADMA level has been declared for these incidents yet.' };
            const incidentsAtLevel = items.filter((it) => declaredLevel(it.incident) === level);
            if (incidentsAtLevel.length === 0) return null;

            const isCollapsed = collapsedLevels[level] ?? false;
            const dotColor = level.includes('Level 3')
              ? 'bg-red-600'
              : level.includes('Level 2')
              ? 'bg-purple-600'
              : 'bg-blue-600';

            return (
              <div key={level} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                {/* Level Section Header */}
                <div
                  onClick={() => setCollapsedLevels((p) => ({ ...p, [level]: !isCollapsed }))}
                  className="flex items-center justify-between cursor-pointer select-none group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {level}
                      </h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {incidentsAtLevel.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">
                      {info.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="p-1 rounded-lg text-slate-400 group-hover:text-slate-600 transition-colors"
                  >
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>

                {/* 1 Clean Row Per Incident */}
                {!isCollapsed && (
                  <div className="mt-4 space-y-3">
                    {incidentsAtLevel.map(({ incident, assessment, priority_rank, analysis_state }) => {
                      // incident_assessments is the source of truth for AI values.
                      const score = isNum(assessment?.priority_score) ? (assessment!.priority_score as number) : null;
                      const conf = isNum(assessment?.confidence_score) ? (assessment!.confidence_score as number) : null;
                      const reportedAffected =
                        factState(incident, 'affected_population') !== 'unknown' && isNum(incident.affected_population) && incident.affected_population > 0
                          ? incident.affected_population
                          : null;
                      const modelled = assessment?.estimated_affected_population ?? assessment?.population?.estimated_exposed_population ?? null;

                      const scoreColor =
                        score == null ? 'text-slate-400' : score >= 80 ? 'text-red-600' : score >= 60 ? 'text-amber-600' : 'text-blue-600';

                      const sevColor =
                        incident.severity === 'Critical'
                          ? 'text-red-600'
                          : incident.severity === 'High'
                          ? 'text-orange-600'
                          : incident.severity === 'Medium'
                          ? 'text-amber-600'
                          : 'text-slate-600';

                      const sevDot =
                        incident.severity === 'Critical'
                          ? 'bg-red-600'
                          : incident.severity === 'High'
                          ? 'bg-orange-600'
                          : incident.severity === 'Medium'
                          ? 'bg-amber-600'
                          : 'bg-slate-400';

                      return (
                        <div
                          key={incident.id}
                          onClick={() => onSelectInsight(incident.id)}
                          className="bg-white border border-slate-100 hover:border-slate-300 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-4 group"
                        >
                          {/* Left Column: Metadata, Title, Location */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs mb-1">
                              <span className="font-mono text-slate-400 font-semibold">
                                {incident.display_id || incident.id}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className={`flex items-center gap-1 font-bold ${sevColor}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sevDot}`} />
                                {incident.severity || 'Severity not set'}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-500 font-medium">
                                {incident.type || 'Disaster'}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {incident.title}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {[incident.location, incident.district, incident.state]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>

                          {/* Right Column: AI Priority, Confidence, Exposed Population, Arrow */}
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              {score != null ? (
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {isNum(priority_rank) && <span className="mr-1.5 text-slate-500">#{priority_rank}</span>}
                                  AI priority
                                  <span className={`text-sm font-black font-mono ml-1 ${scoreColor}`}>{Math.round(score)}</span>
                                  <span className="text-slate-400">/100</span>
                                </div>
                              ) : (
                                <AssessmentStatusBadge state={analysis_state} />
                              )}
                              {conf != null && (
                                <div className="text-[10px] text-slate-500 mt-0.5" title="Share of scoring inputs that were reported rather than defaulted — not a probability">
                                  Input completeness {conf}%
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                {reportedAffected != null
                                  ? `${fmtNumber(reportedAffected)} affected (reported)`
                                  : modelled != null
                                    ? `~${fmtNumber(modelled)} exposed (model estimate)`
                                    : 'Affected population not reported'}
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-blue-400 group-hover:text-blue-600 transition-all">
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
      )}

      {data && total > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xs">
          <PaginationBar
            pageIndex={pageIndex}
            pageCount={pageCount(total, PAGE_SIZE)}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPageIndex}
            isFetching={isFetching}
            label="incidents"
          />
        </div>
      )}
    </motion.div>
  );
};
