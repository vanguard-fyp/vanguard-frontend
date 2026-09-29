export interface AIRequestRecommendation {
  decision: 'Approve' | 'Flag for Review';
  confidence: number;
  rationale: string;
  depot_impact: string;
}

export interface AIStockAdvisory {
  suggested_qty: number;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  forecast_rationale: string;
  depletion_trend: string;
}

export type ViewMode = 1 | 2 | 3 | 'all';
