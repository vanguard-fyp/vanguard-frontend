import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {
  Plus, Minus, LocateFixed, RotateCw, RotateCcw, X, Warehouse as WarehouseIcon, AlertTriangle, Factory, Check,
  Layers, ListChecks, Crosshair, Play, Truck, Info, Loader2, Move, Undo2,
} from 'lucide-react';
import type { Incident, ResourceItem, ResourceRequest, Warehouse } from '../../../../types';
import { FLOW_STEPS, nextAction, requestFlow } from '../../../../utils/resourceFlow';
import { requestRoute } from './ResourceUI';
import { formatDateTime } from '../../../../utils/dateFormatter';
import { Tag, TONE, type Tone } from '../../shared/Tag';
import { useUpdateRequestStatus } from '../../../../hooks/useResources';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import {
  makeWarehouse, makeStockPallet, makeForklift, makeTruck, makeTree, makeBuilding, makeIncidentSite, makeSupplierYard,
  makeCrate, groundRect, mesh, boxGeo, mat, flat, isShared,
} from './scene3d/models';
import { CELL, ROAD_W, placeSites, routeBetween, roadStrips, drivePath } from './scene3d/layout';

/* ============================================================
   3D resource yard (digital twin of the request workflow).
   Facts only:
   - depots, stock lines, incidents and requests come from the database;
   - places keep their real relative positions on a schematic block map;
   - suppliers have no stored location: they stand in a labelled column;
   - trucks show each request's real status. Movement along the road is a
     simulation (no vehicle tracking exists); the scene says so.
   Actions call the existing endpoints, which validate every transition.
   ============================================================ */

interface Props {
  inventory: ResourceItem[];
  requests: ResourceRequest[];
  warehouses: Warehouse[];
  incidents: Incident[];
  onOpenRequest?: (req: ResourceRequest) => void;
  onReview?: (req: ResourceRequest) => void;
  /** request to open on (from the pipeline's "Show in 3D flow") */
  focusRequestId?: string | null;
}

type Kind = 'depot' | 'incident' | 'supplier' | 'request';
type Sel = { kind: Kind; id: string } | null;
type LayerKey = 'stock' | 'vehicles' | 'incidents' | 'scenery' | 'labels';

const STATUS_LOOK: Record<string, { tone: Tone; label: string; hex: string }> = {
  'Pending Approval': { tone: 'amber', label: 'Waiting for approval', hex: '#f59e0b' },
  Approved: { tone: 'blue', label: 'Approved, at the depot', hex: '#3b82f6' },
  Dispatched: { tone: 'cyan', label: 'On the way', hex: '#06b6d4' },
  Delivered: { tone: 'teal', label: 'Delivered', hex: '#14b8a6' },
  Fulfilled: { tone: 'teal', label: 'Delivered', hex: '#14b8a6' },
  Rejected: { tone: 'slate', label: 'Rejected', hex: '#94a3b8' },
};
const SEVERITY_HEX: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#94a3b8' };
const STOCK_HEX: Record<string, string> = { Sufficient: '#22c55e', 'Low Stock': '#f59e0b', Critical: '#ef4444' };
const STOCK_TONE: Record<string, Tone> = { Sufficient: 'teal', 'Low Stock': 'amber', Critical: 'red' };
const LAYOUT_KEY = 'vanguard.resourceFlow3D.layout';
type Pins = Record<string, [number, number]>;
const loadPins = (): Pins => {
  try { return JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}') as Pins; } catch { return {}; }
};
const SPEED = 3.6; // scene units per second (simulation), slow enough to follow

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function label(text: string, sub?: string, alert = false) {
  const el = document.createElement('div');
  el.className = `pointer-events-none select-none transition-opacity duration-200 px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shadow-sm border ${alert ? 'bg-white text-red-700 border-red-200' : 'bg-white/95 text-slate-800 border-slate-200'}`;
  el.textContent = text;
  if (sub) {
    const s = document.createElement('span');
    s.className = 'block text-[10px] font-medium text-slate-500';
    s.textContent = sub;
    el.appendChild(s);
  }
  return new CSS2DObject(el);
}

interface SceneApi {
  zoom: (f: number) => void;
  rotate: (deg: number) => void;
  reset: () => void;
  focus: (sel: Sel) => void;
  follow: (id: string | null) => void;
  replay: (id: string) => void;
  layers: (l: Record<LayerKey, boolean>) => void;
  pulseStock: (itemId: string) => void;
}

/* ── Component ───────────────────────────────────────────────────────────── */
export const ResourceFlow3D: React.FC<Props> = ({ inventory, requests, warehouses, incidents, onOpenRequest, onReview, focusRequestId }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Sel>(focusRequestId ? { kind: 'request', id: focusRequestId } : null);
  const [following, setFollowing] = useState<string | null>(null);
  const [menu, setMenu] = useState<'requests' | 'layers' | null>(null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ stock: true, vehicles: true, incidents: true, scenery: true, labels: true });
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [confirming, setConfirming] = useState<string | null>(null);
  // Arrange mode: drag a place to another block. View only, kept in this browser.
  const [arrange, setArrange] = useState(false);
  const [hinted, setHinted] = useState(false);
  const [pins, setPins] = useState<Pins>(loadPins);
  const arrangeRef = useRef(arrange);
  arrangeRef.current = arrange;
  const savePins = (next: Pins) => {
    setPins(next);
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(next)); } catch { /* layout stays for this visit only */ }
  };
  const savePinsRef = useRef(savePins);
  savePinsRef.current = savePins;
  const api = useRef<SceneApi | null>(null);
  const selectedRef = useRef<Sel>(null);
  selectedRef.current = selected;
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const cameraMemo = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; zoom: number } | null>(null);
  const justDispatched = useRef(new Set<string>());

  const { hasPermission } = useAuth();
  const canDispatch = hasPermission('DISPATCH_RESOURCES');
  const toast = useToast();
  const updateStatus = useUpdateRequestStatus();

  const live = useMemo(() => requests.filter((r) => r.status !== 'Rejected'), [requests]);
  const incidentById = useMemo(() => new Map(incidents.map((i) => [i.id, i])), [incidents]);
  const depotById = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);
  const categoryByType = useMemo(() => new Map(inventory.filter((i) => i.resource_type_id).map((i) => [i.resource_type_id as string, i.category as string])), [inventory]);
  const supplierOf = (r: ResourceRequest) => r.supplier || 'Supplier not recorded';
  const suppliers = useMemo(() => [...new Set(live.filter((r) => requestFlow(r) === 'replenishment').map(supplierOf))], [live]);
  const linkedIncidents = useMemo(
    () => [...new Set(live.filter((r) => r.incident_id).map((r) => r.incident_id as string))].map((id) => incidentById.get(id)).filter((i): i is Incident => !!i),
    [live, incidentById]
  );

  const signature = JSON.stringify([
    warehouses.map((w) => [w.id, w.lat, w.lng]),
    inventory.map((i) => [i.id, i.warehouse_id, i.stock_level, i.min_threshold, i.status, i.category]),
    live.map((r) => [r.id, r.status, r.warehouse_id, r.incident_id, r.supplier]),
    linkedIncidents.map((i) => [i.id, i.coordinates, i.severity]),
    pins,
  ]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    /* ── Layout ── */
    const hasLoc = (w: Warehouse) => Number.isFinite(w.lat) && Number.isFinite(w.lng);
    const sites = placeSites(
      [
        ...warehouses.filter(hasLoc).map((w) => ({ key: `depot:${w.id}`, lat: w.lat, lng: w.lng })),
        ...linkedIncidents.map((i) => ({ key: `incident:${i.id}`, lat: i.coordinates?.[0] ?? null, lng: i.coordinates?.[1] ?? null })),
      ],
      [
        ...warehouses.filter((w) => !hasLoc(w)).map((w) => `depot:${w.id}`),
        ...suppliers.map((s) => `supplier:${s}`),
      ],
      pins
    );
    const origin = (r: ResourceRequest) => (requestFlow(r) === 'replenishment' ? sites.get(`supplier:${supplierOf(r)}`) : r.warehouse_id ? sites.get(`depot:${r.warehouse_id}`) : undefined);
    const destination = (r: ResourceRequest) => (requestFlow(r) === 'replenishment' ? (r.warehouse_id ? sites.get(`depot:${r.warehouse_id}`) : undefined) : r.incident_id ? sites.get(`incident:${r.incident_id}`) : undefined);
    const routes = new Map<string, THREE.Vector3[]>();
    live.forEach((r) => {
      const a = origin(r);
      const b = destination(r);
      if (a && b && a !== b) routes.set(r.id, routeBetween(a, b));
    });

    const all = [...sites.values()];
    if (!all.length) return;
    const minI = Math.min(...all.map((s) => s.i)) - 1;
    const maxI = Math.max(...all.map((s) => s.i)) + 1;
    const minJ = Math.min(...all.map((s) => s.j)) - 1;
    const maxJ = Math.max(...all.map((s) => s.j)) + 1;

    /* ── Renderer, camera, controls ── */
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e9eef5');
    const view = 30;
    const aspect = width / height;
    const camera = new THREE.OrthographicCamera(-view * aspect, view * aspect, view, -view, -400, 800);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    mount.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minZoom = 0.45;
    controls.maxZoom = 8;
    controls.zoomSpeed = 1.6;
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = 1.45;
    controls.screenSpacePanning = false;
    controls.zoomToCursor = true;
    controls.rotateSpeed = 0.7;
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };

    scene.add(new THREE.HemisphereLight('#ffffff', '#cbd5e1', 1.35));
    const sun = new THREE.DirectionalLight('#ffffff', 1.7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const ext = Math.max(maxI - minI + 1, maxJ - minJ + 1) * CELL * 0.75;
    Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 400 });
    sun.shadow.camera.updateProjectionMatrix();

    const centre = new THREE.Vector3(((minI + maxI + 1) / 2) * CELL, 0, ((minJ + maxJ + 1) / 2) * CELL);
    sun.position.copy(centre).add(new THREE.Vector3(40, 90, 25));
    sun.target.position.copy(centre);
    scene.add(sun, sun.target);

    const groups: Record<LayerKey, THREE.Group> = {
      stock: new THREE.Group(), vehicles: new THREE.Group(), incidents: new THREE.Group(), scenery: new THREE.Group(), labels: new THREE.Group(),
    };
    Object.values(groups).forEach((g) => scene.add(g));

    /* ── Ground, blocks, roads ── */
    const ground = groundRect((maxI - minI + 8) * CELL, (maxJ - minJ + 8) * CELL, '#e4ebe1', 0);
    ground.position.set(centre.x, 0, centre.z);
    scene.add(ground);

    for (let i = minI; i <= maxI; i++) {
      for (let j = minJ; j <= maxJ; j++) {
        const pave = groundRect(CELL - ROAD_W, CELL - ROAD_W, '#eef2f6', 0.012);
        pave.position.set((i + 0.5) * CELL, 0.012, (j + 0.5) * CELL);
        scene.add(pave);
      }
    }

    // roads used by any route, the ring road around the map, and each site's front street
    const ring: THREE.Vector3[][] = [
      [new THREE.Vector3(minI * CELL, 0, minJ * CELL), new THREE.Vector3((maxI + 1) * CELL, 0, minJ * CELL)],
      [new THREE.Vector3(minI * CELL, 0, (maxJ + 1) * CELL), new THREE.Vector3((maxI + 1) * CELL, 0, (maxJ + 1) * CELL)],
      [new THREE.Vector3(minI * CELL, 0, minJ * CELL), new THREE.Vector3(minI * CELL, 0, (maxJ + 1) * CELL)],
      [new THREE.Vector3((maxI + 1) * CELL, 0, minJ * CELL), new THREE.Vector3((maxI + 1) * CELL, 0, (maxJ + 1) * CELL)],
    ];
    const fronts = all.map((s) => [new THREE.Vector3(s.i * CELL, 0, s.gate.z), new THREE.Vector3((s.i + 1) * CELL, 0, s.gate.z)]);
    const strips = roadStrips([...routes.values(), ...ring, ...fronts]);
    const asphalt = '#c5cdd8';
    strips.horizontal.forEach((list, z) =>
      list.forEach(([s, e]) => {
        const road = groundRect(e - s, ROAD_W, asphalt, 0.02);
        road.position.set((s + e) / 2, 0.02, z);
        scene.add(road);
        for (let x = s + 1.5; x < e - 1.5; x += 2.6) {
          const dash = groundRect(1.3, 0.14, '#ffffff', 0.03);
          dash.position.set(x + 0.65, 0.03, z);
          scene.add(dash);
        }
      })
    );
    strips.vertical.forEach((list, x) =>
      list.forEach(([s, e]) => {
        const road = groundRect(ROAD_W, e - s, asphalt, 0.024);
        road.position.set(x, 0.024, (s + e) / 2);
        scene.add(road);
        for (let z = s + 1.5; z < e - 1.5; z += 2.6) {
          const dash = groundRect(0.14, 1.3, '#ffffff', 0.034);
          dash.position.set(x, 0.034, z + 0.65);
          scene.add(dash);
        }
      })
    );
    all.forEach((s) => {
      const len = s.gate.z - s.bay.z + 1;
      const drive = groundRect(3.2, len, asphalt, 0.022);
      drive.position.set(s.center.x, 0.022, s.bay.z + len / 2 - 0.5);
      scene.add(drive);
    });

    /* ── Sites ── */
    const selectable: THREE.Object3D[] = [];
    // labels with a priority; overlapping lower-priority labels fade out
    const labelled: { l: CSS2DObject; rank: number; key: string }[] = [];
    let focusKey = '';
    const tag = (obj: THREE.Object3D, sel: NonNullable<Sel>) => {
      obj.userData.sel = sel;
      selectable.push(obj);
    };
    const anchors = new Map<string, THREE.Vector3>();
    const pallets = new Map<string, THREE.Group>();
    const forklifts = new Map<string, { lift: THREE.Group; home: THREE.Vector3 }>();
    const bayFill = new Map<string, number>();
    const pulses: THREE.Mesh[] = [];

    warehouses.forEach((w) => {
      const s = sites.get(`depot:${w.id}`);
      if (!s) return;
      anchors.set(`depot:${w.id}`, s.center.clone());
      const lot = groundRect(CELL - ROAD_W - 1, CELL - ROAD_W - 1, '#dfe5ec', 0.016);
      lot.position.set(s.center.x, 0.016, s.center.z);
      tag(lot, { kind: 'depot', id: w.id });
      scene.add(lot);
      const house = makeWarehouse();
      house.position.set(s.center.x - 1, 0, s.center.z - 2.2);
      tag(house, { kind: 'depot', id: w.id });
      scene.add(house);
      for (let n = -1; n <= 2; n++) {
        const line = groundRect(0.1, 3, '#ffffff', 0.03);
        line.position.set(s.center.x - 1 + n * 2.1 - 1.05, 0.03, s.bay.z);
        scene.add(line);
      }
      // storage yard: one pallet per real stock line
      const lines = inventory.filter((i) => i.warehouse_id === w.id);
      lines.forEach((item, idx) => {
        const ratio = item.min_threshold > 0 ? item.stock_level / item.min_threshold : 3;
        const level = Math.max(1, Math.min(6, Math.round(ratio * 2)));
        const p = makeStockPallet(item.category, level, STOCK_HEX[item.status] ?? '#94a3b8');
        p.position.set(s.center.x + 4.6 + (idx % 2) * 1.9, 0, s.center.z - 4 + Math.floor(idx / 2) * 1.8);
        tag(p, { kind: 'depot', id: w.id });
        pallets.set(item.id, p);
        groups.stock.add(p);
      });
      const lift = makeForklift();
      const home = new THREE.Vector3(s.center.x + 4.2, 0, s.center.z + 1.6);
      lift.position.copy(home);
      lift.rotation.y = Math.PI;
      groups.stock.add(lift);
      forklifts.set(w.id, { lift, home });
      const l = label(w.name, `${lines.length} stock line${lines.length === 1 ? '' : 's'}`);
      l.position.set(s.center.x - 1, 6, s.center.z - 2.2);
      groups.labels.add(l); labelled.push({ l, rank: 2, key: `depot:${w.id}` });
      [[-7, -6.5], [-7, 6], [7.2, 6.4]].forEach(([dx, dz]) => {
        const t = makeTree(0.9 + hash(s.i + dx, s.j + dz) * 0.3);
        t.position.set(s.center.x + dx, 0, s.center.z + dz);
        groups.scenery.add(t);
      });
    });

    linkedIncidents.forEach((inc) => {
      const s = sites.get(`incident:${inc.id}`);
      if (!s) return;
      anchors.set(`incident:${inc.id}`, s.center.clone());
      const { group, ring } = makeIncidentSite(SEVERITY_HEX[inc.severity] ?? '#ef4444');
      group.position.copy(s.center);
      tag(group, { kind: 'incident', id: inc.id });
      groups.incidents.add(group);
      pulses.push(ring);
      const l = label(inc.display_id || 'Incident', `${inc.district} · ${inc.severity}`, inc.severity === 'Critical');
      l.position.set(s.center.x, 5, s.center.z);
      groups.labels.add(l); labelled.push({ l, rank: 1, key: `incident:${inc.id}` });
    });

    suppliers.forEach((name) => {
      const s = sites.get(`supplier:${name}`);
      if (!s) return;
      anchors.set(`supplier:${name}`, s.center.clone());
      const y = makeSupplierYard();
      y.position.set(s.center.x, 0, s.center.z - 1.5);
      tag(y, { kind: 'supplier', id: name });
      scene.add(y);
      const l = label(name, 'Supplier · location not recorded');
      l.position.set(s.center.x, 5, s.center.z - 1.5);
      groups.labels.add(l); labelled.push({ l, rank: 3, key: `supplier:${name}` });
    });

    /* ── Scenery in empty blocks (generic, not real buildings) ── */
    const used = new Set(all.map((s) => `${s.i},${s.j}`));
    for (let i = minI; i <= maxI; i++) {
      for (let j = minJ; j <= maxJ; j++) {
        if (used.has(`${i},${j}`)) continue;
        const cx = (i + 0.5) * CELL;
        const cz = (j + 0.5) * CELL;
        const r = hash(i, j);
        if (r < 0.45) {
          const n = 1 + Math.floor(hash(j, i) * 3);
          for (let b = 0; b < n; b++) {
            const bw = 4 + hash(i + b, j) * 3;
            const bd = 4 + hash(i, j + b) * 3;
            const bld = makeBuilding(bw, bd, 2 + Math.floor(hash(b, i + j) * 4), (['white', 'grey', 'sky'] as const)[b % 3]);
            bld.position.set(cx - 4 + b * 4.5, 0, cz - 2 + (b % 2) * 4);
            groups.scenery.add(bld);
          }
        } else if (r < 0.8) {
          const park = groundRect(CELL - ROAD_W - 1.5, CELL - ROAD_W - 1.5, '#bbf7d0', 0.018);
          park.position.set(cx, 0.018, cz);
          groups.scenery.add(park);
          for (let t = 0; t < 7; t++) {
            const tree = makeTree(0.8 + hash(t, i) * 0.6);
            tree.position.set(cx - 5 + hash(i, t) * 10, 0, cz - 5 + hash(t, j) * 10);
            groups.scenery.add(tree);
          }
        } else {
          for (let h = 0; h < 4; h++) {
            const home = makeBuilding(3, 3, 1, h % 2 ? 'white' : 'grey');
            home.position.set(cx - 3.5 + (h % 2) * 7, 0, cz - 3.5 + Math.floor(h / 2) * 7);
            groups.scenery.add(home);
          }
        }
      }
    }

    /* ── Vehicles: one per request, placed or driven by its real status ── */
    interface Vehicle {
      req: ResourceRequest;
      truck: THREE.Group;
      path: THREE.CurvePath<THREE.Vector3>;
      length: number;
      phase: 'parked' | 'loading' | 'driving' | 'arrived';
      t: number;
      cargo: THREE.Group[];
      stage: THREE.Vector3;
      label: CSS2DObject;
      heading: number;
    }
    const vehicles = new Map<string, Vehicle>();
    const preview = new THREE.Group();
    scene.add(preview);

    const headingOf = (d: THREE.Vector3) => -Math.atan2(d.z, d.x);
    const stackSpot = (base: THREE.Vector3, n: number) => base.clone().add(new THREE.Vector3(-0.35 + (n % 2) * 0.7, Math.floor(n / 2) * 0.44, 0));
    live.forEach((r) => {
      const pts = routes.get(r.id);
      const a = origin(r);
      const b = destination(r);
      if (!pts || !a || !b) return;
      const category = (r.resource_type_id && categoryByType.get(r.resource_type_id)) || 'Emergency supplies';
      const look = STATUS_LOOK[r.status] ?? STATUS_LOOK.Approved;
      const slot = bayFill.get(a.key) ?? 0;
      bayFill.set(a.key, slot + 1);
      const parkAt = a.bay.clone().add(new THREE.Vector3(-3.1 + (slot % 4) * 2.1, 0, 0.4));
      const stage = parkAt.clone().add(new THREE.Vector3(0, 0, -1.6));

      if (r.status === 'Delivered' || r.status === 'Fulfilled') {
        for (let n = 0; n < 3; n++) {
          const c = makeCrate(category);
          c.position.copy(b.bay).add(new THREE.Vector3(-1.2 + n * 0.7, 0, -1.4 - (n % 2) * 0.7));
          tag(c, { kind: 'request', id: r.id });
          groups.stock.add(c);
        }
        anchors.set(`request:${r.id}`, b.bay.clone());
        return;
      }
      if (r.status === 'Pending Approval') {
        // nothing moves yet; a beacon at the destination marks the waiting request
        const dSlot = bayFill.get(`dest:${b.key}`) ?? 0;
        bayFill.set(`dest:${b.key}`, dSlot + 1);
        const beacon = mesh(boxGeo(0.6, 0.6, 0.6), mat('#f59e0b'));
        beacon.position.copy(b.bay).add(new THREE.Vector3(2.4 + dSlot * 1.1, 0.7, -0.8));
        beacon.rotation.y = Math.PI / 4;
        tag(beacon, { kind: 'request', id: r.id });
        groups.vehicles.add(beacon);
        pulses.push(beacon);
        anchors.set(`request:${r.id}`, beacon.position.clone());
        return;
      }

      const path = drivePath(pts);
      const truck = makeTruck(look.hex);
      tag(truck, { kind: 'request', id: r.id });
      groups.vehicles.add(truck);
      const l = label(r.display_id, look.label);
      l.position.set(0, 2.9, 0);
      l.visible = false;
      truck.add(l); labelled.push({ l, rank: 0, key: `request:${r.id}` });
      const cargo: THREE.Group[] = [];
      for (let n = 0; n < 3; n++) {
        const c = makeCrate(category);
        c.position.copy(stackSpot(stage, n));
        cargo.push(c);
        groups.stock.add(c);
      }
      const v: Vehicle = { req: r, truck, path, length: path.getLength(), phase: 'parked', t: 0, cargo, stage, label: l, heading: 0 };

      if (r.status === 'Approved') {
        // parked at the loading bay, nose to the road, boxes staged beside it
        truck.position.copy(parkAt);
        truck.rotation.y = headingOf(new THREE.Vector3(0, 0, 1));
      } else if (reduced) {
        v.phase = 'arrived';
        v.t = 99;
        truck.position.copy(path.getPointAt(1));
        truck.rotation.y = headingOf(path.getTangentAt(0.999));
      } else if (justDispatched.current.has(r.id)) {
        // dispatched in this session: the forklift loads it first, then it drives
        justDispatched.current.delete(r.id);
        v.phase = 'loading';
        truck.position.copy(parkAt);
        truck.rotation.y = headingOf(new THREE.Vector3(0, 0, 1));
      } else {
        v.phase = 'driving';
        cargo.forEach((c) => (c.visible = false));
        truck.position.copy(path.getPointAt(0));
        truck.rotation.y = headingOf(path.getTangentAt(0));
      }
      v.heading = truck.rotation.y;
      vehicles.set(r.id, v);
      anchors.set(`request:${r.id}`, truck.position.clone());
    });

    /* ── Camera: keep the officer's view across data refreshes ── */
    const home = { target: centre.clone(), position: centre.clone().add(new THREE.Vector3(38, 85, 88)), zoom: 1 }; // from the south-east, north stays up
    // fit every site on screen: project the occupied blocks' corners at zoom 1
    {
      camera.position.copy(home.position);
      camera.lookAt(home.target);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      let ex = 0;
      let ey = 0;
      [minI + 1, maxI].forEach((i, a) => [minJ + 1, maxJ].forEach((j, b) => {
        const p = new THREE.Vector3((i + a) * CELL, 0, (j + b) * CELL).project(camera);
        ex = Math.max(ex, Math.abs(p.x));
        ey = Math.max(ey, Math.abs(p.y));
      }));
      home.zoom = THREE.MathUtils.clamp(0.9 / Math.max(ex, ey, 0.01), 0.12, 5);
      controls.minZoom = Math.min(controls.minZoom, home.zoom * 0.8);
    }
    const memo = cameraMemo.current;
    controls.target.copy(memo?.target ?? home.target);
    camera.position.copy(memo?.pos ?? home.position);
    camera.zoom = memo?.zoom ?? home.zoom;
    camera.updateProjectionMatrix();
    controls.update();

    /* ── Route highlight for the selection ── */
    const showRoute = (sel: Sel) => {
      preview.children.forEach((c) => (c as THREE.Mesh).geometry?.dispose());
      preview.clear();
      if (!sel || sel.kind !== 'request') return;
      const pts = routes.get(sel.id);
      if (!pts) return;
      const tube = new THREE.Mesh(new THREE.TubeGeometry(drivePath(pts, 0), 160, 0.22, 8, false), flat('#2563eb', 0.85));
      tube.position.y = 0.25;
      preview.add(tube);
      [pts[0], pts[pts.length - 1]].forEach((p, n) => {
        const disc = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), flat(n ? '#2563eb' : '#0f172a', 0.25));
        disc.rotation.x = -Math.PI / 2;
        disc.position.copy(p).setY(0.05);
        preview.add(disc);
      });
    };

    /* ── Interaction ── */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const visible = (o: THREE.Object3D) => {
      let p: THREE.Object3D | null = o;
      while (p) { if (!p.visible) return false; p = p.parent; }
      return true;
    };
    const pick = (e: PointerEvent): NonNullable<Sel> | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(selectable.filter(visible), true);
      let o: THREE.Object3D | null = hits[0]?.object ?? null;
      while (o && !o.userData.sel) o = o.parent;
      return (o?.userData.sel as NonNullable<Sel>) ?? null;
    };
    let down: { x: number; y: number } | null = null;

    const marker = (hex: string, opacity: number) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      scene.add(m);
      return m;
    };
    const hoverRing = marker('#2563eb', 0.45);
    const selRing = marker('#2563eb', 0.95);
    let hover: Sel = null;
    let chosen: Sel = null;
    const place = (ring: THREE.Mesh, sel: Sel, time: number) => {
      const pos = sel && (vehicles.get(sel.id)?.truck.position ?? anchors.get(`${sel.kind}:${sel.id}`));
      ring.visible = !!pos;
      if (!sel || !pos) return;
      const radius = sel.kind === 'request' ? 2.2 : CELL * 0.46;
      ring.position.set(pos.x, 0.08, pos.z);
      ring.scale.setScalar(ring === selRing && !reduced ? radius * (1 + Math.sin(time * 3) * 0.02) : radius);
    };

    // Arrange mode: drag a depot, incident or supplier onto another block.
    const tile = (hex: string, opacity: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(CELL - ROAD_W, CELL - ROAD_W), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.06;
      m.visible = false;
      scene.add(m);
      return m;
    };
    const fromTile = tile('#0f172a', 0.14);
    const toTile = tile('#2563eb', 0.32);
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const blockAt = (e: PointerEvent): [number, number] | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.ray.intersectPlane(floor, new THREE.Vector3());
      if (!hit) return null;
      return [
        THREE.MathUtils.clamp(Math.floor(hit.x / CELL), minI - 1, maxI + 1),
        THREE.MathUtils.clamp(Math.floor(hit.z / CELL), minJ - 1, maxJ + 1),
      ];
    };
    let drag: { key: string; i: number; j: number; to: [number, number] | null } | null = null;
    const endDrag = () => {
      drag = null;
      fromTile.visible = false;
      toTile.visible = false;
      controls.enabled = true;
    };

    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
      glide = null;
      if (!arrangeRef.current || e.button !== 0) return;
      const hit = pick(e);
      const site = hit && hit.kind !== 'request' ? sites.get(`${hit.kind}:${hit.id}`) : undefined;
      if (!site) return;
      drag = { key: site.key, i: site.i, j: site.j, to: null };
      controls.enabled = false;
      fromTile.position.set(site.center.x, 0.06, site.center.z);
      fromTile.visible = true;
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
    };
    const onUp = (e: PointerEvent) => {
      if (drag) {
        const { key, i, j, to } = drag;
        endDrag();
        if (to && (to[0] !== i || to[1] !== j)) {
          // freeze every place where it stands, then move this one (swapping with whoever is there)
          const next: Pins = {};
          sites.forEach((st) => { next[st.key] = [st.i, st.j]; });
          const occupant = all.find((st) => st.i === to[0] && st.j === to[1]);
          if (occupant) next[occupant.key] = [i, j];
          next[key] = to;
          down = null;
          savePinsRef.current(next);
          return;
        }
      }
      if (!down || e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
      setSelected(pick(e));
    };
    const onMove = (e: PointerEvent) => {
      if (drag) {
        const b = blockAt(e);
        if (!b) return;
        drag.to = b;
        toTile.position.set((b[0] + 0.5) * CELL, 0.07, (b[1] + 0.5) * CELL);
        toTile.visible = b[0] !== drag.i || b[1] !== drag.j;
        return;
      }
      if (e.buttons !== 0) { hover = null; return; }
      const hit = pick(e);
      hover = hit;
      renderer.domElement.style.cursor = !hit ? 'grab' : arrangeRef.current && hit.kind !== 'request' ? 'move' : 'pointer';
    };
    const onCancel = () => { if (drag) endDrag(); };
    const onLeave = () => { hover = null; };
    renderer.domElement.addEventListener('pointercancel', onCancel);
    renderer.domElement.addEventListener('pointerleave', onLeave);
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointermove', onMove);

    let glide: { target: THREE.Vector3; position: THREE.Vector3; zoom: number } | null = null;
    let follow: string | null = null;
    const bounce = new Map<THREE.Object3D, number>();
    const offset = () => camera.position.clone().sub(controls.target);
    api.current = {
      zoom: (f) => { glide = { target: controls.target.clone(), position: camera.position.clone(), zoom: THREE.MathUtils.clamp(camera.zoom * f, controls.minZoom, controls.maxZoom) }; },
      rotate: (deg) => {
        const o = offset().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg));
        glide = { target: controls.target.clone(), position: controls.target.clone().add(o), zoom: camera.zoom };
      },
      reset: () => { follow = null; glide = { target: home.target.clone(), position: home.position.clone(), zoom: home.zoom }; },
      focus: (sel) => {
        focusKey = sel ? `${sel.kind}:${sel.id}` : '';
        chosen = sel;
        showRoute(sel);
        vehicles.forEach((v, id) => { v.label.visible = sel?.kind === 'request' && sel.id === id; });
        if (!sel) return;
        const v = sel.kind === 'request' ? vehicles.get(sel.id) : undefined;
        const p = v ? v.truck.position.clone() : anchors.get(`${sel.kind}:${sel.id}`);
        if (!p) return;
        // a whole block for a place, closer for a truck; never zooms the officer out of a closer look at a truck
        const zoom = sel.kind === 'request' ? Math.max(camera.zoom, 2.6) : THREE.MathUtils.clamp(camera.zoom, 1.9, 3.2);
        glide = { target: p.clone(), position: p.clone().add(offset()), zoom };
      },
      follow: (id) => { follow = id; if (id) glide = null; },
      replay: (id) => {
        const v = vehicles.get(id);
        if (!v) return;
        v.phase = 'driving';
        v.t = 0;
        v.cargo.forEach((c) => (c.visible = false));
      },
      layers: (l) => (Object.keys(groups) as LayerKey[]).forEach((k) => (groups[k].visible = l[k])),
      pulseStock: (itemId) => { const p = pallets.get(itemId); if (p) bounce.set(p, 0); },
    };
    api.current.layers(layersRef.current);
    if (selectedRef.current) api.current.focus(selectedRef.current);

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      Object.assign(camera, { left: (-view * w) / h, right: (view * w) / h, top: view, bottom: -view });
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    /* ── Animation loop ── */
    const clock = new THREE.Clock();
    let raf = 0;
    let lastReport = 0;
    let lastDeclutter = 0;
    const tmp = new THREE.Vector3();
    const up = new THREE.Vector3(0, 0.9, 0);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;

      if (!reduced) {
        pulses.forEach((p, i) => {
          if (p.geometry.type === 'BoxGeometry') { p.position.y = 0.7 + Math.sin(time * 2 + i) * 0.15; p.rotation.y += dt; return; }
          const u = (time * 0.5 + i * 0.3) % 1;
          p.scale.setScalar(1 + u * 0.5);
          (p.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - u);
        });
      }
      bounce.forEach((t, obj) => {
        const nt = t + dt;
        obj.position.y = Math.abs(Math.sin(nt * 8)) * 0.5 * Math.max(0, 1 - nt / 1.2);
        if (nt > 1.2) { obj.position.y = 0; bounce.delete(obj); } else bounce.set(obj, nt);
      });

      vehicles.forEach((v) => {
        if (v.phase === 'parked') return;
        v.t += dt;
        if (v.phase === 'loading') {
          // the forklift shuttles; each box arcs from the stage into the truck bed (~1 s each)
          const fl = v.req.warehouse_id ? forklifts.get(v.req.warehouse_id) : undefined;
          v.cargo.forEach((c, n) => {
            const u = THREE.MathUtils.smoothstep(v.t - n, 0, 1);
            const from = stackSpot(v.stage, n);
            const to = v.truck.position.clone().add(up);
            c.position.lerpVectors(from, to, u);
            c.position.y += Math.sin(u * Math.PI) * 1.2;
            c.visible = u < 1;
          });
          if (fl) fl.lift.position.lerpVectors(fl.home, v.stage.clone().add(new THREE.Vector3(1.4, 0, 0)), (1 - Math.cos(v.t * Math.PI)) / 2);
          if (v.t > v.cargo.length + 0.4) {
            v.phase = 'driving';
            v.t = 0;
            if (fl) fl.lift.position.copy(fl.home);
          }
        } else if (v.phase === 'driving') {
          const u = Math.min(1, (v.t * SPEED) / v.length);
          const e = THREE.MathUtils.clamp(u < 0.05 ? (u / 0.05) ** 2 * 0.05 : u > 0.95 ? 1 - ((1 - u) / 0.05) ** 2 * 0.05 : u, 0, 1);
          v.path.getPointAt(e, tmp);
          v.truck.position.copy(tmp);
          const target = headingOf(v.path.getTangentAt(THREE.MathUtils.clamp(e, 0.001, 0.999)));
          const d = Math.atan2(Math.sin(target - v.heading), Math.cos(target - v.heading));
          v.heading += d * Math.min(1, dt * 8);
          v.truck.rotation.y = v.heading;
          if (u >= 1) { v.phase = 'arrived'; v.t = 0; }
        } else if (v.phase === 'arrived' && v.t < 3) {
          // unload: boxes drop beside the truck at the destination
          const b = destination(v.req);
          if (b) {
            v.cargo.forEach((c, n) => {
              const u = THREE.MathUtils.smoothstep(v.t - n * 0.35, 0, 0.5);
              const spot = b.bay.clone().add(new THREE.Vector3(-1.2 + n * 0.7, 0, -1.6));
              const from = v.truck.position.clone().add(up);
              c.visible = u > 0;
              c.position.lerpVectors(from, spot, u);
              c.position.y += Math.sin(u * Math.PI) * 0.6;
            });
          }
        }
      });

      // follow camera: keep the chosen truck centred while the officer can still orbit
      if (follow) {
        const v = vehicles.get(follow);
        if (v) {
          const o = offset();
          controls.target.lerp(v.truck.position, 0.12);
          camera.position.copy(controls.target).add(o);
        }
      }
      if (glide) {
        controls.target.lerp(glide.target, 0.12);
        camera.position.lerp(glide.position, 0.12);
        camera.zoom += (glide.zoom - camera.zoom) * 0.12;
        camera.updateProjectionMatrix();
        if (controls.target.distanceTo(glide.target) < 0.05 && camera.position.distanceTo(glide.position) < 0.05 && Math.abs(camera.zoom - glide.zoom) < 0.01) glide = null;
      }
      controls.update();
      place(selRing, chosen, time);
      place(hoverRing, hover && !(chosen && hover.kind === chosen.kind && hover.id === chosen.id) ? hover : null, time);
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      if (time - lastDeclutter > 0.15) {
        lastDeclutter = time;
        const kept: DOMRect[] = [];
        [...labelled]
          .sort((a, b) => (a.key === focusKey ? -1 : a.rank) - (b.key === focusKey ? -1 : b.rank))
          .forEach(({ l }) => {
            const el = l.element;
            if (el.style.display === 'none') return;
            const r = el.getBoundingClientRect();
            const clash = kept.some((k) => r.left < k.right + 4 && r.right > k.left - 4 && r.top < k.bottom + 2 && r.bottom > k.top - 2);
            el.style.opacity = clash ? '0' : '1';
            if (!clash) kept.push(r);
          });
      }

      if (time - lastReport > 0.25) {
        lastReport = time;
        const next: Record<string, number> = {};
        vehicles.forEach((v, id) => {
          next[id] = v.phase === 'arrived' ? 1 : v.phase === 'driving' ? Math.min(1, (v.t * SPEED) / v.length) : 0;
        });
        setProgress((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      }
    };
    loop();

    return () => {
      cameraMemo.current = { pos: camera.position.clone(), target: controls.target.clone(), zoom: camera.zoom };
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointercancel', onCancel);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      controls.dispose();
      // cached geometries/materials in models.ts are reused across rebuilds;
      // per-scene ones (ground rects, route tube) are disposed here
      scene.traverse((o) => {
        const g = (o as THREE.Mesh).geometry;
        if (g && !isShared(g)) g.dispose();
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      mount.removeChild(labelRenderer.domElement);
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => { api.current?.focus(selected); setConfirming(null); }, [selected]);
  useEffect(() => { api.current?.follow(following); }, [following]);
  useEffect(() => { api.current?.layers(layers); }, [layers]);

  /* ── Facts for the panels ── */
  const selReq = selected?.kind === 'request' ? live.find((r) => r.id === selected.id) ?? null : null;
  const groupsByStatus: { status: string; items: ResourceRequest[] }[] = [
    { status: 'Pending Approval', items: live.filter((r) => r.status === 'Pending Approval') },
    { status: 'Approved', items: live.filter((r) => r.status === 'Approved') },
    { status: 'Dispatched', items: live.filter((r) => r.status === 'Dispatched') },
    { status: 'Delivered', items: live.filter((r) => r.status === 'Delivered' || r.status === 'Fulfilled') },
  ];

  const advance = (req: ResourceRequest, to: 'Dispatched' | 'Delivered') =>
    updateStatus.mutate(
      { id: req.id, status: to },
      {
        onSuccess: () => {
          if (to === 'Dispatched') justDispatched.current.add(req.id);
          setConfirming(null);
          if (to === 'Delivered' && requestFlow(req) === 'replenishment') {
            toast.success('Stock received', `${req.quantity_requested.toLocaleString()} ${req.unit} added to ${req.warehouse_name ?? 'the depot'}.`);
          } else {
            toast.success(to === 'Delivered' ? 'Marked delivered' : 'Supplies dispatched', `${req.display_id} updated.`);
          }
        },
        onError: (err) => toast.error('Update failed', err instanceof Error ? err.message : 'Could not update the request.'),
      }
    );


  return (
    <div className="relative h-[calc(100vh-250px)] min-h-[640px] rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100">
      <div ref={mountRef} onPointerDown={() => setHinted(true)} className="absolute inset-0 isolate z-0" />

      {/* Top-left: two compact menus instead of a wall of cards */}
      <div className="absolute top-3 left-3 flex items-start gap-2">
        {([
          ['requests', ListChecks, `Requests ${live.length}`],
          ['layers', Layers, 'Layers'],
        ] as const).map(([id, Icon, text]) => (
          <div key={id} className="relative">
            <button onClick={() => setMenu(menu === id ? null : id)} aria-expanded={menu === id}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border shadow-sm cursor-pointer ${menu === id ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white'}`}>
              <Icon size={14} />{text}
            </button>
            {menu === 'requests' && id === 'requests' && (
              <div className="absolute top-full left-0 mt-2 w-[330px] max-h-[380px] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-20">
                {groupsByStatus.map((g) => (
                  <div key={g.status} className="px-2 py-1">
                    <p className="px-2 text-[11px] font-semibold text-slate-500 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_LOOK[g.status].hex }} />
                      {STATUS_LOOK[g.status].label} <span className="text-slate-400 tabular-nums">{g.items.length}</span>
                    </p>
                    {g.items.length === 0 ? <p className="px-2 py-1 text-[11px] text-slate-400">None</p> : g.items.map((r) => {
                      const { from, to } = requestRoute(r);
                      return (
                        <button key={r.id} onClick={() => { setSelected({ kind: 'request', id: r.id }); setMenu(null); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <span className="block text-xs font-semibold text-slate-900 truncate">{r.display_id} · {r.item_requested || 'Supplies'}</span>
                          <span className="block text-[11px] text-slate-500 truncate">{from} → {to}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            {menu === 'layers' && id === 'layers' && (
              <div className="absolute top-full left-0 mt-2 w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-20">
                {([
                  ['stock', 'Stock and forklifts'],
                  ['vehicles', 'Trucks and requests'],
                  ['incidents', 'Incidents'],
                  ['scenery', 'Surroundings (scenery)'],
                  ['labels', 'Labels'],
                ] as const).map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={layers[k]} onChange={() => setLayers((p) => ({ ...p, [k]: !p[k] }))} className="accent-blue-600" />
                    {l}
                  </label>
                ))}
                <div className="mt-1 pt-2 border-t border-slate-100 px-2 space-y-1 text-[11px] text-slate-500">
                  {Object.entries(STOCK_HEX).map(([s, c]) => (
                    <p key={s} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{s === 'Sufficient' ? 'In stock' : s}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        <button onClick={() => setArrange((a) => !a)} aria-pressed={arrange} title="Drag places to rearrange the map"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border shadow-sm cursor-pointer ${arrange ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white'}`}>
          <Move size={14} />Arrange
        </button>
        {Object.keys(pins).length > 0 && (
          <button onClick={() => savePins({})} title="Put every place back where it was"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border shadow-sm cursor-pointer bg-white/95 text-slate-700 border-slate-200 hover:bg-white">
            <Undo2 size={14} />Reset layout
          </button>
        )}
      </div>

      {/* Camera controls and the simulation note, bottom-left */}
      <div className="absolute left-3 bottom-3 flex items-center gap-2 flex-wrap" style={{ right: selected ? 360 : 12 }}>
        <div className="flex bg-white/95 border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {([
            [Plus, 'Zoom in', () => api.current?.zoom(1.6)],
            [Minus, 'Zoom out', () => api.current?.zoom(1 / 1.6)],
            [RotateCcw, 'Turn left', () => api.current?.rotate(-45)],
            [RotateCw, 'Turn right', () => api.current?.rotate(45)],
            [LocateFixed, 'Whole map', () => { setFollowing(null); setSelected(null); api.current?.reset(); }],
          ] as const).map(([Icon, l, fn], n) => (
            <button key={l} onClick={fn} title={l} aria-label={l} className={`p-2 text-slate-600 hover:bg-slate-50 cursor-pointer ${n ? 'border-l border-slate-200' : ''}`}>
              <Icon size={15} />
            </button>
          ))}
        </div>
        <p
          className="text-[11px] text-slate-600 bg-white/90 border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5"
          title="Schematic map: places keep their real relative positions on a block grid. Statuses come from the database; truck movement is simulated because no vehicle tracking is connected. Drag to move, right-drag (or Shift-drag) to turn, scroll to zoom."
        >
          <Info size={13} className="shrink-0 text-blue-600" />
          {arrange ? 'Drag a place to another block' : hinted ? 'Schematic map · truck movement simulated' : 'Drag to move · right-drag to turn · scroll to zoom · click a place'}
        </p>
      </div>

      {/* Right panel: only when something is selected */}
      {selected && (
        <aside className="absolute top-3 right-3 bottom-3 w-[min(336px,calc(100%-24px))] bg-white border border-slate-200 rounded-2xl shadow-lg overflow-y-auto">
          <Details
            sel={selected}
            onClose={() => { setSelected(null); setFollowing(null); }}
            inventory={inventory}
            requests={live}
            depot={selected.kind === 'depot' ? depotById.get(selected.id) : undefined}
            incident={selected.kind === 'incident' ? incidentById.get(selected.id) : undefined}
            request={selReq}
            progress={selReq ? progress[selReq.id] : undefined}
            following={following}
            onFollow={(id) => setFollowing((f) => (f === id ? null : id))}
            onReplay={(id) => api.current?.replay(id)}
            onPick={(sel) => setSelected(sel)}
            onPulseStock={(id) => api.current?.pulseStock(id)}
            canDispatch={canDispatch}
            confirming={confirming}
            setConfirming={setConfirming}
            busy={updateStatus.isPending}
            onAdvance={advance}
            onReview={onReview}
            onOpenRequest={onOpenRequest}
          />
        </aside>
      )}

    </div>
  );
};

/* ── Details panel ───────────────────────────────────────────────────────── */
const Details: React.FC<{
  sel: NonNullable<Sel>;
  onClose: () => void;
  inventory: ResourceItem[];
  requests: ResourceRequest[];
  depot?: Warehouse;
  incident?: Incident;
  request: ResourceRequest | null;
  progress?: number;
  following: string | null;
  onFollow: (id: string) => void;
  onReplay: (id: string) => void;
  onPick: (sel: NonNullable<Sel>) => void;
  onPulseStock: (itemId: string) => void;
  canDispatch: boolean;
  confirming: string | null;
  setConfirming: (id: string | null) => void;
  busy: boolean;
  onAdvance: (req: ResourceRequest, to: 'Dispatched' | 'Delivered') => void;
  onReview?: (req: ResourceRequest) => void;
  onOpenRequest?: (req: ResourceRequest) => void;
}> = (p) => {
  const { sel, request } = p;
  const Icon = sel.kind === 'depot' ? WarehouseIcon : sel.kind === 'incident' ? AlertTriangle : sel.kind === 'supplier' ? Factory : Truck;
  const iconColor = sel.kind === 'depot' ? TONE.blue : sel.kind === 'incident' ? TONE.red : sel.kind === 'supplier' ? TONE.slate : TONE.cyan;
  const related = p.requests.filter((r) =>
    sel.kind === 'depot' ? r.warehouse_id === sel.id : sel.kind === 'incident' ? r.incident_id === sel.id : sel.kind === 'supplier' ? (r.supplier || 'Supplier not recorded') === sel.id && requestFlow(r) === 'replenishment' : false
  );
  const outgoing = related.filter((r) => requestFlow(r) === 'requisition');
  const incoming = related.filter((r) => requestFlow(r) === 'replenishment');
  const lines = sel.kind === 'depot' ? p.inventory.filter((i) => i.warehouse_id === sel.id) : [];
  const warnings = lines.filter((i) => i.status !== 'Sufficient');
  const listed = sel.kind === 'depot' ? outgoing : related;

  const title = request ? request.item_requested || 'Supplies' : p.depot?.name ?? p.incident?.title ?? sel.id;
  const kicker = request ? `${requestFlow(request) === 'replenishment' ? 'Restock' : 'Requisition'} · ${request.display_id}` : sel.kind === 'depot' ? 'Depot' : sel.kind === 'incident' ? `Incident · ${p.incident?.display_id ?? ''}` : 'Supplier';
  const sub = request ? `${request.quantity_requested.toLocaleString()} ${request.unit} · ${request.agency}` : p.depot ? `${p.depot.district}, ${p.depot.state}` : p.incident ? `${p.incident.district}, ${p.incident.state}` : 'Location not recorded';

  const requestRow = (r: ResourceRequest) => {
    const look = STATUS_LOOK[r.status];
    const { from, to } = requestRoute(r);
    return (
      <button key={r.id} onClick={() => p.onPick({ kind: 'request', id: r.id })} className="w-full text-left rounded-lg border border-slate-200/80 px-3 py-2 hover:bg-slate-50 cursor-pointer">
        <span className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-900">{r.display_id}</span>
          {look && <Tag tone={look.tone}>{look.label}</Tag>}
        </span>
        <span className="block text-[11px] text-slate-600 mt-1 truncate">{r.item_requested || 'Supplies'} · {r.quantity_requested.toLocaleString()} {r.unit}</span>
        <span className="block text-[11px] text-slate-400 truncate">{from} → {to}</span>
      </button>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${iconColor}14`, color: iconColor }}><Icon size={19} /></span>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 tabular-nums">{kicker}</p>
            <p className="text-sm font-bold text-slate-900 leading-snug">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
          </div>
        </div>
        <button onClick={p.onClose} aria-label="Close" className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"><X size={16} /></button>
      </div>

      {request && (() => {
        const look = STATUS_LOOK[request.status];
        const action = nextAction(request);
        const { from, to } = requestRoute(request);
        const moving = request.status === 'Dispatched';
        const restock = requestFlow(request) === 'replenishment';
        const goFrom = () => (restock ? p.onPick({ kind: 'supplier', id: request.supplier || 'Supplier not recorded' }) : request.warehouse_id && p.onPick({ kind: 'depot', id: request.warehouse_id }));
        const goTo = () => (restock ? request.warehouse_id && p.onPick({ kind: 'depot', id: request.warehouse_id }) : request.incident_id && p.onPick({ kind: 'incident', id: request.incident_id }));
        const rows: [string, string, (() => void) | null][] = [
          ['From', from, goFrom],
          ['To', to, goTo],
          ['Updated', request.updated_at ? formatDateTime(request.updated_at) : 'Not recorded', null],
        ];
        return (
          <>
            <div className="flex items-center gap-1.5 flex-wrap">
              {look && <Tag tone={look.tone}>{look.label}</Tag>}
              <Tag variant="outline" dot={false}>{request.urgency} urgency</Tag>
            </div>
            <div className="rounded-xl border border-slate-200/80 px-2 pt-3 pb-2.5">
              <Tracker req={request} />
            </div>
            <dl className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 text-xs">
              {rows.map(([k, v, go]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 px-3 py-2">
                  <dt className="text-slate-500 shrink-0">{k}</dt>
                  <dd className="text-right font-semibold text-slate-800 min-w-0">
                    {go ? <button onClick={go} className="hover:text-blue-700 underline-offset-2 hover:underline cursor-pointer text-right">{v}</button> : v}
                  </dd>
                </div>
              ))}
            </dl>

            {(moving || request.status === 'Approved') && (
              <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{moving ? 'Simulated position on route' : 'Parked at the loading bay'}</span>
                  {moving && <span className="font-semibold text-slate-700 tabular-nums">{Math.round((p.progress ?? 0) * 100)}%</span>}
                </div>
                {moving && (
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(p.progress ?? 0) * 100}%`, background: TONE.cyan }} />
                  </div>
                )}
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => p.onFollow(request.id)} className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${p.following === request.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                    <Crosshair size={12} /> {p.following === request.id ? 'Following' : 'Follow truck'}
                  </button>
                  {moving && (
                    <button onClick={() => p.onReplay(request.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <Play size={12} /> Replay route
                    </button>
                  )}
                </div>
                {moving && <p className="text-[10px] text-slate-400 mt-1.5">No vehicle tracking is connected. This shows the route, not a GPS position.</p>}
              </div>
            )}

            {request.status === 'Pending Approval' && p.onReview && (
              <button onClick={() => p.onReview!(request)} className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
                Review in approvals
              </button>
            )}
            {action && (p.canDispatch ? (
              p.confirming === request.id ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                  <p className="text-xs text-slate-700">
                    {action.to === 'Dispatched'
                      ? restock ? 'Mark this order as in transit?' : `Dispatch ${request.quantity_requested.toLocaleString()} ${request.unit} from ${from}?`
                      : restock ? `Confirm receipt? This adds ${request.quantity_requested.toLocaleString()} ${request.unit} to the depot's stock.` : 'Confirm the supplies reached the incident?'}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => p.setConfirming(null)} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white cursor-pointer">Cancel</button>
                    <button disabled={p.busy} onClick={() => p.onAdvance(request, action.to)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 cursor-pointer">
                      {p.busy && <Loader2 size={12} className="animate-spin" />}Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => p.setConfirming(request.id)} className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
                  {action.label}
                </button>
              )
            ) : (
              <p className="text-[11px] text-slate-400">Dispatching and confirming deliveries need the dispatch permission.</p>
            ))}
            {p.onOpenRequest && (
              <button onClick={() => p.onOpenRequest!(request)} className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer">
                Full request record
              </button>
            )}
          </>
        );
      })()}

      {p.incident && (
        <div className="flex gap-1.5">
          <Tag tone={p.incident.severity === 'Critical' ? 'red' : p.incident.severity === 'High' ? 'orange' : p.incident.severity === 'Medium' ? 'amber' : 'slate'}>{p.incident.severity}</Tag>
          <Tag variant="outline" dot={false}>{p.incident.status}</Tag>
        </div>
      )}

      {p.depot?.full_address && <p className="text-[11px] text-slate-500">{p.depot.full_address}</p>}

      {sel.kind === 'depot' && warnings.length > 0 && (
        <div className="rounded-xl px-3 py-2.5" style={{ background: `${TONE.amber}12` }}>
          <p className="text-xs font-semibold text-amber-700">{warnings.length} stock line{warnings.length === 1 ? '' : 's'} need attention</p>
          {warnings.map((w) => (
            <button key={w.id} onClick={() => p.onPulseStock(w.id)} className="block text-left text-[11px] text-slate-700 hover:underline cursor-pointer">
              {w.name}: {w.stock_level.toLocaleString()} {w.unit} (threshold {w.min_threshold.toLocaleString()})
            </button>
          ))}
        </div>
      )}

      {sel.kind === 'depot' && (
        <section>
          <p className="text-xs font-semibold text-slate-800 mb-2">Stock <span className="text-slate-400 font-normal">{lines.length}</span></p>
          {lines.length === 0 ? <p className="text-xs text-slate-400">No stock lines at this depot.</p> : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/80">
              {lines.map((i) => (
                <li key={i.id}>
                  <button onClick={() => p.onPulseStock(i.id)} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer" title="Show this pallet in the yard">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-800 truncate">{i.name}</span>
                      <Tag tone={STOCK_TONE[i.status] ?? 'slate'}>{i.status === 'Sufficient' ? 'In stock' : i.status}</Tag>
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">{i.category} · {i.stock_level.toLocaleString()} {i.unit} · threshold {i.min_threshold.toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {sel.kind !== 'request' && (
        <>
          {listed.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-slate-800 mb-2">{sel.kind === 'depot' ? 'Outgoing' : 'Requests'} <span className="text-slate-400 font-normal">{listed.length}</span></p>
              <div className="space-y-1.5">{listed.map(requestRow)}</div>
            </section>
          )}
          {sel.kind === 'depot' && incoming.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-slate-800 mb-2">Incoming restocks <span className="text-slate-400 font-normal">{incoming.length}</span></p>
              <div className="space-y-1.5">{incoming.map(requestRow)}</div>
            </section>
          )}
          {related.length === 0 && <p className="text-xs text-slate-400">No requests linked here.</p>}
        </>
      )}
    </div>
  );
};

/* ── Tracker: the request's real steps; times only where recorded ───────── */
const Tracker: React.FC<{ req: ResourceRequest }> = ({ req }) => {
  const steps = FLOW_STEPS[requestFlow(req)];
  const status = req.status === 'Fulfilled' ? 'Delivered' : req.status;
  const current = steps.findIndex((s) => s.status === status);
  const when: Record<string, string | null | undefined> = {
    'Pending Approval': req.requested_at,
    Approved: req.approved_at,
    Dispatched: req.dispatched_at,
    Delivered: req.delivered_at,
  };
  return (
    <ol className="grid grid-cols-4 gap-1">
      {steps.map((s, i) => {
        const done = i < current || (i === current && s.status === 'Delivered');
        const now = i === current && !done;
        const color = done ? TONE.teal : now ? (STATUS_LOOK[req.status]?.hex ?? TONE.blue) : '#cbd5e1';
        const at = when[s.status];
        return (
          <li key={s.status} className="relative flex flex-col items-center text-center">
            {i > 0 && <span className="absolute top-3.5 right-1/2 w-full h-0.5" style={{ background: i <= current ? TONE.teal : '#e2e8f0' }} />}
            <span className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: color, boxShadow: now ? `0 0 0 4px ${color}33` : undefined }}>
              {done ? <Check size={14} /> : i + 1}
            </span>
            <span className={`mt-1.5 text-[11px] font-semibold ${i <= current ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
            <span className="text-[10px] text-slate-400 tabular-nums">{at ? formatDateTime(at) : i <= current ? 'Time not recorded' : ''}</span>
          </li>
        );
      })}
    </ol>
  );
};
