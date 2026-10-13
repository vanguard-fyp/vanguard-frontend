import { apiClient } from './apiClient';
import type { AdministrativeArea, Incident, ResourceRequest } from '../types';

export interface AIIncidentAnalysis {
  confidence_score?: number;
  extracted_entities?: {
    type?: string;
    location?: string;
    urgency?: string;
    affected_population_estimate?: number;
    risk_factors?: string[];
  };
  priority_score?: number;
  severity?: string;
  recommended_actions?: string[];
  tactical_notes?: string;
  summary?: string;
}

export interface AIRiskAssessment {
  overall_risk_score?: number;
  severity_rank?: number;
  vulnerability_index?: number;
  hazard_propagation_radius_km?: number;
  impact_summary?: string;
  key_drivers?: string[];
  immediate_actions?: string[];
}

export interface AIRescueRecommendation {
  recommended_teams?: Array<{
    team_id: string;
    team_name?: string;
    agency?: string;
    match_score: number;
    recommended_personnel: number;
    eta_mins: number;
    rationale: string;
  }>;
  optimal_personnel_count?: number;
  strategy_notes?: string;
}

export interface AIResourceAllocation {
  decision: 'Approve' | 'Flag for Review' | 'Route to Alternate Depot' | 'Decline';
  confidence: number;
  rationale: string;
  depot_impact: string;
  recommended_fulfillment_depot?: string;
  suggested_quantity?: number;
  depletion_risk?: 'Low' | 'Medium' | 'High' | 'Critical';
}

export const agentService = {
  /**
   * Run the AI Incident Intelligence Agent over an incident payload
   */
  analyzeIncident: async (payload: any): Promise<AIIncidentAnalysis> => {
    return apiClient.post<AIIncidentAnalysis>('/agents/incidents/analyze', { payload });
  },

  /**
   * Run the AI Risk Assessment Agent
   */
  assessRisk: async (scoringInputs: any, incidentId?: string): Promise<AIRiskAssessment> => {
    return apiClient.post<AIRiskAssessment>('/agents/risk/assess', {
      scoring_inputs: scoringInputs,
      incident_id: incidentId,
    });
  },

  /**
   * Run the AI Rescue Coordination Agent
   */
  recommendRescue: async (incident: Incident): Promise<AIRescueRecommendation> => {
    return apiClient.post<AIRescueRecommendation>('/agents/rescue/recommend', { incident });
  },

  /**
   * Run the AI Resource Allocation Agent
   */
  allocateResources: async (request: Partial<ResourceRequest>): Promise<AIResourceAllocation> => {
    return apiClient.post<AIResourceAllocation>('/agents/resources/allocate', { request });
  },

  /**
   * Fetch all canonical administrative areas from database
   */
  getAdministrativeAreas: async (): Promise<AdministrativeArea[]> => {
    return apiClient.get<AdministrativeArea[]>('/incidents/administrative-areas');
  },
};
