/**
 * Typed contract for backend incident intelligence (mirrors
 * vanguard-backend/app/services/intelligence/contract.py).
 *
 * Every number shown in the UI must come from one of these fields; values that
 * are unknown are null/absent and must be rendered as an explicit
 * "unavailable" state — never as 0, NaN or a made-up default.
 */

export type FactField =
  | 'severity'
  | 'affected_population'
  | 'casualties_count'
  | 'infrastructure_damage'
  | 'accessibility_score'
  | 'weather_condition';

export type FactState = 'reported' | 'verified' | 'disputed' | 'unknown';

export type AssessmentStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'insufficient_evidence'
  | 'failed'
  | 'superseded';

export type StageStatus = 'ok' | 'unavailable' | 'insufficient_evidence' | 'failed' | 'skipped' | 'flagged';

export interface EvidenceItem {
  key: string;
  label: string;
  source: string;
  status: 'available' | 'unavailable' | 'partial';
  retrieved_at?: string | null;
  coverage?: string | null;
  detail?: string | null;
}

export interface ScoringBlock {
  priority_score?: number | null;
  priority_scale?: string;
  confidence_score?: number | null;
  confidence_meaning?: string;
  inputs_used?: Record<string, unknown>;
  input_sources?: Record<string, 'observed' | 'reported' | 'calculated' | 'llm' | 'external'>;
  substitutions?: string[];
  /** Per-aspect breakdown of the weighted priority model (points add up to the score). */
  factors?: PriorityFactor[];
  /** The wider event this incident belongs to, if any. */
  wider_event?: WiderEvent | null;
}

/** Related incidents scored together (backend intelligence/events.py). Advisory. */
export interface WiderEvent {
  id: string;
  hazard: string;
  title: string;
  incident_count: number;
  incidents: {
    id: string;
    display_id?: string | null;
    title?: string | null;
    district?: string | null;
    state?: string | null;
    severity?: string | null;
    disaster_level?: string | null;
    priority_score?: number | null;
  }[];
  states: string[];
  districts: string[];
  affected_people?: number | null;
  affected_basis?: { reported: number; modelled: number; unknown: number };
  casualties?: number;
  highest_severity?: string | null;
  combined_priority?: number | null;
  highest_single_priority?: number | null;
  declared_level?: string | null;
  suggested_level: string;
  under_declared: boolean;
  rule: string;
}

export interface PriorityFactor {
  key: 'severity' | 'urgency' | 'casualties' | 'population' | 'infrastructure' | 'access' | 'weather' | string;
  label: string;
  /** value the model used (e.g. "Critical", 34500) */
  input?: unknown;
  /** 0-1 rating of this aspect */
  factor: number;
  /** model weight 0-1 */
  weight: number;
  /** weight x factor x 100 */
  points: number;
  /** where the input came from; "default" = not reported, a documented default was used */
  source?: 'observed' | 'reported' | 'calculated' | 'llm' | 'external' | 'default' | null;
}

export interface PopulationBlock {
  status: StageStatus;
  reported_affected_population?: number | null;
  reported_casualties?: number | null;
  estimated_exposed_population?: number | null;
  method?: string | null;
  district_population?: number | null;
  district_population_year?: number | null;
  district_area_km2?: number | null;
  impact_radius_km?: number | null;
  district?: string | null;
  state?: string | null;
  resolution?: string | null;
  note?: string | null;
}

export interface ForecastPoint {
  hour_offset: number;
  valid_time?: string | null;
  cumulative_precip_mm?: number | null;
  estimated_exposed_population?: number | null;
  growth_factor?: number | null;
  /** reading behind the step, e.g. "AQI 168 (Unhealthy), PM2.5 89 µg/m³" */
  driver_note?: string | null;
  driver_value?: number | null;
}

export interface ForecastBlock {
  status: StageStatus;
  model?: string;
  metric?: string;
  metric_unit?: string;
  time_axis?: string;
  driver?: string | null;
  /** projection start: latest reported figure, or the modelled exposure when none was reported */
  baseline_population?: number | null;
  baseline_source?: 'reported' | 'modelled' | null;
  horizon_hours?: number | null;
  requested_horizons?: number[];
  unavailable_horizons?: number[];
  points?: ForecastPoint[];
  reference_rainfall_mm?: number | null;
  /** flood | landslide | storm | haze | fire | drought | earthquake | volcano | structural | other */
  hazard_family?: string | null;
  note?: string | null;
}

export interface AccessConstraint {
  code: string;
  severity: 'info' | 'moderate' | 'severe';
  description: string;
  source: string;
  evidence: string;
}

export interface AccessBlock {
  status: StageStatus;
  reported_accessibility_score?: number | null;
  reported_infrastructure_damage?: string | null;
  teams_route_checked?: number;
  teams_routable?: number;
  nearest_road_distance_km?: number | null;
  nearest_road_duration_min?: number | null;
  constraints?: AccessConstraint[];
}

export interface ImpactAnalysisBlock {
  status: StageStatus;
  source?: 'llm';
  summary?: string | null;
  key_impacts?: string[];
  access_considerations?: string[];
  uncertainties?: string[];
  missing_evidence?: string[];
  model?: string | null;
  reason?: string | null;
}

export interface DecisionRecommendationBlock {
  status: StageStatus;
  recommended_action?: string | null;
  rationale?: string | null;
  urgency?: 'Immediate' | 'Within 6h' | 'Within 24h' | 'Monitor' | null;
  advisory_only?: boolean;
  note?: string;
}

export interface SuggestedTeam {
  team_id: string;
  display_id?: string | null;
  name?: string | null;
  agency?: string | null;
  specialization?: string | null;
  recommended_personnel: number;
  available_personnel: number;
  road_distance_km?: number | null;
  rank_score?: number | null;
  rationale: string;
  // Present on /missions/recommendations (live re-check)
  available_now?: number;
  eligible_now?: boolean;
  still_feasible?: boolean;
}

export interface RescueBlock {
  status: StageStatus;
  required_personnel?: number | null;
  required_personnel_basis?: string | null;
  suggested_teams?: SuggestedTeam[];
  covered_personnel?: number;
  shortfall_personnel?: number;
  excluded?: { team_id: string; reason: string }[];
  mission_title?: string | null;
  mission_objective?: string | null;
  reason?: string | null;
}

/** One signal behind the report-credibility verdict. */
export interface CredibilitySignal {
  key: string;
  label: string;
  effect: 'supports' | 'weakens' | 'neutral';
  points: number;
  detail: string;
}

/** Advisory "is this report likely real?" check (backend intelligence/credibility.py). */
export interface CredibilityBlock {
  status: 'ok' | 'failed';
  verdict?: 'Likely genuine' | 'Needs verification' | 'Possibly false';
  score?: number;
  suggestion?: string;
  signals?: CredibilitySignal[];
  vision?: {
    status: 'assessed' | 'no_media' | 'media_unreachable' | 'vision_unavailable';
    images_checked: number;
    observations: string[];
    model?: string | null;
  };
  is_official_source?: boolean;
  advisory_only?: boolean;
  note?: string;
  reason?: string;
}

export interface IncidentAssessment {
  id: string;
  incident_id: string;
  version: number;
  status: AssessmentStatus;
  trigger: string;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  priority_score?: number | null;
  confidence_score?: number | null;
  estimated_affected_population?: number | null;
  forecast_horizon_hours?: number | null;
  scoring: ScoringBlock;
  population: Partial<PopulationBlock>;
  forecast: Partial<ForecastBlock>;
  access_constraints: Partial<AccessBlock>;
  impact_analysis: Partial<ImpactAnalysisBlock>;
  decision_recommendation: Partial<DecisionRecommendationBlock>;
  rescue_recommendation: Partial<RescueBlock>;
  evidence: EvidenceItem[];
  /** Empty object until the credibility migration is applied / re-assessed. */
  credibility?: Partial<CredibilityBlock>;
  assumptions: string[];
  uncertainty: string[];
  validation_flags: string[];
  stage_status: Record<string, StageStatus>;
  model_metadata: Record<string, unknown>;
  is_stale: boolean;
}

export interface AssessmentEnvelope {
  incident_id: string;
  current: IncidentAssessment | null;
  last_usable: IncidentAssessment | null;
  priority_rank: number | null;
  ranked_incidents: number;
}

export type AnalysisState =
  | 'not_analysed'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'insufficient_evidence'
  | 'failed';

export interface OverviewIncident {
  id: string;
  display_id: string;
  title: string;
  location: string;
  state: string;
  district: string;
  administrative_district?: string | null;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | null;
  disaster_level: string | null;
  status: string;
  occurred_at: string;
  affected_population: number;
  casualties_count: number;
  field_verification?: Partial<Record<FactField, FactState>>;
  type: string | null;
  lat?: number;
  lng?: number;
}

export interface IntelligenceOverviewItem {
  incident: OverviewIncident;
  assessment: IncidentAssessment | null;
  priority_rank: number | null;
  analysis_state: AnalysisState;
}

export interface IntelligenceOverview {
  items: IntelligenceOverviewItem[];
  total: number;
  limit: number;
  offset: number;
  ranking_method: string;
  generated_at: string;
}

export interface HazardPrediction {
  id: string;
  prediction_key: string;
  version: number;
  hazard_type: string | null;
  state: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  hazard_score: number | null;
  confidence: number | null;
  projected_within_hours: number | null;
  exposed_population: number | null;
  signals: Record<string, unknown>;
  evidence: { key: string; source: string; status: string; detail?: string }[];
  uncertainty: string[];
  advisory: string | null;
  advisory_source: 'llm' | 'rule_fallback' | null;
  status: string;
  generated_at: string;
  /** Read-only context: confirmed past incidents of this hazard in the area. Never part of the score. null = could not be read. */
  history?: PredictionHistory | null;
  /** Official MET Malaysia warnings in force for this hazard and area. Context only. null = feed unreachable. */
  official_warnings?: OfficialWarning[] | null;
  /** JKM relief centres open in this prediction's districts. Context only. null = feed unreachable. */
  relief_centres?: ReliefSummary | null;
  /** DOSM figures for the district, shown beside the warning. Never part of the score. */
  district_profile?: DistrictProfile | null;
}

export interface DistrictProfile {
  district: string;
  poverty_pct: number;
  /** 'state' = no district figure is published; the state's is shown instead */
  poverty_scope: 'district' | 'state';
  age_65_plus_pct: number;
  under_5_pct: number;
  poverty_year: number;
  population_year: number;
  source: string;
}

export interface ReliefSummary {
  open: number;
  victims: number;
  families: number;
  nearly_full: number;
  source: string;
}

export interface ReliefCentre {
  id: string;
  name: string;
  state: string;
  district: string;
  mukim?: string | null;
  lat: number | null;
  lng: number | null;
  victims: number;
  families: number;
  capacity_pct: number;
}

/** available = false means the feed could not be read (unknown, not "none open"). */
export interface ReliefCentresResponse {
  available: boolean;
  source: string;
  centres: ReliefCentre[];
  summary: ReliefSummary | null;
  nearly_full_pct?: number;
}

export interface OfficialWarning {
  title: string;
  issued: string | null;
  valid_from: string | null;
  valid_to: string | null;
  source: string;
  /** Districts of this prediction named in the warning; null when the whole state is named. */
  districts: string[] | null;
  scope: 'district' | 'state';
}

export interface PredictionHistory {
  years: number;
  confirmed_events: number;
  scope: 'district' | 'state';
  area: string | null;
  last_event_at: string | null;
  prone: boolean;
  label: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface GisFeature {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  attributes: Record<string, string | number | null>;
}

export interface GisLayerResponse {
  layer: string;
  label?: string;
  status: 'ok' | 'degraded' | 'unavailable';
  features: GisFeature[];
  feature_count: number;
  truncated?: boolean;
  source_url?: string;
  coverage?: string;
  notes?: string;
  fetched_at?: string | null;
  message?: string | null;
}

export type GeoStatus = 'resolved' | 'partial' | 'ambiguous' | 'unresolved' | 'unavailable';

export interface GeoResolution {
  status: GeoStatus;
  lat: number | null;
  lng: number | null;
  administrative_area_id: string | null;
  state: string | null;
  district: string | null;
  zone: string | null;
  postcode: string | null;
  street?: string | null;
  /** town people use (e.g. Mentakab); may differ from the administrative district */
  locality?: string | null;
  display_name?: string | null;
  candidates?: { administrative_area_id: string | null; state: string | null; district: string | null; zone: string | null; lat: number; lng: number }[];
  sources?: Record<string, string | null>;
  message?: string | null;
}

export interface MediaUploadResult {
  ref: string;
  content_type: string;
  kind: 'image' | 'video';
  size_bytes: number;
  uploaded_at: string;
}

export interface ResolvedMedia {
  ref: string;
  url: string | null;
  kind: 'image' | 'video';
  status: 'available' | 'unavailable' | 'unsupported';
  expires_in_seconds: number | null;
}
