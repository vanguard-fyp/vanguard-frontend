import * as THREE from 'three';

/* Low-poly models for the 3D resource yard. Geometries and materials are
   cached and shared, so repeated objects (crates, trees, trucks) cost little. */

const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.Material>();

export const boxGeo = (w: number, h: number, d: number) => {
  const k = `b${w}|${h}|${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k)!;
};
const cylGeo = (rt: number, rb: number, h: number, seg = 14) => {
  const k = `c${rt}|${rb}|${h}|${seg}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.CylinderGeometry(rt, rb, h, seg));
  return geoCache.get(k)!;
};
const sphGeo = (r: number) => {
  const k = `s${r}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.SphereGeometry(r, 14, 10));
  return geoCache.get(k)!;
};
export const mat = (color: string, rough = 0.78) => {
  const k = `${color}|${rough}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.04 }));
  return matCache.get(k)!;
};
export const flat = (color: string, opacity = 1) => {
  const k = `f${color}|${opacity}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  return matCache.get(k)!;
};

export const mesh = (geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, shadow = true) => {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = shadow;
  o.receiveShadow = true;
  return o;
};

/** Flat rectangle on the ground (roads, lots, markings). */
export const groundRect = (w: number, d: number, color: string, y: number, opacity = 1) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), flat(color, opacity));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.receiveShadow = true;
  return m;
};

/** True for geometries cached here (shared across scenes; never dispose per scene). */
export const isShared = (g: THREE.BufferGeometry) => {
  for (const v of geoCache.values()) if (v === g) return true;
  return false;
};

export function disposeShared() {
  geoCache.forEach((g) => g.dispose());
  matCache.forEach((m) => m.dispose());
  geoCache.clear();
  matCache.clear();
}

/* ── Warehouse: blue and white, loading bays on the +z side ─────────────── */
export function makeWarehouse(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(boxGeo(7, 2.6, 4.6), mat('#3b82f6'), 0, 1.3, 0));
  // white lower band and corner columns, like a cladded shed
  g.add(mesh(boxGeo(7.04, 0.5, 4.64), mat('#e2e8f0'), 0, 0.25, 0));
  // gable roof
  const shape = new THREE.Shape();
  shape.moveTo(-3.7, 0);
  shape.lineTo(3.7, 0);
  shape.lineTo(0, 1.4);
  shape.closePath();
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: false }), mat('#1d4ed8'));
  roof.position.set(0, 2.6, -2.5);
  roof.castShadow = true;
  g.add(roof);
  // roof ribs
  for (let i = -3; i <= 3; i++) g.add(mesh(boxGeo(0.06, 0.06, 5.02), mat('#1e40af'), i, 2.62, 0, false));
  // side annex
  g.add(mesh(boxGeo(2.2, 1.9, 3.4), mat('#60a5fa'), -4.5, 0.95, -0.4));
  g.add(mesh(boxGeo(2.4, 0.18, 3.6), mat('#1d4ed8'), -4.5, 1.95, -0.4));
  // loading bays: frame, dark opening, dock leveller
  for (let i = -1; i <= 1; i++) {
    g.add(mesh(boxGeo(1.6, 1.9, 0.1), mat('#f1f5f9'), i * 2.1, 0.95, 2.33, false));
    g.add(mesh(boxGeo(1.3, 1.6, 0.12), mat('#1e293b'), i * 2.1, 0.8, 2.34, false));
    g.add(mesh(boxGeo(1.4, 0.12, 0.6), mat('#94a3b8'), i * 2.1, 0.06, 2.65, false));
  }
  // round sign on the gable
  const sign = mesh(cylGeo(0.45, 0.45, 0.08, 24), mat('#ffffff'), 0, 3.1, 2.52, false);
  sign.rotation.x = Math.PI / 2;
  g.add(sign);
  return g;
}

/* ── Stock: one pallet per stock line, styled by category ──────────────── */
export type Category = 'Food' | 'Medical supplies' | 'Rescue equipment' | 'Vehicles' | 'Emergency supplies' | string;

export function makeCrate(category: Category): THREE.Group {
  const g = new THREE.Group();
  if (category === 'Medical supplies') {
    g.add(mesh(boxGeo(0.6, 0.42, 0.6), mat('#f8fafc'), 0, 0.21, 0));
    g.add(mesh(boxGeo(0.36, 0.02, 0.1), mat('#ef4444'), 0, 0.43, 0, false));
    g.add(mesh(boxGeo(0.1, 0.02, 0.36), mat('#ef4444'), 0, 0.43, 0, false));
  } else if (category === 'Rescue equipment') {
    g.add(mesh(boxGeo(0.62, 0.4, 0.62), mat('#f97316'), 0, 0.2, 0));
    g.add(mesh(boxGeo(0.64, 0.06, 0.64), mat('#334155'), 0, 0.43, 0, false));
  } else if (category === 'Emergency supplies') {
    g.add(mesh(boxGeo(0.6, 0.42, 0.6), mat('#60a5fa'), 0, 0.21, 0));
    g.add(mesh(boxGeo(0.62, 0.05, 0.12), mat('#1e3a8a'), 0, 0.3, 0, false));
  } else {
    // Food and anything else: cardboard with tape
    g.add(mesh(boxGeo(0.6, 0.42, 0.6), mat('#d9a066'), 0, 0.21, 0));
    g.add(mesh(boxGeo(0.12, 0.02, 0.62), mat('#a16207'), 0, 0.43, 0, false));
  }
  return g;
}

/** A small vehicle for the "Vehicles" category (boats, trucks held as stock). */
function makeStockVehicle(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(boxGeo(1.2, 0.3, 0.6), mat('#ef4444'), 0, 0.25, 0));
  g.add(mesh(boxGeo(0.5, 0.3, 0.56), mat('#f8fafc'), 0.25, 0.55, 0));
  [-0.4, 0.4].forEach((x) => [-0.3, 0.3].forEach((z) => {
    const w = mesh(cylGeo(0.13, 0.13, 0.08), mat('#1e293b'), x, 0.13, z);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  }));
  return g;
}

/**
 * Stock pallet. `level` (1–6) is a relative mark: how stock compares with its
 * safety threshold, never a count of physical units. The floor pad shows status.
 */
export function makeStockPallet(category: Category, level: number, statusColor: string): THREE.Group {
  const g = new THREE.Group();
  g.add(groundRect(1.7, 1.5, statusColor, 0.03, 0.35));
  g.add(mesh(boxGeo(1.4, 0.12, 1.25), mat('#a16207'), 0, 0.06, 0));
  if (category === 'Vehicles') {
    g.add(makeStockVehicle());
    return g;
  }
  for (let i = 0; i < level; i++) {
    const c = makeCrate(category);
    const layer = Math.floor(i / 2);
    c.position.set((i % 2) * 0.66 - 0.33, 0.12 + layer * 0.44, 0);
    g.add(c);
  }
  return g;
}

/* ── Forklift ─────────────────────────────────────────────────────────── */
export function makeForklift(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(boxGeo(1, 0.45, 0.7), mat('#fbbf24'), 0, 0.42, 0));
  g.add(mesh(boxGeo(0.5, 0.5, 0.66), mat('#f59e0b'), -0.2, 0.9, 0));
  g.add(mesh(boxGeo(0.06, 0.55, 0.62), mat('#1e293b'), -0.2, 1.4, 0, false)); // roof guard
  g.add(mesh(boxGeo(0.08, 1.5, 0.5), mat('#334155'), 0.55, 0.85, 0)); // mast
  g.add(mesh(boxGeo(0.6, 0.05, 0.12), mat('#475569'), 0.85, 0.12, -0.16, false));
  g.add(mesh(boxGeo(0.6, 0.05, 0.12), mat('#475569'), 0.85, 0.12, 0.16, false));
  [[-0.3, 0.36], [-0.3, -0.36], [0.3, 0.36], [0.3, -0.36]].forEach(([x, z]) => {
    const w = mesh(cylGeo(0.17, 0.17, 0.12), mat('#1e293b'), x, 0.17, z);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  });
  return g;
}

/* ── Delivery truck: points along +x ──────────────────────────────────── */
export function makeTruck(accent: string): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(boxGeo(2.6, 1.3, 1.15), mat('#f8fafc'), -0.35, 1.05, 0));
  g.add(mesh(boxGeo(2.62, 0.16, 1.17), mat(accent), -0.35, 0.48, 0, false));
  g.add(mesh(boxGeo(0.9, 1.05, 1.1), mat(accent), 1.45, 0.88, 0));
  g.add(mesh(boxGeo(0.06, 0.42, 0.92), mat('#0f172a', 0.25), 1.92, 1.1, 0, false));
  g.add(mesh(boxGeo(3.4, 0.2, 1.05), mat('#334155'), 0.05, 0.36, 0, false));
  [[-1.2, 0.55], [-1.2, -0.55], [-0.5, 0.55], [-0.5, -0.55], [1.4, 0.55], [1.4, -0.55]].forEach(([x, z]) => {
    const w = mesh(cylGeo(0.27, 0.27, 0.16), mat('#1e293b'), x, 0.27, z);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  });
  return g;
}

/* ── Scenery ──────────────────────────────────────────────────────────── */
export function makeTree(scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(cylGeo(0.1, 0.13, 0.7), mat('#92400e'), 0, 0.35, 0));
  const crown = mesh(sphGeo(0.6), mat('#34d399'), 0, 1.15, 0);
  crown.scale.set(1, 1.15, 1);
  g.add(crown);
  g.scale.setScalar(scale);
  return g;
}

/** Generic surrounding building (scenery only; not a real record). */
export function makeBuilding(w: number, d: number, floors: number, tone: 'white' | 'grey' | 'sky'): THREE.Group {
  const g = new THREE.Group();
  const h = floors * 1.1;
  const wall = tone === 'white' ? '#f8fafc' : tone === 'grey' ? '#e2e8f0' : '#dbeafe';
  g.add(mesh(boxGeo(w, h, d), mat(wall), 0, h / 2, 0));
  for (let f = 0; f < floors; f++) {
    g.add(mesh(boxGeo(w + 0.02, 0.32, d + 0.02), mat('#93c5fd', 0.3), 0, 0.6 + f * 1.1, 0, false));
  }
  g.add(mesh(boxGeo(w + 0.1, 0.12, d + 0.1), mat('#cbd5e1'), 0, h + 0.06, 0, false));
  return g;
}

export function makeIncidentSite(color: string): { group: THREE.Group; ring: THREE.Mesh } {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.9, 48), flat(color, 0.45));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  g.add(ring);
  g.add(groundRect(4.4, 4.4, color, 0.03, 0.12));
  const pin = mesh(new THREE.ConeGeometry(0.55, 1.6, 20), mat(color), 0, 2, 0);
  pin.rotation.x = Math.PI;
  g.add(pin);
  g.add(mesh(sphGeo(0.72), mat(color), 0, 3.05, 0));
  g.add(mesh(sphGeo(0.28), mat('#ffffff'), 0, 3.05, 0.55, false));
  // traffic cones around the site
  [[-1.8, 1.8], [1.8, 1.8], [-1.8, -1.8], [1.8, -1.8]].forEach(([x, z]) => {
    g.add(mesh(new THREE.ConeGeometry(0.18, 0.5, 12), mat('#f97316'), x, 0.25, z));
  });
  return { group: g, ring };
}

export function makeSupplierYard(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(boxGeo(5.5, 2.2, 3.8), mat('#94a3b8'), 0, 1.1, 0));
  g.add(mesh(boxGeo(5.7, 0.2, 4), mat('#64748b'), 0, 2.3, 0));
  const ch = mesh(cylGeo(0.3, 0.36, 2.4), mat('#64748b'), 1.8, 3.4, -1);
  g.add(ch);
  for (let i = -1; i <= 1; i++) g.add(mesh(boxGeo(1.2, 1.4, 0.1), mat('#1e293b'), i * 1.6, 0.7, 1.92, false));
  return g;
}
