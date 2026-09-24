import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MapPin, Phone, UserCheck, ChevronDown, ChevronUp,
  Truck, ShieldCheck, Target, Navigation, ArrowUpRight, Sparkles
} from 'lucide-react';
import type { RescueTeam, Mission, Incident } from '../../../../types';

interface TeamCardProps {
  team: RescueTeam;
  missions: Mission[];
  incidents: Incident[];
  isExpanded: boolean;
  onToggle: () => void;
  onViewOperations?: (team: RescueTeam) => void;
  onEdit?: (team: RescueTeam) => void;
  onDelete?: (team: RescueTeam) => void;
}

const agencyColors: Record<string, string> = {
  SMART: 'bg-blue-50 text-blue-800 border-blue-200',
  BOMBA: 'bg-red-50 text-red-800 border-red-200',
  APM: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PDRM: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  ATM: 'bg-amber-50 text-amber-800 border-amber-200',
};

const statusConfig: Record<string, { dot: string; badge: string }> = {
  Available: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Deployed: { dot: 'bg-orange-500 animate-pulse', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  'En Route': { dot: 'bg-blue-500 animate-pulse', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  'Off Duty': { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const TeamCard: React.FC<TeamCardProps> = ({
  team, missions, incidents, isExpanded, onToggle, onViewOperations, onEdit, onDelete
}) => {
  const teamMissions = missions.filter((m) => m.assignedTeamId === team.id);
  const assignedIncident = incidents.find((i) => i.id === team.assignedIncidentId);
  const sc = statusConfig[team.status] || statusConfig['Off Duty'];
  const ac = agencyColors[team.agency] || '';

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${isExpanded ? 'border-blue-300 shadow-md' : 'border-slate-200 shadow-xs hover:border-slate-300'}`}>
      {/* Team Row Header */}
      <div className="flex items-center gap-4 px-5 py-4 text-left">
        {/* Agency badge */}
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded border shrink-0 ${ac}`}>
          {team.agency}
        </span>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900 truncate">{team.name}</p>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Users size={11} className="text-slate-400" />
              {team.personnelCount} personnel
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <MapPin size={11} className="text-slate-400" />
              {team.currentLocation}
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Target size={11} className="text-slate-400" />
              {teamMissions.length} mission{teamMissions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${sc.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {team.status}
          </span>
          
          {onViewOperations && (
            <button
              onClick={() => onViewOperations(team)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer"
            >
              <span>Operations</span>
              <ArrowUpRight size={13} />
            </button>
          )}

          <button
            onClick={onToggle}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            {isExpanded
              ? <ChevronUp size={16} />
              : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Quick Info Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50 space-y-4">
              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <UserCheck size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Commander</p>
                    <p className="text-xs font-semibold text-slate-800">{team.commander}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Contact</p>
                    <p className="text-xs font-semibold text-slate-800 font-mono">{team.contactNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Current Location</p>
                    <p className="text-xs font-semibold text-slate-800">{team.currentLocation}</p>
                  </div>
                </div>
              </div>

              {/* Vehicles & Assigned Equipment Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Vehicles */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Truck size={13} className="text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Assets &amp; Vehicles</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {team.vehicles && team.vehicles.length > 0 ? (
                      team.vehicles.map((v) => (
                        <span key={v} className="text-[11px] font-semibold px-2.5 py-0.5 bg-white text-slate-700 rounded-md border border-slate-200">
                          {v}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No vehicles assigned</span>
                    )}
                  </div>
                </div>

                {/* Assigned Equipment */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldCheck size={13} className="text-slate-500" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Assigned Equipment &amp; Gear</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {team.equipment && team.equipment.length > 0 ? (
                      team.equipment.map((eq) => (
                        <span key={eq} className="text-[11px] font-semibold px-2.5 py-0.5 bg-white text-slate-700 rounded-md border border-slate-200">
                          {eq}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Standard tactical gear</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Assigned Incident */}
              {assignedIncident && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <ShieldCheck size={13} className="text-orange-600" />
                    <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">Active Incident Assignment</p>
                  </div>
                  <p className="text-xs font-bold text-orange-900">{assignedIncident.title}</p>
                  <p className="text-[11px] text-orange-700 font-medium">
                    {assignedIncident.location}, {assignedIncident.state} · Severity: {assignedIncident.severity}
                  </p>
                </div>
              )}

              {/* Quick Summary Info & Team Actions */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Sparkles size={13} className="text-violet-600" />
                  {teamMissions.length} active/queued mission(s) for this squad
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {team.displayId || (team.id.startsWith('team-') ? team.id.split('-').slice(0, 3).join('-').toUpperCase() : team.id.length > 12 ? `TEAM-${team.id.slice(0, 6).toUpperCase()}` : team.id)}
                  </span>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(team)}
                      className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                      title="Edit rescue team details"
                    >
                      Edit Team
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(team)}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                      title="Decommission / Remove rescue team"
                    >
                      Remove Team
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
