import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
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
} from 'lucide-react';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
import { TriggerAlertPanel } from '../../../components/ui/situational/TriggerAlertPanel';
import { ImpactTimeline } from '../../../components/ui/situational/ImpactTimeline';
import { useUpdateIncident, useResolveIncident } from '../../../hooks';
import { incidentService } from '../../../services/incidentService';
import { formatDateTime } from '../../../utils/dateFormatter';
import { useToast } from '../../../context/ToastContext';
import type { Incident } from '../../../types';

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

interface IncidentDetailViewProps {
  incident: Incident;
  onBack: () => void;
  onVerify: (id: string) => void;
  onTrackInIntelligence?: (incident: Incident) => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  Unverified: <Clock size={14} className="text-amber-600" />,
  Verified: <CheckCircle size={14} className="text-blue-600" />,
  Responding: <Radio size={14} className="text-orange-600 animate-pulse" />,
  Resolved: <CheckCircle size={14} className="text-emerald-600" />,
  Rejected: <XCircle size={14} className="text-rose-500" />,
};

export const IncidentDetailView: React.FC<IncidentDetailViewProps> = ({
  incident,
  onBack,
  onVerify,
  onTrackInIntelligence,
}) => {
  const isTracked = incident.status !== 'Unverified' && !!incident.impactTimeline?.length;
  const updateIncident = useUpdateIncident();
  const resolveIncident = useResolveIncident();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const [activeCommandTab, setActiveCommandTab] = useState<'verify' | 'deploy' | 'resolve' | 'export'>(() => {
    if (incident.status === 'Unverified') return 'verify';
    if (incident.status === 'Resolved') return 'resolve';
    return 'deploy';
  });

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [resolverName, setResolverName] = useState('EOC Incident Commander');
  const [verifierName, setVerifierName] = useState("Dato' Ir. Ahmad Rosli (NADMA)");
  const [rejectReason, setRejectReason] = useState('Duplicate report / ground check unconfirmed');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleConfirmVerify = () => {
    updateIncident.mutate(
      {
        id: incident.id,
        updates: {
          status: 'Verified',
          verifiedBy: verifierName,
          verifiedAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setShowVerifyModal(false);
          onVerify(incident.id);
          toastSuccess('Incident Verified', `${getCleanIncidentId(incident.id, incident.displayId)} has been verified and activated.`);
        },
        onError: () => toastError('Verification Failed', 'Could not verify incident. Please retry.'),
      }
    );
  };

  const handleConfirmReject = () => {
    updateIncident.mutate(
      {
        id: incident.id,
        updates: {
          status: 'Rejected',
          verifiedBy: `Rejected by ${verifierName}`,
          rejectionReason: rejectReason,
        },
      },
      {
        onSuccess: () => {
          setShowRejectModal(false);
          toastWarning('Incident Rejected', `Report ${getCleanIncidentId(incident.id, incident.displayId)} has been rejected and logged.`);
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
          toastSuccess('Incident Resolved', `${getCleanIncidentId(incident.id, incident.displayId)} has been closed and archived.`);
          onBack();
        },
        onError: () => toastError('Resolution Failed', 'Could not close incident. Please retry.'),
      }
    );
  };

  const fieldCommanderPhone = incident.reporterContact?.match(/\+?[\d\-\s()]{8,}/)?.[0] || null;

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(incident.id);
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
            LAST SYNC: {formatDateTime(incident.occurredAt)}
          </span>
          <div className="h-4 w-px bg-slate-200" />
          <DisasterBadge type="severity" value={incident.severity} />
          <DisasterBadge type="level" value={incident.disasterLevel} />
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
                title="Click to copy full UUID"
                className="flex items-center gap-1.5 text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded border border-slate-700 transition-colors cursor-pointer"
              >
                <span>INCIDENT ID: {getCleanIncidentId(incident.id, incident.displayId)}</span>
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
              <MapPin size={14} className="text-red-400 shrink-0" />
              {incident.location}, {incident.district}, {incident.state}
            </p>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shrink-0 space-y-1 min-w-[220px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Source & Verification
            </p>
            <p className="text-sm font-extrabold text-slate-100">{incident.source}</p>
            <p className="text-xs text-slate-400 pt-1 border-t border-slate-700">
              Officer: <span className="text-slate-200 font-medium">{incident.verifiedBy || 'Unassigned'}</span>
            </p>
            {incident.verifiedAt && (
              <p className="text-[10px] text-emerald-400 font-mono">
                Verified: {formatDateTime(incident.verifiedAt)}
              </p>
            )}
            {incident.resolvedAt && (
              <p className="text-[10px] text-emerald-300 font-mono flex items-center gap-1 font-bold">
                <CheckCircle size={10} className="text-emerald-400" />
                Resolved: {formatDateTime(incident.resolvedAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Impacted Population</span>
            <Users size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{incident.affectedPopulation.toLocaleString()}</p>
          <span className="text-[10px] text-slate-500 font-medium">Est. residents in zone</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Confirmed Casualties</span>
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{incident.casualtiesCount}</p>
          <span className="text-[10px] text-slate-500 font-medium">Requiring immediate aid</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Infrastructural Risk</span>
            <Building2 size={16} className="text-amber-600" />
          </div>
          <p className="text-lg font-black text-slate-900 truncate">{incident.infrastructureDamage}</p>
          <span className="text-[10px] text-slate-500 font-medium">Primary impact area</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Access Score</span>
            <Zap size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{incident.accessibilityScore}<span className="text-xs text-slate-400 font-normal">/100</span></p>
          <span className="text-[10px] text-slate-500 font-medium">Ground transit viability</span>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {incident.triggerAlert && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Radio size={16} className="text-orange-600" /> Trigger & Prediction
              </h2>
              <TriggerAlertPanel alert={incident.triggerAlert} size="full" />
            </div>
          )}

          {isTracked && incident.impactTimeline && (
            <ImpactTimeline timeline={incident.impactTimeline} mode="confirmed-only" size="full" />
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText size={16} className="text-blue-600" /> Ground Situation Narrative
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed font-normal">
              {incident.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-lg">
              <div className="flex items-start gap-2.5">
                <Wind size={16} className="text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weather Condition</span>
                  <p className="text-xs font-bold text-slate-800">{incident.weatherCondition}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Navigation size={16} className="text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Geographic Zone</span>
                  <p className="text-xs font-bold text-slate-800">{incident.district}, {incident.state}</p>
                </div>
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
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/60 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveCommandTab('verify')}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  activeCommandTab === 'verify'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <CheckCircle size={13} />
                  <span>Verify</span>
                </div>
                {incident.status === 'Unverified' && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveCommandTab('deploy')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  activeCommandTab === 'deploy'
                    ? 'bg-white text-orange-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Send size={13} />
                  <span>Deploy</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveCommandTab('resolve')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  activeCommandTab === 'resolve'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <CheckSquare size={13} />
                  <span>Resolve</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveCommandTab('export')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  activeCommandTab === 'export'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Download size={13} />
                  <span>Export</span>
                </div>
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
                  <span className="text-[10px] font-mono text-slate-400">EOC Directive</span>
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
                      onClick={() => setShowRejectModal(true)}
                      disabled={updateIncident.isPending}
                      className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <XCircle size={14} /> Reject / Mark Duplicate
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2.5">
                      <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-950">Verified & Confirmed</p>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Verified by {incident.verifiedBy || 'EOC Watch Commander'}.
                        </p>
                      </div>
                    </div>

                    {onTrackInIntelligence && (
                      <button
                        onClick={() => onTrackInIntelligence(incident)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer"
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

                {/* Field Commander Contact Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Field Commander Line
                    </span>
                    <PhoneCall size={12} className="text-blue-600" />
                  </div>

                  <div className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-md">
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {fieldCommanderPhone || '03-8888 2010 (NADMA)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(fieldCommanderPhone || '03-8888 2010')}
                      className="text-slate-400 hover:text-slate-700 text-[11px] flex items-center gap-1 font-medium cursor-pointer"
                      title="Copy phone number"
                    >
                      {copiedPhone ? (
                        <>
                          <Check size={12} className="text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`tel:${(fieldCommanderPhone || '0388882010').replace(/\s/g, '')}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <Phone size={13} />
                      <span>Direct Call</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowContactModal(true)}
                      className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: RESOLUTION ── */}
            {activeCommandTab === 'resolve' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Step 3 · Lifecycle Resolution
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Audit</span>
                </div>

                {incident.status === 'Resolved' ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle size={14} /> Incident Resolved & Closed
                    </span>
                    <p className="text-[11px] text-emerald-800">
                      Closed by {incident.verifiedBy || 'EOC Command'}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900">
                      <p className="font-bold mb-0.5">🏁 Complete Incident Handover</p>
                      <p className="text-[11px] text-purple-800">
                        Closes mission records, releases assigned rescue teams, and files closing audit.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
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
                  <span className="text-[10px] font-mono text-slate-400">PDF SITREP</span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => incidentService.downloadSitrepPdf(incident.id, incident.displayId)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Download size={14} className="text-blue-600" />
                      Official SITREP PDF
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">EOC-PDF</span>
                  </button>

                  <button
                    onClick={() => incidentService.downloadSitrepPoster(incident.id, incident.displayId)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Printer size={14} className="text-amber-700" />
                      Warning Poster PDF
                    </span>
                    <span className="text-[10px] font-mono text-amber-600">A4 Print</span>
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
                {incident.actionLog && incident.actionLog.length > 0 ? (
                  incident.actionLog.map((log, idx) => (
                    <div key={log.id || idx} className="relative flex items-start gap-3 pl-7">
                      <div
                        className={`absolute left-1.5 top-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                          log.action.toLowerCase().includes('create')
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
                            {formatDateTime(log.loggedAt, 'Recent')}
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
                  <input
                    type="text"
                    value={resolverName}
                    onChange={(e) => setResolverName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                    placeholder="EOC Incident Commander"
                  />
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
                <p className="text-sm font-bold text-slate-800">{incident.reporterContact || 'No contact recorded'}</p>
              </div>

              {fieldCommanderPhone ? (
                <a
                  href={`tel:${fieldCommanderPhone.replace(/\s/g, '')}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <PhoneCall size={15} /> Call {fieldCommanderPhone}
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
                  <span className="font-bold text-red-600">{incident.severity} · {incident.disasterLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Est. Population:</span>
                  <span className="font-mono font-bold text-slate-900">{incident.affectedPopulation.toLocaleString()} people</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Verifying Officer Name & Agency</label>
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
                  placeholder="e.g. Dato' Ir. Ahmad Rosli (NADMA)"
                />
              </div>

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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rejecting Officer</label>
                  <input
                    type="text"
                    value={verifierName}
                    onChange={(e) => setVerifierName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600 font-medium"
                    placeholder="e.g. Commander Azmi Yusof"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600 resize-none font-medium"
                    placeholder="e.g. Duplicate report, false alarm, or resolved prior to verification..."
                  />
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
                  disabled={updateIncident.isPending}
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
    </motion.div>
  );
};
