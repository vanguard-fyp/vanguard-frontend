import { apiClient } from './apiClient';
import type { Incident, MapPOI } from '../types';

export const incidentService = {
  /**
   * List all disaster incidents with optional filters
   */
  getIncidents: async (filters?: { severity?: string; status?: string; district?: string }): Promise<Incident[]> => {
    return apiClient.get<Incident[]>('/incidents', filters);
  },

  /**
   * Get single incident details by ID
   */
  getIncidentById: async (id: string): Promise<Incident> => {
    return apiClient.get<Incident>(`/incidents/${id}`);
  },

  /**
   * Create a new disaster incident report
   */
  createIncident: async (incident: Partial<Incident>): Promise<Incident> => {
    return apiClient.post<Incident>('/incidents', incident);
  },

  /**
   * Update incident fields (status, severity, notes)
   */
  updateIncident: async (id: string, updates: Partial<Incident>): Promise<Incident> => {
    return apiClient.patch<Incident>(`/incidents/${id}`, updates);
  },

  /**
   * Delete an incident report
   */
  deleteIncident: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/incidents/${id}`);
  },

  /**
   * Retrieve GIS Map Points of Interest (Shelters, Hospitals, Utilities)
   */
  getMapPOIs: async (): Promise<MapPOI[]> => {
    return apiClient.get<MapPOI[]>('/incidents/pois');
  },
};
