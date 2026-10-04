'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';

// ── 3D: DeckGL + MapLibre ────────────────────────────────────────────────────
import DeckGL from '@deck.gl/react';
import { Map as MapLibreMap } from 'react-map-gl/maplibre';
import { ScatterplotLayer, ColumnLayer } from '@deck.gl/layers';

// ── 2D: react-leaflet ────────────────────────────────────────────────────────
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';

// ── Icons ────────────────────────────────────────────────────────────────────
import {
  Crosshair,
  RotateCcw,
  Layers,
  Eye,
  EyeOff,
  MousePointer2,
  Compass,
  Phone,
  Clock,
  Radio,
} from 'lucide-react';

import { DisasterBadge } from '../dashboard/DisasterBadge';
import type { GISLayerState, Incident, MapPOI, FlyToTarget, HoverInfo } from '../../../types';
import { DARK_STYLE, TOPOLOGY_PLANES } from '../../../constants';
import { overpassService } from '../../../services/overpassService';

import 'maplibre-gl/dist/maplibre-gl.css';
import 'leaflet/dist/leaflet.css';

interface MapCanvasProps {
  layers: GISLayerState;
  is3D: boolean;
  viewMode?: 'map' | 'topology';
  flyToTarget?: FlyToTarget | null;
  onSelectIncident: (incident: Incident) => void;
  onToggleLayer?: (key: keyof GISLayerState) => void;
  incidents?: Incident[];
  pois?: MapPOI[];
}

// Helper component inside Leaflet to smoothly fly to location
const LeafletFlyTo: React.FC<{ target: FlyToTarget | null }> = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom || 10, { duration: 1.5 });
    }
  }, [target, map]);
  return null;
};

// Helper component inside Leaflet to progressively load Overpass facilities when panning / zooming
const LeafletViewportLoader: React.FC<{
  onFetchArea: (lat: number, lng: number) => void;
}> = ({ onFetchArea }) => {
  const map = useMap();

  useEffect(() => {
    let timer: any;
    const handleMoveEnd = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const zoom = map.getZoom();
        if (zoom >= 8) {
          const center = map.getCenter();
          onFetchArea(center.lat, center.lng);
        }
      }, 800);
    };

    map.on('moveend', handleMoveEnd);
    return () => {
      clearTimeout(timer);
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onFetchArea]);

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Geographic constants — show ALL of Malaysia
// ─────────────────────────────────────────────────────────────────────────────
const MY_LEAFLET_CENTER: [number, number] = [4.5, 108.5]; // [lat, lng]
const MY_DECK_CENTER: [number, number] = [108.5, 4.5]; // [lng, lat]
const MY_INITIAL_ZOOM = 5.5;

// Color palettes
const severityHex: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#22c55e',
};

const severityRgb: Record<string, [number, number, number]> = {
  Critical: [239, 68, 68],
  High: [249, 115, 22],
  Medium: [251, 191, 36],
  Low: [34, 197, 94],
};

const poiHex: Record<string, string> = {
  Hospital: '#db2777',
  Clinic: '#0d9488',
  'Police Station': '#1d4ed8',
  Police: '#1d4ed8',
  'Fire Station': '#dc2626',
  'Fire & Rescue': '#dc2626',
  Shelter: '#059669',
  School: '#7c3aed',
  'Rescue Team': '#0891b2',
  Warehouse: '#4f46e5',
  Depot: '#4f46e5',
  Utility: '#d97706',
  'Road Closure': '#64748b',
  Pharmacy: '#0d9488',
  Other: '#64748b',
};

const poiRgb: Record<string, [number, number, number]> = {
  Hospital: [219, 39, 119],
  Clinic: [13, 148, 136],
  'Police Station': [29, 78, 216],
  Police: [29, 78, 216],
  'Fire Station': [220, 38, 38],
  'Fire & Rescue': [220, 38, 38],
  Shelter: [5, 150, 105],
  School: [124, 58, 237],
  'Rescue Team': [8, 145, 178],
  Warehouse: [79, 70, 229],
  Depot: [79, 70, 229],
  Utility: [217, 119, 6],
  'Road Closure': [100, 116, 139],
  Pharmacy: [13, 148, 136],
  Other: [100, 116, 139],
};

const poiToLayerKey: Record<string, keyof GISLayerState> = {
  Hospital: 'hospitals',
  Clinic: 'clinics',
  'Police Station': 'policeStations',
  Police: 'policeStations',
  'Fire Station': 'fireStations',
  'Fire & Rescue': 'fireStations',
  Shelter: 'emergencyShelters',
  School: 'evacuationSchools',
  'Rescue Team': 'rescueTeamLocations',
  Warehouse: 'rescueTeamLocations',
  Depot: 'rescueTeamLocations',
  Utility: 'utilityElectricity',
  'Road Closure': 'roadAccessibility',
  Pharmacy: 'clinics',
  Other: 'utilityElectricity',
};

export const MapCanvas3D: React.FC<MapCanvasProps> = ({
  layers,
  is3D,
  viewMode = 'map',
  flyToTarget = null,
  onSelectIncident,
  onToggleLayer,
  incidents = [],
  pois = [],
}) => {
  const [hover, setHover] = useState<HoverInfo>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [liveFacilities, setLiveFacilities] = useState<MapPOI[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);

  // DeckGL view state
  const [viewState, setViewState] = useState({
    longitude: MY_DECK_CENTER[0],
    latitude: MY_DECK_CENTER[1],
    zoom: MY_INITIAL_ZOOM,
    pitch: is3D ? 55 : 0,
    bearing: is3D ? -15 : 0,
  });

  // Handle flyToTarget in 3D mode
  useEffect(() => {
    if (flyToTarget) {
      setViewState((v) => ({
        ...v,
        longitude: flyToTarget.lng,
        latitude: flyToTarget.lat,
        zoom: flyToTarget.zoom || 9.5,
        transitionDuration: 1500,
      }));
    }
  }, [flyToTarget]);

  // Animate camera when toggling between 2D and 3D
  const prevIs3D = React.useRef(is3D);
  useEffect(() => {
    if (prevIs3D.current !== is3D) {
      prevIs3D.current = is3D;
      setViewState((v) => ({
        ...v,
        pitch: is3D ? 55 : 0,
        bearing: is3D ? -15 : 0,
      }));
    }
  }, [is3D]);

  const resetView = useCallback(() => {
    setViewState({
      longitude: MY_DECK_CENTER[0],
      latitude: MY_DECK_CENTER[1],
      zoom: MY_INITIAL_ZOOM,
      pitch: is3D ? 55 : 0,
      bearing: is3D ? -15 : 0,
    });
  }, [is3D]);

  // ── Progressive OSM facility loader (shared by Leaflet viewport events + 3D focus) ──
  const fetchAreaFacilities = useCallback(async (lat: number, lng: number) => {
    if (overpassService.hasFetchedNear(lat, lng, 6)) return;
    setIsLoadingFacilities(true);
    try {
      const pois = await overpassService.fetchNearbyFacilities(lat, lng, 8000, 60);
      setLiveFacilities((prev) => {
        const map = new Map<string, MapPOI>(prev.map((p) => [p.id, p]));
        pois.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
    } catch (err) {
      console.warn('Overpass fetch notice:', err);
    } finally {
      setIsLoadingFacilities(false);
    }
  }, []);

  // ── Fetch Real OSM Facilities around focus targets & top active hazard incidents ──
  useEffect(() => {
    let isCancelled = false;

    const loadLiveFacilities = async () => {
      const queryCenters: { lat: number; lng: number }[] = [];

      if (flyToTarget) {
        queryCenters.push({ lat: flyToTarget.lat, lng: flyToTarget.lng });
      } else if (incidents.length > 0) {
        // Only query around the top-3 most-impacted incidents to avoid Overpass timeout
        const severityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        const top3 = [...incidents]
          .sort((a, b) => {
            const sv = (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
            if (sv !== 0) return sv;
            return (b.affected_population || 0) - (a.affected_population || 0);
          })
          .slice(0, 3);
        top3.forEach((inc) => queryCenters.push({ lat: inc.coordinates[0], lng: inc.coordinates[1] }));
      }

      for (const c of queryCenters) {
        if (isCancelled) break;
        if (overpassService.hasFetchedNear(c.lat, c.lng, 6)) continue;
        setIsLoadingFacilities(true);
        try {
          const pois = await overpassService.fetchNearbyFacilities(c.lat, c.lng, 8000, 60);
          if (!isCancelled) {
            setLiveFacilities((prev) => {
              const map = new Map<string, MapPOI>(prev.map((p) => [p.id, p]));
              pois.forEach((p) => map.set(p.id, p));
              return Array.from(map.values());
            });
          }
        } catch (err) {
          console.warn('Overpass fetch notice:', err);
        } finally {
          if (!isCancelled) setIsLoadingFacilities(false);
        }
      }
    };

    loadLiveFacilities();

    return () => {
      isCancelled = true;
    };
  }, [flyToTarget, incidents]);

  // Use real live Overpass OSM facilities (plus real warehouses if provided)
  const combinedPOIs = useMemo(() => {
    const map = new Map<string, MapPOI>();
    liveFacilities.forEach((p) => map.set(p.id, p));
    pois.forEach((p) => {
      if (p.category === 'Warehouse' && !map.has(p.id)) {
        map.set(p.id, p);
      }
    });
    return Array.from(map.values());
  }, [pois, liveFacilities]);

  // Filter incidents based on active hazard layers
  const visibleIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (layers.disasterHotspots) return true;

      const t = (inc.type || (inc as any).disaster_type || '').toLowerCase();
      if (layers.floodAreas && (t.includes('flood') || t.includes('inundation'))) return true;
      if (layers.landslideAreas && (t.includes('landslide') || t.includes('slope'))) return true;
      if (layers.fireZones && (t.includes('fire') || t.includes('wildfire'))) return true;
      if (
        layers.severeStorms &&
        (t.includes('storm') || t.includes('cyclone') || t.includes('haze') || t.includes('wind'))
      )
        return true;
      if (
        layers.earthquakeDrought &&
        (t.includes('earthquake') || t.includes('seismic') || t.includes('drought'))
      )
        return true;

      return false;
    });
  }, [incidents, layers]);

  const incidentData = useMemo(
    () =>
      visibleIncidents.map((inc) => ({
        ...inc,
        position: [inc.coordinates[1], inc.coordinates[0]] as [number, number],
      })),
    [visibleIncidents]
  );

  const visiblePois = useMemo(
    () =>
      combinedPOIs
        .filter((p) => {
          const layerKey = poiToLayerKey[p.category];
          return layerKey ? layers[layerKey] : false;
        })
        .map((p) => ({
          ...p,
          position: [p.coordinates[1], p.coordinates[0]] as [number, number],
        })),
    [combinedPOIs, layers]
  );

  // DeckGL layers
  const deckLayers = useMemo(() => {
    const out: any[] = [];

    if (visibleIncidents.length > 0) {
      out.push(
        new ScatterplotLayer({
          id: 'incident-halo',
          data: incidentData,
          getPosition: (d: any) => d.position,
          getRadius: 14000,
          getFillColor: (d: any) => [...(severityRgb[d.severity] ?? severityRgb.Medium), 35],
          radiusUnits: 'meters',
          pickable: false,
        })
      );

      out.push(
        new ScatterplotLayer({
          id: 'incidents',
          data: incidentData,
          getPosition: (d: any) => d.position,
          getRadius: 6500,
          radiusUnits: 'meters',
          getFillColor: (d: any) => severityRgb[d.severity] ?? severityRgb.Medium,
          getLineColor: [255, 255, 255],
          lineWidthMinPixels: 2,
          stroked: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 80],
          onClick: (info: any) => info.object && onSelectIncident(info.object),
          onHover: (info: any) =>
            setHover(
              info.object
                ? { x: info.x, y: info.y, kind: 'incident', data: info.object }
                : null
            ),
        })
      );

      if (is3D) {
        out.push(
          new ColumnLayer({
            id: 'incident-columns',
            data: incidentData,
            getPosition: (d: any) => d.position,
            getElevation: (d: any) =>
              Math.max((d.affected_population || d.affectedPopulation || 0) * 0.1, 8000),
            radius: 4500,
            getFillColor: (d: any) => [
              ...(severityRgb[d.severity] ?? severityRgb.Medium),
              160,
            ],
            getLineColor: [255, 255, 255, 120],
            lineWidthMinPixels: 1,
            stroked: true,
            extruded: true,
            pickable: true,
            autoHighlight: true,
            highlightColor: [255, 255, 255, 60],
            onClick: (info: any) => info.object && onSelectIncident(info.object),
            onHover: (info: any) =>
              setHover(
                info.object
                  ? { x: info.x, y: info.y, kind: 'incident', data: info.object }
                  : null
              ),
          } as any)
        );
      }
    }

    if (visiblePois.length > 0) {
      out.push(
        new ScatterplotLayer({
          id: 'pois',
          data: visiblePois,
          getPosition: (d: any) => d.position,
          getRadius: 3600,
          radiusUnits: 'meters',
          getFillColor: (d: any) => poiRgb[d.category] ?? [148, 163, 184],
          getLineColor: [255, 255, 255],
          lineWidthMinPixels: 1.5,
          stroked: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 90],
          onHover: (info: any) =>
            setHover(
              info.object ? { x: info.x, y: info.y, kind: 'poi', data: info.object } : null
            ),
        })
      );
    }

    return out;
  }, [visibleIncidents, incidentData, visiblePois, is3D, onSelectIncident]);

  return (
    <div className="relative w-full h-[580px] bg-slate-950 overflow-hidden rounded-b-xl border border-slate-800">
      {viewMode === 'map' && (
        <>
          {/* 2D Leaflet */}
          {!is3D && (
            <div className="absolute inset-0 z-10">
              <MapContainer
                center={MY_LEAFLET_CENTER}
                zoom={6}
                style={{ width: '100%', height: '100%', background: '#0f172a' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  maxZoom={19}
                />

                <LeafletFlyTo target={flyToTarget} />
                {/* Progressive viewport-based facility loading */}
                <LeafletViewportLoader onFetchArea={fetchAreaFacilities} />

                {/* Incidents Layer */}
                {visibleIncidents.map((inc: Incident) => (
                  <React.Fragment key={inc.id}>
                    <CircleMarker
                      center={[inc.coordinates[0], inc.coordinates[1]]}
                      radius={22}
                      fillColor={severityHex[inc.severity] || '#94a3b8'}
                      color="transparent"
                      weight={0}
                      fillOpacity={0.18}
                      interactive={false}
                    />
                    <CircleMarker
                      center={[inc.coordinates[0], inc.coordinates[1]]}
                      radius={13}
                      fillColor={severityHex[inc.severity] || '#94a3b8'}
                      color="white"
                      weight={2.5}
                      fillOpacity={0.92}
                      eventHandlers={{ click: () => onSelectIncident(inc) }}
                    >
                      <Tooltip direction="top" offset={[0, -14]} opacity={1}>
                        <div className="min-w-[190px] p-0.5">
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {inc.title}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {inc.location}, {inc.state}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                              style={{ background: severityHex[inc.severity] }}
                            >
                              {inc.severity}
                            </span>
                            <span className="text-[9px] text-slate-600 font-semibold">
                              {inc.affected_population.toLocaleString()} affected
                            </span>
                          </div>
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  </React.Fragment>
                ))}

                {/* POIs & Real Live Facilities Layer */}
                {visiblePois.map((p: MapPOI) => (
                  <CircleMarker
                    key={p.id}
                    center={[p.coordinates[0], p.coordinates[1]]}
                    radius={8.5}
                    fillColor={poiHex[p.category] || '#94a3b8'}
                    color="white"
                    weight={2}
                    fillOpacity={0.92}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                      <div className="min-w-[180px] p-0.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: poiHex[p.category] || '#94a3b8' }}
                          />
                          <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
                            {p.category}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 leading-snug">{p.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{p.details}</p>
                        {p.contact && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-1">
                            <Phone size={10} />
                            <span>{p.contact}</span>
                          </div>
                        )}
                        {p.openingHours && (
                          <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-0.5">
                            <Clock size={9} />
                            <span>{p.openingHours}</span>
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>

              {/* 2D HUD */}
              <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] flex items-center gap-2">
                <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-300 backdrop-blur-sm shadow-lg flex items-center gap-1.5">
                  <Crosshair size={11} className="text-blue-400" />
                  <span>2D Vector GIS Engine · Leaflet</span>
                </div>
                {isLoadingFacilities && (
                  <div className="bg-slate-900/90 border border-blue-500/50 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-blue-300 backdrop-blur-sm shadow-lg flex items-center gap-1.5">
                    <Radio size={11} className="text-blue-400 animate-pulse" />
                    <span>Syncing Live OSM Facilities…</span>
                  </div>
                )}
              </div>

              <div className="pointer-events-none absolute bottom-4 right-4 z-[1000] bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 backdrop-blur-sm shadow-lg">
                <p className="text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide">
                  Live GIS Legend
                </p>
                <div className="space-y-1">
                  {[
                    { label: 'Critical Hazard', hex: '#ef4444' },
                    { label: 'High / Medium Hazard', hex: '#f97316' },
                    { label: 'Hospital / Clinic', hex: '#db2777' },
                    { label: 'Police Station (PDRM)', hex: '#1d4ed8' },
                    { label: 'Fire & Rescue (BOMBA)', hex: '#dc2626' },
                    { label: 'Evac Shelter / School', hex: '#059669' },
                    { label: 'Logistics Depot / Hub', hex: '#4f46e5' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.hex }} />
                      <span className="text-[10px] font-medium text-slate-300">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3D DeckGL */}
          {is3D && (
            <div className="absolute inset-0 z-10">
              <div className="absolute top-3 left-3 z-20 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg px-3 py-1.5 text-[10px] text-slate-300 shadow-lg flex items-center gap-2 pointer-events-none">
                <MousePointer2 size={10} className="shrink-0 text-blue-400" />
                <span>Right-drag to orbit · Left-drag to pan · Scroll to zoom</span>
              </div>

              <DeckGL
                viewState={viewState as any}
                onViewStateChange={(e: any) => setViewState(e.viewState)}
                controller={
                  {
                    dragRotate: true,
                    touchRotate: true,
                    keyboard: true,
                    inertia: 350,
                    maxPitch: 85,
                  } as any
                }
                layers={deckLayers}
                style={{ width: '100%', height: '100%' }}
                getCursor={({ isDragging }: { isDragging: boolean }) =>
                  isDragging ? 'grabbing' : 'grab'
                }
              >
                <MapLibreMap
                  mapStyle={DARK_STYLE as any}
                  style={{ width: '100%', height: '100%' }}
                  reuseMaps
                />
              </DeckGL>

              {hover && (
                <div
                  className="pointer-events-none absolute z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl px-3.5 py-2.5 shadow-2xl min-w-[220px]"
                  style={{ left: hover.x + 16, top: hover.y + 16 }}
                >
                  {hover.kind === 'incident' ? (
                    <>
                      <p className="text-xs font-bold text-white leading-snug">{hover.data.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {hover.data.location}, {hover.data.state}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <DisasterBadge type="severity" value={hover.data.severity} />
                        <span className="text-[10px] text-slate-300 font-semibold">
                          {(hover.data.affected_population || (hover.data as any).affectedPopulation || 0).toLocaleString()}{' '}
                          affected
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: poiHex[hover.data.category] || '#94a3b8' }}
                        />
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wide">
                          {hover.data.category}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white">{hover.data.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{hover.data.details}</p>
                      {hover.data.contact && (
                        <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                          Tel: {hover.data.contact}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 flex-wrap">
                <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-300 shadow-lg backdrop-blur-sm flex items-center gap-1.5">
                  <Crosshair size={10} className="text-blue-400" />
                  {viewState.latitude.toFixed(4)}° N,&nbsp;{viewState.longitude.toFixed(4)}° E
                </div>
                <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-300 shadow-lg backdrop-blur-sm">
                  Z&nbsp;{viewState.zoom.toFixed(1)}
                </div>
                <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-300 shadow-lg backdrop-blur-sm flex items-center gap-1.5">
                  <Compass size={10} />
                  P&nbsp;{Math.round(viewState.pitch)}°&nbsp;&nbsp;B&nbsp;
                  {Math.round(viewState.bearing)}°
                </div>
                <button
                  onClick={resetView}
                  className="bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-300 shadow-lg flex items-center gap-1.5 hover:text-white hover:border-slate-500 transition-colors cursor-pointer backdrop-blur-sm"
                >
                  <RotateCcw size={10} /> Reset View
                </button>
              </div>

              <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 shadow-lg z-20 backdrop-blur-sm">
                <p className="text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide">
                  Live GIS Legend
                </p>
                <div className="space-y-1">
                  {[
                    { label: 'Critical Hazard', hex: '#ef4444' },
                    { label: 'High / Medium Hazard', hex: '#f97316' },
                    { label: 'Hospital / Medical', hex: '#db2777' },
                    { label: 'Police Station (PDRM)', hex: '#1d4ed8' },
                    { label: 'Fire & Rescue (BOMBA)', hex: '#dc2626' },
                    { label: 'Evacuation Shelter', hex: '#059669' },
                    { label: 'Logistics Depot', hex: '#4f46e5' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.hex }} />
                      <span className="text-[10px] font-medium text-slate-300">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Vector Topology View */}
      {viewMode === 'topology' && (
        <div className="relative w-full h-full flex items-center justify-center select-none overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 backdrop-blur-md">
            <Layers className="size-4 text-blue-400" />
            <span className="font-bold text-white tracking-wide uppercase">
              Vector Topology Stack
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Multi-Layer Projection</span>
          </div>

          <div className="relative w-full max-w-xl h-[420px] flex items-center justify-center perspective-[1000px]">
            <div className="relative w-[340px] h-[340px] transform-style-3d rotate-x-[58deg] rotate-z-[-32deg] transition-transform duration-700 hover:rotate-x-[50deg] hover:rotate-z-[-26deg]">
              <div className="absolute inset-0 rounded-2xl border-2 border-slate-700/60 bg-slate-900/80 shadow-[0_0_40px_rgba(0,0,0,0.8)] translate-z-[0px] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:14px_14px] opacity-40" />
                <div className="absolute bottom-3 left-3 text-[9px] font-mono text-slate-500">
                  TERRAIN ELEVATION BASE (DEM)
                </div>
              </div>

              {TOPOLOGY_PLANES.map((plane, index) => {
                const isEnabled = layers[plane.id];
                const zOffset = (index + 1) * 85;
                return (
                  <div
                    key={plane.id}
                    style={{
                      transform: `translateZ(${isEnabled ? zOffset : 10}px)`,
                      opacity: isEnabled ? 1 : 0.15,
                    }}
                    className={`absolute inset-0 rounded-2xl border-2 ${plane.borderColor} bg-gradient-to-tr ${plane.bgGradient} transition-all duration-500 backdrop-blur-[2px] shadow-2xl`}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:1.25rem_1.25rem]" />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-md text-[9px] font-mono font-bold text-slate-200">
                      {plane.icon}
                      <span>{plane.title}</span>
                    </div>

                    {isEnabled &&
                      plane.nodes.map((node, ni) => (
                        <div
                          key={ni}
                          style={{ left: `${node.x}%`, top: `${node.y}%` }}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                          onMouseEnter={() => setHoveredNode(node.label)}
                          onMouseLeave={() => setHoveredNode(null)}
                        >
                          <div className="absolute top-1/2 left-1/2 w-[1px] h-[85px] bg-gradient-to-b from-white/50 to-transparent transform -translate-x-1/2 pointer-events-none" />
                          <div
                            className={`size-3 rounded-full ${plane.color} animate-ping opacity-75 absolute inset-0`}
                          />
                          <div
                            className={`relative size-3 rounded-full ${plane.color} border-2 border-white shadow-md`}
                          />
                          {hoveredNode === node.label && (
                            <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-slate-900 border border-slate-700 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-xl z-30">
                              {node.label}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl backdrop-blur-md shadow-2xl">
            {TOPOLOGY_PLANES.map((plane) => {
              const active = layers[plane.id];
              return (
                <button
                  key={plane.id}
                  onClick={() => onToggleLayer && onToggleLayer(plane.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {plane.icon}
                  <span>{plane.category}</span>
                  {active ? (
                    <Eye className="size-3.5 text-blue-400" />
                  ) : (
                    <EyeOff className="size-3.5 text-slate-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};