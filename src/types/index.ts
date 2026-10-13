import type { AssessmentStatus, FactField, FactState } from './intelligence';
export * from './navigation';
export * from './communication';
export * from './rescue';
export * from './resource';
export * from './situational';
export * from './system';
export * from './intelligence';

export type UserRole =
  | 'NADMA Lead Officer'
  | 'Disaster Management Officer'
  | 'Citizen Reporter'
  | 'System / Sensor Bot';

export const USER_ROLES: UserRole[] = [
  'NADMA Lead Officer',
  'Disaster Management Officer',
  'Citizen Reporter',
  'System / Sensor Bot',
];

export type DisasterType = 'Flood' | 'Landslide' | 'Flash Flood' | 'Forest Fire' | 'Severe Storm' | 'Haze' | 'Earthquake' | 'Drought' | 'Other';

export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type DisasterLevel = 'Level 1: District' | 'Level 2: State' | 'Level 3: Federal';

export interface IncidentLog {
  id: string;
  incident_id: string;
  actor_user_id?: string;
  actor: string;
  actor_role?: string;
  actor_agency?: string;
  action: string;
  detail?: string;
  logged_at: string;
}

export interface CityItem {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
}

export interface GdacsEvent {
  id: string;
  eventId: string;
  title: string;
  description: string;
  hazardType: string;
  hazardCode: string;
  alertLevel: 'Red' | 'Orange' | 'Green';
  country: string;
  lat: number;
  lng: number;
  date: string;
  severity: string;
  affectedPopulation: number;
  link: string;
  isCurrent: boolean;
  source: string;
}

export interface Incident {
  id: string;
  display_id: string;
  title: string;
  type: DisasterType;
  location: string;
  state: string;
  /** most precise place name (e.g. Mentakab) */
  district: string;
  /** canonical administrative area resolved by the backend from the pin */
  administrative_area_id?: string | null;
  /** name of that canonical district (e.g. Temerloh); enrichment only */
  administrative_district?: string | null;
  postcode?: string;
  coordinates: [number, number];
  severity: SeverityLevel;
  disaster_level: DisasterLevel;
  occurred_at: string;
  source: string;
  reported_by_user_id?: string;
  reporter_name?: string;
  status: 'Unverified' | 'Verified' | 'Responding' | 'Resolved' | 'Rejected' | 'Archived';
  affected_population: number;
  casualties_count: number;
  infrastructure_damage: 'Severe' | 'Moderate' | 'Minor' | 'None';
  accessibility_score: number;
  /** null = not reported */
  weather_condition: string | null;
  description: string;
  reporter_contact?: string;
  verified_by?: string;
  verified_by_user_id?: string;
  verified_by_role?: string;
  verified_by_agency?: string;
  verified_at?: string;
  resolved_at?: string;
  resolved_by_user_id?: string;
  rejection_reason?: string;
  /** AI-derived (latest assessment); null until the pipeline has produced a score. */
  ai_priority_score: number | null;
  /** Provenance of officer-entered facts: reported | verified | disputed | unknown. */
  field_verification?: Partial<Record<FactField, FactState>>;
  /** Analysis run queued by the last create/update, if any. */
  analysis?: { assessment_id: string; status: AssessmentStatus; version: number } | null;
  outcome_notes?: string;
  media_urls?: string[];
  trigger_alert?: TriggerAlert;
  impact_timeline?: ImpactSnapshot[];
  action_log?: IncidentLog[];
}

export interface AdministrativeArea {
  id: string;
  state: string;
  district: string;
  state_code?: string;
  district_code?: string;
  population?: number;
  centroid_lat?: number;
  centroid_lng?: number;
}

export interface CopilotTask {
  id: string;
  category: string;
  priority: SeverityLevel | string;
  title: string;
  description: string;
  actionLabel: string;
  link: string;
  display_id?: string;
  badge?: string;
  icon?: string;
  dueTime?: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  suggestions?: string[];
  tasks?: CopilotTask[];
  /** copilot replies: where the text came from */
  source?: CopilotSource;
  /** copilot replies: provider/model that produced the text, e.g. "fallback:…" */
  model?: string | null;
  /** copilot replies: guardrail outcome (anything but 'allow' is a refusal) */
  guardrail?: string;
  /** user messages: the request failed and was not answered */
  failed?: boolean;
}

export interface CopilotChatResponse {
  reply: string;
  timestamp: string;
  role: string;
  suggestions: string[];
  activeIncidentsCount: number;
  criticalCount: number;
  unreadAlertsCount: number;
  /** allow | clarify | refuse_scope | refuse_action | refuse_injection | refuse_length */
  guardrail?: string;
  source?: CopilotSource;
  model?: string | null;
}

/** llm = model reply · guardrail = blocked before any model call · unavailable = no model reply could be produced */
export type CopilotSource = 'llm' | 'guardrail' | 'unavailable';

export interface GISLayerState {
  disasterHotspots: boolean;
  floodAreas: boolean;
  landslideAreas: boolean;
  fireZones: boolean;
  severeStorms: boolean;
  earthquakeDrought: boolean;
  emergencyShelters: boolean;
  hospitals: boolean;
  clinics: boolean;
  fireStations: boolean;
  policeStations: boolean;
  evacuationSchools: boolean;
  rescueTeamLocations: boolean;
}

export interface MapPOI {
  id: string;
  name: string;
  category:
    | 'Shelter'
    | 'Hospital'
    | 'Clinic'
    | 'Police Station'
    | 'Fire Station'
    | 'School'
    | 'Utility'
    | 'Rescue Team'
    | 'Road Closure'
    | 'Warehouse'
    | 'Depot'
    | 'Pharmacy'
    | 'Flood Hotspot'
    | 'Other';
  coordinates: [number, number];
  capacity?: { current: number; max: number };
  details: string;
  contact?: string;
  distanceKm?: number;
  place?: string;
  website?: string;
  openingHours?: string;
}

export interface RescueTeam {
  id: string;
  display_id: string;
  name: string;
  agency: 'SMART' | 'BOMBA' | 'APM' | 'PDRM' | 'ATM';
  personnel_count: number;
  vehicles: string[];
  equipment?: string[];
  current_location: string;
  coordinates: [number, number];
  status: 'Available' | 'Deployed' | 'En Route' | 'Off Duty' | 'Deleted';
  contact_number: string;
  commander: string;
  specialization?: string;
  /** Authoritative capacity from the backend (capacity_service). */
  total_personnel?: number;
  committed_personnel?: number;
  available_personnel?: number;
  active_assignment_count?: number;
  active_mission_count?: number;
  active_mission_ids?: string[];
  eligible?: boolean;
  ineligible_reason?: 'inactive' | 'off_duty' | null;
  unsized_assignments?: number;
}

export interface MissionTeamAssignment {
  id: string;
  name?: string;
  agency?: string;
  display_id?: string;
  assignment_id?: string;
  assignment_status?: string;
  assigned_personnel?: number | null;
  selection_source?: 'ai' | 'officer' | null;
  approved_by_user_id?: string | null;
  approved_at?: string | null;
}

export interface Mission {
  id: string;
  display_id: string;
  title: string;
  incident_id: string;
  incident_display_id?: string;
  incident_title?: string;
  incident_location: string;
  assigned_team_id?: string;
  team_ids?: string[];
  team_name: string;
  agency: 'SMART' | 'BOMBA' | 'APM' | 'PDRM' | 'ATM';
  priority: SeverityLevel;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Aborted';
  estimated_completion: string;
  actual_completion?: string;
  objective: string;
  created_at?: string;
  updated_at?: string;
  teams?: MissionTeamAssignment[];
  recommended_personnel?: number | null;
  approved_by_user_id?: string | null;
  approved_at?: string | null;
}

export interface Warehouse {
  id: string;
  name: string;
  state: string;
  district: string;
  postcode?: string;
  full_address: string;
  lat: number;
  lng: number;
  contact_number: string;
}

export type ResourceCategory = 'Food' | 'Medical supplies' | 'Rescue equipment' | 'Vehicles' | 'Emergency supplies';
export type StockStatus = 'Sufficient' | 'Low Stock' | 'Critical';

export interface ResourceItem {
  id: string;
  display_id: string;
  name: string;
  category: ResourceCategory;
  unit: string;
  stock_level: number;
  min_threshold: number;
  warehouse_id?: string;
  resource_type_id?: string;
  warehouse_location?: string;
  status: StockStatus;
}

export interface ResourceRequest {
  id: string;
  display_id: string;
  requested_by_user_id?: string;
  agency: string;
  district: string;
  resource_type_id?: string;
  warehouse_id?: string;
  quantity_requested: number;
  unit: string;
  urgency: SeverityLevel;
  status: 'Pending Approval' | 'Approved' | 'Rejected' | 'Dispatched' | 'Delivered' | 'Fulfilled';
  requested_at?: string;
  updated_at?: string;
  justification: string;
  approved_by_user_id?: string;
  requested_by_name?: string;
  approved_by_name?: string;
  item_requested?: string;
  rejection_reason?: string;
  /** requisition = depot -> one incident; replenishment = supplier -> depot */
  request_type?: 'requisition' | 'replenishment';
  incident_id?: string | null;
  incident_display_id?: string | null;
  incident_title?: string | null;
  warehouse_name?: string | null;
  supplier?: string | null;
  approved_at?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
}

export interface PublicAnnouncement {
  id: string;
  display_id: string;
  title: string;
  category: 'Emergency Alert' | 'Evacuation Order' | 'Safety Announcement';
  target_type?: 'State' | 'District' | 'Radius';
  target_state?: string;
  target_districts: string[];
  lat?: number;
  lng?: number;
  radius_km?: number;
  severity: SeverityLevel;
  content: string;
  issued_by_user_id?: string;
  issued_by?: string;
  issued_at?: string;
  expires_at?: string;
  active: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  agency: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  last_active: string;
  avatar_url?: string;
}

/* ─── Network Topology ─────────────────────────────────────── */
export type TopoNodeType = 'hub' | 'incident' | 'team' | 'mission';
export type TopoEdgeType = 'command' | 'assignment' | 'mission' | 'response';

export interface TopoNode {
  id: string;
  display_id: string;
  label: string;
  sublabel?: string;
  type: TopoNodeType;
  x: number;
  y: number;
  severity?: SeverityLevel;
  agency?: string;
  priority?: SeverityLevel;
  status?: string;
  affected?: number;
  personnel?: number;
}

export interface TopoEdge {
  id: string;
  source: string;
  target: string;
  type: TopoEdgeType;
}

export interface ActivityEvent {
  id: string;
  time: string;
  event: string;
  type: 'critical' | 'alert' | 'warning' | 'info' | 'success';
  actor: string;
}

/* ─── KPI Sparkline Trends ──────────────────────────────────── */
/** Daily new-record counts for the dashboard sparklines (backend: analytics.get_kpi_trends). */
export interface KpiTrends {
  /** 'hour' when every record in the window falls within 24 h, else 'day' */
  bucket?: 'hour' | 'day';
  /** bucket labels aligned with each series, e.g. "01 Aug 21:00" or "01 Aug" */
  labels?: string[];
  /** ISO dates (Asia/Kuala_Lumpur), oldest first, aligned with each series */
  days?: string[];
  window_end?: string;
  /** false when nothing happened in the last 7 days and the window ends at the latest record */
  is_current_window?: boolean;
  incidents: number[];
  population: number[];
  teams: number[];
  missions: number[];
  basis?: string;
}

export type TriggerSource = 'Metrology Station' | 'Seismic Sensor' | 'Hydrological Monitor' | 'Public Report';

export interface MetrologyReading {
  metric: 'Rainfall' | 'RiverLevel' | 'WindSpeed' | 'SeismicActivity' | 'SoilMoisture';
  value: number;
  unit: string;
  threshold: number;
  station: string;
  recorded_at: string;
}

export interface TriggerAlert {
  id: string;
  source: TriggerSource;
  readings: MetrologyReading[];
  predicted_probability: number;
  predicted_onset: string;
  triggered_at: string;
}

export interface ImpactSnapshot {
  timestamp: string;
  affected_population: number;
  casualties_count?: number;
  severity?: 'Critical' | 'High' | 'Medium' | 'Low';
  impact_radius_km?: number;
  note?: string;
  is_predicted?: boolean;
  stage?: string;
}

/** Year KPIs; comparison fields are null when the previous year has no data. */
export interface AnalyticsSummary {
  year: string;
  comparison_year: string;
  total_incidents: number;
  total_resolved: number;
  resolution_rate: number | null;
  total_affected_reported: number;
  /** mean minutes from incident occurrence to first team assigned */
  avg_response_time_min: number | null;
  response_samples: number;
  incident_trend_pct: number | null;
  resolution_rate_improvement_pct: number | null;
  response_time_delta_min: number | null;
}

export interface AdminRoleOption {
  role: UserRole;
  label: string;
  badge: string;
  email: string;
  name: string;
  description: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'high' | 'warning' | 'info' | 'success';
  category?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}
