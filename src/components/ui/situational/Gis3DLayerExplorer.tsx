import React, { useEffect, useRef, useState } from 'react';
import { animate, stagger } from 'animejs';
import {
  Layers,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RotateCw,
  Compass,
  Building2,
  Radio,
  Waves,
  AlertTriangle,
  Hospital,
  Home,
  Truck
} from 'lucide-react';
import type { Incident, MapPOI, GISLayerState } from '../../../types';

interface Gis3DLayerExplorerProps {
  layers: GISLayerState;
  incidents: Incident[];
  pois: MapPOI[];
  onSelectIncident: (incident: Incident) => void;
  onToggleLayer?: (key: keyof GISLayerState) => void;
}

interface LayerDefinition {
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

const LAYER_CONFIGS: LayerDefinition[] = [
  {
    id: 'terrain',
    name: 'Topographical Base & DEM',
    category: 'Elevation Model',
    icon: <Compass className="w-4 h-4 text-emerald-400" />,
    color: '#10b981',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    borderColor: 'border-emerald-500/40',
    bgGradient: 'from-emerald-950/40 via-slate-900/80 to-slate-950/90',
    elevationZ: 0,
    description: 'Digital Elevation Model (DEM), contour elevations, river catchments & soil saturation',
    type: 'terrain',
  },
  {
    id: 'hydro',
    name: 'Doppler Radar & Flood Inundation',
    category: 'Hydro-Meteorology',
    icon: <Waves className="w-4 h-4 text-cyan-400" />,
    color: '#06b6d4',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    borderColor: 'border-cyan-500/40',
    bgGradient: 'from-cyan-950/40 via-slate-900/80 to-blue-950/90',
    elevationZ: 85,
    description: 'Live rainfall intensity, river overflow buffers, danger level telemetry & flood extent',
    type: 'hydro',
  },
  {
    id: 'infrastructure',
    name: 'Critical Lifelines & Facilities',
    category: 'Assets & Facilities',
    icon: <Building2 className="w-4 h-4 text-amber-400" />,
    color: '#f59e0b',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderColor: 'border-amber-500/40',
    bgGradient: 'from-amber-950/40 via-slate-900/80 to-slate-950/90',
    elevationZ: 170,
    description: 'Hospitals, emergency relief centers, primary substations, cellular nodes & bridges',
    type: 'infrastructure',
  },
  {
    id: 'sar',
    name: 'Tactical SAR & Drone Vectors',
    category: 'Operations Fleet',
    icon: <Radio className="w-4 h-4 text-blue-400" />,
    color: '#3b82f6',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    borderColor: 'border-blue-500/40',
    bgGradient: 'from-blue-950/40 via-slate-900/80 to-indigo-950/90',
    elevationZ: 255,
    description: 'SMART teams, APM watercraft, aerial surveillance tracks, and rescue convoys',
    type: 'sar',
  },
  {
    id: 'hotspots',
    name: 'Active Incidents & Casualty Nodes',
    category: 'Disaster Hotspots',
    icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
    color: '#f43f5e',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    borderColor: 'border-rose-500/50',
    bgGradient: 'from-rose-950/40 via-slate-900/80 to-slate-950/90',
    elevationZ: 340,
    description: 'Real-time verified hazard reports, river danger marks, critical evacuation alerts',
    type: 'hotspots',
  },
];

export const Gis3DLayerExplorer: React.FC<Gis3DLayerExplorerProps> = ({
  layers: _layers,
  incidents,
  pois,
  onSelectIncident,
}) => {
  const [isExploded, setIsExploded] = useState(true);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [cameraAngle, setCameraAngle] = useState<'isometric' | 'topdown' | 'side'>('isometric');
  const [hoveredNode, setHoveredNode] = useState<{ id: string; title: string; subtitle: string; severity?: string; casualties?: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // ── Anime.js: Initial Stack Projection & Explode Animation ──
  useEffect(() => {
    if (!stackRef.current) return;

    let rx = 58;
    let rz = -28;
    let ry = 0;
    let scale = 1;

    if (cameraAngle === 'topdown') {
      rx = 10;
      rz = 0;
      ry = 0;
      scale = 0.95;
    } else if (cameraAngle === 'side') {
      rx = 78;
      rz = -45;
      ry = -10;
      scale = 1.05;
    }

    // Camera tilt transition using Anime.js
    animate(stackRef.current, {
      rotateX: rx,
      rotateZ: rz,
      rotateY: ry,
      scale: scale,
      duration: 1000,
      ease: 'outElastic(1, .8)',
    });

    // Animate each layer plane along the Z-axis
    LAYER_CONFIGS.forEach((layerDef, index) => {
      const el = layerRefs.current[layerDef.id];
      if (!el) return;

      let targetZ = isExploded ? layerDef.elevationZ : index * 18;
      let targetOpacity = 1;
      let targetScale = 1;

      // Layer isolation logic
      if (selectedLayerId) {
        if (selectedLayerId === layerDef.id) {
          targetZ = 180;
          targetOpacity = 1;
          targetScale = 1.08;
        } else {
          targetOpacity = 0.15;
          targetScale = 0.92;
        }
      }

      animate(el, {
        translateZ: targetZ,
        opacity: targetOpacity,
        scale: targetScale,
        duration: 900,
        delay: index * 60,
        ease: 'outQuint',
      });
    });
  }, [isExploded, selectedLayerId, cameraAngle]);

  // ── Anime.js: Continuous Pulsing Rings & Radar Sweep ──
  useEffect(() => {
    const pulseAnim = animate('.gis-pulse-node', {
      scale: [1, 2.2],
      opacity: [0.9, 0],
      duration: 2000,
      loop: true,
      ease: 'outQuad',
      delay: stagger(300),
    });

    const radarAnim = animate('.gis-radar-line', {
      rotate: '1turn',
      duration: 5000,
      loop: true,
      ease: 'linear',
    });

    return () => {
      pulseAnim.pause();
      radarAnim.pause();
    };
  }, []);

  const handleToggleExplode = () => {
    setIsExploded(!isExploded);
    setSelectedLayerId(null);
  };

  const handleLayerClick = (layerId: string) => {
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    } else {
      setSelectedLayerId(layerId);
    }
  };

  const activeIncidents = incidents.filter(i => i.status !== 'Resolved');

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[620px] bg-slate-950 overflow-hidden rounded-b-xl border border-slate-800 select-none flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #0c1527 0%, #030712 100%)',
      }}
    >
      {/* ── Background Cyber Ambient Grid ── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b22_1px,transparent_1px),linear-gradient(to_bottom,#1e293b22_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#030712_90%)] pointer-events-none" />

      {/* ── Top Floating HUD: Telemetry & Controls ── */}
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: GIS Title & Live Engine Badge */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded-xl shadow-xl pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <Layers className="size-4 text-cyan-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-white uppercase">3D GIS Layer Explorer</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                Anime.js Engine
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Interactive Multi-Plane Holographic Projection</p>
          </div>
        </div>

        {/* Right: Camera Angle & Stack Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-xl shadow-xl">
          {/* Camera View Switcher */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setCameraAngle('isometric')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                cameraAngle === 'isometric'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Isometric 3D Perspective"
            >
              Isometric
            </button>
            <button
              onClick={() => setCameraAngle('topdown')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                cameraAngle === 'topdown'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Top-Down Orthogonal Perspective"
            >
              Planar
            </button>
            <button
              onClick={() => setCameraAngle('side')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                cameraAngle === 'side'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Elevated Profile View"
            >
              Profile
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Explode / Collapse Toggle Button */}
          <button
            onClick={handleToggleExplode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              isExploded
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isExploded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isExploded ? 'Collapse Stack' : 'Explode 3D Stack'}</span>
          </button>

          {/* Reset Selection */}
          {selectedLayerId && (
            <button
              onClick={() => setSelectedLayerId(null)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors"
            >
              <RotateCw size={12} /> Show All Layers
            </button>
          )}
        </div>
      </div>

      {/* ── 3D Viewport with Perspective & Anime.js Stack ── */}
      <div className="relative w-full max-w-2xl h-[460px] flex items-center justify-center [perspective:1400px]">
        <div
          ref={stackRef}
          className="relative w-[360px] h-[360px] [transform-style:preserve-3d] transition-transform"
        >
          {/* ── LAYER 0: Terrain DEM Base Plane ── */}
          <div
            ref={el => { layerRefs.current['terrain'] = el; }}
            onClick={() => handleLayerClick('terrain')}
            className={`absolute inset-0 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-tr from-emerald-950/60 via-slate-900/90 to-slate-950/90 backdrop-blur-[4px] shadow-[0_0_50px_rgba(16,185,129,0.15)] cursor-pointer transition-all duration-300 ${
              selectedLayerId === 'terrain' ? 'ring-2 ring-emerald-400' : ''
            }`}
          >
            {/* Terrain gridlines & topographic contours */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b98133_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-70" />
            <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" viewBox="0 0 100 100">
              <path d="M 10 90 Q 30 40 50 60 T 90 20" fill="none" stroke="#10b981" strokeWidth="0.8" strokeDasharray="2 2" />
              <path d="M 20 80 Q 45 30 70 50 T 95 30" fill="none" stroke="#10b981" strokeWidth="0.5" />
              <path d="M 5 60 Q 40 70 65 30 T 95 70" fill="none" stroke="#34d399" strokeWidth="0.5" />
            </svg>

            {/* Elevation Base Label */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/90 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-400">
              <Compass size={12} />
              <span>TERRAIN DEM BASE (0m - 1450m)</span>
            </div>
          </div>

          {/* ── LAYER 1: Hydro & Flood Inundation Plane ── */}
          <div
            ref={el => { layerRefs.current['hydro'] = el; }}
            onClick={() => handleLayerClick('hydro')}
            className={`absolute inset-0 rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-tr from-cyan-950/50 via-slate-900/80 to-blue-950/80 backdrop-blur-[3px] shadow-[0_0_50px_rgba(6,182,212,0.15)] cursor-pointer transition-all duration-300 ${
              selectedLayerId === 'hydro' ? 'ring-2 ring-cyan-400' : ''
            }`}
          >
            {/* Animated Doppler Radar Sweeper */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-56 rounded-full border border-cyan-500/30">
                <div className="absolute inset-0 rounded-full border border-cyan-500/20 scale-75" />
                <div className="absolute inset-0 rounded-full border border-cyan-500/10 scale-50" />
                {/* Rotating Scan line */}
                <div className="gis-radar-line absolute top-1/2 left-1/2 w-28 h-[2px] origin-left bg-gradient-to-r from-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee]" />
              </div>
            </div>

            {/* Inundation Zones */}
            <div className="absolute top-[30%] left-[25%] w-24 h-16 rounded-full bg-cyan-500/20 blur-sm border border-cyan-400/40 animate-pulse" />
            <div className="absolute top-[55%] left-[58%] w-28 h-20 rounded-full bg-blue-500/20 blur-sm border border-blue-400/40" />

            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/90 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300">
              <Waves size={12} />
              <span>DOPPLER HYDRO-RADAR (124.5mm/h)</span>
            </div>
          </div>

          {/* ── LAYER 2: Infrastructure & Facilities Plane ── */}
          <div
            ref={el => { layerRefs.current['infrastructure'] = el; }}
            onClick={() => handleLayerClick('infrastructure')}
            className={`absolute inset-0 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-tr from-amber-950/40 via-slate-900/80 to-slate-950/80 backdrop-blur-[3px] shadow-[0_0_50px_rgba(245,158,11,0.15)] cursor-pointer transition-all duration-300 ${
              selectedLayerId === 'infrastructure' ? 'ring-2 ring-amber-400' : ''
            }`}
          >
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f59e0b11_1px,transparent_1px),linear-gradient(to_bottom,#f59e0b11_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />

            {/* Infrastructure POI markers */}
            {pois.slice(0, 6).map((poi, idx) => {
              const xPos = 20 + ((idx * 27) % 65);
              const yPos = 25 + ((idx * 33) % 55);
              return (
                <div
                  key={poi.id}
                  style={{ left: `${xPos}%`, top: `${yPos}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group/poi z-20 cursor-pointer"
                  onMouseEnter={() =>
                    setHoveredNode({
                      id: poi.id,
                      title: poi.name,
                      subtitle: `${poi.category} · ${poi.status}`,
                    })
                  }
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <div className="w-4 h-4 rounded-md bg-amber-500/30 border border-amber-400 flex items-center justify-center text-white shadow-md hover:scale-125 transition-transform">
                    {poi.category === 'Hospital' ? (
                      <Hospital size={10} className="text-pink-300" />
                    ) : poi.category === 'Shelter' ? (
                      <Home size={10} className="text-emerald-300" />
                    ) : (
                      <Building2 size={10} className="text-amber-300" />
                    )}
                  </div>
                </div>
              );
            })}

            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/90 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300">
              <Building2 size={12} />
              <span>CRITICAL LIFELINES (48 ASSETS)</span>
            </div>
          </div>

          {/* ── LAYER 3: Tactical SAR & Drone Vectors Plane ── */}
          <div
            ref={el => { layerRefs.current['sar'] = el; }}
            onClick={() => handleLayerClick('sar')}
            className={`absolute inset-0 rounded-3xl border-2 border-blue-500/40 bg-gradient-to-tr from-blue-950/40 via-slate-900/80 to-indigo-950/80 backdrop-blur-[3px] shadow-[0_0_50px_rgba(59,130,246,0.15)] cursor-pointer transition-all duration-300 ${
              selectedLayerId === 'sar' ? 'ring-2 ring-blue-400' : ''
            }`}
          >
            {/* Squad path lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
              <line x1="30" y1="40" x2="60" y2="70" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="70" y1="20" x2="45" y2="55" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 3" />
            </svg>

            {/* Tactical SAR Squad Pins */}
            <div
              style={{ left: '42%', top: '48%' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group/sar"
              onMouseEnter={() =>
                setHoveredNode({
                  id: 'sar-1',
                  title: 'SMART Squad Alpha',
                  subtitle: 'Boat Infiltration · 12 Responders Deployed',
                })
              }
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white shadow-lg hover:scale-125 transition-transform">
                <Radio size={10} />
              </div>
            </div>

            <div
              style={{ left: '68%', top: '28%' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group/sar"
              onMouseEnter={() =>
                setHoveredNode({
                  id: 'sar-2',
                  title: 'APM Bravo Flood Squad',
                  subtitle: 'Evacuation Convoy · 4 High-water Trucks',
                })
              }
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className="w-5 h-5 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center text-white shadow-lg hover:scale-125 transition-transform">
                <Truck size={10} />
              </div>
            </div>

            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/90 border border-blue-500/40 text-[10px] font-mono font-bold text-blue-300">
              <Radio size={12} />
              <span>SAR TACTICAL ASSETS (14 UNITS)</span>
            </div>
          </div>

          {/* ── LAYER 4: Active Incidents & Casualty Nodes Plane ── */}
          <div
            ref={el => { layerRefs.current['hotspots'] = el; }}
            onClick={() => handleLayerClick('hotspots')}
            className={`absolute inset-0 rounded-3xl border-2 border-rose-500/50 bg-gradient-to-tr from-rose-950/40 via-slate-900/80 to-slate-950/80 backdrop-blur-[3px] shadow-[0_0_50px_rgba(244,63,94,0.2)] cursor-pointer transition-all duration-300 ${
              selectedLayerId === 'hotspots' ? 'ring-2 ring-rose-400' : ''
            }`}
          >
            {/* Incident Pins with Pulse Wave and Click trigger to SITREP */}
            {activeIncidents.slice(0, 5).map((inc, idx) => {
              const xPos = 25 + ((idx * 31) % 55);
              const yPos = 30 + ((idx * 29) % 50);
              const isCrit = inc.severity === 'Critical';

              return (
                <div
                  key={inc.id}
                  style={{ left: `${xPos}%`, top: `${yPos}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group/node cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectIncident(inc);
                  }}
                  onMouseEnter={() =>
                    setHoveredNode({
                      id: inc.id,
                      title: inc.title,
                      subtitle: `${inc.location}, ${inc.state} · Click for SITREP`,
                      severity: inc.severity,
                      casualties: inc.affectedPopulation,
                    })
                  }
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Anime.js Target Pulse Wave */}
                  <div
                    className={`gis-pulse-node absolute -inset-2 rounded-full ${
                      isCrit ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                  />

                  {/* Vertical Light Pillar */}
                  <div className="absolute bottom-1/2 left-1/2 w-[1px] h-20 bg-gradient-to-t from-rose-500 to-transparent -translate-x-1/2 pointer-events-none" />

                  {/* Node Badge */}
                  <div
                    className={`relative w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-130 ${
                      isCrit ? 'bg-rose-600 shadow-rose-500/50' : 'bg-amber-600 shadow-amber-500/50'
                    }`}
                  >
                    <AlertTriangle size={12} className="animate-bounce" />
                  </div>
                </div>
              );
            })}

            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/90 border border-rose-500/50 text-[10px] font-mono font-bold text-rose-300">
              <AlertTriangle size={12} />
              <span>ACTIVE HAZARDS & SITREPS ({activeIncidents.length} LIVE)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hover Tooltip Card ── */}
      {hoveredNode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl px-4 py-2.5 shadow-2xl min-w-[240px] pointer-events-none text-center">
          <p className="text-xs font-bold text-white">{hoveredNode.title}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{hoveredNode.subtitle}</p>
          {hoveredNode.severity && (
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span
                className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded text-white ${
                  hoveredNode.severity === 'Critical' ? 'bg-red-600' : 'bg-amber-600'
                }`}
              >
                {hoveredNode.severity}
              </span>
              {hoveredNode.casualties !== undefined && (
                <span className="text-[9px] text-slate-300 font-mono font-bold">
                  {hoveredNode.casualties.toLocaleString()} affected
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Bottom Layer Selection Pills ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl shadow-2xl max-w-[95%] overflow-x-auto">
        {LAYER_CONFIGS.map((layerDef) => {
          const isSelected = selectedLayerId === layerDef.id;
          return (
            <button
              key={layerDef.id}
              onClick={() => handleLayerClick(layerDef.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-slate-800 text-white border border-slate-600 shadow-md ring-1 ring-cyan-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {layerDef.icon}
              <span>{layerDef.name}</span>
              {isSelected ? (
                <Eye size={13} className="text-cyan-400 ml-0.5" />
              ) : (
                <EyeOff size={13} className="text-slate-600 ml-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Gis3DLayerExplorer;
