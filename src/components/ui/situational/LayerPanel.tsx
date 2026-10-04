import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  AlertTriangle,
  Droplets,
  Mountain,
  Flame,
  CloudRain,
  CircleDot,
  Home,
  Hospital,
  Stethoscope,
  Shield,
  GraduationCap,
  Zap,
  Wifi,
  RouteOff,
  ShieldCheck,
  RotateCcw,
  CheckSquare,
  X,
} from 'lucide-react';
import type { GISLayerState, LayerGroup } from '../../../types';

const groups: LayerGroup[] = [
  {
    title: 'Natural Hazards & Risks',
    items: [
      { key: 'disasterHotspots', label: 'Active Incidents', icon: <AlertTriangle size={15} />, iconColor: 'text-red-600', activeBg: 'bg-red-50/80', activeBorder: 'border-red-200', activeDot: 'bg-red-500' },
      { key: 'floodAreas', label: 'Flood & Flash Flood', icon: <Droplets size={15} />, iconColor: 'text-blue-600', activeBg: 'bg-blue-50/80', activeBorder: 'border-blue-200', activeDot: 'bg-blue-500' },
      { key: 'landslideAreas', label: 'Landslide Threats', icon: <Mountain size={15} />, iconColor: 'text-amber-600', activeBg: 'bg-amber-50/80', activeBorder: 'border-amber-200', activeDot: 'bg-amber-500' },
      { key: 'fireZones', label: 'Forest Fire / Hotspots', icon: <Flame size={15} />, iconColor: 'text-orange-600', activeBg: 'bg-orange-50/80', activeBorder: 'border-orange-200', activeDot: 'bg-orange-500' },
      { key: 'severeStorms', label: 'Severe Storm & Haze', icon: <CloudRain size={15} />, iconColor: 'text-indigo-600', activeBg: 'bg-indigo-50/80', activeBorder: 'border-indigo-200', activeDot: 'bg-indigo-500' },
      { key: 'earthquakeDrought', label: 'Earthquake & Drought', icon: <CircleDot size={15} />, iconColor: 'text-rose-600', activeBg: 'bg-rose-50/80', activeBorder: 'border-rose-200', activeDot: 'bg-rose-500' },
    ],
  },
  {
    title: 'Emergency Facilities & Shelters',
    items: [
      { key: 'emergencyShelters', label: 'Evac Shelters (PPS)', icon: <Home size={15} />, iconColor: 'text-emerald-600', activeBg: 'bg-emerald-50/80', activeBorder: 'border-emerald-200', activeDot: 'bg-emerald-500' },
      { key: 'hospitals', label: 'Hospitals & Medical', icon: <Hospital size={15} />, iconColor: 'text-pink-600', activeBg: 'bg-pink-50/80', activeBorder: 'border-pink-200', activeDot: 'bg-pink-500' },
      { key: 'clinics', label: 'Clinics & Dispensaries', icon: <Stethoscope size={15} />, iconColor: 'text-teal-600', activeBg: 'bg-teal-50/80', activeBorder: 'border-teal-200', activeDot: 'bg-teal-500' },
      { key: 'fireStations', label: 'Fire Stations (Bomba)', icon: <Flame size={15} />, iconColor: 'text-red-500', activeBg: 'bg-red-50/80', activeBorder: 'border-red-200', activeDot: 'bg-red-500' },
      { key: 'policeStations', label: 'Police Stations (PDRM)', icon: <Shield size={15} />, iconColor: 'text-sky-700', activeBg: 'bg-sky-50/80', activeBorder: 'border-sky-200', activeDot: 'bg-sky-600' },
      { key: 'evacuationSchools', label: 'Schools & Halls', icon: <GraduationCap size={15} />, iconColor: 'text-purple-600', activeBg: 'bg-purple-50/80', activeBorder: 'border-purple-200', activeDot: 'bg-purple-500' },
      { key: 'rescueTeamLocations', label: 'Rescue Squads & Hubs', icon: <ShieldCheck size={15} />, iconColor: 'text-blue-700', activeBg: 'bg-blue-50/80', activeBorder: 'border-blue-200', activeDot: 'bg-blue-600' },
    ],
  },
  {
    title: 'Critical Infrastructure & Utilities',
    items: [
      { key: 'utilityElectricity', label: 'Electricity Grid', icon: <Zap size={15} />, iconColor: 'text-amber-500', activeBg: 'bg-amber-50/80', activeBorder: 'border-amber-200', activeDot: 'bg-amber-400' },
      { key: 'utilityWater', label: 'Water Network', icon: <Droplets size={15} />, iconColor: 'text-cyan-600', activeBg: 'bg-cyan-50/80', activeBorder: 'border-cyan-200', activeDot: 'bg-cyan-500' },
      { key: 'utilityTelecom', label: 'Telecom Towers', icon: <Wifi size={15} />, iconColor: 'text-violet-600', activeBg: 'bg-violet-50/80', activeBorder: 'border-violet-200', activeDot: 'bg-violet-500' },
      { key: 'roadAccessibility', label: 'Road Closures / Access', icon: <RouteOff size={15} />, iconColor: 'text-slate-600', activeBg: 'bg-slate-100', activeBorder: 'border-slate-300', activeDot: 'bg-slate-600' },
    ],
  },
];

interface LayerPanelProps {
  layers: GISLayerState;
  isOpen: boolean;
  onClose: () => void;
  onToggleLayer: (key: keyof GISLayerState) => void;
  onResetLayers?: () => void;
  onSelectAllLayers?: () => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  isOpen,
  onClose,
  onToggleLayer,
  onResetLayers,
  onSelectAllLayers,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const activeCount = Object.values(layers).filter(Boolean).length;
  const totalCount = Object.keys(layers).length;

  // Outside click listener to auto-close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          className="absolute top-14 right-4 z-40 w-96 max-w-[calc(100vw-2.5rem)] bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-blue-600" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                GIS Layer Matrix
              </h3>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                {activeCount}/{totalCount} active
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="p-3.5 space-y-3.5 max-h-[480px] overflow-y-auto">
            {/* Quick preset actions */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</span>
              <div className="flex items-center gap-3">
                {onSelectAllLayers && (
                  <button
                    onClick={onSelectAllLayers}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                  >
                    <CheckSquare size={11} /> Select All
                  </button>
                )}
                {onResetLayers && (
                  <button
                    onClick={onResetLayers}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={11} /> Reset
                  </button>
                )}
              </div>
            </div>

            {/* Layer Groups Grid */}
            {groups.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.title}
                </p>

                <div className="grid grid-cols-2 gap-1.5">
                  {group.items.map((layer) => {
                    const active = !!layers[layer.key];
                    return (
                      <button
                        key={layer.key}
                        onClick={() => onToggleLayer(layer.key)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          active
                            ? `${layer.activeBg} ${layer.activeBorder} shadow-2xs`
                            : 'bg-white border-slate-200 hover:bg-slate-50/80 hover:border-slate-300'
                        }`}
                      >
                        <span className={active ? layer.iconColor : 'text-slate-400'}>
                          {layer.icon}
                        </span>
                        <span
                          className={`text-[11px] font-semibold flex-1 truncate ${
                            active ? 'text-slate-900 font-bold' : 'text-slate-600'
                          }`}
                        >
                          {layer.label}
                        </span>
                        <span
                          className={`size-2 rounded-full shrink-0 ${
                            active ? layer.activeDot : 'bg-slate-200'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};