import { apiClient, downloadBlob } from './apiClient';
import type { ActivityEvent, AnalyticsSummary, KpiTrends } from '../types';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

/** One state row of the yearly summary; null = no data (never estimated). */
export interface StateSummaryRow {
  state: string;
  count: number;
  severity: Severity | null;
  affected_population: number;
  resolved_pct: number | null;
  avg_resolution_hours: number | null;
  districts: { district: string; count: number; severity: Severity | null; affected_population: number }[];
}

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
  getResourceUtilization: async (): Promise<Array<{ name: string; value: number; allocated?: number; stock?: number; fill: string }>> => {
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
  getDisasterTypeDistribution: async (year?: string): Promise<Array<{ name: string; value: number; percent: number; color: string }>> => {
    return apiClient.get('/analytics/disaster-types', year ? { year } : undefined);
  },

  /**
   * Fetch agency response times breakdown
   */
  getAgencyResponseTimes: async (year?: string): Promise<Array<{ agency: string; avg_mins: number | null; samples: number; excluded?: number }>> => {
    return apiClient.get('/analytics/agency-response-times', year ? { year } : undefined);
  },

  /**
   * Fetch state incident heatmap breakdown
   */
  getStateHeatmap: async (year: string = '2026'): Promise<StateSummaryRow[]> => {
    return apiClient.get('/analytics/state-heatmap', { year });
  },

  /**
   * Export all analytics as CSV file download
   */
  exportCSV: async (year: string = '2026'): Promise<void> => {
    const blob = await downloadBlob(`/analytics/export/csv?year=${encodeURIComponent(year)}`);
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
    const blob = await downloadBlob(`/analytics/export/pdf?year=${encodeURIComponent(year)}`);
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
   * Export all analytics as formatted Excel workbook (.xlsx)
   */
  exportExcel: async (year: string = '2026'): Promise<void> => {
    const blob = await downloadBlob(`/analytics/export/excel?year=${encodeURIComponent(year)}`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanguard_analytics_${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * National situation report (PDF) as at now: every active incident, JKM relief
   * centres by state and district, warnings in force and the response.
   */
  exportNationalSitrep: async (): Promise<void> => {
    const blob = await downloadBlob('/analytics/export/national-sitrep');
    const url = window.URL.createObjectURL(blob);
    const stamp = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date()).replace(/[-: ]/g, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `SITREP_Nasional_${stamp}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Export State Disaster Summary as CSV (State Summary section)
   */
  exportStateSummaryCSV: async (year: string = '2026'): Promise<void> => {
    const blob = await downloadBlob(`/analytics/export/state-summary-csv?year=${encodeURIComponent(year)}`);
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
