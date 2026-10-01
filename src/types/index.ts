export * from './navigation';
export * from './communication';
export * from './rescue';
export * from './resource';
export * from './situational';
export * from './system';

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

export type DisasterType = 'Flood' | 'Landslide' | 'Flash Flood' | 'Forest Fire' | 'Severe Storm';

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

export interface AIRecommendation {
  id: string;
  entity_type: 'team' | 'resource' | 'incident';
  entity_id: string;
  action_text: string;
  rationale: string;
  confidence: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  stream_status: 'pending' | 'streaming' | 'complete' | 'error';
  model_used: string;
  is_streaming: boolean;
  generated_at: string;
  completed_at?: string;
  is_active: boolean;
}

export interface Incident {
  id: string;
  display_id: string;
  title: string;
  type: DisasterType;
  location: string;
  state: string;
  district: string;
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
  weather_condition: string;
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
  ai_priority_score: number;
  outcome_notes?: string;
  trigger_alert?: TriggerAlert;
  impact_timeline?: ImpactSnapshot[];
  action_log?: IncidentLog[];
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
}

export interface CopilotChatResponse {
  reply: string;
  timestamp: string;
  role: string;
  suggestions: string[];
  activeIncidentsCount: number;
  criticalCount: number;
  unreadAlertsCount: number;
}

export interface GISLayerState {
  disasterHotspots: boolean;
  floodAreas: boolean;
  landslideAreas: boolean;
  fireZones: boolean;
  emergencyShelters: boolean;
  hospitals: boolean;
  evacuationSchools: boolean;
  utilityElectricity: boolean;
  utilityWater: boolean;
  utilityTelecom: boolean;
  trafficConditions: boolean;
  roadAccessibility: boolean;
  rescueTeamLocations: boolean;
}

export interface MapPOI {
  id: string;
  name: string;
  category: 'Shelter' | 'Hospital' | 'School' | 'Utility' | 'Rescue Team' | 'Road Closure' | 'Warehouse' | 'Depot';
  coordinates: [number, number];
  capacity?: { current: number; max: number };
  details: string;
  contact?: string;
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
}

export interface Mission {
  id: string;
  display_id: string;
  title: string;
  incident_id: string;
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
export interface KpiTrends {
  incidents: number[];
  population: number[];
  teams: number[];
  missions: number[];
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

export interface AnalyticsSummary {
  total_incidents: number;
  total_resolved: number;
  resolution_rate: number;
  total_evacuated: number;
  avg_response_time_min: number;
  incident_trend_pct: number;
  resolution_rate_improvement_pct: number;
  response_time_delta_min: number;
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
