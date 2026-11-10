import { apiClient, downloadBlob, postForm } from './apiClient';
import type { Incident, MapPOI, MediaUploadResult, Page, ResolvedMedia } from '../types';

/** Fetches with the officer's sign-in, then saves the file. */
async function saveFile(endpoint: string, filename: string): Promise<void> {
  const blob = await downloadBlob(endpoint);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const incidentService = {
  /**
   * List all disaster incidents with optional filters
   */
  getIncidents: async (filters?: { severity?: string; status?: string; district?: string }): Promise<Incident[]> => {
    return apiClient.get<Incident[]>('/incidents', filters);
  },

  /**
   * Server-side page of incidents (occurred_at desc). Filters are applied on the server.
   */
  getIncidentsPage: async (params: {
    limit: number;
    offset: number;
    severity?: string;
    status?: string;
    district?: string;
    search?: string;
  }): Promise<Page<Incident>> => {
    return apiClient.get<Page<Incident>>('/incidents', { ...params, paginated: true });
  },

  /** Latest photo of each incident for the officers' list (signed URLs, about 15 min). */
  getMediaCovers: async (): Promise<Record<string, string>> => {
    return apiClient.get<Record<string, string>>('/incidents/media-covers');
  },

  /**
   * Upload ONE photo/video to private incident storage. Returns a storage reference
   * for media_urls. Throws ApiError (415 type, 413 size, 502 storage down).
   */
  uploadMedia: async (file: File): Promise<MediaUploadResult> => {
    const form = new FormData();
    form.append('file', file);
    return postForm<MediaUploadResult>('/incidents/media', form);
  },

  /** Short-lived signed URLs for an incident's media. */
  getMedia: async (incidentId: string): Promise<ResolvedMedia[]> => {
    return apiClient.get<ResolvedMedia[]>(`/incidents/${incidentId}/media`);
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
  downloadSitrepPdf: (id: string, displayId?: string): Promise<void> =>
    saveFile(`/incidents/${id}/sitrep-pdf`, displayId ? `SITREP-${displayId}.pdf` : 'sitrep.pdf'),

  /**
   * Download creative AI Disaster Warning Poster PDF for an incident.
   * Uses displayId (e.g. INC-2026-001) as the saved filename when provided.
   */
  downloadSitrepPoster: (id: string, displayId?: string): Promise<void> =>
    saveFile(`/incidents/${id}/sitrep-poster`, displayId ? `WARNING-POSTER-${displayId}.pdf` : 'warning-poster.pdf'),

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

  /**
   * Retrieve citizen emergency assistance requests (Rescue / Medical)
   */
  getAssistanceRequests: async (params?: { status?: string; reporter_contact?: string }): Promise<any[]> => {
    return apiClient.get<any[]>('/incidents/assistance-requests', params);
  },

  /**
   * Update status of citizen assistance request (e.g. Dispatched, Resolved)
   */
  updateAssistanceStatus: async (requestId: string, status: string, notes?: string, extra?: { closure_reason?: string; linked_incident_id?: string }): Promise<any> => {
    return apiClient.patch<any>(`/incidents/assistance-requests/${requestId}/status`, { status, notes, ...extra });
  },

  /**
   * Fetch the operational audit log entries for a specific incident
   */
  getIncidentLogs: async (incidentId: string): Promise<any[]> => {
    return apiClient.get<any[]>(`/incidents/${incidentId}/logs`);
  },
};


