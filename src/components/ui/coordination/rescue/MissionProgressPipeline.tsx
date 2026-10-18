import React, { useState } from 'react';
import { Radio, CheckCircle2, AlertCircle, Calendar, MapPin, Shield, ArrowRight, Loader2 } from 'lucide-react';
import type { Mission } from '../../../../types';
import { useUpdateMissionStatus, useIncidents } from '../../../../hooks';
import { useToast } from '../../../../context/ToastContext';
import { formatDateTime } from '../../../../utils/dateFormatter';
import { Tag, SEVERITY_TONE, type Tone } from '../../shared/Tag';


const MISSION_STATUS_TONE: Record<string, Tone> = {
  Pending: 'amber',
  'In Progress': 'blue',
  Completed: 'teal',
  Aborted: 'slate',
};

interface MissionProgressPipelineProps {
  missions: Mission[];
}

export const MissionProgressPipeline: React.FC<MissionProgressPipelineProps> = ({ missions }) => {
  const [filterMode, setFilterMode] = useState<'active' | 'completed'>('active');
  const [pendingMissionId, setPendingMissionId] = useState<string | null>(null);
  const updateStatus = useUpdateMissionStatus();
  const { data: incidents = [] } = useIncidents();
  const toast = useToast();

  const handleMobilize = (m: Mission) => {
    setPendingMissionId(m.id);
    updateStatus.mutate(
      { id: m.id, status: 'In Progress' },
      {
        onSuccess: () => {
          toast.success(
            'Squads Mobilized',
            `${m.display_id || m.title || 'Mission'} is now In Progress. Squad status updated to En Route.`
          );
          setPendingMissionId(null);
        },
        onError: (err: any) => {
          toast.error('Mobilization Failed', err?.message || 'Could not update mission status.');
          setPendingMissionId(null);
        },
      }
    );
  };

  const handleComplete = (m: Mission) => {
    setPendingMissionId(m.id);
    updateStatus.mutate(
      { id: m.id, status: 'Completed' },
      {
        onSuccess: () => {
          toast.success(
            'Mission Completed',
            `${m.display_id || m.title || 'Mission'} concluded. Squads released back to Available.`
          );
          setPendingMissionId(null);
        },
        onError: (err: any) => {
          toast.error('Update Failed', err?.message || 'Could not complete mission.');
          setPendingMissionId(null);
        },
      }
    );
  };

  const activeMissions = missions.filter(
    (m) => m.status === 'Pending' || m.status === 'In Progress'
  );
  const completedMissions = missions.filter(
    (m) => m.status === 'Completed' || m.status === 'Aborted'
  );

  const displayedMissions = filterMode === 'active' ? activeMissions : completedMissions;

  return (
    <div className="space-y-4">
      {/* Top Filter Switch */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
        <button
          type="button"
          onClick={() => setFilterMode('active')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            filterMode === 'active'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio size={13} className={filterMode === 'active' ? 'text-blue-600 animate-pulse' : 'text-slate-400'} />
          <span>Active Operations</span>
          <span
            className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold transition-colors ${
              filterMode === 'active'
                ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                : 'bg-slate-200/70 text-slate-600'
            }`}
          >
            {activeMissions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('completed')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            filterMode === 'completed'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 size={13} className={filterMode === 'completed' ? 'text-teal-600' : 'text-slate-400'} />
          <span>Completed &amp; Archived</span>
          <span
            className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold transition-colors ${
              filterMode === 'completed'
                ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                : 'bg-slate-200/70 text-slate-600'
            }`}
          >
            {completedMissions.length}
          </span>
        </button>
      </div>

      {/* Mission List */}
      {displayedMissions.length === 0 ? (
        <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
          <AlertCircle size={24} className="text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">
            {filterMode === 'active' ? 'No active mission operations currently running' : 'No completed missions logged yet'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {filterMode === 'active'
              ? 'Missions dispatched in the wizard will appear in this pipeline.'
              : 'Completed missions will be archived here for historical SITREP review.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedMissions.map((mission) => {
            const teamsList = (mission as any).teams || [];
            const isCompleted = mission.status === 'Completed' || mission.status === 'Aborted';
            const incidentDisplayId =
              mission.incident_display_id ||
              incidents.find((inc) => inc.id === mission.incident_id || inc.display_id === mission.incident_id)?.display_id ||
              (mission.incident_id
                ? (mission.incident_id.startsWith('inc-')
                    ? mission.incident_id.split('-').slice(0, 3).join('-').toUpperCase()
                    : mission.incident_id.length > 13
                    ? `INC-${mission.incident_id.slice(0, 8).toUpperCase()}`
                    : mission.incident_id)
                : null);

            return (
              <div
                key={mission.id}
                className={`bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all space-y-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {mission.display_id || mission.id}
                      </span>
                      <Tag tone={SEVERITY_TONE[mission.priority] ?? 'slate'}>
                        {mission.priority} Priority
                      </Tag>
                      <Tag variant="outline" tone={MISSION_STATUS_TONE[mission.status] ?? 'slate'}>
                        {mission.status}
                      </Tag>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-1.5 truncate">{mission.title}</h4>
                    {incidentDisplayId && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="text-slate-400 shrink-0" />
                        Incident #{incidentDisplayId}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Est. Completion</span>
                    <span className="text-xs font-bold text-slate-900">{formatDateTime(mission.estimated_completion)}</span>
                  </div>
                </div>

                {mission.objective && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2.5 leading-relaxed">
                    🎯 <span className="font-semibold text-slate-700">Objective:</span> {mission.objective}
                  </p>
                )}

                {/* Assigned Teams Badge */}
                {teamsList.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Shield size={11} className="text-blue-600" /> Assigned Squads ({teamsList.length}):
                    </span>
                    {teamsList.map((t: any) => (
                      <span
                        key={t.id}
                        className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-md"
                      >
                        {t.name} ({t.agency || 'SAR'})
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Status Advancement & Timestamps */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Calendar size={11} className="text-slate-400" />
                    <span>Created: {formatDateTime(mission.created_at ?? '', 'Recent')}</span>
                  </div>

                  {!isCompleted && (
                    <div className="flex items-center gap-2">
                      {mission.status === 'Pending' && (
                        <button
                          type="button"
                          disabled={pendingMissionId === mission.id}
                          onClick={() => handleMobilize(mission)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          {pendingMissionId === mission.id ? (
                            <>
                              <Loader2 size={11} className="animate-spin" />
                              <span>Mobilizing…</span>
                            </>
                          ) : (
                            <>
                              <span>Mobilize En Route</span>
                              <ArrowRight size={11} />
                            </>
                          )}
                        </button>
                      )}
                      {mission.status === 'In Progress' && (
                        <button
                          type="button"
                          disabled={pendingMissionId === mission.id}
                          onClick={() => handleComplete(mission)}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          {pendingMissionId === mission.id ? (
                            <>
                              <Loader2 size={11} className="animate-spin" />
                              <span>Completing…</span>
                            </>
                          ) : (
                            <>
                              <span>Mark Completed ✓</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {isCompleted && (
                    <span className="text-[10px] font-bold text-teal-700 flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                      <CheckCircle2 size={12} className="text-teal-600" /> Operation Concluded
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
