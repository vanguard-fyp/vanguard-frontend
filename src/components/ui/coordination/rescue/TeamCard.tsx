import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MapPin, Phone, ChevronDown, ChevronUp,
  Truck, Target, ArrowUpRight, Pencil, Trash2,
  Ambulance, Ship, Plane, Bus, Bike, Tractor, Car, Wrench, HeartPulse, Zap, Axe, Radio, LifeBuoy, Droplets, Flashlight, Tent, Flame,
  type LucideIcon,
} from 'lucide-react';
import type { RescueTeam, Mission, Incident } from '../../../../types';

/** "4×4 Offroad Truck x6" → name "4×4 Offroad Truck", count 6. */
const splitCount = (raw: string): { name: string; count: number | null } => {
  const m = raw.match(/^(.*?)[\s·,-]*(?:[x×]\s*(\d+)|\((\d+)\))\s*$/i);
  if (!m || !m[1].trim()) return { name: raw.trim(), count: null };
  return { name: m[1].trim(), count: Number(m[2] ?? m[3]) };
};

/** Picture chosen from words in the item's name; the first match wins. */
const VEHICLE_ICONS: [RegExp, LucideIcon][] = [
  [/ambulan/i, Ambulance],
  [/boat|vessel|raft|dinghy|kayak|jet ?ski|perahu|bot\b/i, Ship],
  [/heli|aircraft|plane|drone|uav/i, Plane],
  [/bus|coach/i, Bus],
  [/motor(cycle|bike)|bike|scrambler/i, Bike],
  [/tractor|excavator|backhoe|bulldozer|loader/i, Tractor],
  [/car|suv|sedan|patrol|pickup|hilux|4x4 (vehicle|car)/i, Car],
  [/truck|lorry|lori|tanker|engine|tender|4.?4/i, Truck],
];
const EQUIPMENT_ICONS: [RegExp, LucideIcon][] = [
  [/trauma|medical|first.?aid|stretcher|defib|oxygen/i, HeartPulse],
  [/generator|power|battery|genset/i, Zap],
  [/chainsaw|saw|cutter|axe/i, Axe],
  [/radio|walkie|comms|satellite|antenna/i, Radio],
  [/life ?(jacket|vest|buoy)|rope|harness|float/i, LifeBuoy],
  [/pump|hose|water/i, Droplets],
  [/light|torch|lamp|flood ?light/i, Flashlight],
  [/tent|shelter|tarp/i, Tent],
  [/extinguisher|fire|thermal/i, Flame],
];
const iconFor = (name: string, table: readonly [RegExp, LucideIcon][], fallback: LucideIcon): LucideIcon =>
  table.find(([re]) => re.test(name))?.[1] ?? fallback;

/** "Captain Nurul Ain (APM)" → "NA": first letters of the name, ranks and brackets left out. */
const initials = (name?: string | null) => {
  const words = (name ?? '').replace(/\(.*?\)/g, '').split(/\s+/).filter((w) => w && !/^(capt(ain)?|lt|lieutenant|maj(or)?|insp(ector)?|sgt|sergeant|cpl|corporal|en|tuan|puan|dr)\.?$/i.test(w));
  return (words.slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
};
const SEVERITY_TEXT: Record<string, string> = { Critical: '#b91c1c', High: '#c2410c', Medium: '#b45309', Low: '#475569' };

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
            {/* Who and what first (mission beside its commander), then the kit, then actions */}
            <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-3">
                {/* Mission */}
                {assignedIncident ? (
                  <button
                    type="button"
                    onClick={() => onViewOperations?.(team)}
                    title="Open this squad's operations"
                    className="group relative text-left bg-white border border-slate-200 rounded-lg pl-4 pr-3 py-3 cursor-pointer hover:border-slate-300 transition-colors overflow-hidden"
                  >
                    <span className="absolute left-0 inset-y-0 w-[3px]" style={{ background: SEVERITY_TEXT[assignedIncident.severity] ?? '#94a3b8' }} />
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-500">Current mission</span>
                      <ArrowUpRight size={14} className="text-slate-400 group-hover:text-blue-700" />
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-slate-900 group-hover:text-blue-700 truncate">{assignedIncident.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                      <span className="font-medium" style={{ color: SEVERITY_TEXT[assignedIncident.severity] ?? '#475569' }}>{assignedIncident.severity}</span>
                      <span className="text-slate-300">·</span>
                      <span>{assignedIncident.status}</span>
                      <span className="text-slate-300">·</span>
                      <span>{myAssignment?.assigned_personnel != null ? `${myAssignment.assigned_personnel} personnel committed` : 'Whole squad committed'}</span>
                      {activeCount > 1 && (<><span className="text-slate-300">·</span><span>+{activeCount - 1} more</span></>)}
                    </span>
                  </button>
                ) : (
                  <div className="bg-white border border-dashed border-slate-300 rounded-lg px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">Current mission</p>
                    <p className="mt-1 text-sm text-slate-600">Free to assign</p>
                  </div>
                )}

                {/* Commander */}
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-3 flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-full bg-[#1e293b] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                    {initials(team.commander)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-medium text-slate-500">Commander</span>
                    <span className="block text-sm font-semibold text-slate-900 truncate">{team.commander || 'Not recorded'}</span>
                    {team.contact_number && (
                      <a href={`tel:${team.contact_number.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 hover:text-blue-700">
                        <Phone size={11} className="text-slate-400" /> {team.contact_number}
                      </a>
                    )}
                  </span>
                </div>
              </div>

              {/* Resources, always shown: one line per group, items as icon chips with their quantity */}
              <div className="space-y-2">
                {([
                  { title: 'Vehicles', items: team.vehicles ?? [], icons: VEHICLE_ICONS, fallback: Truck, empty: 'None assigned' },
                  { title: 'Equipment', items: team.equipment ?? [], icons: EQUIPMENT_ICONS, fallback: Wrench, empty: 'Standard gear only' },
                ] as const).map(({ title, items, icons, fallback, empty }) => (
                  <div key={title} className="flex items-start gap-3">
                    <span className="w-[72px] shrink-0 pt-1 text-[11px] font-medium text-slate-500">{title}</span>
                    <div className="flex flex-wrap gap-1.5 min-w-0">
                      {items.length === 0 && <span className="pt-1 text-xs text-slate-400">{empty}</span>}
                      {items.map((raw) => {
                        const { name, count } = splitCount(raw);
                        const Icon = iconFor(name, icons, fallback);
                        return (
                          <span key={raw} title={raw} className="inline-flex items-center gap-1.5 h-7 pl-1 pr-1 rounded-full bg-white border border-slate-200 text-xs text-slate-700">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                              <Icon size={12} strokeWidth={1.9} />
                            </span>
                            <span className="whitespace-nowrap pr-1">{name}</span>
                            {count != null && (
                              <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#1e293b] text-white text-[10px] font-semibold leading-5 text-center tabular-nums">{count}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {(onEdit || onDelete) && (
                <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400">{team.display_id}</span>
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(team)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(team)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
