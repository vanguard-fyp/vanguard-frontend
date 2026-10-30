import { DataRegion } from '../../../components/common/DataRegion';
import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileSearch,
  ListChecks,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  Send,
  Users,
  XCircle,
} from 'lucide-react';
import { Tag, TONE, type Tone } from '../../../components/ui/shared/Tag';
import { Bone } from '../../../components/ui/dashboard/Panel';
import { AssessmentStatusBadge } from '../../../components/ui/situational/AssessmentStatus';
import { ImpactTimeline } from '../../../components/ui/situational/ImpactTimeline';
import { IN_FLIGHT, useIncident, useIncidentAssessment, useReassessIncident } from '../../../hooks';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { formatFullLocation } from '../../../utils/locationFormatter';
import { formatDateTime } from '../../../utils/dateFormatter';
import { factState } from '../../../utils/facts';
import { fmtDecimal, fmtNumber, isNum, newIdempotencyKey, relativeTime } from '../../../utils/display';
import { buildPredictiveTimeline, factorInputText, rankingDrivers } from '../../../utils/intelligenceView';
import type { AIInsightDetailViewProps, IncidentAssessment, PriorityFactor } from '../../../types';

const USABLE = ['completed', 'partial', 'insufficient_evidence'] as const;

/** Panel in the app's style: small uppercase title over a hairline. */
const Card: React.FC<{ title: string; note?: string; children: React.ReactNode; className?: string }> = ({ title, note, children, className = '' }) => (
  <section className={`bg-white border border-slate-200/80 rounded-2xl flex flex-col ${className}`}>
    <header className="px-5 sm:px-6 pt-5 pb-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">{title}</h2>
      {note && <span className="text-[11px] text-slate-400">{note}</span>}
    </header>
    <div className="px-5 sm:px-6 py-5 flex-1">{children}</div>
  </section>
);

/** A small labelled figure inside a panel. */
const Fig: React.FC<{ label: string; value: React.ReactNode; color?: string }> = ({ label, value, color }) => (
  <div className="rounded-xl bg-slate-50 px-3 py-2.5">
    <dt className="text-[11px] text-slate-500">{label}</dt>
    <dd className="text-base font-bold tabular-nums mt-0.5" style={{ color: color ?? '#0f172a' }}>{value}</dd>
  </div>
);

/** Priority score as a ring on the navy header. */
const ScoreRing: React.FC<{ score: number | null; color: string }> = ({ score, color }) => {
  const r = 44, c = 2 * Math.PI * r;
  return (
    <div className="relative w-[104px] h-[104px] shrink-0" role="img" aria-label={score != null ? `AI priority ${score} out of 100` : 'Not scored yet'}>
      <svg viewBox="0 0 104 104" className="w-full h-full -rotate-90">
        <circle cx="52" cy="52" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
        {score != null && (
          <circle cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)' }} />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-extrabold tabular-nums leading-none" style={{ color: score != null ? '#fff' : '#94a3b8' }}>{score ?? '—'}</span>
        <span className="text-[10px] text-slate-400 mt-0.5">{score != null ? 'of 100' : 'not scored'}</span>
      </span>
    </div>
  );
};

/** The page's own shape while the incident loads. */
const InsightSkeleton: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="max-w-7xl mx-auto space-y-5 pb-12" aria-busy="true" aria-label="Loading the AI assessment">
    <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
      <ArrowLeft size={15} /> Priority overview
    </button>
    <div className="rounded-2xl px-7 py-6 flex items-center justify-between gap-6" style={{ background: '#1e293b' }}>
      <div className="flex-1 space-y-3">
        <span className="block h-5 w-32 rounded bg-white/10 animate-pulse" />
        <span className="block h-7 w-3/4 rounded bg-white/10 animate-pulse" />
        <span className="block h-4 w-1/2 rounded bg-white/10 animate-pulse" />
      </div>
      <span className="w-[104px] h-[104px] rounded-full bg-white/10 animate-pulse shrink-0" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 space-y-2"><Bone className="h-3 w-24" /><Bone className="h-7 w-16" /><Bone className="h-2.5 w-20" /></div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3">{[0, 1, 2, 3].map((i) => <Bone key={i} className="h-4 w-full" />)}</div>
      <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3"><Bone className="h-5 w-20" /><Bone className="h-4 w-full" /><Bone className="h-4 w-4/5" /></div>
    </div>
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6"><Bone className="h-56 w-full" /></div>
  </div>
);

const ON_NAVY_SEVERITY: Record<string, string> = { Critical: '#fca5a5', High: '#fdba74', Medium: '#fcd34d', Low: '#cbd5e1' };

/** "A. B. C." -> ["A.", "B.", "C."] so a long AI rationale reads as a list. */
const sentences = (text: string) =>
  text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z])/).map((x) => x.trim()).filter(Boolean);

const shortAspect = (label: string) =>
  label.replace('Affected population', 'Population').replace('Infrastructure damage', 'Infrastructure').replace('Access difficulty', 'Access');

/**
 * Structured AI analysis of one incident. Every value comes from the persisted
 * incident and its latest usable assessment (incident_assessments is the source
 * of truth); missing values are stated, never filled in.
 */
export const AIInsightDetailView: React.FC<AIInsightDetailViewProps> = ({ incidentId, onBack }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const incidentQuery = useIncident(incidentId);
  const { data: incident, isLoading: isLoadingIncident } = incidentQuery;
  const { data: envelope, isLoading: isLoadingAssessment, isError: isAssessmentError, refetch } = useIncidentAssessment(incidentId);
  const reassess = useReassessIncident();
  // One key per re-assess intent: retries reuse it, so the backend never starts a duplicate run.
  const reassessKey = useRef(newIdempotencyKey('reassess'));

  const current = envelope?.current ?? null;
  const inFlight = !!current && IN_FLIGHT.includes(current.status);
  const a: IncidentAssessment | null =
    current && (USABLE as readonly string[]).includes(current.status) ? current : envelope?.last_usable ?? null;
  const showingPrevious = !!a && !!current && a.id !== current.id;
  const canReassess = hasPermission('MANAGE_INCIDENTS');

  const timeline = useMemo(
    () => buildPredictiveTimeline(incident?.impact_timeline, a?.forecast, a?.completed_at ?? a?.created_at),
    [incident?.impact_timeline, a]
  );
  const drivers = useMemo(() => rankingDrivers(a?.scoring?.factors), [a]);

  const handleReassess = () =>
    reassess.mutate(
      { incidentId, key: reassessKey.current },
      {
        onSuccess: () => {
          reassessKey.current = newIdempotencyKey('reassess');
          toast.success('Re-assessment requested', 'The analysis will refresh automatically when it completes.');
        },
        onError: (e) => toast.error('Re-assessment failed', e instanceof Error ? e.message : 'Please retry.'),
      }
    );

  if (isLoadingIncident) return <InsightSkeleton onBack={onBack} />;
  // A failed refresh with a cached incident still renders it (DataRegion warns).
  if (!incident) {
    return (
      <div className="max-w-6xl mx-auto space-y-3">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
          <ArrowLeft size={15} /> Back to intelligence overview
        </button>
        <p className="text-sm text-red-700 font-semibold">This incident could not be loaded.</p>
      </div>
    );
  }

  const forecast = a?.forecast ?? null;
  const access = a?.access_constraints ?? {};
  const impact = a?.impact_analysis ?? {};
  const decision = a?.decision_recommendation ?? {};
  const rescue = a?.rescue_recommendation ?? {};
  const pop = a?.population ?? {};
  const affectedKnown = factState(incident, 'affected_population') !== 'unknown';
  const accessKnown = factState(incident, 'accessibility_score') !== 'unknown';
  const reportedAffected = affectedKnown && incident.affected_population > 0 ? incident.affected_population : null;
  const modelledExposed = a?.estimated_affected_population ?? pop.estimated_exposed_population ?? null;
  const factors: PriorityFactor[] = a?.scoring?.factors ?? [];
  const radarData = factors.map((f) => ({ aspect: shortAspect(f.label), rating: Math.round(f.factor * 100) }));
  const defaulted = factors.filter((f) => f.source === 'default');
  const top = drivers.slice(0, 2);
  const score = isNum(a?.priority_score) ? Math.round(a!.priority_score as number) : null;
  const rank = isNum(envelope?.priority_rank) ? envelope!.priority_rank! : null;
  const evidenceOk = (a?.evidence ?? []).filter((e) => e.status === 'available').length;

  const urgencyTone: Tone =
    decision.urgency === 'Immediate' || decision.urgency === 'Within 6h' ? 'red' : decision.urgency === 'Monitor' ? 'slate' : 'amber';
  const urgencyText = decision.urgency === 'Immediate' ? 'Act now' : decision.urgency === 'Monitor' ? 'Monitor' : decision.urgency ? `Act ${decision.urgency.toLowerCase()}` : null;

  const points: { tone: Tone; text: React.ReactNode }[] = [];
  if (score != null) points.push({ tone: 'blue', text: <>Priority <strong>{score}/100</strong>{rank ? <> · ranked <strong>#{rank}</strong> of {envelope!.ranked_incidents} active incidents</> : null}.</> });
  if (reportedAffected != null) points.push({ tone: 'indigo', text: <><strong>{fmtNumber(reportedAffected)}</strong> people reported affected.</> });
  else if (modelledExposed != null) points.push({ tone: 'indigo', text: <>About <strong>{fmtNumber(modelledExposed)}</strong> people may be exposed (model estimate, none reported yet).</> });
  top.forEach((f) => points.push({ tone: 'blue', text: <><strong>{f.label}</strong> drives the score: {factorInputText(f)}.</> }));
  if (a?.credibility?.verdict === 'Possibly false') points.push({ tone: 'red', text: <><strong>Possible false alarm:</strong> independent evidence does not support this report.</> });
  if (a?.scoring?.wider_event) points.push({ tone: a.scoring.wider_event.under_declared ? 'red' : 'indigo', text: <>Part of <strong>{a.scoring.wider_event.title}</strong> ({a.scoring.wider_event.incident_count} incidents){a.scoring.wider_event.under_declared ? <>; its spread suggests {a.scoring.wider_event.suggested_level}</> : null}.</> });
  if (defaulted.length) points.push({ tone: 'amber', text: <>{defaulted.length} input{defaulted.length === 1 ? '' : 's'} not reported, so a default was used: {defaulted.map((f) => shortAspect(f.label).toLowerCase()).join(', ')}.</> });
  const rationale = decision.rationale ? sentences(decision.rationale) : [];

  return (
    <DataRegion queries={[incidentQuery]} label="Page data"><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
          <ArrowLeft size={15} /> Priority overview
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {canReassess && (
            <button onClick={handleReassess} disabled={inFlight || reassess.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
              {inFlight || reassess.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} style={{ color: TONE.indigo }} />}
              {inFlight ? 'Analysing…' : 'Re-assess'}
            </button>
          )}
          <button onClick={() => navigate(`/situational/incidents/${incident.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
            <FileSearch size={13} style={{ color: TONE.blue }} /> Incident record
          </button>
          <button onClick={() => navigate(`/response/rescue?incidentId=${incident.id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
            <Send size={13} /> Dispatch teams
          </button>
        </div>
      </div>

      {/* 1. What it is, where, and how urgent */}
      <section className="rounded-2xl text-white overflow-hidden" style={{ background: '#1e293b' }}>
        <div className="px-6 py-6 sm:px-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-[12px]">
              {incident.display_id && <span className="text-slate-400 tabular-nums">{incident.display_id}</span>}
              {incident.type && <span className="text-slate-400">· {incident.type}</span>}
            </div>
            <h1 className="mt-3 text-2xl sm:text-[28px] font-extrabold tracking-tight leading-[1.15] text-balance">{incident.title}</h1>
            <p className="mt-2 text-sm text-slate-300 flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0" style={{ color: '#93c5fd' }} />
              {formatFullLocation(incident.location, incident.district, incident.state, incident.administrative_district)}
            </p>
            <div className="mt-4 flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold bg-white/10" style={{ color: ON_NAVY_SEVERITY[incident.severity] ?? '#cbd5e1' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: ON_NAVY_SEVERITY[incident.severity] ?? '#cbd5e1' }} />{incident.severity}
              </span>
              <span className="inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold text-slate-200 ring-1 ring-inset ring-white/15">{incident.disaster_level}</span>
              <span className="inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold text-slate-200 ring-1 ring-inset ring-white/15">{incident.status}</span>
            </div>
          </div>

          {/* Priority ring */}
          <div className="flex items-center gap-4 shrink-0">
            {isLoadingAssessment ? (
              <span className="w-[104px] h-[104px] rounded-full bg-white/10 animate-pulse" />
            ) : (
              <ScoreRing score={score} color={score != null ? (score >= 80 ? '#f87171' : score >= 60 ? '#fb923c' : '#60a5fa') : '#64748b'} />
            )}
            <div className="text-xs">
              <p className="text-slate-400">AI priority</p>
              <p className="mt-0.5 text-sm font-semibold text-white">{rank ? <>Rank #{rank}</> : 'Not ranked'}</p>
              {rank && <p className="text-slate-400">of {envelope!.ranked_incidents} active incidents</p>}
            </div>
          </div>
        </div>
        <div className="px-6 sm:px-7 py-3 bg-black/15 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-300">
          {isLoadingAssessment ? (
            <span className="h-3 w-48 rounded bg-white/10 animate-pulse" />
          ) : isAssessmentError ? (
            <span className="text-red-300 font-semibold">Assessment unavailable. <button onClick={() => refetch()} className="underline cursor-pointer">Retry</button></span>
          ) : !current && !a ? (
            <span className="flex items-center gap-2"><AssessmentStatusBadge state="not_analysed" />Not analysed yet{canReassess ? '; use Re-assess' : ''}.</span>
          ) : (
            <>
              {current && <AssessmentStatusBadge state={current.status} />}
              {a && <span className="flex items-center gap-1.5"><Clock size={12} /> Assessed {relativeTime(a.completed_at) ?? 'at an unknown time'}{a.completed_at ? ` · ${formatDateTime(a.completed_at)}` : ''}</span>}
              {showingPrevious && <span className="font-semibold" style={{ color: '#fcd34d' }}>Showing the previous result</span>}
              {a?.is_stale && <span className="font-semibold" style={{ color: '#fcd34d' }}>Out of date; re-assess</span>}
              {current?.status === 'failed' && current.error && <span className="text-red-300">Latest run failed: {current.error}</span>}
            </>
          )}
        </div>
      </section>

      {/* 2. Key figures */}
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { ai: true, label: 'Inputs reported', Icon: ListChecks, value: isNum(a?.confidence_score) ? `${a!.confidence_score}%` : '—', note: 'not defaulted', title: a?.scoring?.confidence_meaning ?? 'Share of scoring inputs that were reported rather than defaulted' },
          { ai: false, label: reportedAffected != null ? 'People affected' : 'People exposed', Icon: Users, value: reportedAffected != null ? fmtNumber(reportedAffected) : modelledExposed != null ? `~${fmtNumber(modelledExposed)}` : '—', note: reportedAffected != null ? 'officer-reported' : modelledExposed != null ? 'model estimate' : 'Not reported', title: undefined },
          { ai: false, label: 'Road access', Icon: Navigation, value: accessKnown ? incident.accessibility_score : '—', note: accessKnown ? 'out of 100' : 'Not reported', title: '0 = unreachable, 100 = fully accessible' },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 min-w-0" title={k.title}>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500 truncate"><k.Icon size={14} className="shrink-0 text-slate-400" />{k.label}</dt>
            {k.ai && isLoadingAssessment ? (
              <dd className="mt-2 space-y-1.5"><Bone className="h-7 w-14" /><Bone className="h-2.5 w-20" /></dd>
            ) : (
              <>
                <dd className="text-[26px] font-bold text-slate-900 tabular-nums leading-tight mt-1.5 truncate">{k.value}</dd>
                <dd className="text-[11px] text-slate-400 mt-1">{k.note}</dd>
              </>
            )}
          </div>
        ))}
      </dl>

      {isLoadingAssessment && !a && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3">{[0, 1, 2, 3].map((i) => <Bone key={i} className="h-4 w-full" />)}</div>
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3"><Bone className="h-5 w-20" /><Bone className="h-4 w-full" /><Bone className="h-4 w-4/5" /></div>
        </div>
      )}

      {a && (
        <>
          {/* 3. Key points + what to do */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <Card title="Key points" className="lg:col-span-3">
              {points.length > 0 ? (
                <ul className="space-y-2.5">
                  {points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: TONE[p.tone] }} />
                      <span>{p.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No scored inputs in this run yet.</p>
              )}
              {impact.summary && (
                <p className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">{impact.summary}</p>
              )}
            </Card>

            <Card title="Recommended action" note="Suggestion only" className="lg:col-span-2">
              {decision.recommended_action ? (
                <>
                  {urgencyText && <Tag tone={urgencyTone}>{urgencyText}</Tag>}
                  <p className="mt-2 text-[15px] font-semibold text-slate-900 leading-snug">{decision.recommended_action}</p>
                  {rationale.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {rationale.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] text-slate-600 leading-relaxed">
                          <CheckCircle2 size={14} className="shrink-0 mt-[3px]" style={{ color: TONE.blue }} />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">Written by the AI from this assessment's evidence. An officer decides.</p>
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  {impact.status === 'unavailable' ? 'No AI recommendation: no language model was available for this run.' : 'No recommendation in this run.'}
                </p>
              )}
              {impact.status === 'flagged' && <p className="text-[11px] mt-3" style={{ color: TONE.amber }}>Check: the AI text contains figures that are not in the evidence.</p>}
            </Card>
          </div>

          {/* 4. Impact over time */}
          {timeline.length > 0 ? (
            <div>
              <ImpactTimeline timeline={timeline} size="full" mode="predictive" joinPrediction={forecast?.baseline_source !== 'modelled'} />
              {forecast && (
                <p className="text-[11px] text-slate-500 mt-1.5 px-1">
                  {forecast.status === 'ok'
                    ? <>AI trend driven by <span className="font-semibold text-slate-700">{forecast.driver}</span>.</>
                    : <>No AI trend for this assessment: {forecast.note ?? 'no forecast data was available'}.</>}
                </p>
              )}
            </div>
          ) : null}

          {/* 5. Why this score */}
          {radarData.length > 0 && (
            <Card title={rank ? `Why it ranks #${rank}` : 'What drives the score'} note={`${evidenceOk} of ${a.evidence.length} data sources available`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="72%">
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="aspect" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600, fontFamily: 'inherit' }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="rating" stroke={TONE.blue} fill={TONE.blue} fillOpacity={0.18} strokeWidth={2} />
                      <Tooltip formatter={(v) => [`${v}/100`, 'Rating']} contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-3">
                  {drivers.map((f) => (
                    <li key={f.key} title={factorInputText(f)}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700">{f.label}</span>
                        <span className="text-slate-500 tabular-nums">{f.points.toFixed(1)} pts</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, f.factor * 100)}%`, background: f.source === 'default' ? TONE.amber : TONE.blue }} />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{f.source === 'default' ? 'Not reported, default used' : factorInputText(f)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          {/* 6. Response readiness */}
          <Card title="Response readiness">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <dl className="grid grid-cols-3 gap-2 mb-3">
                  <Fig label="Personnel needed" value={fmtNumber(rescue.required_personnel, '—')} />
                  <Fig label="Covered" value={fmtNumber(rescue.covered_personnel, '0')} color={TONE.teal} />
                  <Fig label="Short" value={rescue.shortfall_personnel ?? 0} color={(rescue.shortfall_personnel ?? 0) > 0 ? TONE.red : undefined} />
                </dl>
                {rescue.suggested_teams && rescue.suggested_teams.length > 0 ? (
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/80">
                    {rescue.suggested_teams.slice(0, 4).map((t) => (
                      <li key={t.team_id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs">
                        <span className="min-w-0 truncate"><span className="font-semibold text-slate-900">{t.name ?? t.display_id ?? 'Team'}</span> <span className="text-slate-400">{t.agency ?? ''}</span></span>
                        <span className="text-slate-600 tabular-nums shrink-0">{t.recommended_personnel} people{isNum(t.road_distance_km) ? ` · ${t.road_distance_km.toFixed(1)} km` : ''}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">{rescue.reason ?? 'No team suggestion in this run.'}</p>
                )}
              </div>
              <div>
                <dl className="grid grid-cols-2 gap-2">
                  <Fig label="Nearest team" value={fmtDecimal(access.nearest_road_distance_km, 1, ' km', '—')} />
                  <Fig label="Drive time" value={fmtDecimal(access.nearest_road_duration_min, 0, ' min', '—')} />
                </dl>
                {access.constraints && access.constraints.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {access.constraints.map((c) => (
                      <li key={c.code} className="text-xs flex items-start gap-2 text-slate-700 leading-relaxed">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: c.severity === 'severe' ? TONE.red : c.severity === 'moderate' ? TONE.amber : TONE.slate }} />
                        <span>{c.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>

          {/* 7. Evidence and validation (collapsed) */}
          <details className="group bg-white border border-slate-200/80 rounded-2xl">
            <summary className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 cursor-pointer list-none">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Evidence and checks</span>
              <span className="flex items-center gap-3 text-[11px] font-semibold">
                <span style={{ color: TONE.teal }}>{evidenceOk}/{a.evidence.length} sources</span>
                <span style={{ color: defaulted.length ? TONE.amber : '#94a3b8' }}>{defaulted.length} defaulted</span>
                <span style={{ color: a.validation_flags.length ? TONE.red : '#94a3b8' }}>{a.validation_flags.length} flags</span>
                <ChevronDown size={14} className="text-slate-400 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="px-5 sm:px-6 pb-5 border-t border-slate-100 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Data used</p>
                <ul className="space-y-1.5">
                  {a.evidence.map((e) => (
                    <li key={e.key} className="flex items-start gap-2 text-xs" title={[e.source, e.coverage, e.detail].filter(Boolean).join(' · ')}>
                      {e.status === 'available' ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: TONE.teal }} />
                        : e.status === 'partial' ? <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: TONE.amber }} />
                          : <XCircle size={14} className="shrink-0 mt-0.5" style={{ color: TONE.red }} />}
                      <span className="text-slate-800">{e.label}{e.detail && <span className="text-slate-400"> · {e.detail}</span>}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                {([
                  ['Validation flags', a.validation_flags],
                  ['Missing evidence', impact.missing_evidence ?? []],
                  ['Uncertainty', a.uncertainty],
                  ['Assumptions', a.assumptions],
                ] as [string, unknown[]][]).map(([label, list]) =>
                  list.length > 0 ? (
                    <div key={label}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
                      <ul className="space-y-1">
                        {list.map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                            <span className="w-1 h-1 rounded-full bg-slate-300 mt-[7px] shrink-0" />{String(t)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          </details>
        </>
      )}

      {!a && !isLoadingAssessment && inFlight && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin text-blue-600" /> First analysis in progress. Results appear here automatically.
        </div>
      )}
      {!a && current?.status === 'failed' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 text-xs text-slate-700">
          <span className="font-semibold" style={{ color: TONE.red }}>The analysis failed</span> and there is no earlier result.{canReassess ? ' Try Re-assess.' : ''}
        </div>
      )}
    </motion.div></DataRegion>
  );
};
