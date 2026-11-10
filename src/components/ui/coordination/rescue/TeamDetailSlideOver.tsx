import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLockPageScroll } from '../../../../hooks/useLockPageScroll';
import { Overlay } from '../../shared/Modal';
import {
  X,
  MapPin,
  Phone,
  UserCheck,
  Target,
} from 'lucide-react';
import type { RescueTeam, Mission, Incident } from '../../../../types';
import { Tag, StatusTag, SEVERITY_TONE } from '../../shared/Tag';
import { MissionProgressPipeline } from './MissionProgressPipeline';

interface TeamDetailSlideOverProps {
  team: RescueTeam | null;
  missions: Mission[];
  incidents: Incident[];
  onClose: () => void;
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

export const TeamDetailSlideOver: React.FC<TeamDetailSlideOverProps> = ({
  team,
  missions,
  incidents,
  onClose,
}) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!team) return null;

  // Match missions where this team is specifically assigned
  // Only the team's OWN assignment records (never the mission's "primary team" alias).
  const teamMissions = missions.filter(
    (m) => m.team_ids?.includes(team.id) || m.teams?.some((t) => t.id === team.id)
  );
  const activeMission = teamMissions.find((m) => m.status !== 'Completed' && m.status !== 'Aborted');
  const assignedIncident = incidents.find((i) => i.id === activeMission?.incident_id);
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
  useLockPageScroll(true);

  return (
    <Overlay>
    <div className="fixed top-0 left-0 w-screen h-screen z-[55] overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200"
        >
          {/* Header */}
          <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${ac}`}>
                  {team.agency}
                </span>
                <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${sc.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {normalizedStatus || team.status}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                  {team.display_id || (team.id.startsWith('team-') ? team.id.split('-').slice(0, 3).join('-').toUpperCase() : team.id.length > 12 ? `TEAM-${team.id.slice(0, 6).toUpperCase()}` : team.id)}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">{team.name}</h2>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
                <MapPin size={13} className="text-slate-400" />
                {team.current_location} · {team.personnel_count} Personnel Squad
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Metadata Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Commander
                </span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <UserCheck size={13} className="text-slate-500" />
                  {team.commander}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Contact Line
                </span>
                <span className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1">
                  <Phone size={13} className="text-slate-500" />
                  {team.contact_number}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Assigned Vehicles
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {team.vehicles.map((v) => (
                    <span key={v} className="text-[10px] font-semibold px-2 py-0.5 bg-white text-slate-700 rounded border border-slate-200">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Incident assignment */}
            {assignedIncident && (
              <div className={`bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-2`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-500">Currently assigned to</span>
                  <div className="flex items-center gap-1.5">
                    <Tag tone={SEVERITY_TONE[assignedIncident.severity] ?? 'slate'}>{assignedIncident.severity}</Tag>
                    <StatusTag status={assignedIncident.status} />
                  </div>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{assignedIncident.title}</h4>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <MapPin size={12} className="text-slate-400 shrink-0" />
                  {[assignedIncident.location, assignedIncident.district, assignedIncident.state].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Mission Pipeline ({teamMissions.length})</h3>
                  </div>
                </div>
                <MissionProgressPipeline missions={teamMissions} />
              </div>
          </div>
        </motion.div>
      </div>
    </div>
    </Overlay>
  );
};
