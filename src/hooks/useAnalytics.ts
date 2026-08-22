/**
 * useAnalytics — TanStack Query hooks for dashboard analytics
 */
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';

export const ANALYTICS_KEYS = {
  kpiTrends: ['analytics', 'kpi-trends'] as const,
  activityFeed: ['analytics', 'activity-feed'] as const,
  severityDist: ['analytics', 'severity-distribution'] as const,
  responseTrends: ['analytics', 'response-trends'] as const,
  teamCapacity: ['analytics', 'team-capacity'] as const,
  resourceUtilization: ['analytics', 'resource-utilization'] as const,
  monthlyTrends: ['analytics', 'monthly-trends'] as const,
  disasterTypes: ['analytics', 'disaster-types'] as const,
  agencyResponseTimes: ['analytics', 'agency-response-times'] as const,
  stateHeatmap: ['analytics', 'state-heatmap'] as const,
};

export function useKpiTrends() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.kpiTrends,
    queryFn: () => analyticsService.getKpiTrends(),
    staleTime: 60_000,
  });
}

export function useActivityFeed() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.activityFeed,
    queryFn: () => analyticsService.getActivityFeed(),
    staleTime: 15_000,
  });
}

export function useSeverityDist() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.severityDist,
    queryFn: () => analyticsService.getSeverityDistribution(),
    staleTime: 60_000,
  });
}

export function useResponseTrends() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.responseTrends,
    queryFn: () => analyticsService.getResponseTrends(),
    staleTime: 60_000,
  });
}

export function useTeamCapacity() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.teamCapacity,
    queryFn: () => analyticsService.getTeamCapacity(),
    staleTime: 30_000,
  });
}

export function useResourceUtilization() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.resourceUtilization,
    queryFn: () => analyticsService.getResourceUtilization(),
    staleTime: 60_000,
  });
}

export function useNetworkGraph() {
  return useQuery({
    queryKey: ['analytics', 'network-graph'],
    queryFn: () => analyticsService.getNetworkGraph(),
    staleTime: 120_000,
  });
}

export function useMonthlyTrends() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.monthlyTrends,
    queryFn: () => analyticsService.getMonthlyTrends(),
    staleTime: 60_000,
  });
}

export function useDisasterTypeDistribution() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.disasterTypes,
    queryFn: () => analyticsService.getDisasterTypeDistribution(),
    staleTime: 60_000,
  });
}

export function useAgencyResponseTimes() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.agencyResponseTimes,
    queryFn: () => analyticsService.getAgencyResponseTimes(),
    staleTime: 60_000,
  });
}

export function useStateHeatmap() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.stateHeatmap,
    queryFn: () => analyticsService.getStateHeatmap(),
    staleTime: 60_000,
  });
}
