import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileSearch,
  Gauge,
  ListChecks,
  Loader2,
  Navigation,
  RefreshCw,
  Send,
  Sparkles,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import { AiSuggestion, AiVerdict } from '../../../components/ui/shared/AiSuggestion';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
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

const Card: React.FC<{ title: string; icon: React.ElementType; badge?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  icon: Icon,
  badge,
  children,
  className = '',
}) => (
  <section className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-xs ${className}`}>
    <header className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Icon size={16} className="text-blue-600" /> {title}
      </h2>
      {badge}
    </header>
    {children}
  </section>
);

const Kpi: React.FC<{ label: string; value: React.ReactNode; suffix?: string; hint: string; icon: React.ElementType }> = ({ label, value, suffix, hint, icon: Icon }) => (
  <div className="bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-3" title={hint}>
    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
      <Icon size={12} className="text-blue-300" /> {label}
    </p>
    <p className="text-xl font-black mt-1 text-white">
      {value}
      {suffix && <span className="text-xs font-semibold text-slate-400 ml-1">{suffix}</span>}
    </p>
  </div>
);

const Chip: React.FC<{ label: string; value: React.ReactNode; icon: React.ElementType; tone?: string }> = ({ label, value, icon: Icon, tone = 'text-blue-700' }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-center">
    <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 ${tone}`}>
      <Icon size={11} /> {label}
    </p>
    <p className="text-sm font-black text-slate-900 mt-0.5">{value}</p>
  </div>
);

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
  const { data: incident, isLoading: isLoadingIncident, isError: isIncidentError } = useIncident(incidentId);
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

  if (isLoadingIncident) {
    return <p className="max-w-6xl mx-auto p-6 text-xs text-slate-400 italic">Loading incident…</p>;
  }
  if (isIncidentError || !incident) {
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

  // Plain-language brief built only from the stored values above.
  const briefParts: string[] = [];
  if (score != null) briefParts.push(`AI assessment places this incident${rank ? ` at priority rank #${rank} of ${envelope!.ranked_incidents}` : ''} with a score of ${score}/100.`);
  if (reportedAffected != null) briefParts.push(`${fmtNumber(reportedAffected)} people are reported affected.`);
  else if (modelledExposed != null) briefParts.push(`About ${fmtNumber(modelledExposed)} people may be exposed (model estimate; none reported).`);
  if (top.length) briefParts.push(`${top.map((f) => `${f.label.toLowerCase()} (${factorInputText(f)})`).join(' and ')} drive the urgency.`);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-6xl mx-auto space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
        >
          <ArrowLeft size={15} /> Back to intelligence overview
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {canReassess && (
            <button
              onClick={handleReassess}
              disabled={inFlight || reassess.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {inFlight || reassess.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              <span>{inFlight ? 'Analysing…' : 'Re-assess'}</span>
            </button>
          )}
          <button
            onClick={() => navigate(`/situational/incidents/${incident.id}`)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <FileSearch size={13} /> Incident record
          </button>
          <button
            onClick={() => navigate(`/response/rescue?incidentId=${incident.id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
          >
            <Send size={14} className="text-blue-400" /> Open dispatch wizard
          </button>
        </div>
      </div>

      {/* 1. Hero */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-7 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-widest uppercase text-blue-300 flex items-center gap-1.5">
              <BrainCircuit size={13} /> AI-processed disaster intelligence
            </p>
            <h1 className="text-2xl font-extrabold mt-2 tracking-tight">{incident.title}</h1>
            <p className="text-sm text-slate-300 mt-1">
              {formatFullLocation(incident.location, incident.district, incident.state, incident.administrative_district)}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap shrink-0">
            <DisasterBadge type="severity" value={incident.severity} />
            <DisasterBadge type="level" value={incident.disaster_level} />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
          <Kpi label="Priority rank" icon={Trophy} value={rank ? `#${rank}` : '—'} suffix={rank ? `of ${envelope!.ranked_incidents}` : 'unranked'} hint="Among active incidents with a usable assessment" />
          <Kpi label="AI priority score" icon={Gauge} value={score ?? '—'} suffix={score != null ? '/100' : 'not scored'} hint={a?.scoring?.priority_scale ?? 'Weighted priority model'} />
          <Kpi
            label="Input completeness"
            icon={ListChecks}
            value={isNum(a?.confidence_score) ? `${a!.confidence_score}%` : '—'}
            hint={a?.scoring?.confidence_meaning ?? 'Share of scoring inputs that were reported rather than defaulted'}
          />
          <Kpi
            label={reportedAffected != null ? 'Affected' : 'Exposed (est.)'}
            icon={Users}
            value={reportedAffected != null ? fmtNumber(reportedAffected) : modelledExposed != null ? `~${fmtNumber(modelledExposed)}` : '—'}
            hint={reportedAffected != null ? 'Latest officer-reported figure' : 'Model estimate, not a count'}
          />
          <Kpi label="Access score" icon={Navigation} value={accessKnown ? incident.accessibility_score : '—'} suffix={accessKnown ? '/100' : 'not reported'} hint="0 = unreachable, 100 = fully accessible" />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-5 pt-4 border-t border-white/10 text-[11px] text-slate-300">
          {isLoadingAssessment ? (
            <span className="italic">Loading assessment…</span>
          ) : isAssessmentError ? (
            <span className="text-red-300 font-semibold">
              Assessment unavailable. <button onClick={() => refetch()} className="underline cursor-pointer">Retry</button>
            </span>
          ) : !current && !a ? (
            <span>
              <AssessmentStatusBadge state="not_analysed" className="mr-2" />
              Not analysed yet{canReassess ? ' — use Re-assess' : ''}.
            </span>
          ) : (
            <>
              {current && <AssessmentStatusBadge state={current.status} />}
              {a && (
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {relativeTime(a.completed_at) ?? 'time unknown'}
                  {a.completed_at ? ` · ${formatDateTime(a.completed_at)}` : ''}
                </span>
              )}
              {showingPrevious && <span className="text-amber-300 font-semibold">Showing previous result</span>}
              {a?.is_stale && <span className="text-amber-300 font-semibold">Older than 6 h — re-assess</span>}
              {current?.status === 'failed' && current.error && <span className="text-red-300">Latest run failed: {current.error}</span>}
            </>
          )}
        </div>
      </div>

      {a && (
        <>
          {/* 2. Impact progression with the AI projection (dotted) */}
          {timeline.length > 0 ? (
            <div>
              <ImpactTimeline
                timeline={timeline}
                size="full"
                mode="predictive"
                joinPrediction={forecast?.baseline_source !== 'modelled'}
              />
              {forecast && (
                <p className="text-[11px] text-slate-500 mt-1.5 px-1">
                  {forecast.status === 'ok'
                    ? <>AI trend driven by <span className="font-semibold text-slate-700">{forecast.driver}</span>. Hover a dotted point for the reading behind it.</>
                    : <>No AI trend for this assessment: {forecast.note ?? 'no forecast data was available'}</>}
                </p>
              )}
            </div>
          ) : (
            <Card title="Impact Progression & AI Forecast" icon={Activity}>
              <p className="text-xs text-slate-500 italic">No confirmed figures and no projection{forecast?.note ? ` — ${forecast.note}` : ''}.</p>
            </Card>
          )}

          {/* 3. Factor analysis + decision brief */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <Card title="Multi-factor AI impact analysis" icon={Activity} className="lg:col-span-3">
              {radarData.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} outerRadius="72%">
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="aspect" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar dataKey="rating" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} strokeWidth={2} />
                          <Tooltip formatter={(v) => [`${v}/100`, 'Rating']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="space-y-2">
                      {drivers.map((f) => (
                        <li key={f.key} className="text-[11px]" title={factorInputText(f)}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-700">{f.label}</span>
                            <span className="font-mono text-slate-500">{f.points.toFixed(1)} pts</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                            <div
                              className={`h-full rounded-full ${f.source === 'default' ? 'bg-amber-400' : 'bg-blue-600'}`}
                              style={{ width: `${Math.min(100, f.factor * 100)}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <Chip label="Completeness" icon={ListChecks} value={isNum(a.confidence_score) ? `${a.confidence_score}%` : '—'} />
                    <Chip label="Data sources" icon={CheckCircle2} value={`${evidenceOk}/${a.evidence.length}`} tone="text-emerald-700" />
                    <Chip label="Defaulted" icon={AlertTriangle} value={defaulted.length} tone={defaulted.length ? 'text-amber-700' : 'text-slate-500'} />
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 italic">No factor breakdown in this run — re-assess to generate it.</p>
              )}
            </Card>

            <Card
              title="Operational decision brief"
              icon={Sparkles}
              className="lg:col-span-2"
            >
              {briefParts.length > 0 && <p className="text-sm text-slate-700 leading-relaxed">{briefParts.join(' ')}</p>}
              {decision.recommended_action ? (
                <AiSuggestion
                  className="mt-4"
                  title="Recommended focus"
                  headline={
                    decision.urgency ? (
                      <AiVerdict
                        tone={decision.urgency === 'Immediate' || decision.urgency === 'Within 6h' ? 'bad' : decision.urgency === 'Monitor' ? 'neutral' : 'caution'}
                        verdict={decision.urgency === 'Immediate' ? 'Act now' : decision.urgency === 'Monitor' ? 'Monitor' : `Act ${decision.urgency.toLowerCase()}`}
                      >
                        <span className="text-sm font-semibold text-slate-900">{decision.recommended_action}</span>
                      </AiVerdict>
                    ) : (
                      <span className="text-sm font-semibold text-slate-900">{decision.recommended_action}</span>
                    )
                  }
                  basis="Written by the language model from this assessment's evidence"
                >
                  {decision.rationale && <p>{decision.rationale}</p>}
                </AiSuggestion>
              ) : (
                <p className="text-xs text-slate-500 italic mt-4">
                  {impact.status === 'unavailable' ? 'No AI recommendation — no language model was available for this run.' : 'No recommendation in this run.'}
                </p>
              )}
              {impact.status === 'flagged' && (
                <p className="text-[11px] text-amber-800 mt-3">Check: the AI text contains figures not in the evidence.</p>
              )}
              <dl className="text-[11px] text-slate-500 mt-4 space-y-0.5">
                {factors.length > 0 && (
                  <div>
                    <dt className="inline font-bold text-slate-600">AI inputs: </dt>
                    <dd className="inline">{factors.filter((f) => f.source !== 'default').map((f) => shortAspect(f.label)).join(', ')}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline font-bold text-slate-600">Source record: </dt>
                  <dd className="inline">{incident.source || '—'}</dd>
                </div>
              </dl>
            </Card>
          </div>

          {/* 4. Why this rank */}
          {top.length > 0 && score != null && (
            <Card title={rank ? `Why this incident ranks #${rank}` : 'What drives this score'} icon={Trophy}>
              <p className="text-sm text-slate-700 leading-relaxed">
                The priority score is driven primarily by <strong>{top[0].label}</strong>
                {top[1] && (
                  <>
                    {' '}and <strong>{top[1].label}</strong>
                  </>
                )}{' '}
                — together {Math.round(top.reduce((s, f) => s + f.points, 0))} of the {score} points.
                {impact.summary ? ` ${impact.summary}` : ''}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {top.map((f) => (
                  <div key={f.key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-black text-xs">
                      {Math.round(f.factor * 100)}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label} factor</p>
                      <p className="text-sm font-bold text-slate-900">{factorInputText(f)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 5. Response readiness */}
          <Card title="Response readiness" icon={Users}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Chip label="Needed" icon={Users} value={fmtNumber(rescue.required_personnel, '—')} />
                  <Chip label="Covered" icon={CheckCircle2} value={fmtNumber(rescue.covered_personnel, '0')} tone="text-emerald-700" />
                  <Chip label="Short" icon={AlertTriangle} value={rescue.shortfall_personnel ?? 0} tone={(rescue.shortfall_personnel ?? 0) > 0 ? 'text-red-700' : 'text-slate-500'} />
                </div>
                {rescue.suggested_teams && rescue.suggested_teams.length > 0 ? (
                  <ul className="space-y-1.5">
                    {rescue.suggested_teams.slice(0, 4).map((t) => (
                      <li key={t.team_id} className="flex items-center justify-between gap-2 border border-slate-100 rounded-lg px-3 py-2 text-xs">
                        <span className="font-bold text-slate-900 truncate">
                          {t.name ?? t.display_id ?? 'Team'} <span className="text-slate-400 font-medium">{t.agency ?? ''}</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-600 shrink-0">
                          {t.recommended_personnel} pax{isNum(t.road_distance_km) ? ` · ${t.road_distance_km.toFixed(1)} km` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">{rescue.reason ?? 'No team suggestion in this run.'}</p>
                )}
              </div>
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <Chip label="Nearest team" icon={Navigation} value={fmtDecimal(access.nearest_road_distance_km, 1, ' km', '—')} />
                  <Chip label="Drive time" icon={Clock} value={fmtDecimal(access.nearest_road_duration_min, 0, ' min', '—')} />
                </div>
                {access.constraints && access.constraints.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {access.constraints.map((c) => (
                      <li key={c.code} className="text-xs flex items-start gap-2 text-slate-700">
                        <AlertTriangle
                          size={12}
                          className={`mt-0.5 shrink-0 ${c.severity === 'severe' ? 'text-red-600' : c.severity === 'moderate' ? 'text-amber-600' : 'text-slate-400'}`}
                        />
                        <span>{c.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>

          {/* 6. Evidence & validation (collapsed) */}
          <details className="group bg-white border border-slate-200 rounded-2xl shadow-xs">
            <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSearch size={16} className="text-blue-600" /> Evidence &amp; validation
              </span>
              <span className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="text-emerald-700">{evidenceOk}/{a.evidence.length} sources</span>
                <span className={defaulted.length ? 'text-amber-700' : 'text-slate-400'}>{defaulted.length} defaulted</span>
                <span className={a.validation_flags.length ? 'text-red-700' : 'text-slate-400'}>{a.validation_flags.length} flags</span>
                <ChevronDown size={14} className="text-slate-400 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="px-5 pb-5 border-t border-slate-100 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Data used</p>
                <ul className="space-y-1.5">
                  {a.evidence.map((e) => (
                    <li key={e.key} className="flex items-start gap-2 text-xs" title={[e.source, e.coverage, e.detail].filter(Boolean).join(' · ')}>
                      {e.status === 'available' ? (
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      ) : e.status === 'partial' ? (
                        <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                      )}
                      <span className="text-slate-800">
                        {e.label}
                        {e.detail && <span className="text-slate-400"> — {e.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                {defaulted.length > 0 && (
                  <p className="text-xs text-amber-800 mt-3">
                    <strong>Not reported (default used):</strong> {defaulted.map((f) => f.label).join(', ')}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                {(
                  [
                    ['Validation flags', a.validation_flags, 'text-red-700'],
                    ['Missing evidence', impact.missing_evidence ?? [], 'text-amber-800'],
                    ['Uncertainty', a.uncertainty, 'text-slate-600'],
                    ['Assumptions', a.assumptions, 'text-slate-600'],
                  ] as [string, unknown[], string][]
                ).map(([label, items, tone]) =>
                  items.length > 0 ? (
                    <div key={label}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
                      <ul className={`list-disc pl-4 space-y-0.5 text-xs ${tone}`}>
                        {items.map((t, i) => (
                          <li key={i}>{String(t)}</li>
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
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center text-xs text-blue-900 flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" /> First analysis in progress — results appear here automatically.
        </div>
      )}
      {!a && current?.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800">
          The analysis failed and there is no earlier result.{canReassess ? ' Try Re-assess.' : ''}
        </div>
      )}
    </motion.div>
  );
};
