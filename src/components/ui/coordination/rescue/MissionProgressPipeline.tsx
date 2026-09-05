import React from 'react';
import { Clock, Radio, CheckCircle2, AlertCircle, Calendar, MapPin } from 'lucide-react';
import type { Mission } from '../../../../types';
import { useUpdateMissionStatus } from '../../../../hooks';
import { formatDateTime } from '../../../../utils/dateFormatter';

interface MissionProgressPipelineProps {
  missions: Mission[];
}

const STAGES = [
  { key: 'Pending', label: 'Pending Dispatch', icon: Clock, color: 'text-amber-600', border: 'border-amber-200', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' },
  { key: 'In Progress', label: 'Active / In Progress', icon: Radio, color: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800' },
  { key: 'Completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800' },
] as const;

export const MissionProgressPipeline: React.FC<MissionProgressPipelineProps> = ({ missions }) => {
  const updateStatus = useUpdateMissionStatus();

  return (
    <div className="space-y-4">
      {/* Pipeline Summary Bar */}
      <div className="grid grid-cols-3 gap-2">
        {STAGES.map((stage) => {
          const count = missions.filter((m) => m.status === stage.key).length;
          const Icon = stage.icon;
          return (
            <div
              key={stage.key}
              className={`p-3 rounded-xl border ${stage.border} ${stage.bg} flex items-center justify-between`}
            >
              <div className="flex items-center gap-2">
                <Icon size={16} className={stage.color} />
                <span className="text-xs font-bold text-slate-800 hidden sm:inline">{stage.label}</span>
                <span className="text-xs font-bold text-slate-800 sm:hidden">{stage.key}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${stage.badge}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mission List */}
      {missions.length === 0 ? (
        <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
          <AlertCircle size={24} className="text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">No active mission assignments</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Missions dispatched in the wizard will appear in this pipeline.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {missions.map((mission) => {
            return (
              <div
                key={mission.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3"
              >

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {mission.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          mission.priority === 'Critical'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : mission.priority === 'High'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {mission.priority} Priority
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-1">{mission.title}</h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-slate-400" />
                      {mission.incidentLocation}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 block">Est. Window</span>
                    <span className="text-xs font-bold text-slate-700">{formatDateTime(mission.estimatedCompletion)}</span>
                  </div>
                </div>

                {mission.objective && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2.5 leading-relaxed">
                    🎯 <span className="font-semibold text-slate-700">Objective:</span> {mission.objective}
                  </p>
                )}

                {/* Progress Stepper & Quick Status Advance */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                    <Calendar size={11} />
                    <span>Assigned: {formatDateTime(mission.assignedTime, 'Just now')}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {mission.status === 'Pending' && (
                      <button
                        onClick={() => updateStatus.mutate({ id: mission.id, status: 'In Progress' })}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Start Mission →
                      </button>
                    )}
                    {mission.status === 'In Progress' && (
                      <button
                        onClick={() => updateStatus.mutate({ id: mission.id, status: 'Completed' })}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Mark Complete ✓
                      </button>
                    )}
                    {mission.status === 'Completed' && (
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Mission Finished
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
