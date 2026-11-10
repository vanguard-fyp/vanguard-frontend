import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MapPin, Phone, UserCheck, ChevronDown, ChevronUp,
  Truck, ShieldCheck, Target, Navigation, ArrowUpRight, Sparkles
} from 'lucide-react';
import type { RescueTeam, Mission, Incident } from '../../../../types';
import { Tag, StatusTag, SEVERITY_TONE } from '../../shared/Tag';

const SEVERITY_BORDER: Record<string, string> = {
  Critical: 'border-l-red-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-amber-500',
  Low: 'border-l-slate-400',
};

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
  // Missions this team is ACTUALLY assigned to (its own mission_assignments rows).
  const teamMissions = missions.filter(
    (m) => m.team_ids?.includes(team.id) || m.teams?.some((t) => t.id === team.id)
  );
  // Authoritative active count from the backend (capacity_service); fall back to
  // counting this team's own open assignments when the field is absent.
  const activeMissionIds = new Set(team.active_mission_ids ?? []);
  const activeMissions = activeMissionIds.size
    ? teamMissions.filter((m) => activeMissionIds.has(m.id))
    : teamMissions.filter((m) => m.status !== 'Completed' && m.status !== 'Aborted');
  const activeCount = team.active_mission_count ?? activeMissions.length;
  const activeMission = activeMissions[0];
  // No guessing: an incident is shown only when the team has an assignment to it.
  const assignedIncident = activeMission?.incident_id
    ? incidents.find((i) => i.id === activeMission.incident_id || i.display_id === activeMission.incident_id)
    : undefined;
  const myAssignment = activeMission?.teams?.find((t) => t.id === team.id);
  const normalizedStatus =
    team.status?.trim().toLowerCase() === 'en route'
      ? 'En Route'
      : team.status?.trim().toLowerCase() === 'deployed'
      ? 'Deployed'
      : team.status?.trim().toLowerCase() === 'available'
      ? 'Available'
      : team.status?.trim().toLowerCase() === 'off duty'
      ? 'Off Duty'
      : team.status;
  const sc = statusConfig[normalizedStatus] || statusConfig['Off Duty'];
  const ac = agencyColors[team.agency] || '';

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${isExpanded ? 'border-blue-300 shadow-md' : 'border-slate-200 shadow-xs hover:border-slate-300'}`}>
      {/* Team Row Header */}
      <div onClick={onToggle} className="cursor-pointer flex items-center gap-4 px-5 py-4 text-left">
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
              {team.available_personnel != null
                ? `${team.available_personnel}/${team.personnel_count} available`
                : `${team.personnel_count} personnel`}
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <MapPin size={11} className="text-slate-400" />
              {team.current_location}
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Target size={11} className="text-slate-400" />
              {activeCount} active mission{activeCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${sc.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {normalizedStatus || team.status}
          </span>
          
          {onViewOperations && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewOperations(team); }}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer"
            >
              <span>Operations</span>
              <ArrowUpRight size={13} />
            </button>
          )}

          <button
            type="button"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Hide squad details' : 'Show squad details'}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
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
                    <p className="text-xs font-semibold text-slate-800 font-mono">{team.contact_number}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Current Location</p>
                    <p className="text-xs font-semibold text-slate-800">{team.current_location}</p>
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
                      <span className="text-[11px] text-slate-400">No vehicles assigned</span>
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
                      <span className="text-[11px] text-slate-400">Standard tactical gear</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Assigned Incident */}
              {assignedIncident && (
                <div className={`bg-white border border-slate-200/90 border-l-4 ${SEVERITY_BORDER[assignedIncident.severity] ?? 'border-l-blue-500'} rounded-xl p-3.5 shadow-2xs space-y-1.5`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <ShieldCheck size={13} className="text-blue-600" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Incident Assignment</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tag tone={SEVERITY_TONE[assignedIncident.severity] ?? 'slate'}>{assignedIncident.severity}</Tag>
                      <StatusTag status={assignedIncident.status} />
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-900">{assignedIncident.title}</p>
                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <MapPin size={11} className="text-slate-400 shrink-0" />
                    {assignedIncident.location}, {assignedIncident.state}
                  </p>
                  {myAssignment && (
                    <p className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-100 flex items-center gap-1.5">
                      <Users size={11} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">
                        {myAssignment.assigned_personnel != null
                          ? `${myAssignment.assigned_personnel} personnel committed`
                          : 'Whole squad committed'}
                      </span>
                      {myAssignment.selection_source && (
                        <span className="text-slate-400">· {myAssignment.selection_source === 'ai' ? 'AI-recommended' : 'Officer-selected'}</span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Quick Summary Info & Team Actions */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Sparkles size={13} className="text-violet-600" />
                  {activeCount} active mission(s) for this squad
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {team.display_id}
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
