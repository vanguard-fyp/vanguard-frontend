import type React from 'react';
import type { Incident, GISLayerState, MapPOI, TriggerAlert, ImpactSnapshot } from './index';

export interface FlyToTarget {
  lat: number;
  lng: number;
  zoom?: number;
  id?: string;
  timestamp?: number;
  label?: string;
  detail?: string;
}

export type HoverInfo =
  | { x: number; y: number; kind: 'incident'; data: Incident }
  | { x: number; y: number; kind: 'poi'; data: MapPOI }
  | null;

export interface LayerDef {
  key: keyof GISLayerState;
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  activeBg: string;
  activeBorder: string;
  activeDot: string;
}

export interface LayerGroup {
  title: string;
  items: LayerDef[];
}

export type SitrepTab = 'dashboard' | 'operations';

export interface AIInsightDetailViewProps {
  incidentId: string;
  onBack: () => void;
}

export interface DisasterIntelligenceProps {
  focusIncident?: Incident | null;
  onFocusHandled?: () => void;
}

export interface IntelligenceOverviewProps {
  onSelectInsight: (incidentId: string) => void;
}

export interface IncidentDetailViewProps {
  incident: Incident;
  onBack: () => void;
  onVerify: (id: string) => void;
  onTrackInIntelligence?: (incident: Incident) => void;
}

export type CommandTabType = 'verify' | 'deploy' | 'resolve' | 'export';

export interface GdacsHazardDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  matches: (hazardType: string) => boolean;
}

export interface IncidentManagementProps {
  onTrackInIntelligence?: (incident: Incident) => void;
}

export interface TriggerAlertPanelProps {
  alert: TriggerAlert;
  size?: 'compact' | 'full';
}

export interface Gis3DLayerExplorerProps {
  layers: GISLayerState;
  incidents: Incident[];
  pois: MapPOI[];
  /** Places around the searched point; follow the layer filters, not the "near incidents" rule. */
  nearbyPois?: MapPOI[];
  onSelectIncident: (incident: Incident) => void;
  onToggleLayer?: (key: keyof GISLayerState) => void;
}

export interface LayerDefinition {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  badgeColor: string;
  borderColor: string;
  bgGradient: string;
  elevationZ: number;
  description: string;
  type: 'terrain' | 'hydro' | 'infrastructure' | 'sar' | 'hotspots';
}

export interface ImpactTimelineProps {
  timeline: ImpactSnapshot[];
  size?: 'compact' | 'full';
  mode?: 'confirmed-only' | 'predictive';
  /** join the dotted projection to the last confirmed point (only when it starts from that figure) */
  joinPrediction?: boolean;
  /** optional card title override */
  title?: string;
}