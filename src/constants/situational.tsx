import React from 'react';
import { Activity, CheckCircle2, Clock, LayoutDashboard, Radio, AlertTriangle, Home, Zap, CheckCircle, XCircle, Droplets, Flame, Mountain, CircleDot, CloudRain, Sun, Waves, Wind } from 'lucide-react';
import type { GdacsHazardDef, GISLayerState, SitrepTab } from '../types';

export const DARK_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm-layer', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 }],
};

export const TOPOLOGY_PLANES = [
  {
    id: 'disasterHotspots' as keyof GISLayerState,
    title: 'Hazards & Active Incident Matrix',
    subtitle: 'Incident priority vectors, affected zones & hazard perimeters',
    category: 'Hazards',
    accentColor: '#ef4444',
    badgeText: 'Live Hazard Grid',
    subtext: 'Active incidents at their reported coordinates.',
    color: 'bg-red-500',
    borderColor: 'border-red-500/50',
    bgGradient: 'from-red-500/10 via-red-900/5 to-transparent',
    icon: <AlertTriangle className="size-4 text-red-500" />,
  },
  {
    id: 'emergencyShelters' as keyof GISLayerState,
    title: 'Facilities & Logistics Depots',
    subtitle: 'Shelters, hospitals, clinics, fire and police stations, depots',
    category: 'Assets',
    accentColor: '#3b82f6',
    badgeText: 'Asset Fleet Net',
    subtext: 'Facilities from OpenStreetMap and backend GIS layers, plus Vanguard warehouses.',
    color: 'bg-emerald-400',
    borderColor: 'border-emerald-500/50',
    bgGradient: 'from-emerald-500/10 via-emerald-900/5 to-transparent',
    icon: <Home className="size-4 text-emerald-400" />,
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
  { id: 'dashboard', label: 'Tactical SITREP', icon: <LayoutDashboard size={14} /> },
  { id: 'operations', label: 'Live Ops Feed', icon: <Radio size={14} /> },
];

export const tabs = ['Map', 'Intelligence Overview'] as const;

export const defaultLayers: GISLayerState = {
  disasterHotspots: true,
  floodAreas: true,
  landslideAreas: true,
  fireZones: false,
  severeStorms: false,
  earthquakeDrought: false,
  emergencyShelters: true,
  hospitals: true,
  clinics: true,
  fireStations: true,
  policeStations: true,
  evacuationSchools: true,
  jkmReliefCentres: false,
  rescueTeamLocations: true,
};

export const MINIMAL_STATUS_FILTERS = [
  { id: 'active', label: 'Active Incidents' },
  { id: 'all', label: 'All Tracked' },
  { id: 'resolved', label: 'Resolved / Archived' },
] as const;

export const statusIcons: Record<string, React.ReactNode> = {
  Unverified: <Clock size={14} className="text-amber-600" />,
  Verified: <CheckCircle size={14} className="text-blue-600" />,
  Responding: <Radio size={14} className="text-orange-600 animate-pulse" />,
  Resolved: <CheckCircle size={14} className="text-emerald-600" />,
  Rejected: <XCircle size={14} className="text-rose-500" />,
};

export const typeIcons: Record<string, React.ReactNode> = {
  Flood: <Droplets size={16} className="text-blue-600" />,
  'Flash Flood': <Droplets size={16} className="text-cyan-600" />,
  Landslide: <Mountain size={16} className="text-amber-600" />,
  'Forest Fire': <Flame size={16} className="text-red-600" />,
  'Severe Storm': <Activity size={16} className="text-purple-600" />,
  'Haze': <Wind size={16} className="text-indigo-600" />,
  'Earthquake': <CircleDot size={16} className="text-rose-600" />,
  'Drought': <Sun size={16} className="text-orange-500" />,
  'Other': <Zap size={16} className="text-amber-400" />,
};

export const GDACS_HAZARD_DEFS: GdacsHazardDef[] = [
  {
    id: 'Tropical Cyclone',
    label: 'Cyclone',
    icon: <Wind size={14} className="text-purple-600" />,
    matches: (h) => /cyclone|typhoon|hurricane/i.test(h),
  },
  {
    id: 'Earthquake',
    label: 'Earthquake',
    icon: <CircleDot size={14} className="text-rose-600" />,
    matches: (h) => /earthquake|seismic/i.test(h),
  },
  {
    id: 'Flood',
    label: 'Flood',
    icon: <Droplets size={14} className="text-blue-600" />,
    matches: (h) => /flood/i.test(h),
  },
  {
    id: 'Volcanic Eruption',
    label: 'Volcanic',
    icon: <Mountain size={14} className="text-amber-700" />,
    matches: (h) => /volcan/i.test(h),
  },
  {
    id: 'Forest Fire / Wildfire',
    label: 'Wildfire',
    icon: <Flame size={14} className="text-red-600" />,
    matches: (h) => /fire|wildfire|peatland/i.test(h),
  },
  {
    id: 'Tsunami',
    label: 'Tsunami',
    icon: <Waves size={14} className="text-cyan-600" />,
    matches: (h) => /tsunami/i.test(h),
  },
  {
    id: 'Drought',
    label: 'Drought',
    icon: <Sun size={14} className="text-orange-500" />,
    matches: (h) => /drought/i.test(h),
  },
  {
    id: 'Storm Surge',
    label: 'Storm',
    icon: <CloudRain size={14} className="text-indigo-600" />,
    matches: (h) => /storm|surge/i.test(h),
  },
  {
    id: 'Landslide',
    label: 'Landslide',
    icon: <Mountain size={14} className="text-stone-600" />,
    matches: (h) => /landslide|mudslide/i.test(h),
  },
];

export const SEVERITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};