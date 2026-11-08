import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { intelligenceService } from '../services/intelligenceService';
import type { AssessmentEnvelope, AssessmentStatus } from '../types';

export const INTEL_KEYS = {
  all: ['intelligence'] as const,
  overview: (status: string, limit: number, offset: number) => ['intelligence', 'overview', status, limit, offset] as const,
  assessment: (incidentId: string) => ['intelligence', 'assessment', incidentId] as const,
  history: (incidentId: string) => ['intelligence', 'history', incidentId] as const,
  predictions: ['intelligence', 'predictions'] as const,
  events: ['intelligence', 'events'] as const,
  scan: ['intelligence', 'predictions', 'scan'] as const,
  accuracy: (days: number) => ['intelligence', 'predictions', 'accuracy', days] as const,
};

/** Early-warning hits, misses and false alarms over the last `days`. */
export function usePredictionAccuracy(days: number) {
  return useQuery({
    queryKey: INTEL_KEYS.accuracy(days),
    queryFn: () => intelligenceService.getPredictionAccuracy(days),
    staleTime: 5 * 60_000,
  });
}

/** Wider events (related incidents scored together). */
export function useWiderEvents() {
  return useQuery({
    queryKey: INTEL_KEYS.events,
    queryFn: () => intelligenceService.getWiderEvents(),
    staleTime: 60_000,
  });
}

export const IN_FLIGHT: AssessmentStatus[] = ['queued', 'processing'];

export function useIntelligenceOverview(status: 'active' | 'resolved' | 'all', limit: number, offset: number) {
  return useQuery({
    queryKey: INTEL_KEYS.overview(status, limit, offset),
    queryFn: () => intelligenceService.getOverview({ status, limit, offset }),
    placeholderData: (prev) => prev,
    // Keep polling while any listed incident is still being analysed.
    refetchInterval: (q) =>
      q.state.data?.items.some((i) => i.analysis_state === 'queued' || i.analysis_state === 'processing') ? 4000 : 60_000,
  });
}

/** Latest assessment for one incident; polls every 3 s while a run is in flight. */
export function useIncidentAssessment(incidentId: string | null | undefined) {
  return useQuery<AssessmentEnvelope>({
    queryKey: INTEL_KEYS.assessment(incidentId ?? ''),
    queryFn: () => intelligenceService.getAssessment(incidentId as string),
    enabled: !!incidentId,
    refetchInterval: (q) => (q.state.data?.current && IN_FLIGHT.includes(q.state.data.current.status) ? 3000 : false),
  });
}

export function useAssessmentHistory(incidentId: string | null | undefined) {
  return useQuery({
    queryKey: INTEL_KEYS.history(incidentId ?? ''),
    queryFn: () => intelligenceService.getAssessmentHistory(incidentId as string, 10),
    enabled: !!incidentId,
  });
}

export function useReassessIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, key }: { incidentId: string; key: string }) => intelligenceService.reassess(incidentId, key),
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: INTEL_KEYS.assessment(vars.incidentId) });
      qc.invalidateQueries({ queryKey: INTEL_KEYS.all });
    },
  });
}

export function useAssessPending() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (includeStale: boolean = false) => intelligenceService.assessPending(includeStale),
    onSettled: () => qc.invalidateQueries({ queryKey: INTEL_KEYS.all }),
  });
}

export function useHazardPredictions() {
  return useQuery({
    queryKey: INTEL_KEYS.predictions,
    queryFn: () => intelligenceService.getPredictions(),
    staleTime: 60_000,
  });
}

export function useReliefCentres(params: { state?: string; district?: string } = {}, enabled = true) {
  return useQuery({
    queryKey: [...INTEL_KEYS.predictions, 'relief-centres', params.state ?? '', params.district ?? ''],
    queryFn: () => intelligenceService.getReliefCentres(params),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useDismissPrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => intelligenceService.dismissPrediction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: INTEL_KEYS.predictions }),
  });
}

export function usePromotePrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, incidentId }: { id: string; incidentId: string }) => intelligenceService.promotePrediction(id, incidentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: INTEL_KEYS.predictions }),
  });
}

export function useRunPredictionScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => intelligenceService.runPredictionScan(),
    onSuccess: () => qc.invalidateQueries({ queryKey: INTEL_KEYS.scan }),
  });
}

/** Scan status; polls every 3 s while a scan runs. */
export function usePredictionScanStatus() {
  return useQuery({
    queryKey: INTEL_KEYS.scan,
    queryFn: () => intelligenceService.getPredictionScanStatus(),
    refetchInterval: (q) => (q.state.data?.running ? 3000 : false),
    staleTime: 30_000,
  });
}
