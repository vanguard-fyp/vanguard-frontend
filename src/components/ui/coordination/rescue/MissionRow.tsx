import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Target, MapPin, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { DisasterBadge } from '../../dashboard/DisasterBadge';
import type { Mission } from '../../../../types';
import { milestones } from '../../../../constants';

interface MissionRowProps {
  mission: Mission;
  isExpanded: boolean;
  onToggle: () => void;
}

const missionStatusConfig: Record<string, { icon: React.FC<{ size?: number; className?: string }>, color: string, bg: string, label: string }> = {
  'In Progress': { icon: Loader2, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', label: 'In Progress' },
  Pending: { icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Pending' },
  Completed: { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Completed' },
  Aborted: { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'Aborted' },
};

const missionProgressMap: Record<string, number> = {
  'MIS-2026-801': 45,
  'MIS-2026-802': 30,
  'MIS-2026-803': 60,
};

function getMilestoneIndex(mission: Mission): number {
  const p = missionProgressMap[mission.id] ?? 0;
  if (p >= 100) return 4;
  if (p >= 75) return 3;
  if (p >= 50) return 2;
  if (p >= 25) return 1;
  return 0;
}

export const MissionRow: React.FC<MissionRowProps> = ({ mission, isExpanded, onToggle }) => {
  const statusCfg = missionStatusConfig[mission.status] || missionStatusConfig['Pending'];
  const StatusIcon = statusCfg.icon;
  const progress = missionProgressMap[mission.id] ?? 0;
  const milestoneIdx = getMilestoneIndex(mission);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Row Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <Target size={14} className="text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-400">{mission.id}</span>
            <DisasterBadge type="severity" value={mission.priority} />
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusCfg.bg} ${statusCfg.color}`}>
              {mission.status === 'In Progress' && <StatusIcon size={10} className="animate-spin" />}
              {mission.status !== 'In Progress' && <StatusIcon size={10} />}
              {statusCfg.label}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{mission.title}</p>
        </div>
        <div className="shrink-0">
          {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {/* Expanded Detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4">
              {/* Objective */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Mission Objective</p>
                <p className="text-xs text-slate-700 leading-relaxed">{mission.objective}</p>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Location Sector</p>
                    <p className="text-xs font-semibold text-slate-700">{mission.incidentLocation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={13} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Time</p>
                    <p className="text-xs font-semibold text-slate-700">{mission.assignedTime}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={13} className="text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Est. Completion</p>
                    <p className="text-xs font-semibold text-slate-700">{mission.estimatedCompletion}</p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {mission.status === 'In Progress' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mission Progress</p>
                    <p className="text-xs font-bold text-blue-700">{progress}%</p>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full"
                    />
                  </div>
                </div>
              )}

              {/* Milestone Steps */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Milestone Tracker</p>
                <div className="flex items-center gap-0">
                  {milestones.map((m, i) => (
                    <React.Fragment key={m}>
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 text-[9px] font-bold transition-all
                          ${i < milestoneIdx ? 'bg-blue-600 border-blue-600 text-white' :
                            i === milestoneIdx ? 'bg-blue-100 border-blue-600 text-blue-700' :
                              'bg-slate-100 border-slate-200 text-slate-400'}`}>
                          {i < milestoneIdx ? '✓' : i + 1}
                        </div>
                        <span className={`text-[9px] font-bold text-center leading-tight ${i <= milestoneIdx ? 'text-blue-700' : 'text-slate-400'}`}>
                          {m}
                        </span>
                      </div>
                      {i < milestones.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-4 mx-0.5 ${i < milestoneIdx ? 'bg-blue-600' : 'bg-slate-200'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
