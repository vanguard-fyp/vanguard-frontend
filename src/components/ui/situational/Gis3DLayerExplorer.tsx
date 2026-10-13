import React, { useEffect, useMemo, useRef, useState } from 'react';
import { animate, stagger } from 'animejs';
import {
  AlertTriangle,
  CloudFog,
  Eye,
  EyeOff,
  Flame,
  Home,
  Layers,
  LocateFixed,
  Maximize2,
  Minimize2,
  Minus as MinusIcon,
  Plus,
  X,
  MoveHorizontal,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import type { Gis3DLayerExplorerProps, Incident } from '../../../types';
import { useGisLayers } from '../../../hooks/useGeo';
import { useHazardPredictions, useRescueTeams } from '../../../hooks';

type PlaneId = 'base' | 'facilities' | 'response' | 'incidents';

const PLANES: { id: PlaneId; name: string; color: string; z: number }[] = [
  { id: 'base', name: 'Base · flood hotspots', color: '#10b981', z: 0 },
  { id: 'facilities', name: 'Facilities', color: '#f59e0b', z: 80 },
  { id: 'response', name: 'Rescue teams', color: '#22d3ee', z: 160 },
  { id: 'incidents', name: 'Incidents · AI hazards', color: '#f43f5e', z: 240 },
];

/** Facilities further than this from every active incident are hidden in "near incidents" mode. */
const NEARBY_KM = 30;
const MAX_ZOOM = 8;
const MAX_PER_KIND = 250;

// Points are placed by their real coordinates inside Malaysia's bounding box;
// the plane keeps roughly the box's aspect ratio so positions are not stretched.
const MY_BOUNDS = { north: 7.4, south: 0.8, west: 99.6, east: 119.3 };
const planePosition = (lat: number, lng: number) => ({
  x: Math.min(99, Math.max(1, ((lng - MY_BOUNDS.west) / (MY_BOUNDS.east - MY_BOUNDS.west)) * 100)),
  y: Math.min(99, Math.max(1, ((MY_BOUNDS.north - lat) / (MY_BOUNDS.north - MY_BOUNDS.south)) * 100)),
});
const inMalaysia = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= MY_BOUNDS.south && lat <= MY_BOUNDS.north && lng >= MY_BOUNDS.west && lng <= MY_BOUNDS.east;

const km = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

// Simplified coastline / border outline (lng, lat) — a visual reference only.
const PENINSULAR: [number, number][] = [
  [100.13, 6.44], [100.2, 6.7], [100.75, 6.45], [101.1, 5.75], [101.6, 5.8], [101.95, 5.95], [102.1, 6.2],
  [102.6, 6.0], [103.13, 5.33], [103.45, 4.8], [103.42, 4.2], [103.33, 3.8], [103.45, 3.0], [103.84, 2.43],
  [104.2, 1.7], [104.28, 1.37], [103.6, 1.27], [103.45, 1.3], [102.93, 1.85], [102.25, 2.2], [101.8, 2.52],
  [101.3, 3.0], [100.9, 3.7], [100.6, 4.2], [100.35, 4.9], [100.3, 5.4], [100.35, 5.9], [100.3, 6.1],
];
const BORNEO: [number, number][] = [
  [109.65, 2.08], [110.4, 1.75], [111.3, 1.85], [111.5, 2.4], [112.9, 3.1], [113.05, 3.2], [113.99, 4.4],
  [114.6, 4.6], [115.2, 5.3], [116.07, 5.98], [116.8, 6.95], [117.7, 6.4], [118.1, 5.85], [119.27, 5.35],
  [118.6, 4.5], [117.9, 4.25], [117.6, 4.17], [116.0, 4.3], [115.6, 4.0], [115.0, 3.0], [114.6, 1.5],
  [113.0, 1.45], [112.0, 1.4], [111.0, 1.0], [110.0, 0.95], [109.6, 1.4],
];
const outlinePath = (pts: [number, number][]) =>
  pts.map(([lng, lat], i) => {
    const p = planePosition(lat, lng);
    return `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ') + ' Z';
const OUTLINES = [outlinePath(PENINSULAR), outlinePath(BORNEO)];

const SEVERITY_DOT: Record<string, string> = {
  Critical: 'bg-red-600',
  High: 'bg-orange-500',
  Medium: 'bg-amber-400',
  Low: 'bg-emerald-500',
};

type FacilityKind = 'depot' | 'fire' | 'relief';
const FACILITY_STYLE: Record<FacilityKind, { label: string; cls: string; icon: React.ReactNode }> = {
  depot: { label: 'Depots', cls: 'bg-amber-500 border-amber-100', icon: <WarehouseIcon size={8} className="text-white" /> },
  fire: { label: 'Fire stations', cls: 'bg-orange-600 border-orange-100', icon: <Flame size={8} className="text-white" /> },
  relief: { label: 'Relief centres', cls: 'bg-emerald-600 border-emerald-100', icon: <Home size={8} className="text-white" /> },
};

interface Point {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sub: string;
}
interface Facility extends Point {
  kind: FacilityKind;
}
type Hover = { title: string; lines: string[] };

export const Gis3DLayerExplorer: React.FC<Gis3DLayerExplorerProps> = ({ incidents, pois, onSelectIncident }) => {
  const [isExploded, setIsExploded] = useState(true);
  const [soloId, setSoloId] = useState<PlaneId | null>(null);
  const [hidden, setHidden] = useState<Record<PlaneId, boolean>>({ base: false, facilities: false, response: false, incidents: false });
  const [nearOnly, setNearOnly] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [cameraAngle, setCameraAngle] = useState<'isometric' | 'topdown' | 'side'>('isometric');
  const [hovered, setHovered] = useState<Hover | null>(null);

  const [userRotationZ, setUserRotationZ] = useState(-24);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const baseRotationZRef = useRef(-24);
  const basePanRef = useRef({ x: 50, y: 50 });
  const stackRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const planeRefs = useRef<Partial<Record<PlaneId, HTMLDivElement | null>>>({});

  // Zoom + pan: `center` is the plane point (in %) kept at the middle of the view.
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 50, y: 50 });
  const [focused, setFocused] = useState<(Hover & { incident?: Incident }) | null>(null);
  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(1, z));
  const focusOn = (lat: number, lng: number, z: number, info: Hover & { incident?: Incident }) => {
    setCenter(planePosition(lat, lng));
    setZoom((cur) => Math.max(cur, z));
    setFocused(info);
  };
  const resetView = () => {
    setZoom(1);
    setCenter({ x: 50, y: 50 });
    setFocused(null);
  };

  // Same backend-proxied GIS layers the 2D map uses (cached 10 min).
  const [fireQ, reliefQ, floodQ] = useGisLayers([
    { key: 'fire_stations', enabled: true },
    { key: 'relief_centres_trg', enabled: true },
    { key: 'flood_hotspots', enabled: true },
  ]);
  const { data: teams = [] } = useRescueTeams();
  const { data: predictions = [] } = useHazardPredictions();

  const activeIncidents: Incident[] = useMemo(
    () =>
      incidents.filter(
        (i) => !['Resolved', 'Rejected', 'Archived'].includes(i.status) && inMalaysia(i.coordinates[0], i.coordinates[1])
      ),
    [incidents]
  );

  const allFacilities: Facility[] = useMemo(() => {
    const out: Facility[] = [];
    pois.forEach((p) => {
      if (p.category === 'Warehouse' && inMalaysia(p.coordinates[0], p.coordinates[1])) {
        out.push({ id: p.id, name: p.name, lat: p.coordinates[0], lng: p.coordinates[1], sub: 'Logistics depot', kind: 'depot' });
      }
    });
    const add = (features: { id: string; name: string; lat: number; lng: number }[] | undefined, kind: FacilityKind, sub: string) =>
      (features ?? []).forEach((f) => {
        if (inMalaysia(f.lat, f.lng)) out.push({ id: `${kind}-${f.id}`, name: f.name || sub, lat: f.lat, lng: f.lng, sub, kind });
      });
    add(fireQ.data?.features, 'fire', 'Fire station');
    add(reliefQ.data?.features, 'relief', 'Relief centre');
    return out;
  }, [pois, fireQ.data, reliefQ.data]);

  const floodHotspots: Point[] = useMemo(
    () =>
      (floodQ.data?.features ?? [])
        .filter((f) => inMalaysia(f.lat, f.lng))
        .map((f) => ({ id: `flood-${f.id}`, name: f.name || 'Flood hotspot', lat: f.lat, lng: f.lng, sub: 'Flood hotspot' })),
    [floodQ.data]
  );

  const deployableTeams = useMemo(
    () =>
      teams.filter(
        (t) => t.status !== 'Deleted' && Array.isArray(t.coordinates) && inMalaysia(Number(t.coordinates[0]), Number(t.coordinates[1]))
      ),
    [teams]
  );

  const nearAnIncident = (lat: number, lng: number) =>
    activeIncidents.some((i) => km(lat, lng, i.coordinates[0], i.coordinates[1]) <= NEARBY_KM);

  const facilities = useMemo(() => {
    const list = nearOnly ? allFacilities.filter((f) => nearAnIncident(f.lat, f.lng)) : allFacilities;
    const perKind: Record<FacilityKind, number> = { depot: 0, fire: 0, relief: 0 };
    return list.filter((f) => ++perKind[f.kind] <= MAX_PER_KIND);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFacilities, nearOnly, activeIncidents]);
  const floods = useMemo(
    () => (nearOnly ? floodHotspots.filter((f) => nearAnIncident(f.lat, f.lng)) : floodHotspots).slice(0, MAX_PER_KIND),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floodHotspots, nearOnly, activeIncidents]
  );

  // Nearest relief centre and nearest available team per incident (from the full sets).
  const links = useMemo(
    () =>
      activeIncidents.map((inc) => {
        const [lat, lng] = inc.coordinates;
        const nearest = <T,>(items: T[], at: (t: T) => [number, number]) =>
          items.reduce<{ item: T; d: number } | null>((best, it) => {
            const [a, b] = at(it);
            const d = km(lat, lng, a, b);
            return !best || d < best.d ? { item: it, d } : best;
          }, null);
        const relief = nearest(allFacilities.filter((f) => f.kind === 'relief'), (f) => [f.lat, f.lng]);
        const team = nearest(
          deployableTeams.filter((t) => t.status === 'Available' || (t.available_personnel ?? 0) > 0),
          (t) => [Number(t.coordinates[0]), Number(t.coordinates[1])]
        );
        return { inc, relief, team };
      }),
    [activeIncidents, allFacilities, deployableTeams]
  );

  const counts: Record<PlaneId, string> = {
    base: String(floods.length),
    facilities: String(facilities.length),
    response: String(deployableTeams.length),
    incidents: `${activeIncidents.length}${predictions.length ? ` +${predictions.length}` : ''}`,
  };
  const loadingGis = fireQ.isLoading || reliefQ.isLoading || floodQ.isLoading;
  const isShown = (id: PlaneId) => !hidden[id] && (!soloId || soloId === id || id === 'base');

  // ── anime.js: camera ──
  useEffect(() => {
    if (!stackRef.current) return;
    const cam =
      cameraAngle === 'topdown'
        ? { rotateX: 0, rotateZ: 0, rotateY: 0, scale: 0.92 }
        : cameraAngle === 'side'
          ? { rotateX: 72, rotateZ: -40, rotateY: -6, scale: 0.84 }
          : { rotateX: 58, rotateZ: userRotationZ, rotateY: 0, scale: 0.86 };
    animate(stackRef.current, { ...cam, scale: cam.scale * zoom, duration: isDragging ? 0 : 650, ease: 'outQuart' });
  }, [cameraAngle, userRotationZ, isDragging, zoom]);

  // ── anime.js: glide so `center` sits in the middle (pan happens along the plane) ──
  useEffect(() => {
    if (!panRef.current) return;
    animate(panRef.current, {
      translateX: `${50 - center.x}%`,
      translateY: `${50 - center.y}%`,
      duration: isDragging ? 0 : 700,
      ease: 'outQuart',
    });
  }, [center, isDragging]);

  // Wheel zoom (native listener so the page does not scroll) and keyboard shortcuts.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => {
        const next = clampZoom(z * (e.deltaY < 0 ? 1.2 : 1 / 1.2));
        if (next === 1) setCenter({ x: 50, y: 50 });
        return next;
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') setZoom((z) => clampZoom(z * 1.4));
      else if (e.key === '-') setZoom((z) => clampZoom(z / 1.4));
      else if (e.key === 'Escape') resetView();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── anime.js: plane elevation / visibility ──
  useEffect(() => {
    PLANES.forEach((plane, index) => {
      const el = planeRefs.current[plane.id];
      if (!el) return;
      // Overlay = GIS view: every visible plane sits on the base. Explode = lifted apart.
      const z = isExploded ? plane.z : index * 2;
      const shown = isShown(plane.id);
      animate(el, { translateZ: shown ? z : z + 40, opacity: shown ? 1 : 0, duration: 700, delay: index * 50, ease: 'outQuint' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExploded, soloId, hidden]);

  // ── anime.js: pulsing incident rings ──
  useEffect(() => {
    const pulse = animate('.gis-pulse-node', {
      scale: [1, 2.4],
      opacity: [0.8, 0],
      duration: 1900,
      loop: true,
      ease: 'outQuad',
      delay: stagger(250),
    });
    return () => {
      pulse.pause();
    };
  }, [activeIncidents.length]);

  // ── drag: rotate at full view, pan when zoomed in ──
  const panning = zoom > 1.05;
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, .interactive-node, .layer-panel, .focus-card')) return;
    if (!panning && cameraAngle !== 'isometric') setCameraAngle('isometric');
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartYRef.current = e.clientY;
    baseRotationZRef.current = userRotationZ;
    basePanRef.current = center;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartXRef.current;
    const dy = e.clientY - dragStartYRef.current;
    if (!panning) {
      setUserRotationZ(baseRotationZRef.current + dx * 0.4);
      return;
    }
    // Screen drag → plane-local drag: undo the camera's rotation and foreshortening.
    const rz = ((cameraAngle === 'isometric' ? userRotationZ : cameraAngle === 'side' ? -40 : 0) * Math.PI) / 180;
    const tilt = Math.cos(((cameraAngle === 'isometric' ? 58 : cameraAngle === 'side' ? 72 : 0) * Math.PI) / 180);
    const lx = dx * Math.cos(-rz) - dy * Math.sin(-rz);
    const ly = (dx * Math.sin(-rz) + dy * Math.cos(-rz)) / Math.max(0.3, tilt);
    const w = stackRef.current?.offsetWidth ?? 470;
    const h = stackRef.current?.offsetHeight ?? 174;
    const k = (cameraAngle === 'topdown' ? 0.92 : 0.86) * zoom;
    setCenter({
      x: Math.min(100, Math.max(0, basePanRef.current.x - (lx / (w * k)) * 100)),
      y: Math.min(100, Math.max(0, basePanRef.current.y - (ly / (h * k)) * 100)),
    });
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const at = (lat: number, lng: number): React.CSSProperties => {
    const p = planePosition(lat, lng);
    // Markers grow only gently with zoom so a zoomed view stays readable.
    return { left: `${p.x}%`, top: `${p.y}%`, pointerEvents: 'auto', scale: 'var(--node-scale)' } as React.CSSProperties;
  };
  /** Hover shows a tooltip; click glides the camera to the point and pins its details. */
  const hover = (h: Hover, lat: number, lng: number, opts: { zoomTo?: number; incident?: Incident } = {}) => ({
    onMouseEnter: () => setHovered(h),
    onMouseLeave: () => setHovered(null),
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setHovered(null);
      focusOn(lat, lng, opts.zoomTo ?? 3.5, { ...h, incident: opts.incident });
    },
  });
  const planeCls = 'absolute inset-0 rounded-xl pointer-events-none';
  const glass = (on: string) => (isExploded ? on : 'border-transparent');

  // Faint footprints of the planes above, so lifted points can be matched to the map.
  const footprints = (below: PlaneId) => {
    if (!isExploded) return null;
    const order = PLANES.findIndex((p) => p.id === below);
    return (
      <>
        {order < 1 && isShown('facilities') && facilities.map((f) => (
          <span key={`fp-${f.id}`} className="absolute w-1 h-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/40" style={{ ...at(f.lat, f.lng), pointerEvents: 'none' }} />
        ))}
        {order < 2 && isShown('response') && deployableTeams.map((t) => (
          <span key={`fp-${t.id}`} className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-cyan-300/40" style={{ ...at(Number(t.coordinates[0]), Number(t.coordinates[1])), pointerEvents: 'none' }} />
        ))}
        {order < 3 && isShown('incidents') && activeIncidents.map((i) => (
          <span key={`fp-${i.id}`} className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-400/60 bg-rose-500/15" style={{ ...at(i.coordinates[0], i.coordinates[1]), pointerEvents: 'none' }} />
        ))}
      </>
    );
  };

  return (
    <div
      ref={viewportRef}
      tabIndex={0}
      aria-label="3D GIS layers. Scroll or press plus and minus to zoom, Escape to reset."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={(e) => {
        if (!(e.target as HTMLElement).closest('button, .interactive-node, .layer-panel, .focus-card')) resetView();
      }}
      className={`relative w-full h-[600px] overflow-hidden rounded-b-xl border border-slate-800 select-none flex flex-col items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
        isDragging ? 'cursor-grabbing' : panning ? 'cursor-move' : 'cursor-grab'
      }`}
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #0c1527 0%, #030712 100%)' }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b22_1px,transparent_1px),linear-gradient(to_bottom,#1e293b22_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] pointer-events-none" />

      {/* ── Top bar ── */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-xl pointer-events-auto">
          <Layers className="size-4 text-cyan-400" />
          <span className="text-xs font-black tracking-wider text-white uppercase">3D GIS Layers</span>
          {loadingGis && <span className="text-[10px] text-slate-400">loading facilities…</span>}
        </div>
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-xl">
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            {([
              ['isometric', '3D'],
              ['topdown', 'Map'],
              ['side', 'Profile'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setCameraAngle(id);
                  if (id === 'isometric') setUserRotationZ(-24);
                }}
                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  cameraAngle === id ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <button
            onClick={() => setIsExploded((v) => !v)}
            title={isExploded ? 'Overlay every layer on one map' : 'Lift the layers apart'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
              isExploded ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isExploded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{isExploded ? 'Overlay' : 'Explode'}</span>
          </button>
        </div>
      </div>

      {/* ── 3D viewport ── */}
      <div className="relative w-full h-[460px] flex items-center justify-center [perspective:1300px] overflow-visible">
        <div ref={stackRef} className="relative w-[min(92vw,470px)] aspect-[2.7/1] translate-y-20 [transform-style:preserve-3d] origin-center">
          <div
            ref={panRef}
            className="absolute inset-0 [transform-style:preserve-3d]"
            style={{ '--node-scale': String(1 / Math.sqrt(zoom)) } as React.CSSProperties}
          >
          {/* Base: outline + flood hotspots (ground hazard) */}
          <div
            ref={(el) => {
              planeRefs.current.base = el;
            }}
            className={`${planeCls} border border-emerald-500/50 bg-emerald-950/40 shadow-[0_0_40px_rgba(16,185,129,0.12)]`}
          >
            <div className="absolute inset-0 rounded-xl bg-[radial-gradient(#10b98126_1px,transparent_1px)] [background-size:14px_14px]" />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              {OUTLINES.map((d, i) => (
                <path key={i} d={d} fill="#10b98122" stroke="#34d399" strokeWidth={0.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              ))}
            </svg>
            {floods.map((f) => (
              <div
                key={f.id}
                style={at(f.lat, f.lng)}
                className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-sky-400/35 border border-sky-300/70 cursor-pointer"
                {...hover({ title: f.name, lines: ['Flood hotspot (JPS)'] }, f.lat, f.lng)}
              />
            ))}
            {footprints('base')}
            <span className="absolute bottom-1.5 left-2 text-[9px] font-mono font-bold text-emerald-400/90">MALAYSIA · simplified outline</span>
          </div>

          {/* Facilities */}
          <div
            ref={(el) => {
              planeRefs.current.facilities = el;
            }}
            className={`${planeCls} border ${glass('border-amber-400/50 bg-amber-500/[0.06]')}`}
          >
            {footprints('facilities')}
            {facilities.map((f) => (
              <div
                key={f.id}
                style={at(f.lat, f.lng)}
                className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                {...hover({ title: f.name, lines: [f.sub] }, f.lat, f.lng)}
              >
                <div className={`w-3 h-3 rounded-[4px] border flex items-center justify-center shadow-md hover:scale-150 transition-transform ${FACILITY_STYLE[f.kind].cls}`}>
                  {FACILITY_STYLE[f.kind].icon}
                </div>
              </div>
            ))}
            {isExploded && <span className="absolute top-1.5 left-2 text-[9px] font-mono font-bold text-amber-300">FACILITIES ({facilities.length})</span>}
          </div>

          {/* Response: rescue teams */}
          <div
            ref={(el) => {
              planeRefs.current.response = el;
            }}
            className={`${planeCls} border ${glass('border-cyan-400/50 bg-cyan-500/[0.05]')}`}
          >
            {footprints('response')}
            {deployableTeams.map((t) => (
              <div
                key={t.id}
                style={at(Number(t.coordinates[0]), Number(t.coordinates[1]))}
                className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                {...hover({
                  title: t.name,
                  lines: [
                    `${t.agency} · ${t.status}`,
                    t.available_personnel != null ? `${t.available_personnel} of ${t.total_personnel ?? t.personnel_count} personnel free` : `${t.personnel_count} personnel`,
                  ],
                }, Number(t.coordinates[0]), Number(t.coordinates[1]))}
              >
                <div
                  className={`w-3 h-3 rotate-45 border shadow-md hover:scale-150 transition-transform ${
                    t.status === 'Available' ? 'bg-cyan-400 border-cyan-100' : t.status === 'Off Duty' ? 'bg-slate-500 border-slate-300' : 'bg-cyan-700 border-cyan-300'
                  }`}
                />
              </div>
            ))}
            {isExploded && <span className="absolute top-1.5 left-2 text-[9px] font-mono font-bold text-cyan-300">RESCUE TEAMS ({deployableTeams.length})</span>}
          </div>

          {/* Incidents + AI hazard predictions, with links to the nearest support */}
          <div
            ref={(el) => {
              planeRefs.current.incidents = el;
            }}
            className={`${planeCls} border ${glass('border-rose-400/60 bg-rose-500/[0.06]')}`}
          >
            {showLinks && (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                {links.map(({ inc, relief, team }) => {
                  const a = planePosition(inc.coordinates[0], inc.coordinates[1]);
                  return (
                    <g key={inc.id}>
                      {relief && relief.d <= 80 && (() => {
                        const b = planePosition(relief.item.lat, relief.item.lng);
                        return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#34d399" strokeWidth={1.2} strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />;
                      })()}
                      {team && team.d <= 300 && (() => {
                        const b = planePosition(Number(team.item.coordinates[0]), Number(team.item.coordinates[1]));
                        return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#22d3ee" strokeWidth={1.2} strokeDasharray="1 2" vectorEffect="non-scaling-stroke" />;
                      })()}
                    </g>
                  );
                })}
              </svg>
            )}
            {predictions
              .filter((p) => p.lat != null && p.lng != null && inMalaysia(Number(p.lat), Number(p.lng)))
              .map((p) => (
                <div
                  key={p.id}
                  style={at(Number(p.lat), Number(p.lng))}
                  className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
                  {...hover({
                    title: `AI prediction: ${p.hazard_type ?? 'Hazard'} · ${p.state ?? ''}`,
                    lines: [
                      `Score ${p.hazard_score ?? 'n/a'} · confidence ${p.confidence ?? 'n/a'}%`,
                      p.projected_within_hours === 0 ? 'Now' : p.projected_within_hours != null ? `In ~${p.projected_within_hours} h` : 'Timing unknown',
                      'Not verified — review in Incident Management',
                    ],
                  }, Number(p.lat), Number(p.lng), { zoomTo: 2.5 })}
                >
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-violet-300/80 bg-violet-500/15 flex items-center justify-center">
                    {p.hazard_type === 'Haze' ? <CloudFog size={12} className="text-violet-200" /> : <AlertTriangle size={11} className="text-violet-200" />}
                  </div>
                </div>
              ))}
            {links.map(({ inc, relief, team }) => {
              const affected = inc.field_verification?.affected_population === 'unknown' ? undefined : inc.affected_population || undefined;
              return (
                <div
                  key={inc.id}
                  style={at(inc.coordinates[0], inc.coordinates[1])}
                  className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer"
                  {...hover({
                    title: inc.title,
                    lines: [
                      `${inc.display_id ?? ''} · ${inc.district}, ${inc.state}${inc.severity ? ` · ${inc.severity}` : ''}`,
                      ...(affected ? [`Affected (reported): ${affected.toLocaleString()}`] : []),
                      relief ? `Nearest relief centre: ${relief.item.name} · ${relief.d.toFixed(1)} km` : 'No relief centre data',
                      team ? `Nearest free team: ${team.item.name} · ${team.d.toFixed(0)} km` : 'No free team located',
                    ],
                  }, inc.coordinates[0], inc.coordinates[1], { zoomTo: 4.5, incident: inc })}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="gis-pulse-node absolute w-6 h-6 rounded-full bg-rose-500/40" />
                    <div className={`w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg hover:scale-150 transition-transform ${SEVERITY_DOT[inc.severity ?? ''] ?? 'bg-rose-600'}`}>
                      <AlertTriangle size={8} />
                    </div>
                  </div>
                </div>
              );
            })}
            {isExploded && <span className="absolute top-1.5 left-2 text-[9px] font-mono font-bold text-rose-300">INCIDENTS ({activeIncidents.length})</span>}
          </div>
          </div>
        </div>
      </div>

      {/* ── Zoom controls ── */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-xl overflow-hidden">
        <button type="button" onClick={() => setZoom((z) => clampZoom(z * 1.4))} title="Zoom in (+)" className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer">
          <Plus size={14} />
        </button>
        <button type="button" onClick={() => setZoom((z) => { const n = clampZoom(z / 1.4); if (n === 1) setCenter({ x: 50, y: 50 }); return n; })} title="Zoom out (−)" className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 border-t border-slate-700/80 cursor-pointer">
          <MinusIcon size={14} />
        </button>
        <button type="button" onClick={resetView} disabled={zoom === 1 && !focused} title="Full view (Esc)" className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 border-t border-slate-700/80 cursor-pointer disabled:opacity-30 disabled:cursor-default">
          <LocateFixed size={14} />
        </button>
        <span className="text-[9px] font-mono text-slate-400 text-center py-1 border-t border-slate-700/80">{zoom.toFixed(1)}×</span>
      </div>

      {/* ── Focused point: stays until dismissed ── */}
      {focused && (
        <div className="focus-card absolute top-14 left-14 z-40 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-3 cursor-default">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold text-slate-100 leading-tight">{focused.title}</p>
            <button type="button" onClick={() => setFocused(null)} className="text-slate-500 hover:text-white cursor-pointer" aria-label="Close">
              <X size={13} />
            </button>
          </div>
          {focused.lines.map((l, i) => (
            <p key={i} className="text-[10px] text-slate-400 mt-0.5">{l}</p>
          ))}
          {focused.incident && (
            <button
              type="button"
              onClick={() => onSelectIncident(focused.incident!)}
              className="mt-2 w-full px-2 py-1.5 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
            >
              Open incident
            </button>
          )}
        </div>
      )}

      {/* ── Layer panel ── */}
      <div className="layer-panel absolute bottom-3 right-3 z-30 w-60 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-xl p-2 space-y-1 cursor-default">
        {[...PLANES].reverse().map((plane) => {
          const off = hidden[plane.id];
          const dimmed = !!soloId && soloId !== plane.id && plane.id !== 'base';
          return (
            <div
              key={plane.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${soloId === plane.id ? 'bg-slate-700/70' : 'hover:bg-slate-800'} ${off || dimmed ? 'opacity-50' : ''}`}
            >
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: plane.color }} />
              <button
                type="button"
                onClick={() => plane.id !== 'base' && setSoloId((s) => (s === plane.id ? null : plane.id))}
                title={plane.id === 'base' ? undefined : soloId === plane.id ? 'Show all layers' : 'Show only this layer'}
                className="flex-1 min-w-0 text-left text-[11px] font-semibold text-slate-200 truncate cursor-pointer"
              >
                {plane.name}
              </button>
              <span className="text-[10px] font-mono text-slate-400">{counts[plane.id]}</span>
              <button
                type="button"
                onClick={() => setHidden((h) => ({ ...h, [plane.id]: !h[plane.id] }))}
                title={off ? 'Show layer' : 'Hide layer'}
                className="p-0.5 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                {off ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          );
        })}
        <div className="border-t border-slate-700/80 pt-1.5 px-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-300">
          {(Object.keys(FACILITY_STYLE) as FacilityKind[]).map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-[2px] ${FACILITY_STYLE[k].cls.split(' ')[0]}`} />
              {FACILITY_STYLE[k].label}
            </span>
          ))}
          <span className="flex items-center gap-1"><span className="w-2 h-2 rotate-45 bg-cyan-400" />Free team</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-dashed border-violet-300" />AI hazard</span>
        </div>
        <div className="flex items-center gap-1.5 px-1 pt-1">
          <button
            type="button"
            onClick={() => setNearOnly((v) => !v)}
            className={`flex-1 px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer border ${
              nearOnly ? 'bg-amber-500/20 text-amber-200 border-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title={`Facilities and flood hotspots within ${NEARBY_KM} km of an active incident`}
          >
            {nearOnly ? `Within ${NEARBY_KM} km of incidents` : 'All facilities'}
          </button>
          <button
            type="button"
            onClick={() => setShowLinks((v) => !v)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer border ${
              showLinks ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Dashed links: each incident to its nearest relief centre (green) and nearest free team (cyan)"
          >
            Links
          </button>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-20 pointer-events-none flex items-center gap-1.5 text-[11px] text-slate-400/80 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
        <MoveHorizontal size={13} className="text-cyan-400" />
        <span>{panning ? 'Drag to pan · double-click for full view' : 'Drag to rotate · scroll to zoom · click a point'}</span>
      </div>

      {hovered && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white px-3 py-2 rounded-xl shadow-2xl max-w-sm pointer-events-none">
          <p className="text-xs font-bold text-slate-100 leading-tight">{hovered.title}</p>
          {hovered.lines.map((l, i) => (
            <p key={i} className="text-[10px] text-slate-400 mt-0.5">{l}</p>
          ))}
        </div>
      )}
    </div>
  );
};
