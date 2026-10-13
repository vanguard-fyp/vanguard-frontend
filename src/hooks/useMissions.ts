import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { missionService } from '../services/missionService';
import type { MissionDispatchRequest, TeamSelection } from '../services/missionService';
import type { RescueTeam } from '../types';

export const MISSION_KEYS = {
  missions: ['missions'] as const,
  teams: ['missions', 'teams'] as const,
};

export function useMissions() {
  return useQuery({
    queryKey: MISSION_KEYS.missions,
    queryFn: () => missionService.getMissions(),
    staleTime: 30_000,
  });
}

/** Approved dispatch (server re-validates capacity atomically). */
export function useDispatchMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MissionDispatchRequest) => missionService.dispatchMission(data),
    onSettled: () => {
      // Refresh on success AND failure: a capacity conflict means our view is stale.
      qc.invalidateQueries({ queryKey: MISSION_KEYS.missions });
      qc.invalidateQueries({ queryKey: MISSION_KEYS.teams });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['intelligence'] });
    },
  });
}

export function useAddTeamsToMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ missionId, teams, note }: { missionId: string; teams: TeamSelection[]; note?: string }) =>
      missionService.addTeams(missionId, teams, { confirmed: true, note }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: MISSION_KEYS.missions });
      qc.invalidateQueries({ queryKey: MISSION_KEYS.teams });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useRescueRecommendation(incidentId: string | null | undefined) {
  return useQuery({
    queryKey: ['missions', 'recommendation', incidentId],
    queryFn: () => missionService.getRescueRecommendation(incidentId as string),
    enabled: !!incidentId,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useUpdateMissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      missionService.updateMissionStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MISSION_KEYS.missions });
      qc.invalidateQueries({ queryKey: MISSION_KEYS.teams });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useDeleteMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => missionService.deleteMission(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MISSION_KEYS.missions });
      qc.invalidateQueries({ queryKey: MISSION_KEYS.teams });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useRescueTeams() {
  return useQuery({
    queryKey: MISSION_KEYS.teams,
    queryFn: () => missionService.getRescueTeams(),
    staleTime: 30_000,
  });
}

export function useCreateRescueTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RescueTeam>) => missionService.createRescueTeam(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MISSION_KEYS.teams });
    },
  });
}

export function useUpdateRescueTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<RescueTeam> }) =>
      missionService.updateRescueTeam(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MISSION_KEYS.teams });
    },
  });
}

export function useDeleteRescueTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => missionService.deleteRescueTeam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MISSION_KEYS.teams });
    },
  });
}

export function useAssistanceRequests(params?: { status?: string; reporter_contact?: string }) {
  return useQuery({
    queryKey: ['assistance_requests', params],
    queryFn: async () => {
      const { incidentService } = await import('../services/incidentService');
      return incidentService.getAssistanceRequests(params);
    },
    staleTime: 15_000,
  });
}

export function useUpdateAssistanceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: string; status: string; notes?: string }) => {
      const { incidentService } = await import('../services/incidentService');
      return incidentService.updateAssistanceStatus(requestId, status, notes);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistance_requests'] });
      qc.invalidateQueries({ queryKey: MISSION_KEYS.missions });
    },
  });
}

