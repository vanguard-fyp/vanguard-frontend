import * as THREE from 'three';

/* Schematic logistics map.
   Places keep their real relative positions (from stored lat/lng) but are
   snapped onto a city-block grid so roads can connect them. Roads run along
   the block edges; a route leaves a site by its driveway, follows the roads
   and enters the destination by its driveway. It is a schematic, so the
   scene says so; it is not a street map. */

export const CELL = 18; // block size in scene units
export const ROAD_W = 3.4;

export interface Site {
  key: string; // e.g. depot:<id>
  i: number;
  j: number;
  center: THREE.Vector3;
  /** where vehicles stop (in front of the loading bays / site entry) */
  bay: THREE.Vector3;
  /** where the driveway meets the road */
  gate: THREE.Vector3;
}

export function placeSites(
  items: { key: string; lat: number | null; lng: number | null }[],
  fallbackColumn: string[] = [],
  /** blocks the officer chose by dragging (view only); they win over the computed spot */
  pinned: Record<string, [number, number]> = {}
): Map<string, Site> {
  const located = items.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)) as { key: string; lat: number; lng: number }[];
  const lats = located.map((p) => p.lat);
  const lngs = located.map((p) => p.lng);
  const cLat = located.length ? (Math.min(...lats) + Math.max(...lats)) / 2 : 0;
  const cLng = located.length ? (Math.min(...lngs) + Math.max(...lngs)) / 2 : 0;
  const span = located.length ? Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs), 0.05) : 1;
  const k = (CELL * 5) / span; // about 5 blocks across the widest side

  const taken = new Set<string>();
  const sites = new Map<string, Site>();
  const claim = (key: string, i0: number, j0: number) => {
    // nearest free block, spiralling out, so two nearby places never share a block
    for (let r = 0; r < 12; r++) {
      for (let di = -r; di <= r; di++) {
        for (let dj = -r; dj <= r; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = i0 + di;
          const j = j0 + dj;
          if (taken.has(`${i},${j}`)) continue;
          taken.add(`${i},${j}`);
          const cx = (i + 0.5) * CELL;
          const cz = (j + 0.5) * CELL;
          sites.set(key, {
            key,
            i,
            j,
            center: new THREE.Vector3(cx, 0, cz),
            bay: new THREE.Vector3(cx, 0, cz + CELL * 0.27),
            gate: new THREE.Vector3(cx, 0, (j + 1) * CELL),
          });
          return;
        }
      }
    }
  };
  const known = new Set([...items.map((p) => p.key), ...fallbackColumn]);
  Object.entries(pinned).forEach(([key, [i, j]]) => { if (known.has(key)) claim(key, i, j); });
  located
    .filter((p) => !sites.has(p.key))
    .map((p) => ({ ...p, x: (p.lng - cLng) * k, z: -(p.lat - cLat) * k }))
    .sort((a, b) => a.z - b.z || a.x - b.x)
    .forEach((p) => claim(p.key, Math.floor(p.x / CELL), Math.floor(p.z / CELL)));

  // Places without a stored location go in a labelled column west of the map.
  const minI = Math.min(...[...sites.values()].map((s) => s.i), 0);
  fallbackColumn.filter((key) => !sites.has(key)).forEach((key, n) => claim(key, minI - 2, n));
  return sites;
}

export type Seg = { a: THREE.Vector3; b: THREE.Vector3 };

/** Road route between two sites: driveway → block roads → driveway. */
export function routeBetween(from: Site, to: Site): THREE.Vector3[] {
  const zA = from.gate.z;
  const zB = to.gate.z;
  // the vertical road on the side of the destination block that faces the origin
  const xr = (to.i + (from.center.x <= to.center.x ? 0 : 1)) * CELL;
  const pts = [
    from.bay.clone(),
    new THREE.Vector3(from.center.x, 0, zA),
    new THREE.Vector3(xr, 0, zA),
    new THREE.Vector3(xr, 0, zB),
    new THREE.Vector3(to.center.x, 0, zB),
    to.bay.clone(),
  ];
  return pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]) > 0.01);
}

/** Merge the straight pieces of all routes into road strips per grid line. */
export function roadStrips(routes: THREE.Vector3[][]): { horizontal: Map<number, [number, number][]>; vertical: Map<number, [number, number][]>; drives: Seg[] } {
  const horizontal = new Map<number, [number, number][]>();
  const vertical = new Map<number, [number, number][]>();
  const drives: Seg[] = [];
  const onGridLine = (v: number) => Math.abs(v / CELL - Math.round(v / CELL)) < 1e-6;
  routes.forEach((pts) => {
    for (let n = 1; n < pts.length; n++) {
      const a = pts[n - 1];
      const b = pts[n];
      if (Math.abs(a.z - b.z) < 1e-6 && onGridLine(a.z)) {
        const list = horizontal.get(a.z) ?? [];
        list.push([Math.min(a.x, b.x), Math.max(a.x, b.x)]);
        horizontal.set(a.z, list);
      } else if (Math.abs(a.x - b.x) < 1e-6 && onGridLine(a.x)) {
        const list = vertical.get(a.x) ?? [];
        list.push([Math.min(a.z, b.z), Math.max(a.z, b.z)]);
        vertical.set(a.x, list);
      } else {
        drives.push({ a, b });
      }
    }
  });
  const merge = (m: Map<number, [number, number][]>) => {
    m.forEach((list, key) => {
      list.sort((p, q) => p[0] - q[0]);
      const out: [number, number][] = [];
      list.forEach(([s, e]) => {
        const last = out[out.length - 1];
        if (last && s <= last[1] + 0.01) last[1] = Math.max(last[1], e);
        else out.push([s, e]);
      });
      // extend half a road width so corners meet cleanly
      m.set(key, out.map(([s, e]) => [s - ROAD_W / 2, e + ROAD_W / 2]));
    });
  };
  merge(horizontal);
  merge(vertical);
  return { horizontal, vertical, drives };
}

/**
 * The drivable curve for a route: kept to the LEFT lane (Malaysia drives on
 * the left) with rounded corners, so a vehicle turns instead of snapping.
 */
export function drivePath(pts: THREE.Vector3[], laneOffset = 0.85, radius = 1.6): THREE.CurvePath<THREE.Vector3> {
  const left = (d: THREE.Vector3) => new THREE.Vector3(d.z, 0, -d.x); // left of travel direction (x→z plane)
  const dirs = pts.slice(1).map((p, i) => p.clone().sub(pts[i]).normalize());
  const off = pts.map((p, i) => {
    const dPrev = dirs[Math.max(0, i - 1)];
    const dNext = dirs[Math.min(dirs.length - 1, i)];
    const o = new THREE.Vector3();
    if (i === 0) o.add(left(dNext));
    else if (i === pts.length - 1) o.add(left(dPrev));
    else o.add(left(dPrev)).add(left(dNext)).multiplyScalar(dPrev.dot(dNext) > 0.99 ? 0.5 : 1);
    return p.clone().add(o.multiplyScalar(laneOffset)).setY(0);
  });
  const path = new THREE.CurvePath<THREE.Vector3>();
  let cursor = off[0].clone();
  for (let i = 1; i < off.length; i++) {
    const p = off[i];
    if (i === off.length - 1) {
      path.add(new THREE.LineCurve3(cursor, p.clone()));
      break;
    }
    const dIn = p.clone().sub(off[i - 1]).normalize();
    const dOut = off[i + 1].clone().sub(p).normalize();
    const lenIn = p.distanceTo(off[i - 1]);
    const lenOut = off[i + 1].distanceTo(p);
    const r = Math.min(radius, lenIn / 2, lenOut / 2);
    const enter = p.clone().sub(dIn.clone().multiplyScalar(r));
    const exit = p.clone().add(dOut.clone().multiplyScalar(r));
    if (cursor.distanceTo(enter) > 0.01) path.add(new THREE.LineCurve3(cursor, enter));
    path.add(new THREE.QuadraticBezierCurve3(enter, p.clone(), exit));
    cursor = exit;
  }
  return path;
}
