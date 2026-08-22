import React from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
import { TriggerAlertPanel } from '../../../components/ui/situational/TriggerAlertPanel';
import { ImpactTimeline } from '../../../components/ui/situational/ImpactTimeline';
import type { Incident } from '../../../types';

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
};

export const IncidentDetailView: React.FC<IncidentDetailViewProps> = ({
  incident,
  onBack,
  onVerify,
  onTrackInIntelligence,
}) => {
  const isTracked = incident.status !== 'Unverified' && !!incident.impactTimeline?.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 max-w-7xl mx-auto pb-12"
    >
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
            LAST SYNC: {incident.timestamp}
          </span>
          <div className="h-4 w-px bg-slate-200" />
          <DisasterBadge type="severity" value={incident.severity} />
          <DisasterBadge type="level" value={incident.disasterLevel} />
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <ShieldAlert size={200} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700">
                INCIDENT ID: {incident.id}
              </span>
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
          </div>
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Trigger — why this was raised */}
          {incident.triggerAlert && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Radio size={16} className="text-orange-600" /> Trigger & Prediction
              </h2>
              <TriggerAlertPanel alert={incident.triggerAlert} size="full" />
            </div>
          )}

          {/* Impact timeline — appears once verified/tracked */}
          {isTracked && incident.impactTimeline && (
            <ImpactTimeline timeline={incident.impactTimeline} size="full" />
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

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <History size={16} className="text-slate-600" /> Operational Action Log
            </h2>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
              <div className="relative flex items-start gap-4 pl-8">
                <div className="absolute left-2 top-1.5 -translate-x-1/2 w-3 h-3 rounded-full bg-orange-500 ring-4 ring-white" />
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-800">Triggered by Metrology Alert</span>
                    <span className="text-[10px] font-mono text-slate-400">{incident.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {incident.triggerAlert
                      ? `${incident.triggerAlert.source} readings crossed threshold — ${incident.triggerAlert.predictedProbability}% predicted probability.`
                      : `Incident logged automatically via integration with ${incident.source}.`}
                  </p>
                </div>
              </div>

              {incident.status !== 'Unverified' && (
                <div className="relative flex items-start gap-4 pl-8">
                  <div className="absolute left-2 top-1.5 -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white" />
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 w-full">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-800">Verification Completed</span>
                      <span className="text-[10px] font-mono text-slate-400">Recent</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Verified by <span className="font-semibold text-slate-800">{incident.verifiedBy}</span>. Impact tracking started in Disaster Intelligence.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              Command Actions
            </h3>

            {incident.status === 'Unverified' ? (
              <div className="space-y-2">
                <button
                  onClick={() => onVerify(incident.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  <CheckCircle size={15} /> Verify Report Now
                </button>
                <button className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer">
                  Reject / Mark Duplicate
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  Verified & Enqueued for Dispatch
                </div>
                {onTrackInIntelligence && (
                  <button
                    onClick={() => onTrackInIntelligence(incident)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-100 transition-colors cursor-pointer"
                  >
                    <ArrowUpRight size={14} /> View in Disaster Intelligence
                  </button>
                )}
              </div>
            )}

            <hr className="border-slate-100" />

            <div className="space-y-2 pt-1">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer">
                <Send size={14} /> Dispatch First Responders
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer">
                <PhoneCall size={14} /> Contact Field Commander
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};