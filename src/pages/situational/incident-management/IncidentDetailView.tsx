import React, { useState, useEffect } from 'react';
import { LogDetailBody } from '../../../components/ui/situational/LogDetailBody';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  MapPin,
  Users,
  AlertTriangle,
  Send,
  Building2,
  Wind,
  Navigation,
  ArrowUpRight,
  XCircle,
  Download,
  Printer,
  CheckSquare,
  X,
  Copy,
  Check,
  Phone,
  Thermometer,
  Droplets,
  Edit3,
  BrainCircuit,
  Image as ImageIcon,
  Maximize2,
  Video,
  ShieldCheck,
  Gauge,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TriggerAlertPanel } from '../../../components/ui/situational/TriggerAlertPanel';
import { ImpactTimeline } from '../../../components/ui/situational/ImpactTimeline';
import { CredibilityCard, isCredibilityAvailable } from '../../../components/ui/situational/CredibilityCard';
import { ReliefCentresLine } from '../../../components/ui/situational/ReliefCentresLine';
import { useIncidentLogs, useUpdateIncident, useResolveIncident, useIncidentMedia, useIncidentAssessment } from '../../../hooks';
import { incidentService } from '../../../services/incidentService';
import { formatDateTime } from '../../../utils/dateFormatter';
import { useToast } from '../../../context/ToastContext';
import { formatFullLocation } from '../../../utils/locationFormatter';
import { FACT_STATE_LABEL, editedFieldVerification, factState } from '../../../utils/facts';
import { fmtText, isNum } from '../../../utils/display';
import type { CommandTabType, FactField, FactState, Incident, IncidentDetailViewProps } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { Tag, TONE, IconTile, StatusTag, LevelTag, SourceTag, type Tone } from '../../../components/ui/shared/Tag';
import { FormModal, ConfirmModal, Field, GhostButton, PrimaryButton, inputCls, NAVY, Overlay } from '../../../components/ui/shared/Modal';
import { Bone } from '../../../components/ui/dashboard/Panel';
import { FormattedMessageText } from '../../../utils/messageFormatter';

function getCleanIncidentId(id: string, displayId?: string): string {
  if (displayId) return displayId;
  if (id.startsWith('inc-')) {
    const parts = id.split('-');
    if (parts.length >= 3) return `${parts[0].toUpperCase()}-${parts[1]}-${parts[2]}`;
  }
  if (id.length > 13) {
    return `INC-${id.slice(0, 8).toUpperCase()}`;
  }
  return id.toUpperCase();
}

/** Activity entries shown before "Show all". */
const LOG_PREVIEW = 5;

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1 || code === 2 || code === 3) return 'Partly cloudy / Overcast';
  if (code >= 51 && code <= 55) return 'Light Drizzle';
  if (code >= 61 && code <= 65) return 'Rain showers';
  if (code >= 80 && code <= 82) return 'Heavy monsoon rain showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm & Lightning';
  return 'Overcast / Monsoon Conditions';
}

const FACT_TONE: Record<FactState, Tone> = {
  verified: 'teal',
  reported: 'slate',
  disputed: 'amber',
  unknown: 'slate',
};

/** Provenance tag shown next to each officer-entered fact. */
const FactBadge: React.FC<{ incident: Incident; field: FactField }> = ({ incident, field }) => {
  const state = factState(incident, field);
  return <Tag tone={FACT_TONE[state]} dot={state === 'verified' || state === 'disputed'} className="!text-[10px] !px-1.5">{FACT_STATE_LABEL[state]}</Tag>;
};

/** Tag on the navy header: light hue on a white wash. */
const ON_NAVY_SEVERITY: Record<string, string> = { Critical: '#fca5a5', High: '#fdba74', Medium: '#fcd34d', Low: '#cbd5e1' };
const ON_NAVY_STATUS: Record<string, string> = { Unverified: '#fcd34d', Verified: '#93c5fd', Responding: '#67e8f9', Resolved: '#5eead4', Rejected: '#cbd5e1', Archived: '#cbd5e1' };
const OnNavyTag: React.FC<{ color: string; quiet?: boolean; children: React.ReactNode }> = ({ color, quiet, children }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${quiet ? 'text-slate-200 ring-1 ring-inset ring-white/15' : 'bg-white/10'}`}
    style={quiet ? undefined : { color }}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
    {children}
  </span>
);

/** A white section card with a small uppercase title (dashboard panel style). */
const Section: React.FC<{ title: string; count?: number; note?: string; divided?: boolean; children: React.ReactNode }> = ({ title, count, note, divided, children }) => (
  <section className="bg-white border border-slate-200/80 rounded-2xl">
    <header className={`px-5 sm:px-6 pt-5 flex items-center justify-between gap-3 ${divided ? 'pb-3.5 mb-4 border-b border-slate-100' : 'pb-3'}`}>
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
        {title}{count != null && <span className="ml-2 font-semibold text-slate-400 tabular-nums">{count}</span>}
      </h2>
      {note && <span className="text-[11px] text-slate-400">{note}</span>}
    </header>
    <div className="px-5 sm:px-6 pb-5 sm:pb-6">{children}</div>
  </section>
);

/** Short status note in an action tab: a soft wash of its hue, no border. */
const Note: React.FC<{ tone: Tone; title: string; children: React.ReactNode }> = ({ tone, title, children }) => (
  <div className="rounded-xl px-3.5 py-3 text-xs text-slate-600" style={{ background: `${TONE[tone]}12` }}>
    <p className="font-semibold mb-0.5" style={{ color: TONE[tone] }}>{title}</p>
    <p className="leading-relaxed">{children}</p>
  </div>
);

/** A fact's display value, or "Not reported" when its provenance is unknown. */
function factValue(incident: Incident, field: FactField, render: (v: NonNullable<Incident[FactField]>) => React.ReactNode) {
  const v = incident[field];
  if (factState(incident, field) === 'unknown' || v === null || v === undefined) {
    return <span className="text-slate-400 font-semibold text-base">Not reported</span>;
  }
  return render(v);
}

export const IncidentDetailView: React.FC<IncidentDetailViewProps> = ({
  incident,
  onBack,
  onVerify,
  onTrackInIntelligence,
}) => {
  const isTracked = !!incident.impact_timeline?.length;
  const { user } = useAuth();
  const { data: incidentLogs = [], isLoading: isLoadingLogs } = useIncidentLogs(incident.id);
  const { data: assessmentData, isLoading: isLoadingAssessment } = useIncidentAssessment(incident.id);
  const isCredibilityShown = isCredibilityAvailable(assessmentData, isLoadingAssessment);
  const updateIncident = useUpdateIncident();
  const resolveIncident = useResolveIncident();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const [activeCommandTab, setActiveCommandTab] = useState<CommandTabType>(() => {
    if (incident.status === 'Unverified') return 'verify';
    if (incident.status === 'Resolved') return 'resolve';
    return 'deploy';
  });

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [resolverName] = useState(user?.name ?? 'EOC Incident Commander');
  const [verifierName] = useState(user?.name ?? 'EOC Watch Commander');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [assessmentPop, setAssessmentPop] = useState(incident.affected_population || 0);
  const [assessmentCas, setAssessmentCas] = useState(incident.casualties_count || 0);
  const [assessmentInfra, setAssessmentInfra] = useState(incident.infrastructure_damage || 'None');
  const [assessmentAccess, setAssessmentAccess] = useState(incident.accessibility_score ?? 50);

  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const hasMedia = (incident.media_urls?.length ?? 0) > 0;
  const { data: media = [], isLoading: isLoadingMedia, isError: isMediaError } = useIncidentMedia(incident.id, hasMedia);

  // Live conditions at the incident pin (Open-Meteo). Missing values stay null — never a default.
  const [liveWeather, setLiveWeather] = useState<{
    temp: number | null;
    weatherDesc: string | null;
    windSpeed: number | null;
    humidity: number | null;
    rainProb: number | null;
  } | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<'idle' | 'loading' | 'ok' | 'unavailable' | 'no_location'>('idle');
  const [lat, lng] = incident.coordinates ?? [];
  const hasPin = isNum(lat) && isNum(lng) && !(lat === 0 && lng === 0);

  useEffect(() => {
    if (!hasPin) {
      setLiveWeather(null);
      setWeatherStatus('no_location');
      return;
    }
    const ctrl = new AbortController();
    setWeatherStatus('loading');
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=relative_humidity_2m,precipitation_probability&timezone=Asia%2FKuala_Lumpur`,
      { signal: ctrl.signal }
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        const cw = data?.current_weather;
        if (!cw) throw new Error('No current weather');
        const hourly = data.hourly ?? {};
        setLiveWeather({
          temp: isNum(cw.temperature) ? cw.temperature : null,
          weatherDesc: isNum(cw.weathercode) ? getWeatherDescription(cw.weathercode) : null,
          windSpeed: isNum(cw.windspeed) ? cw.windspeed : null,
          humidity: isNum(hourly.relative_humidity_2m?.[0]) ? hourly.relative_humidity_2m[0] : null,
          rainProb: isNum(hourly.precipitation_probability?.[0]) ? hourly.precipitation_probability[0] : null,
        });
        setWeatherStatus('ok');
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setLiveWeather(null);
        setWeatherStatus('unavailable');
      });
    return () => ctrl.abort();
  }, [hasPin, lat, lng]);

  useEffect(() => {
    setAssessmentPop(incident.affected_population || 0);
    setAssessmentCas(incident.casualties_count || 0);
    setAssessmentInfra(incident.infrastructure_damage || 'None');
    setAssessmentAccess(incident.accessibility_score ?? 50);
  }, [incident]);

  const isSensorSource =
    incident.source === 'Metrological / Sensor' ||
    (incident.source &&
      !incident.source.toLowerCase().includes('citizen') &&
      !incident.source.toLowerCase().includes('sos') &&
      !incident.source.toLowerCase().includes('999') &&
      (incident.source.toLowerCase().includes('sensor') ||
        incident.source.toLowerCase().includes('hydrological') ||
        incident.source.toLowerCase().includes('jps') ||
        incident.source.toLowerCase().includes('telemetry')));

  const handleSaveAssessment = () => {
    const facts = {
      affected_population: Number(assessmentPop) || 0,
      casualties_count: Number(assessmentCas) || 0,
      infrastructure_damage: assessmentInfra as Incident['infrastructure_damage'],
      accessibility_score: Math.min(100, Math.max(0, Number(assessmentAccess) || 0)),
    };
    updateIncident.mutate(
      {
        id: incident.id,
        updates: { ...facts, field_verification: editedFieldVerification(incident, facts) },
      },
      {
        onSuccess: () => {
          setShowAssessmentModal(false);
          toastSuccess('Assessment Updated', 'Disaster impact assessment metrics updated successfully.');
        },
        onError: () => toastError('Update Failed', 'Could not update assessment metrics. Please retry.'),
      }
    );
  };

  const handleConfirmVerify = () => {
    updateIncident.mutate(
      {
        id: incident.id,
        updates: {
          status: 'Verified',
          verified_by: verifierName,
          verified_by_user_id: user?.id,
          verified_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setShowVerifyModal(false);
          onVerify(incident.id);
          toastSuccess('Incident Verified', `${getCleanIncidentId(incident.id, incident.display_id)} has been verified and activated.`);
        },
        onError: () => toastError('Verification Failed', 'Could not verify incident. Please retry.'),
      }
    );
  };

  const handleConfirmReject = () => {
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setRejectReasonError('A rejection note is required.');
      return;
    }
    updateIncident.mutate(
      {
        id: incident.id,
        updates: {
          status: 'Rejected',
          verified_by_user_id: user?.id,
          rejection_reason: trimmedReason,
        },
      },
      {
        onSuccess: () => {
          setShowRejectModal(false);
          toastWarning('Incident Rejected', `Report ${getCleanIncidentId(incident.id, incident.display_id)} has been rejected and logged.`);
          onBack();
        },
        onError: () => toastError('Rejection Failed', 'Could not reject incident. Please retry.'),
      }
    );
  };

  const handleResolve = () => {
    resolveIncident.mutate(
      { id: incident.id, outcomeNotes, resolverName },
      {
        onSuccess: () => {
          setShowResolveModal(false);
          toastSuccess('Incident Resolved', `${getCleanIncidentId(incident.id, incident.display_id)} has been closed and archived.`);
          onBack();
        },
        onError: () => toastError('Resolution Failed', 'Could not close incident. Please retry.'),
      }
    );
  };

  const reporterContact = incident.reporter_contact?.match(/\+?[\d\-\s()]{8,}/)?.[0] || null;

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(getCleanIncidentId(incident.id, incident.display_id));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const idLabel = getCleanIncidentId(incident.id, incident.display_id);
  const assessmentChanged =
    assessmentPop !== (incident.affected_population || 0) ||
    assessmentCas !== (incident.casualties_count || 0) ||
    assessmentInfra !== (incident.infrastructure_damage || 'None') ||
    assessmentAccess !== (incident.accessibility_score ?? 50);
  const location = formatFullLocation(incident.location, incident.district, incident.state, incident.administrative_district);
  const COMMAND_TABS: { key: CommandTabType; label: string; dot?: boolean }[] = [
    { key: 'verify', label: 'Verify', dot: incident.status === 'Unverified' },
    { key: 'deploy', label: 'Deploy' },
    { key: 'resolve', label: 'Resolve' },
    { key: 'export', label: 'Export' },
  ];
  const IMPACT: { field: FactField; title: string; caption: string; color: string; Icon: typeof Users; render: (v: NonNullable<Incident[FactField]>) => React.ReactNode; small?: boolean }[] = [
    { field: 'affected_population', title: 'People Affected', caption: 'Field report', color: TONE.indigo, Icon: Users, render: (v) => Number(v).toLocaleString() },
    { field: 'casualties_count', title: 'Casualties', caption: 'Needing immediate aid', color: TONE.red, Icon: AlertTriangle, render: (v) => Number(v).toLocaleString() },
    { field: 'infrastructure_damage', title: 'Infrastructure Damage', caption: 'Primary impact', color: TONE.blue, Icon: Building2, render: (v) => String(v), small: true },
    { field: 'accessibility_score', title: 'Access Score', caption: 'Ground access', color: TONE.cyan, Icon: Navigation, render: (v) => <>{String(v)}<span className="text-sm text-slate-400 font-semibold">/100</span></> },
  ];
  const hasConditions = factState(incident, 'weather_condition') !== 'unknown' && !!incident.weather_condition?.trim()
    || weatherStatus === 'loading' || !!liveWeather;
  const logDot = (action: string) => {
    const a = action.toLowerCase();
    return a.includes('create') ? TONE.blue : a.includes('verif') ? TONE.teal : a.includes('resolv') ? TONE.indigo : a.includes('reject') ? TONE.red : a.includes('updat') ? TONE.amber : TONE.slate;
  };

  const activitySection = (isLoadingLogs || incidentLogs.length > 0) && (
    <section className="bg-white border border-slate-200/80 rounded-2xl">
      <header className={`${isCredibilityShown ? 'px-5' : 'px-5 sm:px-6'} pt-5 pb-3.5 border-b border-slate-100 flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 truncate">
            Operational Action Log
          </h2>
        </div>
        {incidentLogs.length > LOG_PREVIEW && (
          <button type="button" onClick={() => setShowAllLogs((v) => !v)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer shrink-0">
            {showAllLogs ? (isCredibilityShown ? 'Show latest' : 'Show latest only') : `Show all ${incidentLogs.length}`}
          </button>
        )}
      </header>
      <div className={`${isCredibilityShown ? 'px-5' : 'px-5 sm:px-6'} py-5`}>
        {isLoadingLogs ? (
          <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="space-y-1.5"><Bone className="h-3 w-1/3" /><Bone className="h-2.5 w-1/2" /></div>)}</div>
        ) : incidentLogs.length > 0 ? (
          <ol className="relative space-y-3.5">
            {(showAllLogs ? incidentLogs : incidentLogs.slice(0, LOG_PREVIEW)).map((log, idx, arr) => (
              <li key={log.id || idx} className="relative pl-7">
                {idx < arr.length - 1 && (
                  <span className="absolute left-[5px] top-6 bottom-[-14px] w-0.5 bg-slate-200" aria-hidden="true" />
                )}
                <span
                  className="absolute left-0 top-[18px] w-3 h-3 rounded-full ring-4 ring-white"
                  style={{ background: logDot(log.action) }}
                  aria-hidden="true"
                />
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-[13px] leading-snug">{log.action}</h3>
                    <span className="text-[11px] text-slate-400 font-medium tabular-nums shrink-0 whitespace-nowrap">
                      {formatDateTime(log.logged_at)}
                    </span>
                  </div>
                  {log.detail && (
                    <div className="mt-2 text-xs text-slate-600 leading-relaxed">
                      <LogDetailBody detail={log.detail} />
                    </div>
                  )}
                  {log.actor && (
                    <p className="mt-2.5 text-xs text-slate-500">
                      <span className="text-slate-400">Actor:</span>{' '}
                      <span className="font-medium text-slate-700">{log.actor}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5 max-w-7xl mx-auto pb-12"
    >
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} />
          Incidents
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAssessmentModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Edit3 size={13} style={{ color: TONE.blue }} />
            Update Impact
          </button>
          <button
            type="button"
            onClick={() => navigate(`/situational/intelligence?incidentId=${incident.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <BrainCircuit size={14} style={{ color: TONE.indigo }} />
            Intelligence Assessment
          </button>
        </div>
      </div>

      {/* ── 1. What and where ── */}
      <section className="rounded-2xl text-white px-6 py-5 sm:px-7" style={{ background: NAVY }}>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyId}
            title="Copy incident ID"
            className="flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer tabular-nums"
          >
            {idLabel}
            {copiedId ? <Check size={12} style={{ color: '#5eead4' }} /> : <Copy size={12} className="text-slate-400" />}
          </button>
          <OnNavyTag color={ON_NAVY_SEVERITY[incident.severity] ?? '#cbd5e1'}>{incident.severity}</OnNavyTag>
          <OnNavyTag color={ON_NAVY_STATUS[incident.status] ?? '#cbd5e1'} quiet>{incident.status}</OnNavyTag>
          <span className="ml-auto text-xs text-slate-400">Occurred {formatDateTime(incident.occurred_at)}</span>
        </div>
        <h1 className="mt-3 text-2xl sm:text-[26px] font-extrabold tracking-tight leading-tight">{incident.title}</h1>
        <p className="mt-1.5 text-sm text-slate-300 flex items-center gap-1.5">
          <MapPin size={14} className="shrink-0" style={{ color: '#93c5fd' }} />
          {location}{incident.postcode ? ` · ${incident.postcode}` : ''}
        </p>
      </section>

      {/* ── 2. Impact Figures ── */}
      <dl className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {IMPACT.map(({ field, title, Icon, render, small }) => {
          const alarm = field === 'casualties_count' && factState(incident, field) !== 'unknown' && (incident.casualties_count ?? 0) > 0;
          return (
            <div key={field} className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 min-w-0">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500 truncate">
                <Icon size={14} strokeWidth={2} className="shrink-0 text-slate-400" />{title}
              </dt>
              <dd className={`${small ? 'text-xl' : 'text-[26px]'} font-bold tabular-nums leading-tight mt-1.5 truncate ${alarm ? 'text-red-700' : 'text-slate-900'}`}>
                {factValue(incident, field, render)}
              </dd>
              <dd className="mt-2"><FactBadge incident={incident} field={field} /></dd>
            </div>
          );
        })}
      </dl>

      {/* ── 3. The readings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {incident.description?.trim() && (
            <Section title="Situation" divided>
              <div className="text-sm text-slate-700 leading-relaxed max-w-prose"><FormattedMessageText text={incident.description} /></div>
            </Section>
          )}

          {isSensorSource && incident.trigger_alert && (
            <Section title="River telemetry" divided>
              <TriggerAlertPanel alert={incident.trigger_alert} size="full" />
            </Section>
          )}

          <ReliefCentresLine state={incident.state} district={incident.administrative_district || incident.district} />

          {isTracked && incident.impact_timeline && (
            <ImpactTimeline timeline={incident.impact_timeline} mode="confirmed-only" size="full" />
          )}

          {hasConditions && (
          <Section title="Conditions" note={liveWeather ? 'Live from Open-Meteo' : undefined}>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-xl bg-slate-50 px-3.5 py-3">
                <dt className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  Reported weather <FactBadge incident={incident} field="weather_condition" />
                </dt>
                <dd className="text-sm font-semibold text-slate-900 mt-1">{fmtText(incident.weather_condition, 'Not reported')}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-3.5 py-3">
                <dt className="flex items-center gap-1.5 text-[11px] text-slate-500"><Thermometer size={12} style={{ color: TONE.blue }} /> Live conditions</dt>
                <dd className="text-sm font-semibold text-slate-900 mt-1">
                  {weatherStatus === 'loading'
                    ? <Bone className="h-4 w-28 mt-0.5" />
                    : weatherStatus === 'no_location'
                      ? 'No incident pin'
                      : liveWeather
                        ? `${isNum(liveWeather.temp) ? `${liveWeather.temp}°C` : 'Temp unavailable'} · ${fmtText(liveWeather.weatherDesc)}`
                        : 'Unavailable'}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-3.5 py-3">
                <dt className="flex items-center gap-1.5 text-[11px] text-slate-500"><Droplets size={12} style={{ color: TONE.cyan }} /> Rain chance · humidity</dt>
                <dd className="text-sm font-semibold text-slate-900 mt-1 tabular-nums">
                  {weatherStatus === 'loading'
                    ? <Bone className="h-4 w-24 mt-0.5" />
                    : liveWeather
                      ? `${isNum(liveWeather.rainProb) ? `${liveWeather.rainProb}%` : 'n/a'} · ${isNum(liveWeather.humidity) ? `${liveWeather.humidity}%` : 'n/a'}`
                      : 'Unavailable'}
                </dd>
              </div>
            </dl>
            {liveWeather && isNum(liveWeather.windSpeed) && (
              <p className="mt-3 text-xs text-slate-500 flex items-center justify-end gap-1.5">
                <Wind size={12} className="text-slate-400" /> Wind {liveWeather.windSpeed} km/h at the incident pin
              </p>
            )}
          </Section>
          )}

          {hasMedia && (
            <Section title="Field evidence" count={incident.media_urls!.length} note="AI-screened · click to enlarge" divided>
              {isLoadingMedia ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {incident.media_urls!.slice(0, 4).map((_, i) => <Bone key={i} className="aspect-video rounded-xl" />)}
                </div>
              ) : isMediaError ? (
                <p className="text-xs text-slate-600 rounded-xl px-3.5 py-3" style={{ background: `${TONE.amber}12` }}>
                  Media could not be loaded. The attachments are still recorded on the incident.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {media.map((m) =>
                    m.status === 'available' && m.url ? (
                      <div
                        key={m.ref}
                        onClick={() => m.kind === 'image' && setSelectedMediaUrl(m.url)}
                        className="group relative rounded-xl overflow-hidden bg-slate-100 aspect-video cursor-pointer ring-1 ring-slate-200 hover:ring-2 hover:ring-blue-500 transition-all"
                      >
                        {m.kind === 'video' ? (
                          <video src={m.url} controls preload="metadata" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <img src={m.url} alt="Field evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/25 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/90 text-slate-900 transition-opacity"><Maximize2 size={14} /></span>
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div key={m.ref} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 aspect-video flex flex-col items-center justify-center gap-1 text-slate-400">
                        {m.kind === 'video' ? <Video size={16} /> : <ImageIcon size={16} />}
                        <span className="text-[11px] font-semibold">{m.status === 'unsupported' ? 'Unsupported format' : 'Unavailable'}</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </Section>
          )}

          <CredibilityCard incidentId={incident.id} hideWhenEmpty />

          {!isCredibilityShown && activitySection}
        </div>

        <aside className={`space-y-5 ${isCredibilityShown ? '' : 'lg:sticky lg:top-4'}`}>
          <section className="bg-white border border-slate-200/80 rounded-2xl">
            <header className="px-5 pt-5 pb-3.5 mb-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Actions</h2>
              <StatusTag status={incident.status} />
            </header>

            <div className="px-5 pb-4">
              <div role="tablist" className="grid grid-cols-4 bg-slate-100 rounded-lg p-0.5">
                {COMMAND_TABS.map(({ key, label, dot }) => {
                  const on = activeCommandTab === key;
                  return (
                    <button key={key} role="tab" aria-selected={on} type="button" onClick={() => setActiveCommandTab(key)}
                      className={`relative py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${on ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {on && <motion.span layoutId="incident-cmd-tab" className="absolute inset-0 bg-white rounded-md shadow-[0_1px_2px_rgba(15,23,42,.08)]" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} />}
                      <span className="relative">{label}</span>
                      {dot && <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: TONE.amber }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {activeCommandTab === 'verify' && (
                incident.status === 'Unverified' ? (
                  <>
                    <Note tone="amber" title="Waiting for Verification">Confirm the report is real before sending teams.</Note>
                    <button
                      onClick={() => setShowVerifyModal(true)}
                      disabled={updateIncident.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <CheckCircle size={14} /> Verify Report
                    </button>
                    <button
                      onClick={() => {
                        setRejectReasonError('');
                        setShowRejectModal(true);
                      }}
                      disabled={updateIncident.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60 text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      <XCircle size={14} /> Reject/ Mark Duplicate
                    </button>
                  </>
                ) : (
                  <>
                    <Note tone="blue" title="Verified">Verified by {incident.verified_by || 'EOC Watch Commander'}.</Note>
                    {onTrackInIntelligence && (
                      <button
                        onClick={() => onTrackInIntelligence(incident)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <ArrowUpRight size={14} /> Track in Disaster Intelligence
                      </button>
                    )}
                  </>
                )
              )}

              {activeCommandTab === 'deploy' && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/response/rescue')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer hover:brightness-125"
                    style={{ background: NAVY }}
                  >
                    <Send size={14} /> Dispatch in Rescue Operations
                  </button>
                  <p className="text-[11px] text-slate-400">Teams and missions are assigned in Rescue Operations.</p>
                </>
              )}

              {activeCommandTab === 'resolve' && (
                incident.status === 'Resolved' ? (
                  <Note tone="teal" title="Resolved and closed">
                    Closed by {incident.verified_by || 'EOC Command'}{incident.resolved_at ? ` · ${formatDateTime(incident.resolved_at)}` : ''}.
                    {incident.outcome_notes && (
                      <span className="block mt-2 pt-2 border-t border-slate-200/70 text-slate-700 whitespace-pre-wrap">{incident.outcome_notes}</span>
                    )}
                  </Note>
                ) : (
                  <>
                    <Note tone="slate" title="Incident Completion">Closes its missions, releases assigned teams and files the closing record.</Note>
                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer hover:brightness-125"
                      style={{ background: NAVY }}
                    >
                      <CheckSquare size={14} /> Mark Resolved
                    </button>
                  </>
                )
              )}

              {activeCommandTab === 'export' && (
                <ul className="space-y-2">
                  {[
                    { label: 'Situation Report (SITREP)', hint: 'Official PDF', Icon: Download, run: () => incidentService.downloadSitrepPdf(incident.id, incident.display_id) },
                    { label: 'Public Warning Poster', hint: 'Printable PDF', Icon: Printer, run: () => incidentService.downloadSitrepPoster(incident.id, incident.display_id) },
                  ].map(({ label, hint, Icon, run }) => (
                    <li key={label}>
                      <button onClick={run}
                        className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer text-left">
                        <IconTile color={TONE.blue}><Icon size={15} /></IconTile>
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-semibold text-slate-900">{label}</span>
                          <span className="block text-[11px] text-slate-400">{hint}</span>
                        </span>
                        <Download size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Record details: who reported, through what, at which tier */}
          <section className="bg-white border border-slate-200/80 rounded-2xl">
            <header className="px-5 pt-5 pb-3.5 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Details</h2>
            </header>
            <dl className="px-5 py-2 divide-y divide-slate-100 text-xs">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-slate-500 shrink-0">Disaster Level</dt>
                <dd><LevelTag level={incident.disaster_level} /></dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-slate-500 shrink-0">Source</dt>
                <dd className="min-w-0 flex justify-end"><SourceTag source={incident.source} /></dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-slate-500 shrink-0">Type</dt>
                <dd className="font-semibold text-slate-800 truncate">{incident.type}</dd>
              </div>
              {incident.verified_by && (
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="text-slate-500 shrink-0">Verified by</dt>
                <dd className="text-right min-w-0">
                  <span className="block font-semibold text-slate-800 truncate">{incident.verified_by}</span>
                  {incident.verified_at && <span className="block text-[11px] text-slate-400">{formatDateTime(incident.verified_at)}</span>}
                </dd>
              </div>
              )}
              {incident.resolved_at && (
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-slate-500 shrink-0">Resolved</dt>
                  <dd className="font-semibold" style={{ color: TONE.teal }}>{formatDateTime(incident.resolved_at)}</dd>
                </div>
              )}
            </dl>

            {(incident.reporter_name || reporterContact) && (
            <div className="mx-5 mb-5 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><UserRound size={16} /></span>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400">Reporter</p>
                  {incident.reporter_name && <p className="text-[13px] font-semibold text-slate-900 truncate">{incident.reporter_name}</p>}
                  {reporterContact && <p className="text-xs text-slate-600 tabular-nums">{reporterContact}</p>}
                </div>
              </div>
              {reporterContact ? (
                <div className="flex gap-2 mt-3">
                  <a
                    href={`tel:${reporterContact.replace(/\s/g, '')}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Phone size={13} /> Call
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(reporterContact || '')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {copiedPhone ? <><Check size={13} style={{ color: TONE.teal }} /> Copied</> : <><Copy size={13} /> Copy number</>}
                  </button>
                </div>
              ) : null}
            </div>
            )}
          </section>

          {isCredibilityShown && activitySection}
        </aside>
      </div>

      {/* ── Resolve ── */}
      <FormModal
        open={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="Resolve Incident"
        icon={CheckSquare}
        subtitle={`${idLabel} · Closes Missions`}
        width="max-w-md"
        footer={<>
          <GhostButton onClick={() => setShowResolveModal(false)}>Cancel</GhostButton>
          <PrimaryButton onClick={handleResolve} pending={resolveIncident.isPending}>Mark Resolved</PrimaryButton>
        </>}
      >
        <Field label="Closing officer">
          <p className="px-3 py-2 text-[13px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg">{resolverName || 'EOC Incident Commander'}</p>
        </Field>
        <Field label="Outcome notes" optional>
          <textarea
            value={outcomeNotes}
            onChange={(e) => setOutcomeNotes(e.target.value)}
            rows={4}
            className={`${inputCls} resize-y`}
            placeholder="Final outcome, lessons learned or handover"
          />
        </Field>
      </FormModal>

      {/* ── Verify ── */}
      <ConfirmModal
        open={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        onConfirm={handleConfirmVerify}
        title="Verify this incident?"
        icon={ShieldCheck}
        confirmLabel="Verify"
        pending={updateIncident.isPending}
      >
        Teams can be dispatched to <span className="font-semibold text-slate-800">{idLabel}</span> once it is verified.
      </ConfirmModal>

      {/* ── Reject ── */}
      <FormModal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Report"
        icon={XCircle}
        subtitle={`${idLabel} · removes from active list`}
        width="max-w-md"
        footer={<>
          <GhostButton onClick={() => setShowRejectModal(false)}>Cancel</GhostButton>
          <PrimaryButton danger onClick={handleConfirmReject} pending={updateIncident.isPending} disabled={!rejectReason.trim()}>Reject</PrimaryButton>
        </>}
        reject={true}
      >
        <Field label="Reason for Rejection" required error={rejectReasonError}>
          <textarea
            value={rejectReason}
            onChange={(e) => {
              setRejectReason(e.target.value);
              if (e.target.value.trim()) setRejectReasonError('');
            }}
            rows={3}
            className={`${inputCls} resize-y`}
            placeholder="Duplicate, false alarm, or resolved before verification"
          />
        </Field>
      </FormModal>

      {/* ── Update impact ── */}
      <FormModal
        open={showAssessmentModal}
        onClose={() => setShowAssessmentModal(false)}
        title="Update Impact"
        icon={Gauge}
        subtitle={`Impact updates for ${idLabel}`}
        width="max-w-md"
        footer={<>
          <GhostButton onClick={() => setShowAssessmentModal(false)}>Cancel</GhostButton>
          <PrimaryButton onClick={handleSaveAssessment} pending={updateIncident.isPending}>Save</PrimaryButton>
        </>}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="People Affected">
            <input type="number" min={0} value={assessmentPop}
              onChange={(e) => setAssessmentPop(parseInt(e.target.value, 10) || 0)} className={`${inputCls} tabular-nums`} />
          </Field>
          <Field label="Casualties">
            <input type="number" min={0} value={assessmentCas}
              onChange={(e) => setAssessmentCas(parseInt(e.target.value, 10) || 0)} className={`${inputCls} tabular-nums`} />
          </Field>
          <Field label="Infrastructure Damage">
            <select value={assessmentInfra} onChange={(e) => setAssessmentInfra(e.target.value as typeof assessmentInfra)} className={`${inputCls} cursor-pointer`}>
              <option value="None">None</option>
              <option value="Minor">Minor</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
            </select>
          </Field>
          <Field label="Road Access" note="0–100">
            <input type="number" min={0} max={100} value={assessmentAccess}
              onChange={(e) => setAssessmentAccess(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))} className={`${inputCls} tabular-nums`} />
          </Field>
        </div>
        {assessmentChanged && <p className="text-[11px] text-slate-400">Saving re-runs the AI assessment.</p>}
      </FormModal>

      <Overlay>
      <AnimatePresence>
        {selectedMediaUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedMediaUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setSelectedMediaUrl(null)}
                aria-label="Close"
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors z-10 cursor-pointer"
              >
                <X size={18} />
              </button>
              <img src={selectedMediaUrl} alt="Field evidence, enlarged" className="w-full max-h-[80vh] object-contain" />
              <div className="px-4 py-3 text-xs text-slate-300 flex items-center justify-between gap-3" style={{ background: NAVY }}>
                <span className="truncate">Field evidence · {incident.title}</span>
                <a href={selectedMediaUrl} target="_blank" rel="noreferrer" className="shrink-0 font-semibold text-blue-300 hover:text-blue-200">
                  Open in new tab
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Overlay>
    </motion.div>
  );
};
