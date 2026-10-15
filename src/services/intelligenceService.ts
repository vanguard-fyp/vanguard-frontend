import { apiClient } from './apiClient';
import type {
  AssessmentEnvelope,
  HazardPrediction,
  IncidentAssessment,
  IntelligenceOverview,
  WiderEvent,
} from '../types';

/**
 * Disaster Intelligence: all AI output comes from the backend's single
 * canonical pipeline (persisted incident assessments). The console never
 * orchestrates or merges agent calls itself.
 */
/** Last / current prediction scan (backend prediction_service.scan_status). */
export interface PredictionScanStatus {
  running: boolean;
  scanned_at?: string;
  /** whether each data source answered in the last scan */
  sources?: Partial<Record<'forecast' | 'river' | 'fire_satellite' | 'air_quality' | 'gdacs', boolean>>;
  result?: { status: string; candidates?: number; written?: number; expired?: number; reason?: string; scanned_at?: string };
}

export const intelligenceService = {
  /** Related active incidents grouped into wider events (advisory). */
  getWiderEvents: () => apiClient.get<WiderEvent[]>('/intelligence/events'),

  getOverview: (params: { status?: 'active' | 'resolved' | 'all'; limit?: number; offset?: number }) =>
    apiClient.get<IntelligenceOverview>('/intelligence/overview', params),

  getAssessment: (incidentId: string) =>
    apiClient.get<AssessmentEnvelope>(`/incidents/${incidentId}/assessment`),

  getAssessmentHistory: (incidentId: string, limit = 10) =>
    apiClient.get<IncidentAssessment[]>(`/incidents/${incidentId}/assessments`, { limit }),

  /** Request re-assessment. The idempotency key makes retries/double-clicks safe. */
  reassess: (incidentId: string, idempotencyKey: string) =>
    apiClient.post<IncidentAssessment>(`/incidents/${incidentId}/assessment`, undefined, {
      'Idempotency-Key': idempotencyKey,
    }),

  /** Queue analysis for every active incident without a usable assessment (runs one at a time). */
  assessPending: (includeStale = false) =>
    apiClient.post<{ queued: number; skipped: number; limit: number }>(
      `/intelligence/assess-pending${includeStale ? '?include_stale=true' : ''}`
    ),

  getPredictions: (limit = 50) => apiClient.get<HazardPrediction[]>('/intelligence/predictions', { limit }),

  /** Administrative/test control only — the scan normally runs on a server schedule. */
  /** Starts a background scan: {status: 'started' | 'running'}. */
  runPredictionScan: () => apiClient.post<{ status: string }>('/intelligence/predictions/scan'),

  getPredictionScanStatus: () => apiClient.get<PredictionScanStatus>('/intelligence/predictions/scan'),

  dismissPrediction: (id: string) => apiClient.post<HazardPrediction>(`/intelligence/predictions/${id}/dismiss`),

  /** After an incident was created from a prediction: hide it from the active list. */
  promotePrediction: (id: string, incidentId: string) =>
    apiClient.post<HazardPrediction>(`/intelligence/predictions/${id}/promote?incident_id=${encodeURIComponent(incidentId)}`),
};
