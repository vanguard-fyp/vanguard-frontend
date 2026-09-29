import type { Incident, RescueTeam, SeverityLevel } from ".";

export type AgencyFilter = 'All' | 'SMART' | 'BOMBA' | 'APM' | 'PDRM' | 'ATM';
export type StatusFilter = 'All' | 'Available' | 'Deployed' | 'En Route' | 'Off Duty';
export type TeamSortBy = 'default' | 'personnel' | 'status';

export interface AIRecommendation {
  action: string;
  rationale: string;
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface MissionWizardProps {
  incidents: Incident[];
  teams: RescueTeam[];
  onClose: () => void;
  onDispatch: (data: {
    incidentId: string;
    teamId?: string;
    teamIds?: string[];
    objective: string;
    priority: SeverityLevel;
    durationHrs: number;
    notes?: string;
  }) => void;
}


export interface AITeamRecommendation {
  teamId: string;
  confidence: number;
  rationale: string;
  eta: string;
}
