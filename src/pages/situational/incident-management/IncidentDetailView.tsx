import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  Radio,
  MapPin,
  Users,
  ShieldAlert,
  Zap,
  FileText,
  AlertTriangle,
  Send,
  PhoneCall,
  History,
  Building2,
  Wind,
  Navigation,
  ArrowUpRight,
  XCircle,
  Download,
  Printer,
  CheckSquare,
  X,
  Loader2,
  Copy,
  Check,
  Phone,
  CloudRain,
  Thermometer,
  Droplets,
  Edit3,
} from 'lucide-react';
import { TriggerAlertPanel } from '../../../components/ui/situational/TriggerAlertPanel';
import { ImpactTimeline } from '../../../components/ui/situational/ImpactTimeline';
import { useIncidentLogs, useUpdateIncident, useResolveIncident } from '../../../hooks';
import { incidentService } from '../../../services/incidentService';
import { formatDateTime } from '../../../utils/dateFormatter';
import { useToast } from '../../../context/ToastContext';
import type { CommandTabType, IncidentDetailViewProps } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { statusIcons } from '../../../constants/situational';

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

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1 || code === 2 || code === 3) return 'Partly cloudy / Overcast';
  if (code >= 51 && code <= 55) return 'Light Drizzle';
  if (code >= 61 && code <= 65) return 'Rain showers';
  if (code >= 80 && code <= 82) return 'Heavy monsoon rain showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm & Lightning';
  return 'Overcast / Monsoon Conditions';
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
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [resolverName] = useState(user?.name ?? 'EOC Incident Commander');
  const [verifierName] = useState(user?.name ?? 'EOC Watch Commander');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Assessment edit fields
  const [assessmentPop, setAssessmentPop] = useState(incident.affected_population || 0);
  const [assessmentCas, setAssessmentCas] = useState(incident.casualties_count || 0);
  const [assessmentInfra, setAssessmentInfra] = useState(incident.infrastructure_damage || 'None');
  const [assessmentAccess, setAssessmentAccess] = useState(incident.accessibility_score ?? 50);

  // Dynamic Live Weather Forecast state
  const [liveWeather, setLiveWeather] = useState<{
    temp: number;
    weatherDesc: string;
    windSpeed: number;
    humidity: number;
    rainProb: number;
  } | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  useEffect(() => {
    const fetchLiveForecast = async () => {
      const lat = incident.coordinates?.[0] || 4.2105;
      const lng = incident.coordinates?.[1] || 101.9758;
      setIsLoadingWeather(true);
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=relative_humidity_2m,precipitation_probability&timezone=Asia%2FKuala_Lumpur`
        );
        const data = await res.json();
        if (data?.current_weather) {
          const code = data.current_weather.weathercode;
          const desc = getWeatherDescription(code);
          const hourly = data.hourly || {};
          const humidity = hourly.relative_humidity_2m?.[0] ?? 78;
          const rainProb = hourly.precipitation_probability?.[0] ?? 60;
          setLiveWeather({
            temp: data.current_weather.temperature,
            weatherDesc: desc,
            windSpeed: data.current_weather.windspeed,
            humidity,
            rainProb,
          });
        }
      } catch {
        // Fallback
      } finally {
        setIsLoadingWeather(false);
      }
    };
    fetchLiveForecast();
  }, [incident.coordinates]);

  // Sync assessment states when incident changes
  useEffect(() => {
    setAssessmentPop(incident.affected_population || 0);
    setAssessmentCas(incident.casualties_count || 0);
    setAssessmentInfra(incident.infrastructure_damage || 'None');
    setAssessmentAccess(incident.accessibility_score ?? 50);
  }, [incident]);

  // Determine if this incident originates from hydrological / telemetry monitoring (hide triggers if Citizen/SOS)
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
    updateIncident.mutate(
      {
        id: incident.id,
        updates: {
          affected_population: Number(assessmentPop) || 0,
          casualties_count: Number(assessmentCas) || 0,
          infrastructure_damage: assessmentInfra as any,
          accessibility_score: Number(assessmentAccess) || 50,
        },
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 max-w-7xl mx-auto pb-12"
    >
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
        >
          <ArrowLeft size={16} />
          Return to Incident Feed
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-medium text-slate-500">
            LAST SYNC: {formatDateTime(incident.occurred_at)}
          </span>
        </div>
      </div>

      {/* ── Hero banner ── */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <ShieldAlert size={200} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyId}
                title="Click to copy incident ID"
                className="flex items-center gap-1.5 text-xs font-mono font-bold bg-white/10 hover:bg-white/15 text-blue-100 px-2.5 py-1.5 rounded-lg border border-white/10 transition-colors cursor-pointer"
              >
                <span>INCIDENT ID: {getCleanIncidentId(incident.id, incident.display_id)}</span>
                {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-400" />}
              </button>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
                {statusIcons[incident.status]}
                <span className="text-xs font-bold text-slate-200">{incident.status}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {incident.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1.5 font-medium">
              <MapPin size={14} className="text-blue-300 shrink-0" />
              {incident.location}, {incident.district}, {incident.state}
            </p>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shrink-0 space-y-1 min-w-[220px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Source & Verification
            </p>
            <p className="text-sm font-extrabold text-slate-100">{incident.source}</p>
            <p className="text-xs text-slate-400 pt-1 border-t border-slate-700">
              Officer: <span className="text-slate-200 font-medium">{incident.verified_by ?? 'Unassigned'}</span>
            </p>
            {(incident.verified_by_role || incident.verified_by_agency) && (
              <p className="text-[10px] text-slate-400 font-medium">
                {[incident.verified_by_role, incident.verified_by_agency].filter(Boolean).join(' · ')}
              </p>
            )}
            {incident.verified_at && (
              <p className="text-[10px] text-emerald-400 font-mono">
                Verified: {formatDateTime(incident.verified_at)}
              </p>
            )}
            {incident.resolved_at && (
              <p className="text-[10px] text-emerald-300 font-mono flex items-center gap-1 font-bold">
                <CheckCircle size={10} className="text-emerald-400" />
                Resolved: {formatDateTime(incident.resolved_at)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI cards & Impact Assessment Header ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Disaster Impact Assessment &amp; Ground Situation
          </span>
          <button
            type="button"
            onClick={() => setShowAssessmentModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors cursor-pointer"
          >
            <Edit3 size={13} />
            <span>Update Assessment Metrics</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Impacted Population</span>
              <Users size={16} className="text-slate-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{(incident.affected_population ?? 0).toLocaleString()}</p>
            <span className="text-[10px] text-slate-500 font-medium">Est. residents in zone</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Confirmed Casualties</span>
              <AlertTriangle size={16} className="text-red-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{incident.casualties_count ?? 0}</p>
            <span className="text-[10px] text-slate-500 font-medium">Requiring immediate aid</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Infrastructural Risk</span>
              <Building2 size={16} className="text-slate-600" />
            </div>
            <p className="text-lg font-black text-slate-900 truncate">{incident.infrastructure_damage}</p>
            <span className="text-[10px] text-slate-500 font-medium">Primary impact area</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Access Score</span>
              <Zap size={16} className="text-slate-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{incident.accessibility_score ?? 0}<span className="text-xs text-slate-400 font-normal">/100</span></p>
            <span className="text-[10px] text-slate-500 font-medium">Ground transit viability</span>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Hydrological Trigger & Prediction (Only shown when source is telemetry / hydrological sensor, not Citizen/SOS) */}
          {isSensorSource && incident.trigger_alert && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Radio size={16} className="text-orange-600" /> Hydrological Telemetry &amp; Forecast
              </h2>
              <TriggerAlertPanel alert={incident.trigger_alert} size="full" />
            </div>
          )}

          {isTracked && incident.impact_timeline && (
            <ImpactTimeline timeline={incident.impact_timeline} mode="confirmed-only" size="full" />
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText size={16} className="text-blue-600" /> Ground Situation Narrative
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed font-normal">
              {incident.description}
            </p>

            {/* Dynamic Live Weather Forecast & Reported Metrology */}
            <div className="pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CloudRain size={14} className="text-blue-600" />
                  Live Weather Forecast &amp; Location Metrology
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Reported Weather</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{incident.weather_condition}</p>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Live Conditions</span>
                  <p className="text-xs font-bold text-blue-700 mt-0.5 flex items-center gap-1">
                    <Thermometer size={12} />
                    {liveWeather ? `${liveWeather.temp}°C · ${liveWeather.weatherDesc}` : (isLoadingWeather ? 'Syncing...' : '29°C · Overcast')}
                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Rain / Humidity</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                    <Droplets size={12} className="text-blue-500" />
                    {liveWeather ? `Rain: ${liveWeather.rainProb}% · Hum: ${liveWeather.humidity}%` : 'Rain: 65% · Hum: 80%'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-medium">
                <span className="flex items-center gap-1">
                  <Navigation size={12} className="text-slate-400" />
                  Target Zone: <strong className="text-slate-700">{incident.district}, {incident.state} {incident.postcode ? `(${incident.postcode})` : ''}</strong>
                </span>
                {liveWeather && (
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <Wind size={11} className="text-slate-400" /> Wind: {liveWeather.windSpeed} km/h
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ── Tabbed Command Actions Sidebar ── */}
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {/* Header & Tabs */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Command Action Center
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                  {incident.status}
                </span>
              </div>

              {/* Segmented Tab Controls */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveCommandTab('verify')}
                  className={`relative flex items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${activeCommandTab === 'verify'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/70'
                    }`}
                >
                  <CheckCircle size={13} />
                  <span>Verify</span>

                  {incident.status === 'Unverified' && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCommandTab('deploy')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${activeCommandTab === 'deploy'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/70'
                    }`}
                >
                  <Send size={13} />
                  <span>Deploy</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCommandTab('resolve')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${activeCommandTab === 'resolve'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/70'
                    }`}
                >
                  <CheckSquare size={13} />
                  <span>Resolve</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCommandTab('export')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${activeCommandTab === 'export'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/70'
                    }`}
                >
                  <Download size={13} />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Tab Panel Body */}
            <div className="p-4 space-y-4">
              {/* ── TAB 1: VERIFY & TRIAGE ── */}
              {activeCommandTab === 'verify' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Step 1 · Verification & Triage
                    </span>
                  </div>

                  {incident.status === 'Unverified' ? (
                    <div className="space-y-2.5">
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                        <p className="font-bold mb-0.5">⚠️ Pending Field Verification</p>
                        <p className="text-[11px] text-amber-800">
                          Confirm source validity before dispatching emergency tactical teams.
                        </p>
                      </div>

                      <button
                        onClick={() => setShowVerifyModal(true)}
                        disabled={updateIncident.isPending}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                      >
                        <CheckCircle size={14} /> Verify Incident Report
                      </button>

                      <button
                        onClick={() => {
                          setRejectReasonError('');
                          setShowRejectModal(true);
                        }}
                        disabled={updateIncident.isPending}
                        className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <XCircle size={14} /> Reject / Mark Duplicate
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
                        <CheckCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-blue-950">Verified & Confirmed</p>
                          <p className="text-[11px] text-blue-800 mt-0.5">
                            Verified by {incident.verified_by || 'EOC Watch Commander'}.
                          </p>
                        </div>
                      </div>

                      {onTrackInIntelligence && (
                        <button
                          onClick={() => onTrackInIntelligence(incident)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-black hover:bg-black-100 text-white text-xs font-bold rounded-lg border border-black transition-colors cursor-pointer"
                        >
                          <ArrowUpRight size={14} /> Track in Intelligence Module
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: TACTICAL OPS & CONTACT ── */}
              {activeCommandTab === 'deploy' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Step 2 · Tactical Operations
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Response</span>
                  </div>

                  <a
                    href="/response/rescue"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer text-center"
                  >
                    <Send size={14} /> Dispatch via Rescue Ops →
                  </a>

              {reporterContact &&     <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Reporter Contact
                      </span>
                    </div>

<div className="flex items-stretch gap-2">
                      <div className="flex items-center justify-between flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-3 py-2.5">
                        <span className="text-xs font-mono font-bold text-slate-800 truncate">
                          {reporterContact}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopyPhone(reporterContact || '')}
                          className="ml-3 flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-blue-600 font-semibold transition-colors cursor-pointer shrink-0"
                          title="Copy phone number"
                        >
                          {copiedPhone ? (
                            <>
                              <Check size={12} className="text-blue-600" />
                              <span className="text-blue-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      <a
                        href={`tel:${reporterContact.replace(/\s/g, '')}`}
                        className="flex items-center justify-center w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Call reporter"
                      >
                        <Phone size={14} />
                      </a>
                    </div>
                    
                  </div>
                    }
                </div>
              )}

              {/* ── TAB 3: RESOLUTION ── */}
              {activeCommandTab === 'resolve' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Step 3 · Lifecycle Resolution
                    </span>
                  </div>

                  {incident.status === 'Resolved' ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1.5">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle size={14} /> Incident Resolved & Closed
                      </span>
                      <p className="text-[11px] text-emerald-800">
                        Closed by <strong>{incident.verified_by || 'EOC Command'}</strong>
                        {incident.resolved_at ? ` · ${formatDateTime(incident.resolved_at)}` : ''}.
                      </p>
                      {incident.outcome_notes && (
                        <div className="mt-2 pt-2 border-t border-emerald-200">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Outcome Notes</p>
                          <p className="text-[11px] text-emerald-900 leading-relaxed whitespace-pre-wrap">{incident.outcome_notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                        <p className="font-bold mb-0.5">🏁 Complete Incident Handover</p>
                        <p className="text-[11px] text-blue-800">
                          Closes mission records, releases assigned rescue teams, and files closing audit.
                        </p>
                      </div>

                      <button
                        onClick={() => setShowResolveModal(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black hover:bg-black-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                      >
                        <CheckSquare size={14} /> Mark Incident Resolved
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: OFFICIAL EXPORT ── */}
              {activeCommandTab === 'export' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Step 4 · Official Documents
                    </span>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => incidentService.downloadSitrepPdf(incident.id, incident.display_id)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5
  bg-slate-50 hover:bg-blue-50
  text-slate-800 hover:text-blue-700
  text-xs font-bold rounded-lg
  border border-slate-200 hover:border-blue-200
  transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Download size={14} className="text-blue-600" />
                        Official SITREP PDF
                      </span>

                    </button>

                    <button
                      onClick={() => incidentService.downloadSitrepPoster(incident.id, incident.display_id)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5
  bg-slate-50 hover:bg-blue-50
  text-slate-800 hover:text-blue-700
  text-xs font-bold rounded-lg
  border border-slate-200 hover:border-blue-200
  transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Printer size={14} className="text-blue-600" />
                        Warning Poster PDF
                      </span>

                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Operational Action Log (below Command Action Center) ── */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <History size={15} className="text-slate-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Operational Action Log</h3>
            </div>
            <div className="p-4 max-h-[380px] overflow-y-auto">
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
                {isLoadingLogs ? (
                  <div className="pl-7 py-3 text-xs text-slate-400 font-medium italic">Loading operational log…</div>
                ) : incidentLogs.length > 0 ? (
                  incidentLogs.map((log, idx) => (
                    <div key={log.id || idx} className="relative flex items-start gap-3 pl-7">
                      <div
                        className={`absolute left-1.5 top-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full ring-4 ring-white ${log.action.toLowerCase().includes('create')
                          ? 'bg-blue-600'
                          : log.action.toLowerCase().includes('verif')
                            ? 'bg-emerald-600'
                            : log.action.toLowerCase().includes('resolv')
                              ? 'bg-purple-600'
                              : log.action.toLowerCase().includes('updat')
                                ? 'bg-amber-500'
                                : 'bg-slate-600'
                          }`}
                      />
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-800">{log.action}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {formatDateTime(log.logged_at, 'Recent')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          {log.detail || `Action performed by ${log.actor}`}
                        </p>
                        <div className="mt-1 text-[10px] font-mono text-slate-400">
                          Actor: <span className="font-semibold text-slate-600">{log.actor}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pl-7 py-3 text-xs text-slate-400 font-medium italic">
                    No operational log entries recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Resolve Incident Modal ── */}
      <AnimatePresence>
        {showResolveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowResolveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <CheckSquare size={18} className="text-purple-600" /> Close Disaster Incident
                </h2>
                <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs text-purple-800 font-medium">
                Marking this incident as <strong>Resolved</strong> will: release assigned rescue teams back to Available, mark in-progress missions as Completed, and write a closing audit log entry.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Closing Officer / Resolver</label>
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium select-none">
                    {resolverName || 'EOC Incident Commander'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Outcome Synthesis Notes</label>
                  <textarea
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-slate-900 resize-none"
                    placeholder="Summarise the final outcome, lessons learned, or handover notes..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={resolveIncident.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {resolveIncident.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Confirm & Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contact Field Commander Modal ── */}
      <AnimatePresence>
        {showContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowContactModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <PhoneCall size={18} className="text-blue-600" /> Contact Field Commander
                </h2>
                <button onClick={() => setShowContactModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reporter / Source Contact</p>
                <p className="text-sm font-bold text-slate-800">{incident.reporter_contact || 'No contact recorded'}</p>
              </div>

              {reporterContact ? (
                <a
                  href={`tel:${reporterContact.replace(/\s/g, '')}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <PhoneCall size={15} /> Call {reporterContact}
                </a>
              ) : (
                <div className="text-xs text-slate-500 font-medium bg-amber-50 border border-amber-200 rounded-lg p-3">
                  No callable phone number found. Contact via agency radio channels or NADMA Operations Room: <strong>03-8888 2010</strong>
                </div>
              )}

              <button
                onClick={() => setShowContactModal(false)}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Verify Incident Confirmation Modal ── */}
      <AnimatePresence>
        {showVerifyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowVerifyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <CheckCircle size={18} className="text-blue-600" /> Confirm Incident Verification
                </h2>
                <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900 space-y-1">
                <p className="font-bold">Verify and Activate Emergency Response</p>
                <p className="text-[11px] text-blue-800">
                  Verifying will upgrade status to <strong>Verified</strong>, timestamp the official verification in the national database, and enable search & rescue dispatch.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Incident:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[240px]">{incident.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Location:</span>
                  <span className="font-medium text-slate-800">{incident.location}, {incident.district}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Severity:</span>
                  <span className="font-bold text-red-600">{incident.severity} · {incident.disaster_level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Est. Population:</span>
                  <span className="font-mono font-bold text-slate-900">{(incident.affected_population ?? 0).toLocaleString()} people</span>
                </div>
              </div>

              {/* <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Verifying Officer Name & Agency</label>
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
                  placeholder="e.g. Dato' Ir. Ahmad Rosli (NADMA)"
                />
              </div> */}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowVerifyModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmVerify}
                  disabled={updateIncident.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {updateIncident.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Confirm Verification
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reject Incident Confirmation Modal ── */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <XCircle size={18} className="text-red-600" /> Reject Incident Report
                </h2>
                <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-900 space-y-1">
                <p className="font-bold">Report Rejection</p>
                <p className="text-[11px] text-red-800">
                  Rejecting this report will mark it as <strong>Rejected</strong>, removing it from active disaster feeds and recording the reason in the audit trail.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection <span className="text-red-600">*</span></label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (e.target.value.trim()) setRejectReasonError('');
                    }}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600 resize-none font-medium"
                    placeholder="e.g. Duplicate report, false alarm, or resolved prior to verification..."
                  />
                  {rejectReasonError && <p className="mt-1 text-[11px] font-medium text-red-600">{rejectReasonError}</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={updateIncident.isPending || !rejectReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {updateIncident.isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Impact Assessment Edit Modal (EOC Disaster Management Authority) ── */}
      <AnimatePresence>
        {showAssessmentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowAssessmentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 size={16} className="text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Update Disaster Assessment Metrics</h3>
                    <p className="text-[10px] text-slate-400">
                      Official ground damage &amp; impact updates for {getCleanIncidentId(incident.id, incident.display_id)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssessmentModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Impacted Population</label>
                    <input
                      type="number"
                      min={0}
                      value={assessmentPop}
                      onChange={(e) => setAssessmentPop(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Confirmed Casualties</label>
                    <input
                      type="number"
                      min={0}
                      value={assessmentCas}
                      onChange={(e) => setAssessmentCas(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Infrastructure Risk</label>
                    <select
                      value={assessmentInfra}
                      onChange={(e) => setAssessmentInfra(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="None">None</option>
                      <option value="Minor">Minor</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Severe">Severe</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Access Score (0 - 100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={assessmentAccess}
                      onChange={(e) => setAssessmentAccess(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAssessmentModal(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAssessment}
                    disabled={updateIncident.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    {updateIncident.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Save Assessment Metrics
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
