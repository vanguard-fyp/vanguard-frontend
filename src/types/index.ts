export * from './navigation';
export * from './communication';
export * from './rescue';
export * from './resource';
export * from './situational';
export * from './system';

export type UserRole =
  | 'Disaster Management Officer'
  | 'Rescue Coordinator'
  | 'Resource Manager'
  | 'Government Administrator';

export const USER_ROLES: UserRole[] = [
  'Disaster Management Officer',
  'Rescue Coordinator',
  'Resource Manager',
  'Government Administrator',
];

export type DisasterType = 'Flood' | 'Landslide' | 'Flash Flood' | 'Forest Fire' | 'Severe Storm';

export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type DisasterLevel = 'Level 1: District' | 'Level 2: State' | 'Level 3: Federal';

export interface IncidentLog {
  id: string;
  incidentId: string;
  actor: string;
  action: string;
  detail?: string;
  loggedAt: string;
}

export interface CityItem {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
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
  displayId?: string;
  title: string;
  type: DisasterType;
  location: string;
  state: string;
  district: string;
  coordinates: [number, number];
  severity: SeverityLevel;
  disasterLevel: DisasterLevel;
  timestamp: string;
  source: 'Citizen Report' | 'JPS Water Sensor' | 'MetMalaysia Radar' | 'APM Patrol';
  status: 'Unverified' | 'Verified' | 'Responding' | 'Resolved' | 'Rejected';
  affectedPopulation: number;
  casualtiesCount: number;
  infrastructureDamage: 'Severe' | 'Moderate' | 'Minor' | 'None';
  accessibilityScore: number; // 0 - 100
  weatherCondition: string;
  description: string;
  reporterContact?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  aiPriorityScore: number; // Computed score 0 - 100
  triggerAlert?: TriggerAlert;
  impactTimeline?: ImpactSnapshot[];
  actionLog?: IncidentLog[];
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
  category: 'Shelter' | 'Hospital' | 'School' | 'Utility' | 'Rescue Team' | 'Road Closure';
  coordinates: [number, number];
  status: 'Operational' | 'Near Capacity' | 'Full' | 'Damaged' | 'Active';
  capacity?: { current: number; max: number };
  details: string;
  contact?: string;
}

export interface RescueTeam {
  id: string;
  displayId?: string;
  name: string;
  agency: 'SMART' | 'BOMBA' | 'APM' | 'PDRM' | 'ATM';
  personnelCount: number;
  vehicles: string[];
  currentLocation: string;
  coordinates: [number, number];
  status: 'Available' | 'Deployed' | 'En Route' | 'Off Duty';
  assignedIncidentId?: string;
  contactNumber: string;
  commander: string;
}

export interface Mission {
  id: string;
  displayId?: string;
  title: string;
  incidentId: string;
  incidentLocation: string;
  assignedTeamId: string;
  teamName: string;
  agency: string;
  priority: SeverityLevel;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Aborted';
  assignedTime: string;
  estimatedCompletion: string;
  objective: string;
}

export interface ResourceItem {
  id: string;
  displayId?: string;
  name: string;
  category: 'Food' | 'Medical supplies' | 'Rescue equipment' | 'Vehicles' | 'Emergency supplies';
  unit: string;
  stockLevel: number;
  minThreshold: number;
  warehouseLocation: string;
  status: 'Sufficient' | 'Low Stock' | 'Critical';
}

export interface ResourceRequest {
  id: string;
  displayId?: string;
  requestId: string;
  requestorName: string;
  agency: string;
  district: string;
  resourceCategory: string;
  itemRequested: string;
  quantityRequested: number;
  unit: string;
  urgency: SeverityLevel;
  status: 'Pending Approval' | 'Approved' | 'Rejected' | 'Dispatched' | 'Delivered' | 'Fulfilled';
  timestamp: string;
  justification: string;
  approvedBy?: string;
}

export interface PublicAnnouncement {
  id: string;
  displayId?: string;
  title: string;
  category: 'Emergency Alert' | 'Evacuation Order' | 'Safety Announcement';
  targetState: string;
  targetDistricts: string[];
  severity: SeverityLevel;
  content: string;
  channels: ('SMS Broadcast' | 'MyJPJ App' | 'NADMA Portal' | 'TV/Radio Alert')[];
  issuedBy: string;
  timestamp: string;
  active: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  agency: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastActive: string;
}

/* ─── Network Topology ─────────────────────────────────────── */
export type TopoNodeType = 'hub' | 'incident' | 'team' | 'mission';
export type TopoEdgeType = 'command' | 'assignment' | 'mission' | 'response';

export interface TopoNode {
  id: string;
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
  recordedAt: string;
}

export interface TriggerAlert {
  id: string;
  source: TriggerSource;
  readings: MetrologyReading[];
  predictedProbability: number; // 0-100
  predictedOnset: string;
  triggeredAt: string;
}

export interface ImpactSnapshot {
  timestamp: string;
  affectedPopulation: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  impactRadiusKm: number;
  note?: string;
}

export interface AnalyticsSummary {
  totalIncidents: number;
  totalResolved: number;
  resolutionRate: number;
  totalEvacuated: number;
  avgResponseTimeMin: number;
  incidentTrendPct: number;
  resolutionRateImprovementPct: number;
  responseTimeDeltaMin: number;
}

