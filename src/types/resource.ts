export interface AIRequestRecommendation {
  decision: 'Approve' | 'Flag for Review';
  confidence: number;
  rationale: string;
  depotImpact: string;
}

export interface AIStockAdvisory {
  suggestedQty: number;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  forecastRationale: string;
  depletionTrend: string;
}

export type ViewMode = 1 | 2 | 3 | 'all';