import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  MapPin,
  Maximize2,
  Minimize2,
  Minus as MinusIcon,
  MoveHorizontal,
  Plus,
  Warehouse as WarehouseIcon,
  X,
  Cross,
  Shield,
  Stethoscope,
} from 'lucide-react';
import type { Gis3DLayerExplorerProps, GISLayerState, Incident, MapPOI } from '../../../types';
import { incidentMatchesLayers } from '../../../utils/mapLayers';
import { useGisLayers } from '../../../hooks/useGeo';
import { useHazardPredictions, useRescueTeams } from '../../../hooks';

type PlaneId = 'base' | 'facilities' | 'response' | 'incidents';

/* Dark GIS theme in the sidebar navy. Colour = meaning, in soft 300–400 shades
   so markers read clearly without glare: red incidents (by severity), amber
   facilities, cyan teams, violet dashed AI forecasts, blue the searched place. */
const C = {
  navy: '#1e293b',
  flood: '#38bdf8',    // sky-400   (was sky-300)
  depot: '#f59e0b',    // amber-500 (was amber-400)
  fire: '#f97316',     // orange-500 (was orange-400)
  relief: '#2dd4bf',   // teal-400  (was teal-300)
  team: '#22d3ee',     // cyan-400  (was cyan-300)
  teamBusy: '#06b6d4', // cyan-500  (was cyan-400)
  teamOff: '#64748b',  // slate-500 (unchanged)
  forecast: '#a78bfa', // violet-400 (was violet-300)
  pin: '#3b82f6',      // blue-500  (was blue-400)
  reliefLink: '#2dd4bf',
  teamLink: '#22d3ee',
};
const PLANES: { id: PlaneId; name: string; color: string; z: number }[] = [
  { id: 'base', name: 'Map · flood hotspots', color: C.flood, z: 0 },
  { id: 'facilities', name: 'Facilities', color: C.depot, z: 80 },
  { id: 'response', name: 'Rescue teams', color: C.team, z: 160 },
  { id: 'incidents', name: 'Incidents · AI forecasts', color: '#f87171', z: 240 },
];

/** Facilities further than this from every active incident are hidden in "near incidents" mode. */
const NEARBY_KM = 30;
const MAX_ZOOM = 10;
const MAX_PER_KIND = 250;

// Points are placed by their real coordinates inside Malaysia's bounding box.
const MY_BOUNDS = { north: 7.4, south: 0.8, west: 99.6, east: 119.3 };
const LNG_SPAN = MY_BOUNDS.east - MY_BOUNDS.west;
const LAT_SPAN = MY_BOUNDS.north - MY_BOUNDS.south;
const PLANE_RATIO = LNG_SPAN / LAT_SPAN; // ≈ 3 : 1, so the map is not stretched
const planePosition = (lat: number, lng: number) => ({
  x: Math.min(99.5, Math.max(0.5, ((lng - MY_BOUNDS.west) / LNG_SPAN) * 100)),
  y: Math.min(99.5, Math.max(0.5, ((MY_BOUNDS.north - lat) / LAT_SPAN) * 100)),
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

/* ── Real basemap on the ground plane ───────────────────────────────────────
   Web-map tiles laid out by their lat/lng edges. The tile zoom follows the
   plane's on-screen width, so zooming in loads sharper tiles instead of
   stretching one small picture (which is what made the old view blur). */
const lngToTileX = (lng: number, z: number) => ((lng + 180) / 360) * 2 ** z;
const latToTileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};
const tileXToLng = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const tileYToLat = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

const BaseTiles: React.FC<{ widthPx: number; center: { x: number; y: number }; zoom: number }> = React.memo(({ widthPx, center, zoom }) => {
  // One 256 px tile per ~256 css px on the plane (~128 px on high-density screens, for sharpness).
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio > 1.25 ? 1 : 0;
  const z = Math.min(11, Math.max(5, Math.round(Math.log2((widthPx * 360) / (LNG_SPAN * 256))) + dpr));
  // When zoomed in, only tiles around the view are drawn (the rest are off screen).
  const halfX = Math.min(50, 85 / zoom);
  const halfY = Math.min(50, 150 / zoom);
  const inView = (l: number, t: number, w: number, h: number) =>
    zoom <= 1.5 || (l + w >= center.x - halfX && l <= center.x + halfX && t + h >= center.y - halfY && t <= center.y + halfY);
  const x0 = Math.floor(lngToTileX(MY_BOUNDS.west, z));
  const x1 = Math.floor(lngToTileX(MY_BOUNDS.east, z));
  const y0 = Math.floor(latToTileY(MY_BOUNDS.north, z));
  const y1 = Math.floor(latToTileY(MY_BOUNDS.south, z));
  const tiles: { key: string; src: string; left: number; top: number; w: number; h: number }[] = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const w = tileXToLng(x, z), e = tileXToLng(x + 1, z);
      const n = tileYToLat(y, z), s = tileYToLat(y + 1, z);
      const left = ((w - MY_BOUNDS.west) / LNG_SPAN) * 100;
      const top = ((MY_BOUNDS.north - n) / LAT_SPAN) * 100;
      const tw = ((e - w) / LNG_SPAN) * 100;
      const th = ((n - s) / LAT_SPAN) * 100;
      if (!inView(left, top, tw, th)) continue;
      tiles.push({ key: `${z}-${x}-${y}`, src: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, left, top, w: tw, h: th });
    }
  }
  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl" aria-hidden="true"
      style={{ filter: 'invert(1) hue-rotate(185deg) brightness(0.9) contrast(0.85) saturate(0.45)' }}>
      {tiles.map((t) => (
        <img
          key={t.key}
          src={t.src}
          alt=""
          draggable={false}
          decoding="async"
          className="absolute max-w-none select-none pointer-events-none"
          // A hair of overlap hides seams between tiles.
          style={{ left: `${t.left}%`, top: `${t.top}%`, width: `calc(${t.w}% + 1px)`, height: `calc(${t.h}% + 1px)` }}
        />
      ))}
    </div>
  );
});

const SEVERITY_COLOR: Record<string, string> = { Critical: '#f87171', High: '#fb923c', Medium: '#fbbf24', Low: '#94a3b8' };

type FacilityKind = 'depot' | 'fire' | 'relief' | 'hospital' | 'clinic' | 'police';
const FACILITY_STYLE: Record<FacilityKind, { label: string; color: string; icon: React.ReactNode }> = {
  depot: { label: 'Depots', color: C.depot, icon: <WarehouseIcon size={9} className="text-slate-900" /> },
  fire: { label: 'Fire stations', color: C.fire, icon: <Flame size={9} className="text-slate-900" /> },
  relief: { label: 'Relief centres', color: C.relief, icon: <Home size={9} className="text-slate-900" /> },
  hospital: { label: 'Hospitals', color: '#f472b6', icon: <Cross size={9} className="text-slate-900" /> },
  clinic: { label: 'Clinics & pharmacies', color: '#5eead4', icon: <Stethoscope size={9} className="text-slate-900" /> },
  police: { label: 'Police', color: '#93c5fd', icon: <Shield size={9} className="text-slate-900" /> },
};

/** Which layer-panel filter controls each kind of facility. */
const FACILITY_LAYER: Record<FacilityKind, keyof GISLayerState> = {
  depot: 'rescueTeamLocations',
  fire: 'fireStations',
  relief: 'emergencyShelters',
  hospital: 'hospitals',
  clinic: 'clinics',
  police: 'policeStations',
};

const POI_KIND: Partial<Record<MapPOI['category'], FacilityKind>> = {
  Hospital: 'hospital',
  Clinic: 'clinic',
  Pharmacy: 'clinic',
  'Police Station': 'police',
  'Fire Station': 'fire',
  Shelter: 'relief',
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
type HoverLine = string | { text: string; className?: string };
type Hover = { title: string; lines: HoverLine[] };

/** A searched place (real address or incident) to glide to and pin. */
export interface GisFocusTarget {
  lat: number;
  lng: number;
  label: string;
  detail?: string;
  timestamp: number;
}

/** "Label: value" → grey label, bright value. Lines without a label are a quiet subtitle (or custom styled). */
const DetailLine: React.FC<{ text: HoverLine; compact?: boolean }> = ({ text, compact }) => {
  if (typeof text === 'object') {
    return (
      <li className={`${compact ? 'text-[11px]' : 'text-xs'} ${text.className ?? 'text-sky-300 font-semibold'}`}>
        {text.text}
      </li>
    );
  }
  const i = text.indexOf(': ');
  if (i < 0) return <li className={`${compact ? 'text-[11px]' : 'text-xs'} text-slate-400`}>{text}</li>;
  return (
    <li className={`flex items-baseline justify-between gap-3 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      <span className="text-slate-400 shrink-0">{text.slice(0, i)}</span>
      <span className="font-semibold text-slate-100 text-right">{text.slice(i + 2)}</span>
    </li>
  );
};

const panel = 'bg-[#1e293b]/90 backdrop-blur-md border border-white/10 shadow-[0_12px_32px_-12px_rgba(0,0,0,.6)]';

export const Gis3DLayerExplorer: React.FC<Gis3DLayerExplorerProps & { focusTarget?: GisFocusTarget | null }> = ({
  layers,
  incidents,
  pois,
  nearbyPois = [],
  onSelectIncident,
  focusTarget,
}) => {
  const [isExploded, setIsExploded] = useState(true);
  const [soloId, setSoloId] = useState<PlaneId | null>(null);
  const [hidden, setHidden] = useState<Record<PlaneId, boolean>>({ base: false, facilities: false, response: false, incidents: false });
  const [nearOnly, setNearOnly] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [cameraAngle, setCameraAngle] = useState<'isometric' | 'topdown' | 'side'>('isometric');
  const [hovered, setHovered] = useState<Hover | null>(null);
  const [pin, setPin] = useState<GisFocusTarget | null>(null);

  const [userRotationZ, setUserRotationZ] = useState(-18);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const baseRotationZRef = useRef(-18);
  const basePanRef = useRef({ x: 50, y: 50 });
  const stackRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const planeRefs = useRef<Partial<Record<PlaneId, HTMLDivElement | null>>>({});

  // The plane's real width follows zoom (instead of a CSS scale), so the
  // browser re-renders markers, lines and tiles at full resolution.
  const [baseW, setBaseW] = useState(720);
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBaseW(Math.max(320, Math.min(e.contentRect.width * 0.86, 980))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 50, y: 50 });
  const [focused, setFocused] = useState<(Hover & { incident?: Incident }) | null>(null);
  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(1, z));
  const focusOn = (lat: number, lng: number, z: number, info: (Hover & { incident?: Incident }) | null) => {
    setCenter(planePosition(lat, lng));
    setZoom((cur) => Math.max(cur, z));
    if (info) setFocused(info);
  };
  const resetView = () => {
    setZoom(1);
    setCenter({ x: 50, y: 50 });
    setFocused(null);
    setPin(null);
  };

  // A search result from the page toolbar: glide there and drop a pin.
  useEffect(() => {
    if (!focusTarget) return;
    if (!inMalaysia(focusTarget.lat, focusTarget.lng)) {
      setPin(null);
      setFocused({ title: focusTarget.label, lines: ['Outside the Malaysia map extent'] });
      return;
    }
    setPin(focusTarget);
    focusOn(focusTarget.lat, focusTarget.lng, 5, { title: focusTarget.label, lines: focusTarget.detail ? [focusTarget.detail] : [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget?.timestamp]);

  // When the search is cleared (focusTarget → null), remove the pin and focused card.
  useEffect(() => {
    if (!focusTarget) {
      setPin(null);
      setFocused(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget]);

  const [fireQ, reliefQ, floodQ] = useGisLayers([
    { key: 'fire_stations', enabled: true },
    { key: 'relief_centres_trg', enabled: true },
    { key: 'flood_hotspots', enabled: true },
  ]);
  const { data: teams = [] } = useRescueTeams();
  const { data: predictions = [] } = useHazardPredictions();

  const activeIncidents: Incident[] = useMemo(
    () => incidents.filter((i) => !['Resolved', 'Rejected', 'Archived'].includes(i.status) && inMalaysia(i.coordinates[0], i.coordinates[1]) && incidentMatchesLayers(i, layers)),
    [incidents, layers]
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
    () => teams.filter((t) => t.status !== 'Deleted' && Array.isArray(t.coordinates) && inMalaysia(Number(t.coordinates[0]), Number(t.coordinates[1]))),
    [teams]
  );

  const nearAnIncident = (lat: number, lng: number) =>
    activeIncidents.some((i) => km(lat, lng, i.coordinates[0], i.coordinates[1]) <= NEARBY_KM);

  const facilities = useMemo(() => {
    const list = nearOnly ? allFacilities.filter((f) => nearAnIncident(f.lat, f.lng)) : allFacilities;
    const perKind: Record<FacilityKind, number> = { depot: 0, fire: 0, relief: 0, hospital: 0, clinic: 0, police: 0 };
    const nearby: Facility[] = nearbyPois.flatMap((p) => {
      const kind = POI_KIND[p.category];
      if (!kind || !inMalaysia(p.coordinates[0], p.coordinates[1])) return [];
      return [{ id: `nearby-${p.id}`, name: p.name, lat: p.coordinates[0], lng: p.coordinates[1], sub: `${p.category} · ${p.details}`, kind }];
    });
    return [...list.filter((f) => ++perKind[f.kind] <= MAX_PER_KIND), ...nearby].filter((f) => layers[FACILITY_LAYER[f.kind]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFacilities, nearbyPois, nearOnly, activeIncidents, layers]);
  const floods = useMemo(
    () => (layers.floodAreas ? (nearOnly ? floodHotspots.filter((f) => nearAnIncident(f.lat, f.lng)) : floodHotspots).slice(0, MAX_PER_KIND) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floodHotspots, nearOnly, activeIncidents, layers.floodAreas]
  );

  // Nearest relief centre and nearest available team per incident.
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
    incidents: `${activeIncidents.length}${predictions.length ? ` + ${predictions.length}` : ''}`,
  };
  const loadingGis = fireQ.isLoading || reliefQ.isLoading || floodQ.isLoading;
  const isShown = (id: PlaneId) => !hidden[id] && (!soloId || soloId === id || id === 'base');

  // ── anime.js: camera tilt and turn ──
  useEffect(() => {
    if (!stackRef.current) return;
    const cam =
      // Tilted views shrink a little (never enlarge, which would blur) so raised layers fit.
      cameraAngle === 'topdown'
        ? { rotateX: 0, rotateZ: 0, rotateY: 0, scale: 1, translateY: 0 }
        : cameraAngle === 'side'
          ? { rotateX: 70, rotateZ: -36, rotateY: -4, scale: isExploded ? 0.62 : 0.74, translateY: isExploded ? 70 : 20 }
          : { rotateX: 52, rotateZ: userRotationZ, rotateY: 0, scale: isExploded ? 0.66 : 0.8, translateY: isExploded ? 80 : 20 };
    animate(stackRef.current, { ...cam, duration: isDragging ? 0 : 650, ease: 'outQuart' });
  }, [cameraAngle, userRotationZ, isDragging, isExploded]);

  // ── anime.js: zoom grows the plane itself, so everything stays sharp ──
  const planeW = baseW * zoom;
  useEffect(() => {
    if (!stackRef.current) return;
    animate(stackRef.current, { width: planeW, height: planeW / PLANE_RATIO, duration: isDragging ? 0 : 520, ease: 'outQuart' });
  }, [planeW, isDragging]);
  // Tiles switch detail level (and the area they cover) once zoom and pan settle.
  const [tileW, setTileW] = useState(planeW);
  const [tileCenter, setTileCenter] = useState(center);
  useEffect(() => {
    const t = setTimeout(() => { setTileW(planeW); setTileCenter(center); }, 380);
    return () => clearTimeout(t);
  }, [planeW, center]);

  // ── anime.js: glide so `center` sits in the middle ──
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
        const next = clampZoom(z * (e.deltaY < 0 ? 1.25 : 1 / 1.25));
        if (next === 1) setCenter({ x: 50, y: 50 });
        return next;
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') setZoom((z) => clampZoom(z * 1.5));
      else if (e.key === '-') setZoom((z) => clampZoom(z / 1.5));
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

  // ── anime.js: lift the layers apart, or lay them on one map ──
  useEffect(() => {
    PLANES.forEach((plane, index) => {
      const el = planeRefs.current[plane.id];
      if (!el) return;
      const z = isExploded ? plane.z : index * 2;
      const shown = isShown(plane.id);
      animate(el, { translateZ: shown ? z : z + 40, opacity: shown ? 1 : 0, duration: 700, delay: index * 60, ease: 'outQuint' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExploded, soloId, hidden]);

  // ── anime.js: pulsing incident rings ──
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const pulse = animate('.gis-pulse-node', {
      scale: [1, 2.6],
      opacity: [0.55, 0],
      duration: 2000,
      loop: true,
      ease: 'outQuad',
      delay: stagger(250),
    });
    return () => {
      pulse.pause();
    };
  }, [activeIncidents.length]);

  // ── drag: turn the map in 3D, pan when zoomed in ──
  const panning = zoom > 1.05 || cameraAngle === 'topdown';
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, .interactive-node, .layer-panel, .focus-card')) return;
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
    // Screen drag → plane drag: undo the camera's turn and tilt.
    const rz = ((cameraAngle === 'isometric' ? userRotationZ : cameraAngle === 'side' ? -36 : 0) * Math.PI) / 180;
    const tilt = Math.cos(((cameraAngle === 'isometric' ? 52 : cameraAngle === 'side' ? 70 : 0) * Math.PI) / 180);
    const lx = dx * Math.cos(-rz) - dy * Math.sin(-rz);
    const ly = (dx * Math.sin(-rz) + dy * Math.cos(-rz)) / Math.max(0.3, tilt);
    const w = planeW;
    const h = planeW / PLANE_RATIO;
    setCenter({
      x: Math.min(100, Math.max(0, basePanRef.current.x - (lx / w) * 100)),
      y: Math.min(100, Math.max(0, basePanRef.current.y - (ly / h) * 100)),
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
    return { left: `${p.x}%`, top: `${p.y}%`, pointerEvents: 'auto' };
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
  const planeLabel = (text: string, color: string) =>
    isExploded && (
      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900/85 border border-white/10 text-slate-200 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {text}
      </span>
    );

  // Faint footprints of the planes above, so lifted points can be matched to the map.
  const footprints = (below: PlaneId) => {
    if (!isExploded) return null;
    const order = PLANES.findIndex((p) => p.id === below);
    return (
      <>
        {order < 1 && isShown('facilities') && facilities.map((f) => (
          <span key={`fp-${f.id}`} className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ ...at(f.lat, f.lng), pointerEvents: 'none', background: `${FACILITY_STYLE[f.kind].color}66` }} />
        ))}
        {order < 2 && isShown('response') && deployableTeams.map((t) => (
          <span key={`fp-${t.id}`} className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-cyan-600/40" style={{ ...at(Number(t.coordinates[0]), Number(t.coordinates[1])), pointerEvents: 'none' }} />
        ))}
        {order < 3 && isShown('incidents') && activeIncidents.map((i) => (
          <span key={`fp-${i.id}`} className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500/60 bg-red-500/10" style={{ ...at(i.coordinates[0], i.coordinates[1]), pointerEvents: 'none' }} />
        ))}
      </>
    );
  };

  return (
    <div
      ref={viewportRef}
      tabIndex={0}
      aria-label="GIS map. Scroll or press plus and minus to zoom, Escape to reset."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={(e) => {
        if (!(e.target as HTMLElement).closest('button, .interactive-node, .layer-panel, .focus-card')) resetView();
      }}
      className={`relative w-full h-[620px] overflow-hidden select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ background: 'radial-gradient(ellipse at 50% 35%, #1e293b 0%, #0b1220 100%)' }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415533_1px,transparent_1px),linear-gradient(to_bottom,#33415533_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] pointer-events-none" />

      {/* ── View controls ── */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className={`${panel} flex items-center gap-2 px-3 py-1.5 rounded-xl pointer-events-auto`}>
          <Layers size={14} className="text-sky-300" />
          <span className="text-xs font-semibold text-slate-100">Layer view</span>
          {loadingGis && <span className="text-[11px] text-slate-400">loading facilities…</span>}
        </div>
        <div className={`${panel} flex items-center gap-1.5 p-1 rounded-xl pointer-events-auto`}>
          <div className="flex bg-white/5 p-0.5 rounded-lg">
            {([
              ['topdown', 'Flat'],
              ['isometric', 'Tilted'],
              ['side', 'Profile'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setCameraAngle(id);
                  if (id === 'isometric') setUserRotationZ(-18);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  cameraAngle === id ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setIsExploded((v) => !v);
              if (!isExploded && cameraAngle === 'topdown') setCameraAngle('isometric');
            }}
            title={isExploded ? 'Lay every layer on one map' : 'Lift the layers apart to compare them'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
              isExploded ? 'bg-blue-500/20 text-blue-200 border-blue-400/40' : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
            }`}
          >
            {isExploded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            {isExploded ? 'Stack layers' : 'Separate layers'}
          </button>
        </div>
      </div>

      {/* ── 3D viewport ── */}
      <div className="absolute inset-0 flex items-center justify-center [perspective:1600px]">
        <div
          ref={stackRef}
          className="relative shrink-0 [transform-style:preserve-3d] origin-center"
          style={{ width: baseW, height: baseW / PLANE_RATIO }}
        >
          <div ref={panRef} className="absolute inset-0 [transform-style:preserve-3d]">
            {/* Ground: real basemap + flood hotspots */}
            <div
              ref={(el) => {
                planeRefs.current.base = el;
              }}
              className={`${planeCls} border border-sky-300/25 bg-[#0f172a] shadow-[0_30px_70px_-30px_rgba(0,0,0,.8)]`}
            >
              <BaseTiles widthPx={tileW} center={tileCenter} zoom={tileW / baseW} />
              {floods.map((f) => (
                <div
                  key={f.id}
                  style={at(f.lat, f.lng)}
                  className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-sky-300/20 border border-sky-300/60 cursor-pointer"
                  {...hover({ title: f.name, lines: ['Flood hotspot (JPS)'] }, f.lat, f.lng)}
                />
              ))}
              {footprints('base')}
              {/* Search pin — lives on the base layer so it shows regardless of upper layer visibility */}
              {pin && (
                <div style={at(pin.lat, pin.lng)} className="absolute -translate-x-1/2 -translate-y-full z-40 pointer-events-none">
                  <MapPin size={32} fill={C.pin} stroke="#0f172a" strokeWidth={1.5} className="drop-shadow-[0_2px_6px_rgba(59,130,246,0.8)]" />
                </div>
              )}
              <span className="absolute bottom-1 right-1.5 text-[9px] text-slate-400 bg-slate-900/70 px-1 rounded pointer-events-none">
                © OpenStreetMap contributors
              </span>
            </div>

            {/* Facilities */}
            <div
              ref={(el) => {
                planeRefs.current.facilities = el;
              }}
              className={`${planeCls} border ${glass('border-amber-300/35 bg-slate-900/25')}`}
            >
              {footprints('facilities')}
              {facilities.map((f) => (
                <div
                  key={f.id}
                  style={at(f.lat, f.lng)}
                  className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                  {...hover({ title: f.name, lines: [f.sub] }, f.lat, f.lng)}
                >
                  <div className="w-4 h-4 rounded-[5px] border-2 border-slate-900 flex items-center justify-center shadow hover:scale-125 transition-transform"
                    style={{ background: FACILITY_STYLE[f.kind].color }}>
                    {FACILITY_STYLE[f.kind].icon}
                  </div>
                </div>
              ))}
              {planeLabel(`Facilities · ${facilities.length}`, '#d97706')}
            </div>

            {/* Rescue teams */}
            <div
              ref={(el) => {
                planeRefs.current.response = el;
              }}
              className={`${planeCls} border ${glass('border-cyan-300/35 bg-slate-900/25')}`}
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
                      `${t.agency} · rescue team`,
                      `Status: ${t.status}`,
                      t.available_personnel != null ? `Personnel free: ${t.available_personnel} of ${t.total_personnel ?? t.personnel_count}` : `Personnel: ${t.personnel_count}`,
                    ],
                  }, Number(t.coordinates[0]), Number(t.coordinates[1]))}
                >
                  <div
                    className="w-3.5 h-3.5 rotate-45 border-2 border-slate-900 shadow hover:scale-125 transition-transform"
                    style={{ background: t.status === 'Available' ? C.team : t.status === 'Off Duty' ? C.teamOff : C.teamBusy }}
                  />
                </div>
              ))}
              {planeLabel(`Rescue teams · ${deployableTeams.length}`, '#0891b2')}
            </div>

            {/* Incidents + AI forecasts, with links to the nearest support */}
            <div
              ref={(el) => {
                planeRefs.current.incidents = el;
              }}
              className={`${planeCls} border ${glass('border-red-300/35 bg-slate-900/25')}`}
            >
              {showLinks && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                  {links.map(({ inc, relief, team }) => {
                    const a = planePosition(inc.coordinates[0], inc.coordinates[1]);
                    return (
                      <g key={inc.id}>
                        {relief && relief.d <= 80 && (() => {
                          const b = planePosition(relief.item.lat, relief.item.lng);
                          return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.reliefLink} strokeOpacity={0.7} strokeWidth={1.4} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />;
                        })()}
                        {team && team.d <= 300 && (() => {
                          const b = planePosition(Number(team.item.coordinates[0]), Number(team.item.coordinates[1]));
                          return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.teamLink} strokeOpacity={0.7} strokeWidth={1.4} strokeDasharray="1.5 3" vectorEffect="non-scaling-stroke" />;
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
                      title: `AI forecast: ${p.hazard_type ?? 'Hazard'}${p.district ? ` · ${p.district}` : ''}`,
                      lines: [
                        'Forecast, not an incident yet',
                        `Hazard score: ${p.hazard_score ?? 'n/a'} / 100`,
                        `Confidence: ${p.confidence ?? 'n/a'}%`,
                        `Expected: ${p.projected_within_hours === 0 ? 'Now' : p.projected_within_hours != null ? `In about ${p.projected_within_hours} h` : 'Timing unknown'}`,
                      ],
                    }, Number(p.lat), Number(p.lng), { zoomTo: 2.5 })}
                  >
                    <div className="w-6 h-6 rounded-full border-[1.5px] border-dashed border-violet-300/70 bg-slate-900/60 flex items-center justify-center hover:scale-125 transition-transform">
                      {p.hazard_type === 'Haze' ? <CloudFog size={11} className="text-violet-300" /> : <AlertTriangle size={10} className="text-violet-300" />}
                    </div>
                  </div>
                ))}
              {links.map(({ inc, relief, team }) => {
                const affected = inc.field_verification?.affected_population === 'unknown' ? undefined : inc.affected_population || undefined;
                const color = SEVERITY_COLOR[inc.severity ?? ''] ?? '#dc2626';
                return (
                  <div
                    key={inc.id}
                    style={at(inc.coordinates[0], inc.coordinates[1])}
                    className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer"
                    {...hover({
                      title: inc.title,
                      lines: [
                        { text: `${inc.display_id ?? 'Incident'} · ${inc.district}, ${inc.state}`, className: 'text-sky-300 font-semibold' },
                        ...(inc.severity ? [`Severity: ${inc.severity}`] : []),
                        `People affected: ${affected ? `${affected.toLocaleString()} reported` : 'Not reported'}`,
                        `Nearest relief centre: ${relief ? `${relief.item.name} · ${relief.d.toFixed(1)} km` : 'No data'}`,
                        `Nearest free team: ${team ? `${team.item.name} · ${team.d.toFixed(0)} km` : 'None located'}`,
                      ],
                    }, inc.coordinates[0], inc.coordinates[1], { zoomTo: 4.5, incident: inc })}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="gis-pulse-node absolute w-6 h-6 rounded-full" style={{ background: `${color}40` }} />
                      <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-900 flex items-center justify-center text-slate-900 shadow-md hover:scale-125 transition-transform" style={{ background: color }}>
                        <AlertTriangle size={9} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* pin is now rendered on the base layer */}
              {planeLabel(`Incidents · ${activeIncidents.length}`, '#dc2626')}
            </div>
          </div>
        </div>
      </div>

      {/* ── Zoom ── */}
      <div className={`${panel} absolute left-3 top-1/2 -translate-y-1/2 z-30 flex flex-col rounded-xl overflow-hidden`}>
        <button type="button" onClick={() => setZoom((z) => clampZoom(z * 1.5))} title="Zoom in (+)" aria-label="Zoom in" className="p-2 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer">
          <Plus size={15} />
        </button>
        <button type="button" onClick={() => setZoom((z) => { const n = clampZoom(z / 1.5); if (n === 1) setCenter({ x: 50, y: 50 }); return n; })} title="Zoom out (−)" aria-label="Zoom out" className="p-2 text-slate-300 hover:text-white hover:bg-white/10 border-t border-white/10 cursor-pointer">
          <MinusIcon size={15} />
        </button>
        <button type="button" onClick={resetView} disabled={zoom === 1 && !focused} title="Whole country (Esc)" aria-label="Whole country" className="p-2 text-slate-300 hover:text-white hover:bg-white/10 border-t border-white/10 cursor-pointer disabled:opacity-30 disabled:cursor-default">
          <LocateFixed size={15} />
        </button>
        <span className="text-[10px] font-semibold text-slate-400 text-center py-1 border-t border-white/10 tabular-nums">{zoom.toFixed(1)}×</span>
      </div>

      {/* ── Pinned details ── */}
      {focused && (
        <div className={`${panel} focus-card absolute top-16 left-16 z-40 w-72 rounded-xl p-3.5 cursor-default`}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-white leading-snug">{focused.title}</p>
            <button type="button" onClick={() => { setFocused(null); setPin(null); }} className="text-slate-400 hover:text-slate-200 cursor-pointer" aria-label="Close">
              <X size={14} />
            </button>
          </div>
          {focused.lines.length > 0 && (
            <ul className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
              {focused.lines.map((l, i) => <DetailLine key={i} text={l} />)}
            </ul>
          )}
          {focused.incident && (
            <button
              type="button"
              onClick={() => onSelectIncident(focused.incident!)}
              className="mt-3 w-full px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              Open situation report
            </button>
          )}
        </div>
      )}

      {/* ── Layers ── */}
      <div className={`${panel} layer-panel absolute bottom-3 right-3 z-30 w-64 rounded-xl p-2 space-y-0.5 cursor-default`}>
        <p className="px-2 pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Layers</p>
        {[...PLANES].reverse().map((plane) => {
          const off = hidden[plane.id];
          const dimmed = !!soloId && soloId !== plane.id && plane.id !== 'base';
          return (
            <div
              key={plane.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${soloId === plane.id ? 'bg-white/10' : 'hover:bg-white/5'} ${off || dimmed ? 'opacity-50' : ''}`}
            >
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: plane.color }} />
              <button
                type="button"
                onClick={() => plane.id !== 'base' && setSoloId((s) => (s === plane.id ? null : plane.id))}
                title={plane.id === 'base' ? undefined : soloId === plane.id ? 'Show all layers' : 'Show only this layer'}
                className="flex-1 min-w-0 text-left text-xs font-medium text-slate-200 truncate cursor-pointer"
              >
                {plane.name}
              </button>
              <span className="text-[11px] font-semibold text-slate-400 tabular-nums">{counts[plane.id]}</span>
              <button
                type="button"
                onClick={() => setHidden((h) => ({ ...h, [plane.id]: !h[plane.id] }))}
                title={off ? 'Show layer' : 'Hide layer'}
                aria-label={off ? `Show ${plane.name}` : `Hide ${plane.name}`}
                className="p-0.5 rounded text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                {off ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          );
        })}
        <div className="border-t border-white/10 mt-1 pt-2 px-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-300">
          {(Object.keys(FACILITY_STYLE) as FacilityKind[]).filter((k) => facilities.some((f) => f.kind === k)).map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: FACILITY_STYLE[k].color }} />
              {FACILITY_STYLE[k].label}
            </span>
          ))}
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rotate-45" style={{ background: C.team }} />Free team</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-dashed border-violet-300" />AI forecast</span>
        </div>
        <div className="flex items-center gap-1.5 px-1 pt-2">
          <button
            type="button"
            onClick={() => setNearOnly((v) => !v)}
            className={`flex-1 px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer border ${
              nearOnly ? 'bg-amber-400/15 text-amber-200 border-amber-400/30' : 'bg-white/5 text-slate-300 border-white/10'
            }`}
            title={`Facilities and flood hotspots within ${NEARBY_KM} km of an active incident`}
          >
            {nearOnly ? `Within ${NEARBY_KM} km of incidents` : 'All facilities'}
          </button>
          <button
            type="button"
            onClick={() => setShowLinks((v) => !v)}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer border ${
              showLinks ? 'bg-cyan-400/15 text-cyan-200 border-cyan-400/30' : 'bg-white/5 text-slate-300 border-white/10'
            }`}
            title="Dashed lines: each incident to its nearest relief centre (teal) and nearest free team (cyan)"
          >
            Links
          </button>
        </div>
      </div>

      <div className={`${panel} absolute bottom-3 left-3 z-20 pointer-events-none flex items-center gap-1.5 text-[11px] text-slate-400 px-2.5 py-1 rounded-lg`}>
        <MoveHorizontal size={13} className="text-sky-300" />
        <span>{panning ? 'Drag to move · scroll to zoom · double-click for the whole country' : 'Drag to turn · scroll to zoom · click a point'}</span>
      </div>

      {hovered && (
        <div className={`${panel} absolute top-16 left-1/2 -translate-x-1/2 z-40 px-3 py-2 rounded-xl max-w-sm pointer-events-none`}>
          <p className="text-xs font-semibold text-white leading-snug">{hovered.title}</p>
          <ul className="mt-1 space-y-1">{hovered.lines.map((l, i) => <DetailLine key={i} text={l} compact />)}</ul>
        </div>
      )}
    </div>
  );
};
