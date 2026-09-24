import React, { useEffect, useRef, useState } from 'react';
import { animate, stagger } from 'animejs';
import {
  Layers,
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
  MoveHorizontal,
} from 'lucide-react';
import type { Gis3DLayerExplorerProps, LayerDefinition } from '../../../types';

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
    elevationZ: 65,
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
    elevationZ: 130,
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
    elevationZ: 195,
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
    elevationZ: 260,
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
  const [hoveredNode, setHoveredNode] = useState<{
    id: string;
    title: string;
    subtitle: string;
    severity?: string;
    casualties?: number;
  } | null>(null);

  // Horizontal Drag / Swipe Rotation state
  const [userRotationZ, setUserRotationZ] = useState(-28);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const baseRotationZRef = useRef(-28);

  const containerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // ── Anime.js: Camera Tilt & Explode Animation ──
  useEffect(() => {
    if (!stackRef.current) return;

    let rx = 56;
    let rz = userRotationZ;
    let ry = 0;
    let scale = 0.85;

    if (cameraAngle === 'topdown') {
      rx = 8;
      rz = 0;
      ry = 0;
      scale = 0.88;
    } else if (cameraAngle === 'side') {
      rx = 76;
      rz = -45;
      ry = -8;
      scale = 0.9;
    }

    animate(stackRef.current, {
      rotateX: rx,
      rotateZ: rz,
      rotateY: ry,
      scale: scale,
      duration: 600,
      ease: 'outQuart',
    });

    // Animate each layer plane along the Z-axis
    LAYER_CONFIGS.forEach((layerDef, index) => {
      const el = layerRefs.current[layerDef.id];
      if (!el) return;

      // When collapsed, present the layers as a crisp stacked "deck" instead of
      // several semi-transparent, blurred planes overlapping (which reads as muddy/blurry).
      // The top-most layer stays fully opaque; the ones beneath step back in Z and fall
      // off in opacity quickly so only their clean edges peek out.
      const depthFromTop = LAYER_CONFIGS.length - 1 - index; // 0 = top card
      const collapsedZ = index * 14; // wider separation → visible stacked edges
      const collapsedOpacity = depthFromTop === 0 ? 1 : Math.max(0.25, 1 - depthFromTop * 0.28);
      const collapsedScale = 1 - depthFromTop * 0.015;

      let targetZ = isExploded ? layerDef.elevationZ : collapsedZ;
      let targetOpacity = isExploded ? 1 : collapsedOpacity;
      let targetScale = isExploded ? 1 : collapsedScale;

      // Layer isolation logic
      if (selectedLayerId) {
        if (selectedLayerId === layerDef.id) {
          targetZ = 140;
          targetOpacity = 1;
          targetScale = 1.05;
        } else {
          targetOpacity = 0.15;
          targetScale = 0.92;
        }
      }

      animate(el, {
        translateZ: targetZ,
        opacity: targetOpacity,
        scale: targetScale,
        duration: 700,
        delay: index * 40,
        ease: 'outQuint',
      });
    });
  }, [isExploded, selectedLayerId, cameraAngle, userRotationZ]);

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

  // ── Mouse / Touch Horizontal Drag Handlers ──
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.interactive-node')) {
      return;
    }
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    baseRotationZRef.current = userRotationZ;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartXRef.current;
    const newZ = baseRotationZRef.current + deltaX * 0.4;
    setUserRotationZ(newZ);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

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

  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected');

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full h-[580px] bg-slate-950 overflow-hidden rounded-b-xl border border-slate-800 select-none flex flex-col items-center justify-center ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #0c1527 0%, #030712 100%)',
      }}
    >
      {/* ── Background Cyber Ambient Grid ── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b22_1px,transparent_1px),linear-gradient(to_bottom,#1e293b22_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#030712_90%)] pointer-events-none" />

      {/* ── Top Floating HUD: Telemetry & Controls ── */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Left: GIS Title & Live Engine Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-xl pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <Layers className="size-4 text-cyan-400" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wider text-white uppercase">3D GIS Layers</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                Anime.js
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Swipe to rotate · Multi-plane stack</p>
          </div>
        </div>

        {/* Right: Camera Angle & Stack Action Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-xl">
          {/* Camera View Switcher */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => {
                setCameraAngle('isometric');
                setUserRotationZ(-28);
              }}
              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                cameraAngle === 'isometric'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Isometric
            </button>
            <button
              onClick={() => {
                setCameraAngle('topdown');
                setUserRotationZ(0);
              }}
              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                cameraAngle === 'topdown'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Planar
            </button>
            <button
              onClick={() => {
                setCameraAngle('side');
                setUserRotationZ(-45);
              }}
              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                cameraAngle === 'side'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Profile
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Explode / Collapse Toggle Button */}
          <button
            onClick={handleToggleExplode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
              isExploded
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isExploded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{isExploded ? 'Collapse' : 'Explode'}</span>
          </button>

          {/* Reset Selection */}
          {selectedLayerId && (
            <button
              onClick={() => setSelectedLayerId(null)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors"
            >
              <RotateCw size={11} /> All
            </button>
          )}
        </div>
      </div>

      {/* ── Drag instruction hint ── */}
      <div className="absolute bottom-3 left-4 z-20 pointer-events-none flex items-center gap-1.5 text-[11px] text-slate-400/80 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
        <MoveHorizontal size={13} className="text-cyan-400 animate-pulse" />
        <span>Drag horizontally to rotate 3D view ({Math.round(userRotationZ)}°)</span>
      </div>

      {/* ── 3D Viewport with Perspective & Anime.js Stack ── */}
      <div className="relative w-full max-w-xl h-[420px] flex items-center justify-center [perspective:1200px] overflow-visible">
        <div
          ref={stackRef}
          className="relative w-[320px] h-[320px] translate-y-25 [transform-style:preserve-3d] transition-transform origin-center"
        >
          {/* ── LAYER 0: Terrain DEM Base Plane ── */}
          <div
            ref={(el) => {
              layerRefs.current['terrain'] = el;
            }}
            onClick={() => handleLayerClick('terrain')}
            className={`absolute inset-0 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-tr from-emerald-950/80 via-slate-900/95 to-slate-950/95 shadow-[0_0_35px_rgba(16,185,129,0.15)] cursor-pointer transition-all duration-300 ${
              selectedLayerId === 'terrain' ? 'ring-2 ring-emerald-400' : ''
            }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(#10b98133_1.5px,transparent_1.5px)] [background-size:18px_18px] opacity-70" />
            <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" viewBox="0 0 100 100">
              <path d="M 10 90 Q 30 40 50 60 T 90 20" fill="none" stroke="#10b981" strokeWidth="0.8" strokeDasharray="2 2" />
              <path d="M 20 80 Q 45 30 70 50 T 95 30" fill="none" stroke="#10b981" strokeWidth="0.5" />
              <path d="M 5 60 Q 40 70 65 30 T 95 70" fill="none" stroke="#34d399" strokeWidth="0.5" />
            </svg>

            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/90 border border-emerald-500/40 text-[9px] font-mono font-bold text-emerald-400">
              <Compass size={11} />
              <span>TERRAIN DEM BASE</span>
            </div>
          </div>

          {/* ── LAYER 1: Hydro & Flood Inundation Plane ── */}
          <div
            ref={(el) => {
              layerRefs.current['hydro'] = el;
            }}
            onClick={() => handleLayerClick('hydro')}
            className={`absolute inset-0 rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-tr from-cyan-950/75 via-slate-900/95 to-blue-950/95 shadow-[0_0_35px_rgba(6,182,212,0.15)] cursor-pointer transition-all duration-300 ${
              selectedLayerId === 'hydro' ? 'ring-2 ring-cyan-400' : ''
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-48 h-48 rounded-full border border-cyan-500/30">
                <div className="absolute inset-0 rounded-full border border-cyan-500/20 scale-75" />
                <div className="gis-radar-line absolute top-1/2 left-1/2 w-24 h-[2px] origin-left bg-gradient-to-r from-cyan-400 to-transparent shadow-[0_0_10px_#22d3ee]" />
              </div>
            </div>

            <div className="absolute top-[30%] left-[25%] w-20 h-14 rounded-full bg-cyan-500/20 blur-xs border border-cyan-400/40 animate-pulse" />
            <div className="absolute top-[55%] left-[58%] w-24 h-16 rounded-full bg-blue-500/20 blur-xs border border-blue-400/40" />

            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/90 border border-cyan-500/40 text-[9px] font-mono font-bold text-cyan-300">
              <Waves size={11} />
              <span>HYDRO RADAR & FLOOD (124mm/h)</span>
            </div>
          </div>

          {/* ── LAYER 2: Infrastructure & Facilities Plane ── */}
          <div
            ref={(el) => {
              layerRefs.current['infrastructure'] = el;
            }}
            onClick={() => handleLayerClick('infrastructure')}
            className={`absolute inset-0 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-tr from-amber-950/70 via-slate-900/95 to-slate-950/95 shadow-[0_0_35px_rgba(245,158,11,0.15)] cursor-pointer transition-all duration-300 ${
              selectedLayerId === 'infrastructure' ? 'ring-2 ring-amber-400' : ''
            }`}
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f59e0b11_1px,transparent_1px),linear-gradient(to_bottom,#f59e0b11_1px,transparent_1px)] bg-[size:1.25rem_1.25rem]" />

            {pois.slice(0, 5).map((poi, idx) => {
              const xPos = 20 + ((idx * 27) % 65);
              const yPos = 25 + ((idx * 33) % 55);
              return (
                <div
                  key={poi.id}
                  style={{ left: `${xPos}%`, top: `${yPos}%` }}
                  className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                  onMouseEnter={() =>
                    setHoveredNode({
                      id: poi.id,
                      title: poi.name,
                      subtitle: `${poi.category} · ${poi.status}`,
                    })
                  }
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <div className="w-3.5 h-3.5 rounded-md bg-amber-500/30 border border-amber-400 flex items-center justify-center text-white shadow-md hover:scale-125 transition-transform">
                    {poi.category === 'Hospital' ? (
                      <Hospital size={9} className="text-pink-300" />
                    ) : poi.category === 'Shelter' ? (
                      <Home size={9} className="text-emerald-300" />
                    ) : (
                      <Building2 size={9} className="text-amber-300" />
                    )}
                  </div>
                </div>
              );
            })}

            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/90 border border-amber-500/40 text-[9px] font-mono font-bold text-amber-300">
              <Building2 size={11} />
              <span>CRITICAL LIFELINES</span>
            </div>
          </div>

          {/* ── LAYER 3: Tactical SAR & Drone Vectors Plane ── */}
          <div
            ref={(el) => {
              layerRefs.current['sar'] = el;
            }}
            onClick={() => handleLayerClick('sar')}
            className={`absolute inset-0 rounded-2xl border-2 border-blue-500/50 bg-gradient-to-tr from-blue-950/70 via-slate-900/95 to-indigo-950/95 shadow-[0_0_35px_rgba(59,130,246,0.15)] cursor-pointer transition-all duration-300 ${
              selectedLayerId === 'sar' ? 'ring-2 ring-blue-400' : ''
            }`}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
              <line x1="30" y1="40" x2="60" y2="70" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="70" y1="20" x2="45" y2="55" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 3" />
            </svg>

            <div
              style={{ left: '42%', top: '48%' }}
              className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
              onMouseEnter={() =>
                setHoveredNode({
                  id: 'sar-1',
                  title: 'SMART Squad Alpha',
                  subtitle: 'Boat Infiltration · 12 Responders',
                })
              }
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className="relative flex items-center justify-center">
                <div className="gis-pulse-node absolute w-6 h-6 rounded-full bg-blue-500/30" />
                <div className="w-4 h-4 rounded-full bg-blue-600 border border-white flex items-center justify-center text-white shadow-md">
                  <Radio size={8} />
                </div>
              </div>
            </div>

            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/90 border border-blue-500/40 text-[9px] font-mono font-bold text-blue-300">
              <Radio size={11} />
              <span>TACTICAL SAR VECTORS</span>
            </div>
          </div>

          {/* ── LAYER 4: Active Incidents & Hotspots Plane ── */}
          <div
            ref={(el) => {
              layerRefs.current['hotspots'] = el;
            }}
            onClick={() => handleLayerClick('hotspots')}
            className={`absolute inset-0 rounded-2xl border-2 border-rose-500/60 bg-gradient-to-tr from-rose-950/70 via-slate-900/95 to-slate-950/95 shadow-[0_0_35px_rgba(244,63,94,0.2)] cursor-pointer transition-all duration-300 ${
              selectedLayerId === 'hotspots' ? 'ring-2 ring-rose-400' : ''
            }`}
          >
            {activeIncidents.slice(0, 4).map((inc, idx) => {
              const xPos = 25 + ((idx * 31) % 55);
              const yPos = 30 + ((idx * 29) % 45);
              return (
                <div
                  key={inc.id}
                  style={{ left: `${xPos}%`, top: `${yPos}%` }}
                  className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectIncident(inc);
                  }}
                  onMouseEnter={() =>
                    setHoveredNode({
                      id: inc.id,
                      title: inc.title,
                      subtitle: `${inc.location} · ${inc.severity} Level`,
                      severity: inc.severity,
                      casualties: inc.affectedPopulation,
                    })
                  }
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="gis-pulse-node absolute w-7 h-7 rounded-full bg-rose-500/40" />
                    <div className="w-5 h-5 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-white shadow-lg hover:scale-125 transition-transform">
                      <AlertTriangle size={10} />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/90 border border-rose-500/40 text-[9px] font-mono font-bold text-rose-300">
              <AlertTriangle size={11} />
              <span>ACTIVE INCIDENT NODES</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Node Hover Preview Tooltip ── */}
      {hoveredNode && (
        <div className="absolute bottom-12 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white px-3 py-2 rounded-xl shadow-2xl max-w-xs pointer-events-none">
          <p className="text-xs font-bold text-slate-100 leading-tight">{hoveredNode.title}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{hoveredNode.subtitle}</p>
          {hoveredNode.casualties && (
            <p className="text-[10px] text-rose-400 font-mono mt-1">
              Affected Population: {hoveredNode.casualties.toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
