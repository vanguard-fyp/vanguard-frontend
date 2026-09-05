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
  pois: () => ['incidents', 'pois'] as const,
  cities: () => ['incidents', 'cities'] as const,
};

export function useIncidents(filters?: { severity?: string; status?: string; district?: string }) {
  return useQuery({
    queryKey: INCIDENT_KEYS.list(filters),
    queryFn: () => incidentService.getIncidents(filters),
    staleTime: 30_000,
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

