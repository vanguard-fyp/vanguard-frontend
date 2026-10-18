/**
 * useIncidents — TanStack Query hooks for incident data
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '../services/incidentService';
import type { Incident } from '../types';

export const INCIDENT_KEYS = {
  all: ['incidents'] as const,
  lists: () => [...INCIDENT_KEYS.all, 'list'] as const,
  list: (filters?: Record<string, string>) => [...INCIDENT_KEYS.lists(), filters] as const,
  detail: (id: string) => [...INCIDENT_KEYS.all, 'detail', id] as const,
  global: () => ['incidents', 'global'] as const,
  pois: () => ['incidents', 'pois'] as const,
  cities: () => ['incidents', 'cities'] as const,
};

export function useGlobalIncidents(refresh?: boolean, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: INCIDENT_KEYS.global(),
    queryFn: () => incidentService.getGlobalIncidents(refresh),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useIncidents(filters?: { severity?: string; status?: string; district?: string }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: INCIDENT_KEYS.list(filters),
    queryFn: () => incidentService.getIncidents(filters),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useIncident(id: string | null | undefined) {
  return useQuery({
    queryKey: INCIDENT_KEYS.detail(id || ''),
    queryFn: () => incidentService.getIncidentById(id!),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useMapPOIs() {
  return useQuery({
    queryKey: INCIDENT_KEYS.pois(),
    queryFn: () => incidentService.getMapPOIs(),
    staleTime: 60_000,
  });
}

export function useCities() {
  return useQuery({
    queryKey: INCIDENT_KEYS.cities(),
    queryFn: () => incidentService.getCities(),
    staleTime: 60_000,
  });
}

export function useAdministrativeAreas() {
  return useQuery({
    queryKey: ['administrative_areas'],
    queryFn: async () => {
      const { agentService } = await import('../services/agentService');
      return agentService.getAdministrativeAreas();
    },
    staleTime: 10 * 60_000, // 10 minutes cache
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Incident> }) =>
      incidentService.updateIncident(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INCIDENT_KEYS.all });
    },
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Incident>) => incidentService.createIncident(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INCIDENT_KEYS.all });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => incidentService.deleteIncident(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INCIDENT_KEYS.all });
    },
  });
}

export function useResolveIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outcomeNotes, resolverName }: { id: string; outcomeNotes?: string; resolverName?: string }) =>
      incidentService.resolveIncident(id, { outcomeNotes, resolverName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INCIDENT_KEYS.all });
    },
  });
}


/** Signed media URLs for an incident. Signed URLs expire after 15 min, so refresh well before that. */
export function useIncidentMedia(incidentId: string | null | undefined, hasMedia: boolean) {
  return useQuery({
    queryKey: ['incidents', 'media', incidentId ?? ''],
    queryFn: () => incidentService.getMedia(incidentId!),
    enabled: !!incidentId && hasMedia,
    staleTime: 10 * 60_000,
    refetchInterval: 12 * 60_000,
  });
}

export function useIncidentLogs(incidentId: string | null | undefined) {
  return useQuery({
    queryKey: ['incidents', 'logs', incidentId ?? ''],
    queryFn: () => incidentService.getIncidentLogs(incidentId!),
    enabled: !!incidentId,
    staleTime: 15_000,
  });
}
