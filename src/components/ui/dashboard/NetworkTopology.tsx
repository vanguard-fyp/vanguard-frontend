import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw, Maximize2, Minimize2, X,
  ArrowUpRight
} from 'lucide-react';
import type { TopoNode, TopoEdge, TopoNodeType } from '../../../types';

interface NetworkTopologyProps {
  nodes: TopoNode[];
  edges: TopoEdge[];
  onSelectNode?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  incidents?: Array<{
    id: string; title: string; severity: string; district: string;
    affectedPopulation: number; aiPriorityScore: number | null; status: string;
  }>;
  activityFeed?: Array<{
    id: string; time: string; event: string; actor: string; type: string;
  }>;
}

// ─── High Contrast Node Palette for Dark Background ───────────────────────
// White, Sky Blue, Royal Purple, Emerald Green - luminous against dark canvas
const PALETTE: Record<TopoNodeType, { hex: number; tailwindBg: string; tailwindText: string; tailwindBorder: string; css: string }> = {
  hub: { hex: 0xffffff, tailwindBg: 'bg-white', tailwindText: 'text-white', tailwindBorder: 'border-white/40', css: '#ffffff' }, // Crisp Glowing White
  incident: { hex: 0x38bdf8, tailwindBg: 'bg-sky-400', tailwindText: 'text-sky-400', tailwindBorder: 'border-sky-400/40', css: '#38bdf8' }, // Vivid Sky Blue
  team: { hex: 0xa855f7, tailwindBg: 'bg-purple-500', tailwindText: 'text-purple-400', tailwindBorder: 'border-purple-500/40', css: '#a855f7' }, // Electric Purple
  mission: { hex: 0x34d399, tailwindBg: 'bg-emerald-400', tailwindText: 'text-emerald-400', tailwindBorder: 'border-emerald-400/40', css: '#34d399' }, // Vibrant Emerald
};

const NODE_COLOR = (n: TopoNode): number => PALETTE[n.type]?.hex || 0x38bdf8;

// ─── Canvas Label Sprite ──────────────────────────────────────────────────────
function createLabelSprite(label: string, colorHex: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 384; canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  const c = new THREE.Color(colorHex);
  const r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255);

  // Dark translucent background card with bright crisp text
  ctx.fillStyle = `rgba(15, 23, 42, 0.9)`;
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
  ctx.lineWidth = 3;
  const rx = 16, px = 8, py = 8, pw = 368, ph = 80;
  ctx.beginPath();
  ctx.moveTo(px + rx, py);
  ctx.arcTo(px + pw, py, px + pw, py + ph, rx);
  ctx.arcTo(px + pw, py + ph, px, py + ph, rx);
  ctx.arcTo(px, py + ph, px, py, rx);
  ctx.arcTo(px, py, px + pw, py, rx);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 26px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(label, 192, 48);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(5.2, 1.3, 1);
  return sprite;
}

/** Luminous additive radial glow halo */
function createGlowHalo(colorHex: number, size: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const c = new THREE.Color(colorHex);
  const r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255);
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
  grad.addColorStop(0.3, `rgba(${r},${g},${b},0.35)`);
  grad.addColorStop(0.7, `rgba(${r},${g},${b},0.08)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({
  nodes, edges, onSelectNode,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendRef = useRef<THREE.WebGLRenderer | null>(null);
  const ctrlRef = useRef<OrbitControls | null>(null);
  const meshMap = useRef<Map<string, THREE.Mesh>>(new Map());
  const haloMap = useRef<Map<string, THREE.Sprite>>(new Map());
  const lightMap = useRef<Map<string, THREE.PointLight>>(new Map());
  const tubeMeshesRef = useRef<{ edge: TopoEdge; mesh: THREE.Mesh }[]>([]);

  const [modalNode, setModalNode] = useState<TopoNode | null>(null);
  const [filterType, setFilterType] = useState<TopoNodeType | 'all'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  // ── 3D Layout coordinates
  const nodes3D = useMemo(() => nodes.map((n) => ({
    ...n,
    x3d: ((n.x - 320) / 320) * 20,
    y3d: -((n.y - 210) / 210) * 12,
    z3d: n.type === 'hub' ? 0 : n.type === 'team' ? 2.5 : n.type === 'incident' ? -2.5 : 1.5,
  })), [nodes]);

  const visibleNodes = useMemo(() =>
    nodes3D.filter((n) => filterType === 'all' || n.type === 'hub' || n.type === filterType),
    [nodes3D, filterType]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() =>
    edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)),
    [edges, visibleNodeIds]);

  // ── Connected Nodes calculation for hover spotlight
  const connectedNodeIds = useMemo(() => {
    if (!hovered) return null;
    const connected = new Set<string>([hovered]);
    edges.forEach((e) => {
      if (e.source === hovered) connected.add(e.target);
      if (e.target === hovered) connected.add(e.source);
    });
    return connected;
  }, [hovered, edges]);

  // ── Node click handler
  const handleNodeClick = useCallback((nodeId: string) => {
    const found = nodes.find((n) => n.id === nodeId);
    if (found) { setModalNode(found); }
    if (onSelectNode) onSelectNode(nodeId);
  }, [nodes, onSelectNode]);

  // ── Handle WebGL Window Resize on Fullscreen Toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mountRef.current && rendRef.current && ctrlRef.current) {
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        rendRef.current.setSize(w, h);
        const camera = ctrlRef.current.object as THREE.PerspectiveCamera;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // ── Apply Connected Node Spotlight on Hover
  useEffect(() => {
    meshMap.current.forEach((mesh, id) => {
      const isHighlighted = !connectedNodeIds || connectedNodeIds.has(id);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isHighlighted ? 0.7 : 0.08;
      mat.opacity = isHighlighted ? 1.0 : 0.15;
      mat.transparent = !isHighlighted;
    });

    haloMap.current.forEach((sprite, id) => {
      const isHighlighted = !connectedNodeIds || connectedNodeIds.has(id);
      sprite.material.opacity = isHighlighted ? 0.9 : 0.05;
    });

    lightMap.current.forEach((light, id) => {
      const isHighlighted = !connectedNodeIds || connectedNodeIds.has(id);
      light.intensity = isHighlighted ? 2.0 : 0.05;
    });

    tubeMeshesRef.current.forEach(({ edge, mesh }) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (!connectedNodeIds) {
        mat.opacity = 0.5;
      } else {
        const isConnectedEdge = connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target);
        mat.opacity = isConnectedEdge ? 0.95 : 0.05;
      }
    });
  }, [connectedNodeIds]);

  // ── Build Three.js Scene
  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const w = mountEl.clientWidth, h = mountEl.clientHeight;

    const scene = new THREE.Scene();
    // Premium Dark Space Canvas (#0b1329) - provides extreme contrast for nodes and connecting lines
    scene.background = new THREE.Color(0x0b1329);
    scene.fog = new THREE.FogExp2(0x0b1329, 0.007);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
    camera.position.set(0, -1, 36);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountEl.appendChild(renderer.domElement);
    rendRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 60;
    controls.minDistance = 8;
    controls.enablePan = true;
    ctrlRef.current = controls;

    const onWheel = (e: WheelEvent) => e.stopPropagation();
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Ambient & Directional Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fillLight.position.set(10, 20, 10);
    scene.add(fillLight);

    // Node Spheres & Glow Halos
    const nodesGroup = new THREE.Group();
    const sphereMeshes: THREE.Mesh[] = [];
    meshMap.current.clear();
    haloMap.current.clear();
    lightMap.current.clear();

    visibleNodes.forEach((n) => {
      const colorHex = NODE_COLOR(n);
      const radius = n.type === 'hub' ? 1.3 : 0.9;
      const pos = new THREE.Vector3(n.x3d, n.y3d, n.z3d);

      const geo = new THREE.SphereGeometry(radius, 36, 36);
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex, roughness: 0.15, metalness: 0.2,
        emissive: colorHex, emissiveIntensity: 0.6,
      });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.copy(pos);
      sphere.userData = { id: n.id };
      nodesGroup.add(sphere);
      sphereMeshes.push(sphere);
      meshMap.current.set(n.id, sphere);

      const halo = createGlowHalo(colorHex, radius * 4.8);
      halo.position.copy(pos);
      nodesGroup.add(halo);
      haloMap.current.set(n.id, halo);

      const light = new THREE.PointLight(colorHex, 1.8, 12);
      light.position.copy(pos);
      scene.add(light);
      lightMap.current.set(n.id, light);

      const label = createLabelSprite(n.label, colorHex);
      label.position.set(pos.x, pos.y - radius - 1.4, pos.z);
      nodesGroup.add(label);
    });
    scene.add(nodesGroup);

    // High Contrast Connecting Edges (Lines)
    const edgesGroup = new THREE.Group();
    tubeMeshesRef.current = [];

    visibleEdges.forEach((edge) => {
      const src = visibleNodes.find((n) => n.id === edge.source);
      const tgt = visibleNodes.find((n) => n.id === edge.target);
      if (!src || !tgt) return;

      const midX = (src.x3d + tgt.x3d) / 2;
      const midY = (src.y3d + tgt.y3d) / 2;
      const midZ = (src.z3d + tgt.z3d) / 2 + 1.2;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(src.x3d, src.y3d, src.z3d),
        new THREE.Vector3(midX, midY, midZ),
        new THREE.Vector3(tgt.x3d, tgt.y3d, tgt.z3d),
      );

      const edgeColor = PALETTE[src.type]?.hex || 0x38bdf8;
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.05, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.5 });
      const mesh = new THREE.Mesh(tubeGeo, tubeMat);
      edgesGroup.add(mesh);
      tubeMeshesRef.current.push({ edge, mesh });
    });
    scene.add(edgesGroup);

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(sphereMeshes);
      setHovered(hits.length > 0 ? (hits[0].object.userData.id as string) : null);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(sphereMeshes);
      if (hits.length > 0) handleNodeClick(hits[0].object.userData.id);
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    let rafId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      const t = clock.getElapsedTime();

      sphereMeshes.forEach((mesh) => {
        const id = mesh.userData.id as string;
        const isHov = hovered === id;
        const pulse = 1 + Math.sin(t * 1.8 + mesh.position.x) * 0.04;
        const scale = isHov ? pulse * 1.25 : pulse;
        mesh.scale.setScalar(scale);

        const halo = haloMap.current.get(id);
        if (halo) halo.scale.setScalar((mesh.geometry as THREE.SphereGeometry).parameters.radius * 4.8 * scale);
      });

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mountEl) return;
      const rw = mountEl.clientWidth, rh = mountEl.clientHeight;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (mountEl.contains(renderer.domElement)) mountEl.removeChild(renderer.domElement);
      controls.dispose();
      renderer.dispose();
    };
  }, [visibleNodes, visibleEdges, handleNodeClick]);

  const closeModal = () => { setModalNode(null); };

  // Connected nodes list for Modal display
  const connectedEdgesList = modalNode
    ? edges.filter((e) => e.source === modalNode.id || e.target === modalNode.id)
    : [];

  const connectedNodesList = connectedEdgesList.map((e) => {
    const otherId = e.source === modalNode!.id ? e.target : e.source;
    return { node: nodes.find((n) => n.id === otherId)!, edgeType: e.type };
  }).filter((c) => c.node);

  return (
    <>
      {/* ─── Main 3D Topology View Container ─────────────────────────────── */}
      <div
        className={`relative flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0b1329] shadow-lg transition-all ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : ''
          }`}
        style={{ height: isFullscreen ? '100vh' : '520px' }}
      >
        {/* Header Bar */}
        <div className="px-4 py-2.5 flex items-center justify-between shrink-0 bg-[#0f172a] border-b border-slate-800 z-10">
          <div className="flex items-center gap-2">
            {/* <Network size={16} className="text-sky-400" /> */}
            {/* <span className="text-xs font-bold text-white uppercase tracking-wider">3D Network Topology</span> */}
            <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded">
              {visibleNodes.length} Active Nodes
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
              {(['all', 'hub', 'incident', 'team', 'mission'] as const).map((f) => {
                const active = filterType === f;
                return (
                  <button key={f} onClick={() => setFilterType(f)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer capitalize ${active ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    {f === 'all' ? 'All' : `${f.charAt(0).toUpperCase() + f.slice(1)}s`}
                  </button>
                );
              })}
            </div>

            <button onClick={() => { if (ctrlRef.current) ctrlRef.current.reset(); }}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer shadow-xs"
              title="Reset View"
            >
              <RotateCcw size={13} />
            </button>
            <button onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer shadow-xs"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        {/* 3D Canvas Viewport - Dark Space */}
        <div className="flex-1 relative overflow-hidden bg-[#0b1329]">
          <div ref={mountRef} className="absolute inset-0 w-full h-full" />

          {/* Nav Hint Overlay */}
          <div className="absolute bottom-3 right-3 z-10 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded border border-slate-800">
            <span>Hover to spotlight connections · Click node to inspect</span>
          </div>

          {/* Hover Notification Pill */}
          <AnimatePresence>
            {hovered && !modalNode && (
              <motion.div
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute top-3 right-3 z-10 pointer-events-none"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 shadow-xl text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${PALETTE[nodes.find(n => n.id === hovered)?.type || 'hub'].tailwindBg}`} />
                  <span className="font-bold text-white">{nodes.find(n => n.id === hovered)?.label}</span>
                  <span className="text-slate-400 font-medium">— click to inspect details</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dark Theme Legend Footer */}
        <div className="px-4 py-2 flex items-center justify-between shrink-0 bg-[#0f172a] border-t border-slate-800 text-xs z-10">
          <div className="flex items-center gap-5">
            {[
              { type: 'hub', label: 'Command Hub (White)' },
              { type: 'incident', label: 'Incidents (Blue)' },
              { type: 'team', label: 'Rescue Teams (Purple)' },
              { type: 'mission', label: 'Missions (Green)' },
            ].map(({ type, label }) => (
              <span key={label} className="flex items-center gap-1.5 font-medium text-slate-300">
                <span className={`w-2.5 h-2.5 rounded-full ${PALETTE[type as TopoNodeType].tailwindBg}`} />
                {label}
              </span>
            ))}
          </div>
          <span className="hidden md:inline text-[10px] font-mono text-slate-500">
            High Contrast Luminous Space Canvas
          </span>
        </div>
      </div>

      {/* ─── Sleek Node Inspector Modal ────────────────────── */}
      <AnimatePresence>
        {modalNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)' }}
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${PALETTE[modalNode.type].tailwindBg} shadow-xs border border-slate-300`} />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{modalNode.label}</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {modalNode.sublabel} · <span className="uppercase font-mono text-[10px] font-bold text-slate-700">{modalNode.type}</span>
                    </p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Operational Status</p>
                    <p className="text-xs font-bold text-emerald-700 mt-0.5">{modalNode.status || 'Active'}</p>
                  </div>
                  {modalNode.affected && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Affected Population</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">{modalNode.affected.toLocaleString()}</p>
                    </div>
                  )}
                  {modalNode.personnel && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Active Squad Personnel</p>
                      <p className="text-xs font-bold text-purple-700 mt-0.5">{modalNode.personnel} Personnel</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Direct Relational Connections ({connectedNodesList.length})
                  </p>
                  <div className="space-y-1.5">
                    {connectedNodesList.map(({ node, edgeType }) => (
                      <div key={node.id}
                        onClick={() => { setModalNode(node); }}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full ${PALETTE[node.type].tailwindBg} border border-slate-300`} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{node.label}</p>
                            <p className="text-[10px] text-slate-500">{node.sublabel}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                            {edgeType}
                          </span>
                          <ArrowUpRight size={14} className="text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
