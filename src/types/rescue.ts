import type { Incident, RescueTeam, SeverityLevel } from ".";

export type AgencyFilter = 'All' | 'SMART' | 'BOMBA' | 'APM' | 'PDRM' | 'ATM';
export type StatusFilter = 'All' | 'Available' | 'Deployed' | 'En Route';
export type TeamSortBy = 'default' | 'personnel' | 'status';

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

