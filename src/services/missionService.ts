import { apiClient } from './apiClient';
import type { Mission, Page, RescueTeam, SeverityLevel, SuggestedTeam } from '../types';

export interface TeamSelection {
  team_id: string;
  personnel: number;
  source: 'ai' | 'officer';
}

export interface MissionDispatchRequest {
  title: string;
  incident_id: string;
  priority: SeverityLevel;
  objective: string;
  duration_hours: number;
  teams: TeamSelection[];
  approval: { confirmed: boolean; note?: string };
  idempotency_key?: string;
  recommended_personnel?: number | null;
}

export interface RescueRecommendation {
  incident_id: string;
  status: string;
  analysis_status?: string;
  assessment_id?: string;
  assessment_version?: number;
  generated_at?: string | null;
  is_stale?: boolean;
  required_personnel?: number | null;
  required_personnel_basis?: string | null;
  covered_personnel?: number;
  shortfall_personnel?: number;
  mission_title?: string | null;
  mission_objective?: string | null;
  suggested_teams: SuggestedTeam[];
  excluded?: { team_id: string; reason: string }[];
  advisory_only?: boolean;
  message?: string | null;
}

export const missionService = {
  /**
   * Retrieve active rescue missions
   */
  getMissions: async (): Promise<Mission[]> => {
    return apiClient.get<Mission[]>('/missions');
  },

  getMissionsPage: async (params: { limit: number; offset: number; status?: string }): Promise<Page<Mission>> => {
    return apiClient.get<Page<Mission>>('/missions', { ...params, paginated: true });
  },

  /**
   * Approve and dispatch a mission (authenticated officer = approver; each team
   * carries its own personnel count and selection source).
   */
  dispatchMission: async (req: MissionDispatchRequest): Promise<Mission> => {
    return apiClient.post<Mission>('/missions', req);
  },

  /** Approve deployment of additional teams to an existing mission. */
  addTeams: async (missionId: string, teams: TeamSelection[], approval: { confirmed: boolean; note?: string }): Promise<Mission> => {
    return apiClient.post<Mission>(`/missions/${missionId}/teams`, { teams, approval });
  },

  /** AI-suggested teams from the latest persisted assessment, re-checked against live capacity. */
  getRescueRecommendation: async (incidentId: string): Promise<RescueRecommendation> => {
    return apiClient.get<RescueRecommendation>('/missions/recommendations', { incident_id: incidentId });
  },

  /**
   * Update mission status
   */
  updateMissionStatus: async (missionId: string, status: string): Promise<Mission> => {
    return apiClient.patch<Mission>(`/missions/${missionId}/status?new_status=${encodeURIComponent(status)}`);
  },

  /**
   * Update mission details
   */
  updateMission: async (id: string, updates: Partial<Mission>): Promise<Mission> => {
    return apiClient.patch<Mission>(`/missions/${id}`, updates);
  },

  /**
   * Delete a mission
   */
  deleteMission: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/missions/${id}`);
  },

  /**
   * Retrieve all SAR and response teams
   */
  getRescueTeams: async (): Promise<RescueTeam[]> => {
    return apiClient.get<RescueTeam[]>('/missions/teams');
  },

  /**
   * Create a new rescue team
   */
  createRescueTeam: async (team: Partial<RescueTeam>): Promise<RescueTeam> => {
    return apiClient.post<RescueTeam>('/missions/teams', team);
  },

  /**
   * Update a rescue team
   */
  updateRescueTeam: async (id: string, updates: Partial<RescueTeam>): Promise<RescueTeam> => {
    return apiClient.patch<RescueTeam>(`/missions/teams/${id}`, updates);
  },

  /**
   * Delete a rescue team
   */
  deleteRescueTeam: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/missions/teams/${id}`);
  },
};
