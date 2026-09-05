import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { missionService } from '../services/missionService';
import type { Mission, RescueTeam } from '../types';

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

export function useCreateMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Mission>) => missionService.createMission(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MISSION_KEYS.missions });
      qc.invalidateQueries({ queryKey: MISSION_KEYS.teams });
    },
  });
}

export function useUpdateMissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      missionService.updateMissionStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MISSION_KEYS.missions });
    },
  });
}

export function useDeleteMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => missionService.deleteMission(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MISSION_KEYS.missions });
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

export function useTeamRecommendation(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['missions', 'team', teamId, 'recommendation'],
    queryFn: () => missionService.getTeamRecommendation(teamId!),
    enabled: !!teamId,
    staleTime: 60_000,
  });
}

export function useGenerateTeamRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => missionService.generateTeamRecommendation(teamId),
    onSuccess: (_, teamId) => {
      qc.invalidateQueries({ queryKey: ['missions', 'team', teamId, 'recommendation'] });
    },
  });
}
