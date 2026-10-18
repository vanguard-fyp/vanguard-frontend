import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown, RefreshCw, Loader2, Sparkles } from 'lucide-react';
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
import { itemAnim } from '../../../constants';
import { disasterLevelInfo } from '../../../constants/components/disasterLevels';
import { WiderEventsPanel } from '../../../components/ui/situational/WiderEventsPanel';
import { Tag, TONE, SEVERITY_TONE, LevelTag, StatusTag, type Tone } from '../../../components/ui/shared/Tag';
import { Bone } from '../../../components/ui/dashboard/Panel';

const PAGE_SIZE = 30;
const UNCLASSIFIED = 'Level not declared';
const LEVEL_ORDER = ['Level 3: Federal', 'Level 2: State', 'Level 1: District', UNCLASSIFIED] as const;
const FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'all', label: 'All tracked' },
  { id: 'resolved', label: 'Resolved' },
] as const;

/** The officer-declared NADMA level; never inferred from the AI score. */
function declaredLevel(incident: { disaster_level?: string | null }): string {
  return incident.disaster_level && disasterLevelInfo[incident.disaster_level] ? incident.disaster_level : UNCLASSIFIED;
}

/** Priority bands, the same thresholds everywhere on this page. */
const BANDS: { id: 'high' | 'elevated' | 'watch' | 'unscored'; label: string; tone: Tone; test: (s: number | null) => boolean }[] = [
  { id: 'high', label: 'High (80+)', tone: 'red', test: (s) => s != null && s >= 80 },
  { id: 'elevated', label: 'Elevated (60–79)', tone: 'orange', test: (s) => s != null && s >= 60 && s < 80 },
  { id: 'watch', label: 'Watch (under 60)', tone: 'blue', test: (s) => s != null && s < 60 },
  { id: 'unscored', label: 'Not scored yet', tone: 'slate', test: (s) => s == null },
];
const bandOf = (s: number | null) => BANDS.find((b) => b.test(s))!;

/**
 * Ranked incidents, grouped by the declared NADMA level (Level 3 → 1).
 * The summary up top answers "how many need attention"; each row answers
 * "what is it, how many people, how urgent".
 */
export const IntelligenceOverview: React.FC<IntelligenceOverviewProps> = ({ onSelectInsight }) => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'resolved'>('active');
  const [pageIndex, setPageIndex] = useState(0);
  const [collapsedLevels, setCollapsedLevels] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } = useIntelligenceOverview(statusFilter, PAGE_SIZE, pageOffset(pageIndex, PAGE_SIZE));
  // Totals for each tab (one row each; only `total` is used).
  const activeCount = useIntelligenceOverview('active', 1, 0).data?.total;
  const allCount = useIntelligenceOverview('all', 1, 0).data?.total;
  const resolvedCount = useIntelligenceOverview('resolved', 1, 0).data?.total;
  const tabCount: Record<typeof statusFilter, number | undefined> = { active: activeCount, all: allCount, resolved: resolvedCount };
  // The previous filter's rows stay on screen while the new ones load: say so.
  const switching = isPlaceholderData && isFetching;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const { hasPermission } = useAuth();
  const toast = useToast();
  const assessPending = useAssessPending();
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

  const scoreOf = (it: (typeof items)[number]) => (isNum(it.assessment?.priority_score) ? Math.round(it.assessment!.priority_score as number) : null);
  const reportedOf = (it: (typeof items)[number]) =>
    factState(it.incident, 'affected_population') !== 'unknown' && isNum(it.incident.affected_population) && it.incident.affected_population > 0
      ? it.incident.affected_population
      : null;
  
  const changeFilter = (f: typeof statusFilter) => {
    setStatusFilter(f);
    setPageIndex(0);
  };

  return (
    <motion.div variants={itemAnim} className="space-y-5">
      {/* Filters and actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Incidents shown" className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
          {FILTERS.map((f) => {
            const on = statusFilter === f.id;
            return (
              <button key={f.id} role="tab" aria-selected={on} onClick={() => changeFilter(f.id)}
                className={`relative inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${on ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
                {on && <motion.span layoutId="overview-filter" className="absolute inset-0 bg-white rounded-md shadow-[0_1px_2px_rgba(15,23,42,.08)]" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} />}
                <span className="relative">{f.label}</span>
                {tabCount[f.id] != null && (
                  <span className={`relative ml-1.5 min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${on ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-500'}`}>
                    {tabCount[f.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {data && <span className="text-[11px] text-slate-400">Updated {relativeTime(data.generated_at) ?? 'just now'}</span>}
          {hasPermission('MANAGE_INCIDENTS') && unassessed > 0 && (
            <button onClick={runAssessPending} disabled={assessPending.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60">
              {assessPending.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Analyse {unassessed} not yet scored
            </button>
          )}
          <button onClick={() => refetch()} title="Refresh" aria-label="Refresh"
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
            <RefreshCw size={13} className={isFetching ? 'animate-spin text-slate-400' : 'text-slate-600'} />
          </button>
        </div>
      </div>

      <div className={`space-y-5 transition-opacity duration-200 ${switching ? 'opacity-40 pointer-events-none' : ''}`} aria-busy={switching}>
      {statusFilter !== 'resolved' && <WiderEventsPanel onSelectIncident={onSelectInsight} />}

      {isLoading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3">
          {[0, 1, 2, 3].map((i) => <Bone key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-sm text-slate-600">
          The priority overview could not be loaded.{' '}
          <button onClick={() => refetch()} className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">No incidents in this view</p>
          <p className="text-xs text-slate-400 mt-1">Verified incidents appear here, ranked by AI priority.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {LEVEL_ORDER.map((level) => {
            const rows = items.filter((it) => declaredLevel(it.incident) === level);
            if (rows.length === 0) return null;
            const info = disasterLevelInfo[level] ?? { desc: 'No NADMA level has been declared for these incidents yet.' };
            // Only the highest declared level starts open (normally L3); officers open the others.
            const firstLevel = LEVEL_ORDER.find((l) => items.some((it) => declaredLevel(it.incident) === l));
            const isCollapsed = collapsedLevels[level] ?? level !== firstLevel;
            const topScore = Math.max(...rows.map((r) => scoreOf(r) ?? -1));
            return (
              <section key={level} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
                <button type="button" aria-expanded={!isCollapsed}
                  onClick={() => setCollapsedLevels((p) => ({ ...p, [level]: !isCollapsed }))}
                  title={info.desc}
                  className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-50/60 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      {level === UNCLASSIFIED ? <Tag variant="outline" dot={false}>No level</Tag> : <LevelTag level={level} />}
                      <span className="text-xs font-semibold text-slate-500 tabular-nums">{rows.length} incident{rows.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                  {isCollapsed && topScore >= 0 && (
                    <span className="ml-auto text-xs text-slate-500">Top priority <span className="font-semibold tabular-nums" style={{ color: TONE[bandOf(topScore).tone] }}>{topScore}</span></span>
                  )}
                  <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>

                {!isCollapsed && (
                  <>
                    <div className="hidden md:grid grid-cols-[40px_minmax(0,1fr)_150px_180px_20px] gap-4 px-6 py-2 border-y border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-500">
                      <span>Rank</span><span>Incident</span><span>People</span><span>AI priority</span><span />
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {rows.map((it) => {
                        const { incident, assessment, priority_rank, analysis_state } = it;
                        const closed = incident.status === 'Resolved' || incident.status === 'Rejected' || incident.status === 'Archived';
                        const score = scoreOf(it);
                        const band = bandOf(score);
                        const reported = reportedOf(it);
                        const modelled = assessment?.estimated_affected_population ?? assessment?.population?.estimated_exposed_population ?? null;
                        return (
                          <li key={incident.id}>
                            <button type="button" onClick={() => onSelectInsight(incident.id)}
                              className={`group w-full text-left px-5 sm:px-6 py-3.5 grid grid-cols-[32px_minmax(0,1fr)_auto] md:grid-cols-[40px_minmax(0,1fr)_150px_180px_20px] gap-x-4 gap-y-2 items-center transition-colors cursor-pointer ${closed ? 'bg-slate-50/60 hover:bg-slate-50' : 'hover:bg-slate-50/70'}`}>
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold tabular-nums ${isNum(priority_rank) ? 'bg-slate-100 text-slate-700' : 'text-slate-300'}`}>
                                {isNum(priority_rank) ? priority_rank : '–'}
                              </span>

                              <div className="min-w-0">
                                <p className={`text-sm font-semibold truncate group-hover:text-blue-700 transition-colors ${closed ? 'text-slate-500' : 'text-slate-900'}`}>{incident.title}</p>
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
                                  {closed
                                    ? <Tag tone={incident.status === 'Resolved' ? 'teal' : 'slate'}>{incident.status}</Tag>
                                    : <>
                                        {incident.severity && <Tag tone={SEVERITY_TONE[incident.severity] ?? 'slate'}>{incident.severity}</Tag>}
                                        <StatusTag status={incident.status} />
                                      </>}
                                  <span className="truncate">{incident.type || 'Disaster'} · {[incident.district, incident.state].filter(Boolean).join(', ')}</span>
                                </div>
                                {(assessment?.credibility?.verdict === 'Possibly false' || assessment?.scoring?.wider_event) && (
                                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                    {assessment?.credibility?.verdict === 'Possibly false' && (
                                      <Tag tone="red" title={assessment.credibility.suggestion ?? undefined}>Evidence does not support it</Tag>
                                    )}
                                    {assessment?.scoring?.wider_event && (
                                      <Tag variant="outline" tone="indigo" className="max-w-full truncate text-[11px]">
                                        Part of a {assessment.scoring.wider_event.incident_count}-incident event
                                      </Tag>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* People */}
                              <div className="hidden md:block text-xs">
                                {reported != null ? (
                                  <><p className="font-semibold text-slate-900 tabular-nums">{fmtNumber(reported)}</p><p className="text-slate-400">reported</p></>
                                ) : modelled != null ? (
                                  <><p className="font-semibold text-slate-700 tabular-nums">~{fmtNumber(modelled)}</p><p className="text-slate-400">estimated</p></>
                                ) : (
                                  <p className="text-slate-400">Not reported</p>
                                )}
                              </div>

                              {/* AI priority */}
                              <div className="col-start-3 row-start-1 md:col-start-auto md:row-start-auto text-right md:text-left shrink-0 pl-2 self-start">
                                {score != null ? (
                                  <>
                                    <div className="flex items-baseline justify-end md:justify-start gap-1">
                                      <span className="text-base sm:text-lg font-bold tabular-nums" style={{ color: TONE[band.tone] }}>{score}</span>
                                      <span className="text-[10px] sm:text-[11px] text-slate-400">/100</span>
                                    </div>
                                    <div className="hidden md:block mt-1 h-1.5 w-full max-w-[150px] rounded-full bg-slate-100 overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${score}%`, background: TONE[band.tone] }} />
                                    </div>
                                  </>
                                ) : (
                                  <AssessmentStatusBadge state={analysis_state} />
                                )}
                              </div>

                              <ChevronRight size={16} className="hidden md:block text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}

      </div>

      {data && total > PAGE_SIZE && (
        <PaginationBar
          pageIndex={pageIndex}
          pageCount={pageCount(total, PAGE_SIZE)}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPageIndex}
          isFetching={isFetching}
          label="incidents"
        />
      )}
    </motion.div>
  );
};
