import { apiClient } from './apiClient';
import type {
  AssessmentEnvelope,
  HazardPrediction,
  IncidentAssessment,
  IntelligenceOverview,
} from '../types';

/**
 * Disaster Intelligence: all AI output comes from the backend's single
 * canonical pipeline (persisted incident assessments). The console never
 * orchestrates or merges agent calls itself.
 */
export const intelligenceService = {
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
  runPredictionScan: () => apiClient.post<Record<string, unknown>>('/intelligence/predictions/scan'),

  dismissPrediction: (id: string) => apiClient.post<HazardPrediction>(`/intelligence/predictions/${id}/dismiss`),

  /** After an incident was created from a prediction: hide it from the active list. */
  promotePrediction: (id: string, incidentId: string) =>
    apiClient.post<HazardPrediction>(`/intelligence/predictions/${id}/promote?incident_id=${encodeURIComponent(incidentId)}`),
};
