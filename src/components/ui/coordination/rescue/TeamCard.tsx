import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MapPin, Phone, UserCheck, ChevronDown, ChevronUp,
  Truck, ShieldCheck, Target, Navigation
} from 'lucide-react';
import { MissionRow } from './MissionRow';
import { HILAdvisory } from './HILAdvisory';
import type { RescueTeam, Mission, Incident } from '../../../../types';

interface TeamCardProps {
  team: RescueTeam;
  missions: Mission[];
  incidents: Incident[];
  isExpanded: boolean;
  onToggle: () => void;
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
  team, missions, incidents, isExpanded, onToggle
}) => {
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const teamMissions = missions.filter((m) => m.assignedTeamId === team.id);
  const assignedIncident = incidents.find((i) => i.id === team.assignedIncidentId);
  const sc = statusConfig[team.status] || statusConfig['Off Duty'];
  const ac = agencyColors[team.agency] || '';

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${isExpanded ? 'border-blue-300 shadow-md' : 'border-slate-200 shadow-xs hover:border-slate-300'}`}>
      {/* Team Row Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
      >
        {/* Agency badge */}
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded border shrink-0 ${ac}`}>
          {team.agency}
        </span>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900 truncate">{team.name}</p>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
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
          {isExpanded
            ? <ChevronUp size={15} className="text-slate-400" />
            : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </button>

      {/* Expanded Detail Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-5 py-4 space-y-5">
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Current Position</p>
                    <p className="text-xs font-semibold text-slate-800">{team.currentLocation}</p>
                  </div>
                </div>
              </div>

              {/* Vehicles */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Truck size={13} className="text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Assets & Vehicles</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {team.vehicles.map((v) => (
                    <span key={v} className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Assigned Incident */}
              {assignedIncident && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShieldCheck size={13} className="text-orange-600" />
                    <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">Active Incident Assignment</p>
                  </div>
                  <p className="text-xs font-bold text-orange-900">{assignedIncident.title}</p>
                  <p className="text-[11px] text-orange-700 font-medium mt-0.5">
                    {assignedIncident.location}, {assignedIncident.state} · Severity: {assignedIncident.severity}
                  </p>
                </div>
              )}

              {/* Missions Section */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Target size={11} />
                  Mission Assignments ({teamMissions.length})
                </p>
                {teamMissions.length > 0 ? (
                  <div className="space-y-2">
                    {teamMissions.map((mission) => (
                      <MissionRow
                        key={mission.id}
                        mission={mission}
                        isExpanded={expandedMissionId === mission.id}
                        onToggle={() =>
                          setExpandedMissionId(expandedMissionId === mission.id ? null : mission.id)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-center">
                    <p className="text-xs text-slate-400 font-medium">No missions assigned to this team</p>
                  </div>
                )}
              </div>

              {/* HIL AI Advisory */}
              <HILAdvisory team={team} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
