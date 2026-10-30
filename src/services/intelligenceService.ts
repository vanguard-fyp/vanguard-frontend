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
  sources?: Partial<Record<'forecast' | 'river' | 'fire_satellite' | 'air_quality' | 'gdacs' | 'jps_gauges', boolean>>;
  /** why a source was unavailable, when known (e.g. jps_gauges: "page format changed: Pahang") */
  source_notes?: Record<string, string>;
  /** status: ok | partial (some predictions could not be saved, see failed) | failed | skipped */
  result?: { status: string; candidates?: number; written?: number; expired?: number; failed?: string[]; reason?: string; scanned_at?: string };
}

/** Counts and rates for one slice of the accuracy report. */
export interface AccuracyScore {
  warnings: number;
  hits: number;
  misses: number;
  false_alarms: number;
  dismissed: number;
  pending: number;
  /** hits / (hits + misses); null when nothing to judge */
  detection_rate: number | null;
  /** false alarms / (hits + false alarms) */
  false_alarm_rate: number | null;
  /** median hours from first warning to the event (negative = warned after it began) */
  median_lead_hours: number | null;
}

/** How early warnings compared with confirmed incidents (GET /intelligence/predictions/accuracy). */
export interface PredictionAccuracy {
  days: number;
  window_hours: number;
  generated_at: string;
  overall: AccuracyScore;
  by_hazard: (AccuracyScore & { hazard: string })[];
  by_source: (AccuracyScore & { source: string })[];
  recent_misses: { incident_id: string; title: string; hazard: string; state: string; occurred_at: string }[];
  recent_false_alarms: { prediction_key: string; hazard: string; state: string; started_at: string; max_score: number; dismissed: boolean }[];
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

  getPredictionAccuracy: (days = 30) =>
    apiClient.get<PredictionAccuracy>('/intelligence/predictions/accuracy', { days }),

  dismissPrediction: (id: string) => apiClient.post<HazardPrediction>(`/intelligence/predictions/${id}/dismiss`),

  /** After an incident was created from a prediction: hide it from the active list. */
  promotePrediction: (id: string, incidentId: string) =>
    apiClient.post<HazardPrediction>(`/intelligence/predictions/${id}/promote?incident_id=${encodeURIComponent(incidentId)}`),
};
