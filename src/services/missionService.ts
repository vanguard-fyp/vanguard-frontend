import { apiClient } from './apiClient';
import type { Mission, RescueTeam } from '../types';

export const missionService = {
  /**
   * Retrieve active rescue missions
   */
  getMissions: async (): Promise<Mission[]> => {
    return apiClient.get<Mission[]>('/missions');
  },

  /**
   * Create / dispatch a new rescue mission
   */
  createMission: async (mission: Partial<Mission>): Promise<Mission> => {
    return apiClient.post<Mission>('/missions', mission);
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
