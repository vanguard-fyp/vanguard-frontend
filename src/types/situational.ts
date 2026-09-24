import type React from 'react';
import type { Incident, GISLayerState, MapPOI, TriggerAlert, ImpactSnapshot } from './index';

export interface FlyToTarget {
  lat: number;
  lng: number;
  zoom?: number;
  id?: string;
  timestamp?: number;
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

export type SitrepTab = 'dashboard' | 'executive' | 'tactical' | 'operations';

export interface AIInsightDetailViewProps {
  incident: Incident;
  onBack: () => void;
  onSelectPeer?: (incident: Incident) => void;
  allIncidents?: Incident[];
}

export interface DisasterIntelligenceProps {
  focusIncident?: Incident | null;
  onFocusHandled?: () => void;
}

export interface IntelligenceOverviewProps {
  onSelectInsight: (incident: Incident) => void;
  incidents: Incident[];
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

export interface AIImpactPanelProps {
  incident: Incident;
  rank?: number;
  size?: 'compact' | 'full';
  hideBrief?: boolean;
}

export interface TriggerAlertPanelProps {
  alert: TriggerAlert;
  size?: 'compact' | 'full';
}

export interface Gis3DLayerExplorerProps {
  layers: GISLayerState;
  incidents: Incident[];
  pois: MapPOI[];
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
}