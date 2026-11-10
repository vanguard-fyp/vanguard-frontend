import React, { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { Mission } from '../../../../types';
import { useMobilizeTeam, useUpdateMissionStatus, useIncidents } from '../../../../hooks';
import { useToast } from '../../../../context/ToastContext';
import { formatDateTime } from '../../../../utils/dateFormatter';
import { Tag, SEVERITY_TONE, TONE, TONE_INK, type Tone } from '../../shared/Tag';


const MISSION_STATUS_TONE: Record<string, Tone> = {
  Pending: 'amber',
  'In Progress': 'blue',
  Completed: 'teal',
  Aborted: 'slate',
};

const TEAM_STATUS_TONE: Record<string, Tone> = {
  Assigned: 'amber',
  Accepted: 'amber',
  'En Route': 'blue',
  'On Scene': 'cyan',
  Completed: 'teal',
  Withdrawn: 'slate',
};

const Detail: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[10px] font-medium text-slate-500">{label}</dt>
    <dd className="mt-0.5 text-xs font-medium text-slate-800 tabular-nums">{children}</dd>
  </div>
);

interface MissionProgressPipelineProps {
  missions: Mission[];
}

export const MissionProgressPipeline: React.FC<MissionProgressPipelineProps> = ({ missions }) => {
  const [filterMode, setFilterMode] = useState<'active' | 'completed'>('active');
  const [pendingMissionId, setPendingMissionId] = useState<string | null>(null);
  const updateStatus = useUpdateMissionStatus();
  const mobilize = useMobilizeTeam();
  const [pendingTeamKey, setPendingTeamKey] = useState<string | null>(null);
  const { data: incidents = [] } = useIncidents();
  const toast = useToast();

  const handleMobilize = (m: Mission, team: { id: string; name?: string }) => {
    setPendingTeamKey(`${m.id}:${team.id}`);
    mobilize.mutate(
      { missionId: m.id, teamId: team.id },
      {
        onSuccess: () => toast.success('Team mobilized', `${team.name ?? 'The team'} is now En Route.`),
        onError: (err: any) => toast.error('Mobilization Failed', err?.message || 'Could not mobilize this team.'),
        onSettled: () => setPendingTeamKey(null),
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

  const tabs = [
    { key: 'active' as const, label: 'Active', count: activeMissions.length },
    { key: 'completed' as const, label: 'Completed', count: completedMissions.length },
  ];

  return (
    <div className="space-y-3">
      <div role="tablist" className="flex items-center gap-4 border-b border-slate-200">
        {tabs.map((tab) => {
          const on = filterMode === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setFilterMode(tab.key)}
              className={`-mb-px pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                on ? 'border-blue-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label} <span className="font-medium text-slate-400 tabular-nums">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {displayedMissions.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500">
          {filterMode === 'active' ? 'No active missions for this team.' : 'No completed missions yet.'}
        </p>
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
            const completing = pendingMissionId === mission.id;

            return (
              <article key={mission.id} className="bg-white border border-slate-200/80 rounded-xl">
                <div className="px-4 pt-3.5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="min-w-0 text-[13px] font-semibold text-slate-900 leading-snug">{mission.title}</h4>
                    <span className="shrink-0">
                      <Tag variant="outline" tone={MISSION_STATUS_TONE[mission.status] ?? 'slate'}>{mission.status}</Tag>
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 sm:grid-cols-[0.8fr_1fr_1fr_1.6fr] gap-x-4 gap-y-2.5" title={`Created ${formatDateTime(mission.created_at ?? '', 'recently')}`}>
                    <Detail label="Priority">
                      <span style={{ color: TONE_INK[SEVERITY_TONE[mission.priority] ?? 'slate'] }}>{mission.priority}</span>
                    </Detail>
                    <Detail label="Mission ID">{mission.display_id || mission.id}</Detail>
                    {incidentDisplayId && <Detail label="Incident">{incidentDisplayId}</Detail>}
                    {mission.estimated_completion && <Detail label="Est. completion">{formatDateTime(mission.estimated_completion)}</Detail>}
                  </dl>
                  {mission.objective && (
                    <dl className="mt-2.5">
                      <Detail label="Objective"><span className="font-normal text-slate-600 leading-relaxed line-clamp-2">{mission.objective}</span></Detail>
                    </dl>
                  )}
                </div>

                {teamsList.length > 0 && (
                  <div className="border-t border-slate-100">
                    <p className="px-4 pt-2.5 text-[10px] font-medium text-slate-500">Assigned teams ({teamsList.length})</p>
                    <ul className="divide-y divide-slate-100">
                      {teamsList.map((t: any) => {
                        const waiting = t.assignment_status === 'Assigned' || t.assignment_status === 'Accepted';
                        const busy = pendingTeamKey === `${mission.id}:${t.id}`;
                        return (
                          <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2">
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-medium text-slate-800">{t.name}</span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TONE[TEAM_STATUS_TONE[t.assignment_status] ?? 'slate'] }} aria-hidden="true" />
                                {t.assignment_status}
                              </span>
                            </span>
                            {waiting && !isCompleted && (
                              <button
                                type="button"
                                disabled={!!pendingTeamKey}
                                onClick={() => handleMobilize(mission, t)}
                                aria-label={`Mobilize ${t.name}`}
                                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg shadow-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                              >
                                {busy && <Loader2 size={11} className="animate-spin" />}
                                Mobilize En Route
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {mission.status === 'In Progress' && (
                  <div className="flex justify-end border-t border-slate-100 px-4 py-2">
                    <button
                      type="button"
                      disabled={completing}
                      onClick={() => handleComplete(mission)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg shadow-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      {completing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      {completing ? 'Completing…' : 'Mark Completed'}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
