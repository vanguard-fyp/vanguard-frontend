import { apiClient } from './apiClient';
import type { ActivityEvent, AnalyticsSummary, KpiTrends } from '../types';

export const analyticsService = {
  /**
   * Fetch aggregate summary metrics, response times, and YoY trends
   */
  getSummary: async (year: string = '2026'): Promise<AnalyticsSummary> => {
    return apiClient.get<AnalyticsSummary>('/analytics/summary', { year });
  },

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
  getResponseTrends: async (): Promise<Array<{ time: string; response_min: number; responseMin?: number }>> => {
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
   * Fetch historical monthly incident trend (year-filtered)
   */
  getMonthlyTrends: async (year: string = '2026'): Promise<Array<{ month: string; incidents: number; resolved: number }>> => {
    return apiClient.get('/analytics/monthly-trends', { year });
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
  getStateHeatmap: async (year: string = '2026'): Promise<Array<{ state: string; count: number; severity: 'Critical' | 'High' | 'Medium' | 'Low' }>> => {
    return apiClient.get('/analytics/state-heatmap', { year });
  },

  /**
   * Export all analytics as CSV file download
   */
  exportCSV: async (year: string = '2026'): Promise<void> => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const res = await fetch(`${baseUrl}/analytics/export/csv?year=${encodeURIComponent(year)}`);
    if (!res.ok) throw new Error('Failed to export CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanguard_analytics_${year}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Export all analytics as structured PDF report download
   */
  exportPDF: async (year: string = '2026'): Promise<void> => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const res = await fetch(`${baseUrl}/analytics/export/pdf?year=${encodeURIComponent(year)}`);
    if (!res.ok) throw new Error('Failed to export PDF');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanguard_report_${year}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  /**
   * Export State Disaster Summary as CSV (State Summary section)
   */
  exportStateSummaryCSV: async (year: string = '2026'): Promise<void> => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const res = await fetch(`${baseUrl}/analytics/export/state-summary-csv?year=${encodeURIComponent(year)}`);
    if (!res.ok) throw new Error('Failed to export State Summary CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanguard_state_summary_${year}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
