import React from 'react';
import { Activity, CheckCircle2, Clock, LayoutDashboard, FileText, MapPin, Radio, AlertTriangle, Home, Zap } from 'lucide-react';
import type { GISLayerState, SitrepTab } from '../types';

export const DARK_STYLE = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; CARTO &copy; OpenStreetMap',
    },
  },
  layers: [{ id: 'carto-layer', type: 'raster', source: 'carto', minzoom: 0, maxzoom: 22 }],
};

export const TOPOLOGY_PLANES = [
  {
    id: 'disasterHotspots' as keyof GISLayerState,
    title: 'Hazards & Active Incident Matrix',
    subtitle: 'Incident priority vectors, affected zones & hazard perimeters',
    category: 'Hazards',
    accentColor: '#ef4444',
    badgeText: 'Live Hazard Grid',
    subtext: 'Maps current incident epicenters, severity ratings and risk propagation radiuses across all regions.',
    color: 'bg-red-500',
    borderColor: 'border-red-500/50',
    bgGradient: 'from-red-500/10 via-red-900/5 to-transparent',
    icon: <AlertTriangle className="size-4 text-red-500" />,
    nodes: [
      { label: 'Critical Flood Zone (Sector 4)', x: 35, y: 40 },
      { label: 'Active Landslide Threat', x: 65, y: 25 },
      { label: 'Industrial Fire Risk', x: 50, y: 70 },
    ],
  },
  {
    id: 'emergencyShelters' as keyof GISLayerState,
    title: 'Response Assets & Evac Centers',
    subtitle: 'Rescue teams, supply chain nodes & shelter operational statuses',
    category: 'Assets',
    accentColor: '#3b82f6',
    badgeText: 'Asset Fleet Net',
    subtext: 'Monitors deployed SMART/BOMBA/APM units, logistics hubs, and shelter occupancy capacities.',
    color: 'bg-emerald-400',
    borderColor: 'border-emerald-500/50',
    bgGradient: 'from-emerald-500/10 via-emerald-900/5 to-transparent',
    icon: <Home className="size-4 text-emerald-400" />,
    nodes: [
      { label: 'Primary Evacuation Shelter', x: 25, y: 35 },
      { label: 'Trauma Hospital Alpha', x: 75, y: 45 },
      { label: 'SAR Field Unit Base', x: 45, y: 60 },
    ],
  },
  {
    id: 'utilityElectricity' as keyof GISLayerState,
    title: 'Infrastructure & Power Grid',
    subtitle: 'Telecom towers, power grid nodes, clean water distribution & road connectivity',
    category: 'Infrastructure',
    accentColor: '#10b981',
    badgeText: 'Critical Lifelines',
    subtext: 'Tracks essential infrastructure status: power grid uptime, cellular towers, water plants & open access roads.',
    color: 'bg-amber-400',
    borderColor: 'border-amber-500/50',
    bgGradient: 'from-amber-500/10 via-amber-900/5 to-transparent',
    icon: <Zap className="size-4 text-amber-400" />,
    nodes: [
      { label: 'Main Substation Grid', x: 20, y: 20 },
      { label: 'Telecom Repeater Tower', x: 80, y: 30 },
      { label: 'Primary Bridge Route', x: 55, y: 55 },
    ],
  },
];


export const severityHex: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#22c55e',
};

export const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  Responding: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <Activity size={12} /> },
  Verified: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  Unverified: { color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200', icon: <Clock size={12} /> },
  Resolved: { color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: <CheckCircle2 size={12} /> },
};

export const activityTypeStyle: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  critical: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', label: 'CRITICAL' },
  alert: { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', label: 'ALERT' },
  info: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', label: 'INFO' },
  success: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'SUCCESS' },
};

export const TABS: { id: SitrepTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
  { id: 'executive', label: 'Executive SITREP', icon: <FileText size={14} /> },
  { id: 'tactical', label: 'Tactical View', icon: <MapPin size={14} /> },
  { id: 'operations', label: 'Live Ops Feed', icon: <Radio size={14} /> },
];
