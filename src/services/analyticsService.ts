import { apiClient } from './apiClient';
import type { ActivityEvent, KpiTrends } from '../types';

export const analyticsService = {
  /**
   * Fetch 7-hour rolling KPI sparkline trend data
   */
  getKpiTrends: async (): Promise<KpiTrends> => {
    return apiClient.get<KpiTrends>('/analytics/kpi-trends');
  },

  /**
   * Fetch real-time chronological activity feed
   */
  getActivityFeed: async (): Promise<ActivityEvent[]> => {
    return apiClient.get<ActivityEvent[]>('/analytics/activity-feed');
  },

  /**
   * Fetch disaster severity distribution breakdown
   */
  getSeverityDistribution: async (): Promise<Array<{ name: string; value: number; color: string }>> => {
    return apiClient.get('/analytics/severity-distribution');
  },

  /**
   * Fetch hourly response time trend
   */
  getResponseTrends: async (): Promise<Array<{ time: string; response_min: number }>> => {
    return apiClient.get('/analytics/response-trends');
  },

  /**
   * Fetch squad deployment capacity
   */
  getTeamCapacity: async (): Promise<Array<{ name: string; deployed: number; available: number; fill: string }>> => {
    return apiClient.get('/analytics/team-capacity');
  },

  /**
   * Fetch emergency resource utilization
   */
  getResourceUtilization: async (): Promise<Array<{ name: string; value: number; fill: string }>> => {
    return apiClient.get('/analytics/resource-utilization');
  },

  /**
   * Fetch EOC command network topology graph
   */
  getNetworkGraph: async (): Promise<{ nodes: any[]; edges: any[] }> => {
    return apiClient.get('/analytics/network-graph');
  },

  /**
   * Fetch historical monthly incident trend
   */
  getMonthlyTrends: async (): Promise<Array<{ month: string; incidents: number; resolved: number }>> => {
    return apiClient.get('/analytics/monthly-trends');
  },

  /**
   * Fetch disaster type breakdown distribution
   */
  getDisasterTypeDistribution: async (): Promise<Array<{ name: string; value: number; color: string }>> => {
    return apiClient.get('/analytics/disaster-types');
  },

  /**
   * Fetch agency response times breakdown
   */
  getAgencyResponseTimes: async (): Promise<Array<{ agency: string; avgMins: number }>> => {
    return apiClient.get('/analytics/agency-response-times');
  },

  /**
   * Fetch state incident heatmap breakdown
   */
  getStateHeatmap: async (): Promise<Array<{ state: string; count: number; severity: 'Critical' | 'High' | 'Medium' | 'Low' }>> => {
    return apiClient.get('/analytics/state-heatmap');
  },
};
