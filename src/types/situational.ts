import type React from 'react';
import type { Incident, GISLayerState, MapPOI } from './index';

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
