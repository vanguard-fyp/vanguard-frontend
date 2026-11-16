import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { animate, stagger } from 'animejs';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  CloudFog,
  Cross,
  EyeOff,
  Flame,
  Globe2,
  Home,
  Layers,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Minus as MinusIcon,
  Plus,
  Shield,
  Stethoscope,
  Warehouse as WarehouseIcon,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Gis3DLayerExplorerProps, GISLayerState, Incident, MapPOI } from '../../../types';
import type { HazardPrediction } from '../../../types/intelligence';
import { facilityToPoi, incidentMatchesLayers } from '../../../utils/mapLayers';
import { NEARBY_RADIUS_KM, useGisLayers, useNearbyFacilities } from '../../../hooks/useGeo';
import { useIncidentAssessment } from '../../../hooks/useIntelligence';
import { useHazardPredictions, useRescueTeams } from '../../../hooks';

/** Bottom to top: the map, what threatens, what can help, who can respond, the incident itself. */
type PlaneId = 'base' | 'hazard' | 'facilities' | 'response' | 'incidents';

/* Dark GIS theme in the sidebar navy. Colour = meaning, in soft 300–400 shades
   so markers read clearly without glare: red incidents (by severity), sky/violet
   hazards, amber facilities, cyan teams, blue the searched place. */
const C = {
  flood: '#38bdf8',
  depot: '#f59e0b',
  fire: '#f97316',
  relief: '#2dd4bf',
  team: '#22d3ee',
  teamBusy: '#06b6d4',
  teamOff: '#64748b',
  forecast: '#a78bfa',
  pin: '#3b82f6',
  incident: '#f87171',
};
const PLANES: { id: PlaneId; name: string; color: string; z: number }[] = [
  { id: 'base', name: 'Map', color: '#94a3b8', z: 0 },
  { id: 'hazard', name: 'Hazard', color: C.flood, z: 70 },
  { id: 'facilities', name: 'Facilities', color: C.depot, z: 140 },
  { id: 'response', name: 'Rescue teams', color: C.team, z: 210 },
  { id: 'incidents', name: 'Incidents', color: C.incident, z: 280 },
];
const PLANE_Z: Record<PlaneId, number> = Object.fromEntries(PLANES.map((p) => [p.id, p.z])) as Record<PlaneId, number>;
const PLANE_COLOR: Record<PlaneId, string> = Object.fromEntries(PLANES.map((p) => [p.id, p.color])) as Record<PlaneId, string>;

/** Country view: facilities further than this from every active incident are hidden in "near incidents" mode. */
const NEARBY_KM = 30;
/** Incident focus: what counts as "around" the incident, and the rings drawn on the map. */
const FOCUS_KM = 30;
const RINGS_KM = [5, 10, 30];
/** The focused map is 144 × 72 km, so the 30 km ring fits with room for labels. */
const FOCUS_HALF_W_KM = 72;
const FOCUS_HALF_H_KM = 36;
/** 40× on the 144 km focused map is about 3.5 km across: street level. */
const MAX_ZOOM = 40;
const MAX_PER_KIND = 250;

type Bounds = { north: number; south: number; west: number; east: number };
// Country view: points are placed by their real coordinates inside Malaysia's bounding box.
const MY_BOUNDS: Bounds = { north: 7.4, south: 0.8, west: 99.6, east: 119.3 };
const COUNTRY_RATIO = (MY_BOUNDS.east - MY_BOUNDS.west) / (MY_BOUNDS.north - MY_BOUNDS.south); // ≈ 3 : 1
const FOCUS_RATIO = FOCUS_HALF_W_KM / FOCUS_HALF_H_KM;
const KM_PER_DEG = 111.32;
const localBounds = (lat: number, lng: number): Bounds => {
  const dLat = FOCUS_HALF_H_KM / KM_PER_DEG;
  const dLng = FOCUS_HALF_W_KM / (KM_PER_DEG * Math.cos((lat * Math.PI) / 180));
  return { north: lat + dLat, south: lat - dLat, west: lng - dLng, east: lng + dLng };
};
const project = (b: Bounds, lat: number, lng: number) => ({
  x: Math.min(99.5, Math.max(0.5, ((lng - b.west) / (b.east - b.west)) * 100)),
  y: Math.min(99.5, Math.max(0.5, ((b.north - lat) / (b.north - b.south)) * 100)),
});
const inBounds = (b: Bounds, lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
const inMalaysia = (lat: number, lng: number) => inBounds(MY_BOUNDS, lat, lng);

const km = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const fmtKm = (d: number) => `${d < 10 ? d.toFixed(1) : Math.round(d)} km`;

/* ── Real basemap on the ground plane ───────────────────────────────────────
   Web-map tiles laid out by their lat/lng edges. The tile zoom follows the
   plane's on-screen width, so zooming in loads sharper tiles instead of
   stretching one small picture. */
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

type Tile = { key: string; src: string; left: number; top: number; w: number; h: number };
const tilesFor = (bounds: Bounds, z: number, keep: (l: number, t: number, w: number, h: number) => boolean): Tile[] => {
  const lngSpan = bounds.east - bounds.west;
  const latSpan = bounds.north - bounds.south;
  const x0 = Math.floor(lngToTileX(bounds.west, z));
  const x1 = Math.floor(lngToTileX(bounds.east, z));
  const y0 = Math.floor(latToTileY(bounds.north, z));
  const y1 = Math.floor(latToTileY(bounds.south, z));
  const tiles: Tile[] = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const w = tileXToLng(x, z), e = tileXToLng(x + 1, z);
      const n = tileYToLat(y, z), s = tileYToLat(y + 1, z);
      const left = ((w - bounds.west) / lngSpan) * 100;
      const top = ((bounds.north - n) / latSpan) * 100;
      const tw = ((e - w) / lngSpan) * 100;
      const th = ((n - s) / latSpan) * 100;
      if (!keep(left, top, tw, th)) continue;
      tiles.push({ key: `${z}-${x}-${y}`, src: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, left, top, w: tw, h: th });
    }
  }
  return tiles;
};
const TileLayer: React.FC<{ tiles: Tile[]; fade?: boolean }> = ({ tiles, fade }) => (
  <>
    {tiles.map((t) => (
      <img
        key={t.key}
        src={t.src}
        alt=""
        draggable={false}
        decoding="async"
        onLoad={fade ? (e) => { e.currentTarget.style.opacity = '1'; } : undefined}
        className={`absolute max-w-none select-none pointer-events-none ${fade ? 'transition-opacity duration-300' : ''}`}
        // A hair of overlap hides seams between tiles.
        style={{ opacity: fade ? 0 : undefined, left: `${t.left}%`, top: `${t.top}%`, width: `calc(${t.w}% + 1px)`, height: `calc(${t.h}% + 1px)` }}
      />
    ))}
  </>
);

/**
 * Two tile layers: a coarse one for the whole plane that stays mounted, and a
 * sharper one for the area in view when zoomed in. The coarse layer is always
 * underneath, so changing zoom level never shows an empty map (no blinking).
 */
const BaseTiles: React.FC<{ bounds: Bounds; baseWidthPx: number; widthPx: number; center: { x: number; y: number }; zoom: number }> = React.memo(({ bounds, baseWidthPx, widthPx, center, zoom }) => {
  const lngSpan = bounds.east - bounds.west;
  // One 256 px tile per ~256 css px on the plane (~128 px on high-density screens, for sharpness).
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio > 1.25 ? 1 : 0;
  const zFor = (px: number) => Math.min(16, Math.max(5, Math.round(Math.log2((px * 360) / (lngSpan * 256))) + dpr));
  const z0 = zFor(baseWidthPx);
  const z = zFor(widthPx);
  const halfX = Math.min(50, 85 / zoom);
  const halfY = Math.min(50, 150 / zoom);
  const coarse = useMemo(() => tilesFor(bounds, z0, () => true), [bounds, z0]);
  const detail = z > z0
    ? tilesFor(bounds, z, (l, t, w, h) => l + w >= center.x - halfX && l <= center.x + halfX && t + h >= center.y - halfY && t <= center.y + halfY)
    : [];
  // The previous detail level stays under the new one until it has loaded.
  const last = useRef<{ z: number; tiles: Tile[] }>({ z, tiles: [] });
  const under = useRef<Tile[]>([]);
  if (last.current.z !== z) under.current = last.current.tiles;
  last.current = { z, tiles: detail };
  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl" aria-hidden="true"
      style={{ filter: 'invert(1) hue-rotate(185deg) brightness(0.9) contrast(0.85) saturate(0.45)' }}>
      <TileLayer tiles={coarse} />
      <TileLayer tiles={z > z0 ? under.current : []} />
      <TileLayer tiles={detail} fade />
    </div>
  );
});

const SEVERITY_COLOR: Record<string, string> = { Critical: '#f87171', High: '#fb923c', Medium: '#fbbf24', Low: '#94a3b8' };
const SEVERITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const sevColor = (s?: string | null) => SEVERITY_COLOR[s ?? ''] ?? '#dc2626';

type FacilityKind = 'depot' | 'fire' | 'relief' | 'hospital' | 'clinic' | 'police';
const FACILITY_STYLE: Record<FacilityKind, { label: string; one: string; color: string; Icon: LucideIcon }> = {
  relief: { label: 'Relief centres', one: 'Relief centre', color: C.relief, Icon: Home },
  hospital: { label: 'Hospitals', one: 'Hospital', color: '#f472b6', Icon: Cross },
  clinic: { label: 'Clinics & pharmacies', one: 'Clinic / pharmacy', color: '#5eead4', Icon: Stethoscope },
  police: { label: 'Police', one: 'Police', color: '#93c5fd', Icon: Shield },
  fire: { label: 'Fire stations', one: 'Fire station', color: C.fire, Icon: Flame },
  depot: { label: 'Depots', one: 'Depot', color: C.depot, Icon: WarehouseIcon },
};
const FACILITY_ORDER = Object.keys(FACILITY_STYLE) as FacilityKind[];
/** Looked up around the focused incident by the nearby-places search, not in the GIS layers. */
const SEARCHED_KINDS: FacilityKind[] = ['hospital', 'clinic', 'police'];

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
  /** km from the focused incident (incident focus only) */
  d?: number;
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

/** Name tag beside a marker (incident focus). */
const MarkerLabel: React.FC<{ text: string; strong?: boolean }> = ({ text, strong }) => (
  <span
    className={`absolute left-full ml-1.5 top-1/2 -translate-y-1/2 whitespace-nowrap px-1.5 py-0.5 rounded-md text-[10px] font-semibold border pointer-events-none ${
      strong ? 'bg-white text-slate-900 border-white' : 'bg-slate-900/85 text-slate-100 border-white/10'
    }`}
  >
    {text}
  </span>
);

const panel = 'bg-[#1e293b]/90 backdrop-blur-md border border-white/10 shadow-[0_12px_32px_-12px_rgba(0,0,0,.6)]';
const hoursText = (h: number | null | undefined) => (h === 0 ? 'Now' : h != null ? `In about ${h} h` : 'Timing unknown');

export const Gis3DLayerExplorer: React.FC<Gis3DLayerExplorerProps & { focusTarget?: GisFocusTarget | null }> = ({
  layers,
  incidents,
  pois,
  nearbyPois = [],
  onSelectIncident,
  focusTarget,
}) => {
  const [isExploded, setIsExploded] = useState(true);
  const [soloId] = useState<PlaneId | null>(null);
  const [hidden, setHidden] = useState<Record<PlaneId, boolean>>({ base: false, hazard: false, facilities: false, response: false, incidents: false });
  const [nearOnly, setNearOnly] = useState(true);
  const [showLinks, setShowLinks] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  /** The incident list can be folded away so it never covers the map. */
  const [listOpen, setListOpen] = useState(false);
  /** Which card section is unfolded (one at a time). */
  const [openSection, setOpenSection] = useState<PlaneId | null>(null);
  const [cameraAngle, setCameraAngle] = useState<'isometric' | 'topdown' | 'side'>('isometric');
  const [hovered, setHovered] = useState<Hover | null>(null);
  const [pin, setPin] = useState<GisFocusTarget | null>(null);
  /** The incident the layers are centred on; null = whole country. */
  const [focusId, setFocusId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

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
  // browser re-renders markers, lines and tiles at full resolution. The side
  // panels take ~560 px, so the plane is sized to the space between them.
  const [baseW, setBaseW] = useState(720);
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBaseW(Math.max(320, Math.min((e.contentRect.width - 560) * 1.3, 980))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 50, y: 50 });
  const [focused, setFocused] = useState<Hover | null>(null);
  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(1, z));
  const resetView = () => {
    setZoom(1);
    setCenter({ x: 50, y: 50 });
    setFocused(null);
    setPin(null);
  };
  /** Centre every layer on one incident (or the whole country with null). */
  const selectIncident = (id: string | null) => {
    setFocusId(id);
    if (id) setListOpen(false);
    setOpenSection(null);
    setHighlightId(null);
    setHovered(null);
    resetView();
  };

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
  /** Worst first: severity, then the AI priority score. */
  const sortedIncidents = useMemo(
    () => [...activeIncidents].sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) || (b.ai_priority_score ?? -1) - (a.ai_priority_score ?? -1)),
    [activeIncidents]
  );
  const focusInc = focusId ? activeIncidents.find((i) => i.id === focusId) ?? null : null;
  const fLat = focusInc?.coordinates[0];
  const fLng = focusInc?.coordinates[1];
  const bounds = useMemo(() => (fLat != null && fLng != null ? localBounds(fLat, fLng) : MY_BOUNDS), [fLat, fLng]);
  const ratio = focusInc ? FOCUS_RATIO : COUNTRY_RATIO;
  const pos = (lat: number, lng: number) => project(bounds, lat, lng);
  const dFocus = (lat: number, lng: number) => (fLat != null && fLng != null ? km(fLat, fLng, lat, lng) : 0);

  // Hospitals, clinics and police around the focused incident (one lookup per incident, cached).
  const focusPoint = useMemo(() => (fLat != null && fLng != null ? { lat: fLat, lng: fLng } : null), [fLat, fLng]);
  const nearbyQ = useNearbyFacilities(focusPoint);
  const assessQ = useIncidentAssessment(focusInc?.id);
  const assessment = assessQ.data?.current ?? assessQ.data?.last_usable ?? null;
  const impactKm = assessment?.population?.impact_radius_km ?? null;

  // A search result from the page toolbar: leave incident focus, glide there and drop a pin.
  useEffect(() => {
    if (!focusTarget) return;
    setFocusId(null);
    setHighlightId(null);
    if (!inMalaysia(focusTarget.lat, focusTarget.lng)) {
      setPin(null);
      setFocused({ title: focusTarget.label, lines: ['Outside the Malaysia map extent'] });
      return;
    }
    setPin(focusTarget);
    setCenter(project(MY_BOUNDS, focusTarget.lat, focusTarget.lng));
    setZoom((cur) => Math.max(cur, 5));
    setFocused({ title: focusTarget.label, lines: focusTarget.detail ? [focusTarget.detail] : [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget?.timestamp]);

  // When the search is cleared (focusTarget → null), remove the pin and focused card.
  useEffect(() => {
    if (!focusTarget) {
      setPin(null);
      setFocused(null);
    }
  }, [focusTarget]);

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

  const poiFacilities = (list: MapPOI[], prefix: string, withDetails: boolean): Facility[] =>
    list.flatMap((p) => {
      const kind = POI_KIND[p.category];
      if (!kind || !inMalaysia(p.coordinates[0], p.coordinates[1])) return [];
      const sub = withDetails && p.details ? `${p.category} · ${p.details}` : p.category;
      return [{ id: `${prefix}-${p.id}`, name: p.name, lat: p.coordinates[0], lng: p.coordinates[1], sub, kind }];
    });
  const incidentNearby = useMemo(() => (focusPoint ? (nearbyQ.data ?? []).map(facilityToPoi) : []), [focusPoint, nearbyQ.data]);

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
  const isFree = (t: (typeof deployableTeams)[number]) => t.status === 'Available' || (t.available_personnel ?? 0) > 0;

  const nearAnIncident = (lat: number, lng: number) =>
    activeIncidents.some((i) => km(lat, lng, i.coordinates[0], i.coordinates[1]) <= NEARBY_KM);

  // ── What each plane shows: everything within FOCUS_KM of the focused incident, or the country ──
  const facilities: Facility[] = useMemo(() => {
    if (focusInc) {
      const seen = new Set<string>();
      const out: Facility[] = [];
      [...allFacilities, ...poiFacilities(incidentNearby, 'inc', false), ...poiFacilities(nearbyPois, 'nearby', false)].forEach((f) => {
        if (!layers[FACILITY_LAYER[f.kind]]) return;
        const d = dFocus(f.lat, f.lng);
        if (d > FOCUS_KM) return;
        // The same place can come from the GIS layer and the nearby search.
        const key = `${f.kind}:${f.name.trim().toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ ...f, d });
      });
      return out.sort((a, b) => (a.d ?? 0) - (b.d ?? 0)).slice(0, 120);
    }
    const list = nearOnly ? allFacilities.filter((f) => nearAnIncident(f.lat, f.lng)) : allFacilities;
    const perKind: Record<FacilityKind, number> = { depot: 0, fire: 0, relief: 0, hospital: 0, clinic: 0, police: 0 };
    return [...list.filter((f) => ++perKind[f.kind] <= MAX_PER_KIND), ...poiFacilities(nearbyPois, 'nearby', true)].filter((f) => layers[FACILITY_LAYER[f.kind]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFacilities, incidentNearby, nearbyPois, nearOnly, activeIncidents, layers, focusInc?.id]);

  const floods: Point[] = useMemo(() => {
    if (!layers.floodAreas) return [];
    if (focusInc) {
      return floodHotspots
        .map((f) => ({ ...f, d: dFocus(f.lat, f.lng) }))
        .filter((f) => f.d <= FOCUS_KM)
        .sort((a, b) => a.d - b.d);
    }
    return (nearOnly ? floodHotspots.filter((f) => nearAnIncident(f.lat, f.lng)) : floodHotspots).slice(0, MAX_PER_KIND);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floodHotspots, nearOnly, activeIncidents, layers.floodAreas, focusInc?.id]);

  const forecasts: (HazardPrediction & { d?: number })[] = useMemo(() => {
    const located = predictions.filter((p) => p.lat != null && p.lng != null && inMalaysia(Number(p.lat), Number(p.lng)));
    if (!focusInc) return located;
    // District-level forecasts sit at district centres, so the whole focused map counts, not just the 30 km ring.
    return located
      .filter((p) => inBounds(bounds, Number(p.lat), Number(p.lng)))
      .map((p) => ({ ...p, d: dFocus(Number(p.lat), Number(p.lng)) }))
      .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions, focusInc?.id, bounds]);

  // Nearest relief centre and nearest available team per incident (any distance).
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
        const team = nearest(deployableTeams.filter(isFree), (t) => [Number(t.coordinates[0]), Number(t.coordinates[1])]);
        return { inc, relief, team };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIncidents, allFacilities, deployableTeams]
  );
  const focusLink = focusInc ? links.find((l) => l.inc.id === focusInc.id) ?? null : null;

  type TeamRow = (typeof deployableTeams)[number] & { d?: number; outside?: boolean };
  const teamsShown: TeamRow[] = useMemo(() => {
    if (!focusInc) return deployableTeams;
    const inside: TeamRow[] = deployableTeams
      .filter((t) => inBounds(bounds, Number(t.coordinates[0]), Number(t.coordinates[1])))
      .map((t) => ({ ...t, d: dFocus(Number(t.coordinates[0]), Number(t.coordinates[1])) }));
    // The nearest free team is always shown; outside the map it sits on the edge, pointing its way.
    const nearest = focusLink?.team;
    if (nearest && !inside.some((t) => t.id === nearest.item.id)) inside.push({ ...nearest.item, d: nearest.d, outside: true });
    return inside.sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployableTeams, focusInc?.id, bounds, focusLink]);

  const incidentsShown = useMemo(
    () => (focusInc ? activeIncidents.filter((i) => inBounds(bounds, i.coordinates[0], i.coordinates[1])) : activeIncidents),
    [activeIncidents, focusInc, bounds]
  );

  // Labels in focus mode: the nearest of each kind, the nearest free team, the nearest forecast, and whatever is highlighted.
  const nearestByKind = useMemo(() => {
    const m: Partial<Record<FacilityKind, Facility>> = {};
    facilities.forEach((f) => { if (!m[f.kind]) m[f.kind] = f; });
    return m;
  }, [facilities]);
  /** The two nearest of each kind are always drawn in full; the rest are small dots until zoomed in. */
  const primaryIds = useMemo(() => {
    const s = new Set<string>();
    const seen: Partial<Record<FacilityKind, number>> = {};
    facilities.forEach((f) => {
      seen[f.kind] = (seen[f.kind] ?? 0) + 1;
      if ((seen[f.kind] ?? 0) <= 2) s.add(f.id);
    });
    return s;
  }, [facilities]);
  /** Name tags are shown only for the point the officer picked. */
  const labelIds = useMemo(() => new Set<string>(highlightId ? [highlightId] : []), [highlightId]);

  const counts: Record<PlaneId, string> = {
    base: focusInc ? `${FOCUS_KM} km` : '',
    hazard: String(floods.length + forecasts.length),
    facilities: String(facilities.length),
    response: String(focusInc ? teamsShown.filter((t) => !t.outside).length : deployableTeams.length),
    incidents: String(incidentsShown.length),
  };
  /** Layers are lifted apart only in the tilted views; Flat is always one map. */
  const lifted = isExploded && cameraAngle !== 'topdown';
  /** Every marker is drawn at full size once the officer zooms in. */
  const tactical = zoom >= 3;
  const loadingGis = fireQ.isLoading || reliefQ.isLoading || floodQ.isLoading;
  // A layer that is switched off still shows the one point picked from the card.
  const only = <T extends { id: string }>(off: boolean, list: T[]) => (off ? list.filter((x) => x.id === highlightId) : list);
  const floodsDrawn = only(hidden.hazard, floods);
  const forecastsDrawn = only(hidden.hazard, forecasts);
  const facilitiesDrawn = only(hidden.facilities, facilities);
  const teamsDrawn = only(hidden.response, teamsShown);
  const drawn: Record<PlaneId, number> = {
    base: 1,
    hazard: floodsDrawn.length + forecastsDrawn.length,
    facilities: facilitiesDrawn.length,
    response: teamsDrawn.length,
    incidents: 1,
  };
  const isShown = (id: PlaneId) => (!hidden[id] || (id !== 'incidents' && id !== 'base' && drawn[id] > 0)) && (!soloId || soloId === id || id === 'base');

  // ── anime.js: camera tilt and turn ──
  useEffect(() => {
    if (!stackRef.current) return;
    const tall = !!focusInc; // the focused map is 2:1, so it needs a little more room
    const cam =
      // Tilted views shrink a little (never enlarge, which would blur) so raised layers fit.
      cameraAngle === 'topdown'
        ? { rotateX: 0, rotateZ: 0, rotateY: 0, scale: 1, translateY: 0 }
        : cameraAngle === 'side'
          ? { rotateX: 70, rotateZ: -36, rotateY: -4, scale: isExploded ? (tall ? 0.56 : 0.6) : 0.74, translateY: isExploded ? 95 : 20 }
          : { rotateX: 52, rotateZ: userRotationZ, rotateY: 0, scale: isExploded ? (tall ? 0.6 : 0.64) : 0.8, translateY: isExploded ? 105 : 20 };
    animate(stackRef.current, { ...cam, duration: isDragging ? 0 : 650, ease: 'outQuart' });
  }, [cameraAngle, userRotationZ, isDragging, isExploded, focusInc]);

  // ── anime.js: zoom grows the plane itself, so everything stays sharp ──
  const planeW = baseW * zoom;
  // Tiles switch detail level (and the area they cover) once zoom and pan settle.
  const [tileW, setTileW] = useState(planeW);
  const [tileCenter, setTileCenter] = useState(center);
  useEffect(() => {
    const t = setTimeout(() => { setTileW(planeW); setTileCenter(center); }, 380);
    return () => clearTimeout(t);
  }, [planeW, center]);

  // Wheel zoom (native listener so the page does not scroll) and keyboard shortcuts.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.side-panel')) return;
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
      const z = lifted ? plane.z : index * 2;
      const shown = isShown(plane.id);
      animate(el, { translateZ: shown ? z : z + 40, opacity: shown ? 1 : 0, duration: 700, delay: index * 60, ease: 'outQuint' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifted, soloId, hidden, highlightId]);

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
  }, [incidentsShown.length, focusInc?.id]);

  // ── drag: turn the map in 3D, pan when zoomed in ──
  const panning = zoom > 1.05 || cameraAngle === 'topdown';
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, .interactive-node, .side-panel')) return;
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
    const h = planeW / ratio;
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
    const p = pos(lat, lng);
    return { left: `${p.x}%`, top: `${p.y}%`, pointerEvents: 'auto' };
  };
  /**
   * Hover shows a tooltip. Click: an incident becomes the focus; in focus mode
   * other points are highlighted and their details shown in the side card; in
   * the country view the camera glides to the point and pins its details.
   */
  const pointProps = (id: string, h: Hover, lat: number, lng: number, opts: { zoomTo?: number; incident?: Incident } = {}) => ({
    onMouseEnter: () => setHovered(h),
    onMouseLeave: () => setHovered(null),
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setHovered(null);
      if (opts.incident && opts.incident.id !== focusInc?.id) {
        selectIncident(opts.incident.id);
        return;
      }
      if (focusInc) {
        setHighlightId(id);
        setFocused(h);
        return;
      }
      setCenter(pos(lat, lng));
      setZoom((cur) => Math.max(cur, opts.zoomTo ?? 3.5));
      setFocused(h);
    },
  });
  const ring = (id: string) => (highlightId === id ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : '');
  const planeCls = 'absolute inset-0 rounded-xl pointer-events-none';
  const glass = (on: string) => (lifted ? on : 'border-transparent');
  /** Name of each layer, on a tab just outside its left edge. */
  const planeTab = (id: PlaneId, text: string) =>
    lifted && (
      <span className="absolute right-full mr-2 top-1 flex items-center gap-1.5 whitespace-nowrap pl-1.5 pr-2 py-1 rounded-md text-[11px] font-semibold bg-slate-900/90 border border-white/15 text-slate-100">
        <span className="w-1 h-3.5 rounded-full" style={{ background: PLANE_COLOR[id] }} />
        {text}
      </span>
    );
  const within = focusInc ? ` within ${FOCUS_KM} km` : '';

  // Drop-lines from every raised point (incident focus) down to its spot on the map.
  type Stem = { id: string; lat: number; lng: number; z: number; color: string };
  const stems: Stem[] = !focusInc || !lifted
    ? []
    : [
        ...(isShown('hazard')
          ? [
              ...floodsDrawn.map((f) => ({ id: f.id, lat: f.lat, lng: f.lng, z: PLANE_Z.hazard, color: C.flood })),
              ...forecastsDrawn.map((p) => ({ id: p.id, lat: Number(p.lat), lng: Number(p.lng), z: PLANE_Z.hazard, color: C.forecast })),
            ]
          : []),
        ...(isShown('facilities') ? facilitiesDrawn.filter((f) => tactical || primaryIds.has(f.id) || highlightId === f.id).map((f) => ({ id: f.id, lat: f.lat, lng: f.lng, z: PLANE_Z.facilities, color: FACILITY_STYLE[f.kind].color })) : []),
        ...(isShown('response')
          ? teamsDrawn.filter((t) => !t.outside).map((t) => ({ id: t.id, lat: Number(t.coordinates[0]), lng: Number(t.coordinates[1]), z: PLANE_Z.response, color: C.team }))
          : []),
      ];

  // Country view: faint footprints of the raised points on the map, so they can be matched to a place.
  const footprints = () =>
    lifted && !focusInc && (
      <>
        {isShown('facilities') && facilitiesDrawn.map((f) => (
          <span key={`fp-${f.id}`} className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ ...at(f.lat, f.lng), pointerEvents: 'none', background: `${FACILITY_STYLE[f.kind].color}66` }} />
        ))}
        {isShown('response') && deployableTeams.map((t) => (
          <span key={`fp-${t.id}`} className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-cyan-600/40" style={{ ...at(Number(t.coordinates[0]), Number(t.coordinates[1])), pointerEvents: 'none' }} />
        ))}
        {isShown('incidents') && activeIncidents.map((i) => (
          <span key={`fp-${i.id}`} className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500/60 bg-red-500/10" style={{ ...at(i.coordinates[0], i.coordinates[1]), pointerEvents: 'none' }} />
        ))}
      </>
    );

  const focusPos = focusInc ? pos(focusInc.coordinates[0], focusInc.coordinates[1]) : null;
  const pillarH = PLANE_Z.incidents + 24;

  // ── Surroundings card rows (incident focus) ──
  type Row = { label: string; value: string; id?: string; muted?: boolean; color?: string };
  const hazardRows: Row[] = [];
  const facilityRows: Row[] = [];
  const responseRows: Row[] = [];
  if (focusInc) {
    const near10 = floods.filter((f) => (f.d ?? 0) <= 10);
    hazardRows.push(
      !layers.floodAreas
        ? { label: 'Flood hotspots', value: 'Layer off', muted: true }
        : { label: 'Flood hotspots', value: near10.length ? `${near10.length} within 10 km · nearest ${fmtKm(near10[0].d ?? 0)}` : floods.length ? `None within 10 km · ${floods.length} within ${FOCUS_KM}` : `None within ${FOCUS_KM} km`, id: floods[0]?.id, muted: !floods.length }
    );
    const fc = forecasts[0];
    hazardRows.push(
      fc
        ? { label: 'AI forecast', value: `${fc.hazard_type ?? 'Hazard'} · ${fc.hazard_score ?? 'n/a'}/100 · ${fmtKm(fc.d ?? 0)}`, id: fc.id }
        : { label: 'AI forecast', value: 'None on this map', muted: true }
    );
    hazardRows.push(
      impactKm != null
        ? { label: 'Affected radius', value: `${impactKm} km (AI estimate)` }
        : { label: 'Affected radius', value: assessQ.isLoading ? 'Loading…' : 'Not estimated yet', muted: true }
    );
    FACILITY_ORDER.forEach((k) => {
      const s = FACILITY_STYLE[k];
      const f = nearestByKind[k];
      if (!layers[FACILITY_LAYER[k]]) return facilityRows.push({ label: s.one, color: s.color, value: 'Layer off', muted: true });
      if (f) return facilityRows.push({ label: s.one, color: s.color, value: `${f.name} · ${fmtKm(f.d ?? 0)}`, id: f.id });
      if (k === 'relief' && focusLink?.relief) return facilityRows.push({ label: s.one, color: s.color, value: `${focusLink.relief.item.name} · ${fmtKm(focusLink.relief.d)}`, muted: true });
      if (SEARCHED_KINDS.includes(k)) {
        return facilityRows.push({ label: s.one, color: s.color, value: nearbyQ.isLoading ? 'Searching…' : nearbyQ.isError ? 'Lookup failed' : `None within ${NEARBY_RADIUS_KM} km`, muted: true });
      }
      facilityRows.push({ label: s.one, color: s.color, value: `None within ${FOCUS_KM} km`, muted: true });
    });
    const t = focusLink?.team;
    responseRows.push(t ? { label: 'Nearest free team', value: `${t.item.name} · ${fmtKm(t.d)}`, id: t.item.id } : { label: 'Nearest free team', value: 'None located', muted: true });
    const close = teamsShown.filter((x) => (x.d ?? Infinity) <= FOCUS_KM).length;
    responseRows.push({ label: `Teams within ${FOCUS_KM} km`, value: String(close), muted: !close });
  }
  const affected = focusInc ? (focusInc.field_verification?.affected_population === 'unknown' ? undefined : focusInc.affected_population || undefined) : undefined;

  const rowList = (title: string, plane: PlaneId, rows: Row[], summary: string) => {
    const open = openSection === plane;
    const off = hidden[plane];
    return (
      <div className={`rounded-lg ${open ? 'bg-white/5' : ''}`}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpenSection(open ? null : plane)}
            aria-expanded={open}
            className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-lg text-left cursor-pointer hover:bg-white/5"
          >
            <span className="w-1 h-4 rounded-full shrink-0" style={{ background: PLANE_COLOR[plane] }} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-100">{title}</span>
              {!open && <span className="block text-[11px] text-slate-400 truncate">{summary}</span>}
            </span>
            {open ? <ChevronUp size={14} className="shrink-0 text-slate-400" /> : <ChevronDown size={14} className="shrink-0 text-slate-400" />}
          </button>
          <button
            type="button"
            onClick={() => setHidden((h) => ({ ...h, [plane]: !h[plane] }))}
            aria-pressed={!off}
            title={off ? `Show all ${title.toLowerCase()} on the map` : `Hide ${title.toLowerCase()} from the map`}
            aria-label={off ? `Show all ${title.toLowerCase()} on the map` : `Hide ${title.toLowerCase()} from the map`}
            className={`p-1.5 mr-1 rounded-md cursor-pointer hover:bg-white/10 ${off ? 'text-slate-500' : 'text-sky-300'}`}
          >
            {off ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {open && (
          <ul className="px-1 pb-1.5 space-y-0.5">
            {rows.map((r) => (
              <li key={r.label}>
                <button
                  type="button"
                  disabled={!r.id}
                  onClick={() => r.id && setHighlightId((h) => (h === r.id ? null : r.id!))}
                  title={r.id ? 'Show this one on the map' : undefined}
                  className={`w-full flex items-baseline justify-between gap-3 px-1.5 py-1 rounded-md text-left text-[11px] ${r.id ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'} ${
                    r.id && highlightId === r.id ? 'bg-white/10' : ''
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-slate-400 shrink-0">{r.color && <span className="w-2 h-2 rounded-[2px]" style={{ background: r.color }} />}{r.label}</span>
                  <span className={`min-w-0 truncate text-right font-semibold ${r.muted ? 'text-slate-500' : 'text-slate-100'}`}>{r.value}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };
  const fc0 = forecasts[0];
  const hazardSummary = fc0
    ? `${fc0.hazard_type ?? 'Hazard'} forecast ${fc0.hazard_score ?? 'n/a'}/100${floods.length ? ` · ${floods.length} flood hotspots` : ''}`
    : floods.length ? `${floods.length} flood hotspots within ${FOCUS_KM} km` : 'Nothing flagged nearby';
  const facilitySummary = facilities.length ? `${facilities.length} within ${FOCUS_KM} km` : `None within ${FOCUS_KM} km`;
  const responseSummary = focusLink?.team ? `Nearest free team ${fmtKm(focusLink.team.d)}` : 'No free team located';

  return (
    <div
      ref={viewportRef}
      tabIndex={0}
      aria-label="GIS layer map. Pick an incident to see its surroundings. Scroll or press plus and minus to zoom, Escape to reset."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={(e) => {
        if (!(e.target as HTMLElement).closest('button, .interactive-node, .side-panel')) resetView();
      }}
      className={`relative w-full h-[680px] overflow-hidden select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ background: 'radial-gradient(ellipse at 50% 35%, #1e293b 0%, #0b1220 100%)' }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415533_1px,transparent_1px),linear-gradient(to_bottom,#33415533_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] pointer-events-none" />

      {/* ── View controls ── */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className={`${panel} flex items-center gap-2 px-3 py-1.5 rounded-xl pointer-events-auto min-w-0`}>
          <Layers size={14} className="text-sky-300 shrink-0" />
          <span className="text-xs font-semibold text-slate-100 truncate">
            {focusInc ? `Around ${focusInc.display_id ?? 'incident'} · ${focusInc.district}` : 'Layer view · whole country'}
          </span>
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
              if (cameraAngle === 'topdown') {
                setIsExploded(true);
                setCameraAngle('isometric');
                setUserRotationZ(-18);
              } else setIsExploded((v) => !v);
            }}
            title={lifted ? 'Lay every layer on one map' : 'Lift the layers apart to compare them'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
              lifted ? 'bg-blue-500/20 text-blue-200 border-blue-400/40' : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
            }`}
          >
            {lifted ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            {lifted ? 'Stack layers' : 'Separate layers'}
          </button>
        </div>
      </div>

      {/* ── 3D viewport ── */}
      <div className="absolute inset-0 flex items-center justify-center [perspective:1600px]">
        <div
          ref={stackRef}
          className="relative shrink-0 [transform-style:preserve-3d] origin-center"
          style={{ width: planeW, height: planeW / ratio, transition: isDragging ? 'none' : 'width .28s ease-out, height .28s ease-out' }}
        >
          <div
            ref={panRef}
            className="absolute inset-0 [transform-style:preserve-3d]"
            style={{ transform: `translate(${50 - center.x}%, ${50 - center.y}%)`, transition: isDragging ? 'none' : 'transform .45s cubic-bezier(.16,1,.3,1)' }}
          >
            {/* Ground: real basemap, distance rings, links */}
            <div
              ref={(el) => {
                planeRefs.current.base = el;
              }}
              className={`${planeCls} border border-sky-300/25 bg-[#0f172a] shadow-[0_30px_70px_-30px_rgba(0,0,0,.8)]`}
            >
              <BaseTiles bounds={bounds} baseWidthPx={baseW} widthPx={tileW} center={tileCenter} zoom={tileW / baseW} />
              {focusPos && (
                <>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                    {RINGS_KM.map((r) => (
                      <ellipse
                        key={r}
                        cx={focusPos.x}
                        cy={focusPos.y}
                        rx={(r / (2 * FOCUS_HALF_W_KM)) * 100}
                        ry={(r / (2 * FOCUS_HALF_H_KM)) * 100}
                        fill={r === RINGS_KM[0] ? 'rgba(248,113,113,0.08)' : 'none'}
                        stroke="#e2e8f0"
                        strokeOpacity={r === FOCUS_KM ? 0.55 : 0.35}
                        strokeWidth={r === FOCUS_KM ? 1.6 : 1.1}
                        strokeDasharray={r === FOCUS_KM ? undefined : '5 4'}
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </svg>
                  {RINGS_KM.map((r) => (
                    <span
                      key={r}
                      className="absolute -translate-x-1/2 -translate-y-1/2 px-1 rounded text-[9px] font-semibold text-slate-200 bg-slate-900/80 pointer-events-none"
                      style={{ left: `${focusPos.x}%`, top: `${focusPos.y - (r / (2 * FOCUS_HALF_H_KM)) * 100}%` }}
                    >
                      {r} km
                    </span>
                  ))}
                  {/* The incident's spot on the ground, where the pillar starts */}
                  <span className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 pointer-events-none"
                    style={{ left: `${focusPos.x}%`, top: `${focusPos.y}%`, background: sevColor(focusInc?.severity) }} />
                </>
              )}
              {showLinks && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                  {(focusLink ? [focusLink] : links).map(({ inc, relief, team }) => {
                    const a = pos(inc.coordinates[0], inc.coordinates[1]);
                    return (
                      <g key={inc.id}>
                        {relief && relief.d <= 80 && (() => {
                          const b = pos(relief.item.lat, relief.item.lng);
                          return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.relief} strokeOpacity={0.8} strokeWidth={1.6} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />;
                        })()}
                        {team && team.d <= 300 && (() => {
                          const b = pos(Number(team.item.coordinates[0]), Number(team.item.coordinates[1]));
                          return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.team} strokeOpacity={0.8} strokeWidth={1.6} strokeDasharray="1.5 3" vectorEffect="non-scaling-stroke" />;
                        })()}
                      </g>
                    );
                  })}
                </svg>
              )}
              {footprints()}
              {/* Search pin: on the base layer so it shows whatever the upper layers do */}
              {pin && !focusInc && (
                <div style={at(pin.lat, pin.lng)} className="absolute -translate-x-1/2 -translate-y-full z-40 pointer-events-none">
                  <MapPin size={32} fill={C.pin} stroke="#0f172a" strokeWidth={1.5} className="drop-shadow-[0_2px_6px_rgba(59,130,246,0.8)]" />
                </div>
              )}
              {planeTab('base', focusInc ? `Map · rings at ${RINGS_KM.join(' / ')} km` : 'Map')}
              <span className="absolute bottom-1 right-1.5 text-[9px] text-slate-400 bg-slate-900/70 px-1 rounded pointer-events-none">
                © OpenStreetMap contributors
              </span>
            </div>

            {/* Drop-lines and the incident pillar stand up from the ground through every layer */}
            <div className="absolute inset-0 pointer-events-none [transform-style:preserve-3d]" aria-hidden="true">
              {stems.map((s) => {
                const p = pos(s.lat, s.lng);
                const lit = highlightId === s.id;
                return (
                  <div key={`stem-${s.id}`} className="absolute w-0 h-0 [transform-style:preserve-3d]" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                    <div
                      className="absolute bottom-0 origin-bottom"
                      style={{
                        left: lit ? -1 : -0.5,
                        width: lit ? 2 : 1,
                        height: s.z,
                        transform: 'rotateX(-90deg)',
                        background: `linear-gradient(to top, ${s.color}22, ${s.color}${lit ? 'ff' : '99'})`,
                      }}
                    />
                  </div>
                );
              })}
              {focusPos && lifted && (
                <div className="absolute w-0 h-0 [transform-style:preserve-3d]" style={{ left: `${focusPos.x}%`, top: `${focusPos.y}%` }}>
                  {['rotateX(-90deg)', 'rotateZ(90deg) rotateX(-90deg)'].map((t) => (
                    <div
                      key={t}
                      className="absolute bottom-0 origin-bottom"
                      style={{
                        left: -1.5,
                        width: 3,
                        height: pillarH,
                        transform: t,
                        background: `linear-gradient(to top, ${sevColor(focusInc?.severity)}55, ${sevColor(focusInc?.severity)})`,
                        boxShadow: `0 0 10px ${sevColor(focusInc?.severity)}88`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Hazard: flood hotspots, AI forecasts, the incident's affected radius */}
            <div
              ref={(el) => {
                planeRefs.current.hazard = el;
              }}
              className={`${planeCls} border ${glass(focusInc ? 'border-sky-300/35 bg-slate-900/10' : 'border-sky-300/35 bg-slate-900/25')}`}
            >
              {focusPos && impactKm != null && impactKm > 0 && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                  <ellipse
                    cx={focusPos.x}
                    cy={focusPos.y}
                    rx={(impactKm / (2 * FOCUS_HALF_W_KM)) * 100}
                    ry={(impactKm / (2 * FOCUS_HALF_H_KM)) * 100}
                    fill="rgba(248,113,113,0.16)"
                    stroke="#f87171"
                    strokeOpacity={0.8}
                    strokeWidth={1.4}
                    strokeDasharray="3 3"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}
              {floodsDrawn.map((f) => (
                <div
                  key={f.id}
                  style={at(f.lat, f.lng)}
                  className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
                  {...pointProps(f.id, { title: f.name, lines: ['Flood hotspot (JPS)', ...(f.d != null ? [`Distance: ${fmtKm(f.d)}`] : [])] }, f.lat, f.lng)}
                >
                  <div className={`${focusInc ? 'w-4 h-4' : 'w-3 h-3'} rounded-full bg-sky-300/25 border-[1.5px] border-sky-300/80 hover:scale-125 transition-transform ${ring(f.id)}`} />
                  {labelIds.has(f.id) && <MarkerLabel text={`Flood hotspot · ${fmtKm(f.d ?? 0)}`} strong={highlightId === f.id} />}
                </div>
              ))}
              {forecastsDrawn.map((p) => (
                <div
                  key={p.id}
                  style={at(Number(p.lat), Number(p.lng))}
                  className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                  {...pointProps(p.id, {
                    title: `AI forecast: ${p.hazard_type ?? 'Hazard'}${p.district ? ` · ${p.district}` : ''}`,
                    lines: [
                      'Forecast, not an incident yet',
                      `Hazard score: ${p.hazard_score ?? 'n/a'} / 100`,
                      `Confidence: ${p.confidence ?? 'n/a'}%`,
                      `Expected: ${hoursText(p.projected_within_hours)}`,
                      ...(p.d != null ? [`Distance: ${fmtKm(p.d)}`] : []),
                    ],
                  }, Number(p.lat), Number(p.lng), { zoomTo: 2.5 })}
                >
                  <div className={`${focusInc ? 'w-7 h-7' : 'w-6 h-6'} rounded-full border-[1.5px] border-dashed border-violet-300/80 bg-slate-900/70 flex items-center justify-center hover:scale-125 transition-transform ${ring(p.id)}`}>
                    {p.hazard_type === 'Haze' ? <CloudFog size={focusInc ? 13 : 11} className="text-violet-300" /> : <AlertTriangle size={focusInc ? 12 : 10} className="text-violet-300" />}
                  </div>
                  {labelIds.has(p.id) && <MarkerLabel text={`AI ${p.hazard_type ?? 'forecast'} · ${p.hazard_score ?? 'n/a'}/100`} strong={highlightId === p.id} />}
                </div>
              ))}
              {planeTab('hazard', `Hazard · ${floods.length + forecasts.length}${within}`)}
            </div>

            {/* Facilities */}
            <div
              ref={(el) => {
                planeRefs.current.facilities = el;
              }}
              className={`${planeCls} border ${glass(focusInc ? 'border-amber-300/35 bg-slate-900/10' : 'border-amber-300/35 bg-slate-900/25')}`}
            >
              {facilitiesDrawn.map((f) => {
                const s = FACILITY_STYLE[f.kind];
                const minor = !!focusInc && !tactical && !primaryIds.has(f.id) && highlightId !== f.id;
                return (
                  <div
                    key={f.id}
                    style={at(f.lat, f.lng)}
                    className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                    {...pointProps(f.id, { title: f.name, lines: [f.sub, ...(f.d != null ? [`Distance: ${fmtKm(f.d)}`] : [])] }, f.lat, f.lng)}
                  >
                    {minor ? (
                      <div className="w-2 h-2 rounded-full border border-slate-900/80 opacity-80 hover:scale-150 transition-transform" style={{ background: s.color }} />
                    ) : (
                      <div
                        className={`${focusInc ? 'w-6 h-6 rounded-[7px]' : 'w-4 h-4 rounded-[5px]'} border-2 border-slate-900 flex items-center justify-center shadow hover:scale-125 transition-transform ${ring(f.id)}`}
                        style={{ background: s.color }}
                      >
                        <s.Icon size={focusInc ? 12 : 9} className="text-slate-900" />
                      </div>
                    )}
                    {labelIds.has(f.id) && <MarkerLabel text={`${f.name} · ${fmtKm(f.d ?? 0)}`} strong={highlightId === f.id} />}
                  </div>
                );
              })}
              {planeTab('facilities', `Facilities · ${facilities.length}${within}`)}
            </div>

            {/* Rescue teams */}
            <div
              ref={(el) => {
                planeRefs.current.response = el;
              }}
              className={`${planeCls} border ${glass(focusInc ? 'border-cyan-300/35 bg-slate-900/10' : 'border-cyan-300/35 bg-slate-900/25')}`}
            >
              {teamsDrawn.map((t) => {
                const lat = Number(t.coordinates[0]);
                const lng = Number(t.coordinates[1]);
                return (
                  <div
                    key={t.id}
                    style={at(lat, lng)}
                    className="interactive-node absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                    {...pointProps(t.id, {
                      title: t.name,
                      lines: [
                        `${t.agency} · rescue team`,
                        `Status: ${t.status}`,
                        t.available_personnel != null ? `Personnel free: ${t.available_personnel} of ${t.total_personnel ?? t.personnel_count}` : `Personnel: ${t.personnel_count}`,
                        ...(t.d != null ? [`Distance: ${fmtKm(t.d)}${t.outside ? ' (off this map)' : ''}`] : []),
                      ],
                    }, lat, lng)}
                  >
                    <div
                      className={`${focusInc ? 'w-[18px] h-[18px]' : 'w-3.5 h-3.5'} rotate-45 border-2 border-slate-900 shadow hover:scale-125 transition-transform ${t.outside ? 'opacity-70' : ''} ${ring(t.id)}`}
                      style={{ background: t.status === 'Available' ? C.team : t.status === 'Off Duty' ? C.teamOff : C.teamBusy }}
                    />
                    {labelIds.has(t.id) && <MarkerLabel text={`${t.name} · ${fmtKm(t.d ?? 0)}${t.outside ? ' away' : ''}`} strong={highlightId === t.id} />}
                  </div>
                );
              })}
              {planeTab('response', `Rescue teams · ${counts.response}${within}`)}
            </div>

            {/* Incidents */}
            <div
              ref={(el) => {
                planeRefs.current.incidents = el;
              }}
              className={`${planeCls} border ${glass(focusInc ? 'border-red-300/35 bg-slate-900/10' : 'border-red-300/35 bg-slate-900/25')}`}
            >
              {incidentsShown.map((inc) => {
                const link = links.find((l) => l.inc.id === inc.id);
                const aff = inc.field_verification?.affected_population === 'unknown' ? undefined : inc.affected_population || undefined;
                const color = sevColor(inc.severity);
                const main = inc.id === focusInc?.id;
                const size = main ? 'w-7 h-7' : focusInc ? 'w-5 h-5' : 'w-[18px] h-[18px]';
                return (
                  <div
                    key={inc.id}
                    style={at(inc.coordinates[0], inc.coordinates[1])}
                    className={`interactive-node absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer ${main ? 'z-40' : 'z-30'}`}
                    {...pointProps(inc.id, {
                      title: inc.title,
                      lines: [
                        { text: `${inc.display_id ?? 'Incident'} · ${inc.district}, ${inc.state}`, className: 'text-sky-300 font-semibold' },
                        ...(inc.severity ? [`Severity: ${inc.severity}`] : []),
                        `People affected: ${aff ? `${aff.toLocaleString()} reported` : 'Not reported'}`,
                        `Nearest relief centre: ${link?.relief ? `${link.relief.item.name} · ${fmtKm(link.relief.d)}` : 'No data'}`,
                        `Nearest free team: ${link?.team ? `${link.team.item.name} · ${fmtKm(link.team.d)}` : 'None located'}`,
                        ...(main ? [] : [{ text: 'Click to centre the layers here', className: 'text-slate-400' }]),
                      ],
                    }, inc.coordinates[0], inc.coordinates[1], { incident: inc })}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className={`gis-pulse-node absolute ${main ? 'w-9 h-9' : 'w-6 h-6'} rounded-full`} style={{ background: `${color}40` }} />
                      <div className={`${size} rounded-full border-2 border-slate-900 flex items-center justify-center text-slate-900 shadow-md hover:scale-125 transition-transform`} style={{ background: color }}>
                        <AlertTriangle size={main ? 14 : 9} strokeWidth={2.5} />
                      </div>
                    </div>
                    {main && <MarkerLabel text={inc.display_id ?? 'Incident'} strong />}
                  </div>
                );
              })}
              {planeTab('incidents', `Incidents · ${incidentsShown.length}${focusInc ? ' on this map' : ''}`)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Incident picker (folds to a chip so it never covers the map) ── */}
      {!listOpen ? (
        <button
          type="button"
          onClick={() => setListOpen(true)}
          className={`${panel} side-panel absolute top-16 left-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-100 cursor-pointer hover:bg-[#1e293b]`}
        >
          Incidents · {sortedIncidents.length}
          <ChevronDown size={14} className="text-slate-400" />
        </button>
      ) : (
        <div className={`${panel} side-panel absolute top-16 left-3 z-30 w-60 rounded-xl p-1.5 cursor-default flex flex-col max-h-[calc(100%-16rem)]`}>
          <div className="flex items-center justify-between gap-1.5 px-1.5 pt-1 pb-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Incidents · {sortedIncidents.length}</p>
            <div className="flex items-center gap-1">
              {focusInc && (
                <button
                  type="button"
                  onClick={() => selectIncident(null)}
                  title="Show every incident across Malaysia"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer border text-slate-300 border-white/10 hover:bg-white/10"
                >
                  <Globe2 size={11} /> Whole country
                </button>
              )}
              <button type="button" onClick={() => setListOpen(false)} title="Hide the list" aria-label="Hide the incident list" className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer">
                <ChevronUp size={14} />
              </button>
            </div>
          </div>
          <ul className="overflow-y-auto min-h-0 space-y-0.5">
            {sortedIncidents.length === 0 && <li className="px-2 py-3 text-[11px] text-slate-400">No active incidents match the filters.</li>}
            {sortedIncidents.map((i) => {
              const on = i.id === focusInc?.id;
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => selectIncident(on ? null : i.id)}
                    aria-pressed={on}
                    className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${on ? 'bg-white/15' : 'hover:bg-white/5'}`}
                  >
                    <span className="mt-[5px] w-2 h-2 rounded-full shrink-0" style={{ background: sevColor(i.severity) }} title={i.severity} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-xs font-semibold truncate ${on ? 'text-white' : 'text-slate-200'}`}>{i.title}</span>
                      <span className="block text-[11px] text-slate-400 truncate">{i.display_id} · {i.district}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Zoom ── */}
      <div className={`${panel} side-panel absolute left-3 bottom-3 z-30 flex flex-col rounded-xl overflow-hidden`}>
        <button type="button" onClick={() => setZoom((z) => clampZoom(z * 1.5))} title="Zoom in (+)" aria-label="Zoom in" className="p-2 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer">
          <Plus size={15} />
        </button>
        <button type="button" onClick={() => setZoom((z) => { const n = clampZoom(z / 1.5); if (n === 1) setCenter({ x: 50, y: 50 }); return n; })} title="Zoom out (−)" aria-label="Zoom out" className="p-2 text-slate-300 hover:text-white hover:bg-white/10 border-t border-white/10 cursor-pointer">
          <MinusIcon size={15} />
        </button>
        <button type="button" onClick={resetView} disabled={zoom === 1 && !focused} title="Fit the map (Esc)" aria-label="Fit the map" className="p-2 text-slate-300 hover:text-white hover:bg-white/10 border-t border-white/10 cursor-pointer disabled:opacity-30 disabled:cursor-default">
          <LocateFixed size={15} />
        </button>
        <span className="text-[10px] font-semibold text-slate-400 text-center py-1 border-t border-white/10 tabular-nums">{zoom.toFixed(1)}×</span>
      </div>

      {/* ── Right column: surroundings (or pinned details) above the layer list ── */}
      <div className="absolute top-16 right-3 bottom-16 z-30 w-72 flex flex-col gap-2 pointer-events-none">
        {focusInc ? (
          <div className={`${panel} side-panel rounded-xl p-3 cursor-default pointer-events-auto min-h-0 overflow-y-auto`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-300">
                  <span className="w-2 h-2 rounded-full" style={{ background: sevColor(focusInc.severity) }} />
                  {focusInc.display_id} · {focusInc.severity}
                </p>
                <p className="text-[13px] font-semibold text-white leading-snug mt-0.5">{focusInc.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {focusInc.district}, {focusInc.state} · {affected ? `${affected.toLocaleString()} affected` : 'affected not reported'}
                </p>
              </div>
              <button type="button" onClick={() => selectIncident(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer" aria-label="Back to the whole country">
                <X size={14} />
              </button>
            </div>
            {focused && (
              <div className="mt-2.5 rounded-lg bg-white/5 border border-white/10 p-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-white leading-snug">{focused.title}</p>
                  <button type="button" onClick={() => { setFocused(null); setHighlightId(null); }} className="text-slate-400 hover:text-slate-200 cursor-pointer" aria-label="Close details">
                    <X size={12} />
                  </button>
                </div>
                {focused.lines.length > 0 && <ul className="mt-1 space-y-1">{focused.lines.map((l, i) => <DetailLine key={i} text={l} compact />)}</ul>}
              </div>
            )}
            <div className="mt-2.5 pt-2 border-t border-white/10 space-y-0.5">
              {rowList('Hazard', 'hazard', hazardRows, hazardSummary)}
              {rowList('Facilities', 'facilities', facilityRows, facilitySummary)}
              {rowList('Response', 'response', responseRows, responseSummary)}
            </div>
            <button
              type="button"
              onClick={() => onSelectIncident(focusInc)}
              className="mt-3 w-full px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              Open situation report
            </button>
          </div>
        ) : (
          focused && (
            <div className={`${panel} side-panel rounded-xl p-3.5 cursor-default pointer-events-auto`}>
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
            </div>
          )
        )}

      </div>

      {/* ── Layer bar: one chip per layer (click to show or hide), links, legend ── */}
      <div className="absolute bottom-3 left-16 right-3 z-30 flex justify-center pointer-events-none">
        <div className="relative pointer-events-auto">
          {showLegend && (
            <div className={`${panel} side-panel absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[min(90vw,34rem)] rounded-xl px-3 py-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-300 cursor-default`}>
              {FACILITY_ORDER.map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: FACILITY_STYLE[k].color }} />
                  {FACILITY_STYLE[k].label}
                </span>
              ))}
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-sky-300 bg-sky-300/25" />Flood hotspot</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-dashed border-violet-300" />AI forecast</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rotate-45" style={{ background: C.team }} />Free team</span>
              <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed" style={{ borderColor: C.relief }} />Nearest relief centre</span>
              <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dotted" style={{ borderColor: C.team }} />Nearest free team</span>
            </div>
          )}
          <div className={`${panel} side-panel flex flex-wrap items-center justify-center gap-1 p-1 rounded-xl cursor-default`}>
            {PLANES.filter((p) => p.id !== 'base').reverse().map((plane) => {
              const off = hidden[plane.id];
              return (
                <button
                  key={plane.id}
                  type="button"
                  onClick={() => setHidden((h) => ({ ...h, [plane.id]: !h[plane.id] }))}
                  aria-pressed={!off}
                  title={off ? `Show ${plane.name}` : `Hide ${plane.name}`}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                    off ? 'text-slate-500 hover:bg-white/5' : 'text-slate-100 bg-white/10 hover:bg-white/15'
                  }`}
                >
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: off ? '#475569' : plane.color }} />
                  {plane.name}
                  <span className="tabular-nums text-slate-400">{counts[plane.id]}</span>
                  {off && <EyeOff size={11} />}
                </button>
              );
            })}
            <span className="w-px h-4 bg-white/10 mx-0.5" />
            {!focusInc && (
              <button
                type="button"
                onClick={() => setNearOnly((v) => !v)}
                aria-pressed={nearOnly}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${nearOnly ? 'bg-amber-400/15 text-amber-200' : 'text-slate-400 hover:bg-white/5'}`}
                title={`Only facilities and flood hotspots within ${NEARBY_KM} km of an active incident`}
              >
                Near incidents
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowLinks((v) => !v)}
              aria-pressed={showLinks}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${showLinks ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-400 hover:bg-white/5'}`}
              title="Dashed lines on the map: each incident to its nearest relief centre (teal) and nearest free team (cyan)"
            >
              Links
            </button>
            <button
              type="button"
              onClick={() => setShowLegend((v) => !v)}
              aria-pressed={showLegend}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${showLegend ? 'bg-white/15 text-white' : 'text-slate-400 hover:bg-white/5'}`}
            >
              Legend
            </button>
          </div>
        </div>
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
