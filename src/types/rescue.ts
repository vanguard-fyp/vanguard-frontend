export type AgencyFilter = 'All' | 'SMART' | 'BOMBA' | 'APM' | 'PDRM' | 'ATM';
export type StatusFilter = 'All' | 'Available' | 'Deployed' | 'En Route' | 'Off Duty';
export type TeamSortBy = 'default' | 'personnel' | 'status';

export interface AIRecommendation {
  action: string;
  rationale: string;
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}
