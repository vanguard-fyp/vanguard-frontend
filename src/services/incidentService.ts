import { apiClient } from './apiClient';
import type { Incident, MapPOI } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const incidentService = {
  /**
   * List all disaster incidents with optional filters
   */
  getIncidents: async (filters?: { severity?: string; status?: string; district?: string }): Promise<Incident[]> => {
    return apiClient.get<Incident[]>('/incidents', filters);
  },

  /**
   * List live global disaster alerts from GDACS (Earthquakes, Cyclones, Floods, Volcanoes)
   */
  getGlobalIncidents: async (refresh?: boolean): Promise<any[]> => {
    return apiClient.get<any[]>('/incidents/global', { refresh });
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
   * Resolve an incident — marks it Resolved, releases teams, synthesizes outcome
   */
  resolveIncident: async (id: string, payload?: { outcomeNotes?: string; resolverName?: string }): Promise<Incident> => {
    return apiClient.post<Incident>(`/incidents/${id}/resolve`, payload || {});
  },

  /**
   * Download official NADMA SITREP PDF for an incident.
   * Uses displayId (e.g. INC-2026-001) as the saved filename when provided.
   */
  downloadSitrepPdf: (id: string, displayId?: string): void => {
    const url = `${BASE_URL}/incidents/${id}/sitrep-pdf`;
    const filename = displayId ? `SITREP-${displayId}.pdf` : 'sitrep.pdf';
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  /**
   * Download creative AI Disaster Warning Poster PDF for an incident.
   * Uses displayId (e.g. INC-2026-001) as the saved filename when provided.
   */
  downloadSitrepPoster: (id: string, displayId?: string): void => {
    const url = `${BASE_URL}/incidents/${id}/sitrep-poster`;
    const filename = displayId ? `WARNING-POSTER-${displayId}.pdf` : 'warning-poster.pdf';
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  /**
   * Retrieve GIS Map Points of Interest (Shelters, Hospitals, Utilities)
   */
  getMapPOIs: async (): Promise<MapPOI[]> => {
    return apiClient.get<MapPOI[]>('/incidents/pois');
  },

  /**
   * Retrieve dynamic cities search index from backend
   */
  getCities: async (): Promise<{ id: string; title: string; subtitle: string; lat: number; lng: number }[]> => {
    return apiClient.get<{ id: string; title: string; subtitle: string; lat: number; lng: number }[]>('/incidents/cities');
  },
};


