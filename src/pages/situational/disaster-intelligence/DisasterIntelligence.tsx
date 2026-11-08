import { DataRegion } from '../../../components/common/DataRegion';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Layers, X, MapPin, AlertTriangle, Warehouse, Loader2, Box, Square, Globe2 } from 'lucide-react';
import type { Incident, MapPOI, GISLayerState, FlyToTarget, DisasterIntelligenceProps } from '../../../types';
import { IntelligenceOverview } from './IntelligenceOverview';
import { LayerPanel, type LayerCount } from '../../../components/ui/situational/LayerPanel';
import { AIInsightDetailView } from './AIInsightDetailView';
import { MapCanvas3D } from '../../../components/ui/situational/MapCanvas';
import { Gis3DLayerExplorer, type GisFocusTarget } from '../../../components/ui/situational/Gis3DLayerExplorer';
import { SitrepPanel } from '../../../components/ui/situational/SitrepPanel';
import { NEARBY_RADIUS_KM, useIncidents, useNearbyFacilities, useWarehouses } from '../../../hooks';
import { facilityToPoi } from '../../../utils/mapLayers';
import { geoService } from '../../../services/geoService';
import { containerAnim, defaultLayers, itemAnim } from '../../../constants';
import { TONE } from '../../../components/ui/shared/Tag';

type Tab = 'map' | 'overview';
type MapMode = '3d-layers' | '3d' | '2d';

/** The place or incident whose surroundings are shown on the map. */
type NearbyAnchor = { lat: number; lng: number; label: string };

type Result = {
  id: string;
  title: string;
  subtitle: string;
  kind: 'incident' | 'facility' | 'place';
  lat: number;
  lng: number;
  incident?: Incident;
  google?: boolean;
};

const KIND_LOOK: Record<Result['kind'], { color: string; Icon: typeof MapPin; group: string }> = {
  incident: { color: TONE.red, Icon: AlertTriangle, group: 'Incidents' },
  facility: { color: TONE.amber, Icon: Warehouse, group: 'Facilities' },
  place: { color: TONE.blue, Icon: MapPin, group: 'Places in Malaysia' },
};

/** Real addresses, places and facilities in Malaysia (Google Places, else OpenStreetMap, through the backend). */
function usePlaceSearch(query: string) {
  const [places, setPlaces] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setPlaces([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await geoService.searchPlaces(q, ctrl.signal, true);
        setPlaces(
          rows.map((r) => ({
            id: `place-${r.id}`,
            title: r.name,
            subtitle: [r.kind_label, r.address.split(', ').slice(0, 3).join(', ')].filter(Boolean).join(' · '),
            kind: 'place' as const,
            lat: r.lat,
            lng: r.lng,
            google: r.source === 'Google',
          }))
        );
      } catch {
        if (!ctrl.signal.aborted) setPlaces([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);
  return { places, loading };
}

const DisasterIntelligence: React.FC<DisasterIntelligenceProps> = ({ focusIncident, onFocusHandled }) => {
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [layers, setLayers] = useState<GISLayerState>(defaultLayers);
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [layerCounts, setLayerCounts] = useState<Partial<Record<keyof GISLayerState, LayerCount>>>({});
  const [mapMode, setMapMode] = useState<MapMode>('3d-layers');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null);
  const [focusTarget, setFocusTarget] = useState<GisFocusTarget | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [nearbyAnchor, setNearbyAnchor] = useState<NearbyAnchor | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // The open detail view is driven by ?incidentId= so it can be deep-linked and survives reloads.
  const activeInsightId = searchParams.get('incidentId') ?? focusIncident?.id ?? null;
  const setActiveInsightId = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('incidentId', id);
    else next.delete('incidentId');
    setSearchParams(next);
  };
  const [sitrepOpen, setSitrepOpen] = useState(false);

  const incidentsQuery = useIncidents();
  const { data: incidents = [] } = incidentsQuery;
  const activeIncidents = useMemo(
    () => incidents.filter((inc) => inc.status !== 'Resolved' && inc.status !== 'Rejected'),
    [incidents]
  );
  const nearbyQuery = useNearbyFacilities(nearbyAnchor);
  const nearbyPois = useMemo(() => (nearbyAnchor ? (nearbyQuery.data ?? []).map(facilityToPoi) : []), [nearbyAnchor, nearbyQuery.data]);
  const nearbySources = [...new Set((nearbyQuery.data ?? []).map((f) => f.source).filter(Boolean))].join(', ');
  const warehousesQuery = useWarehouses();
  const { data: warehouses = [] } = warehousesQuery;

  const combinedPOIs = useMemo(() => {
    const list: MapPOI[] = [];
    warehouses.forEach((w) => {
      // Warehouses without stored coordinates are not plotted (no invented position).
      if (typeof w.lat !== 'number' || !Number.isFinite(w.lat) || typeof w.lng !== 'number' || !Number.isFinite(w.lng)) return;
      list.push({
        id: `wh-${w.id}`,
        name: `${w.name} (Logistics Depot)`,
        category: 'Warehouse',
        coordinates: [w.lat, w.lng],
        details: `${w.full_address || w.name} · ${w.district}, ${w.state}`,
        contact: w.contact_number,
      });
    });
    return list;
  }, [warehouses]);

  const searchRef = useRef<HTMLDivElement>(null);
  const toggleLayer = (key: keyof GISLayerState) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleResetLayers = () => setLayers(defaultLayers);
  const handleSelectAllLayers = () =>
    setLayers(Object.fromEntries(Object.keys(defaultLayers).map((k) => [k, true])) as unknown as GISLayerState);

  const local = useMemo<Result[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const words = q.split(/\s+/);
    const matches = (text: string) => words.every((w) => text.includes(w));
    const out: Result[] = [];
    activeIncidents.forEach((inc) => {
      const text = `${inc.title} ${inc.type ?? ''} ${inc.display_id ?? ''} ${inc.location} ${inc.district} ${inc.state}`.toLowerCase();
      if (matches(text)) {
        out.push({
          id: `inc-${inc.id}`,
          title: inc.title,
          subtitle: `${inc.display_id ?? ''} · ${inc.district}, ${inc.state}`,
          kind: 'incident',
          lat: inc.coordinates[0],
          lng: inc.coordinates[1],
          incident: inc,
        });
      }
    });
    combinedPOIs.forEach((poi) => {
      if (matches(`${poi.name} ${poi.details ?? ''}`.toLowerCase())) {
        out.push({ id: `poi-${poi.id}`, title: poi.name, subtitle: poi.details ?? poi.category, kind: 'facility', lat: poi.coordinates[0], lng: poi.coordinates[1] });
      }
    });
    return out.slice(0, 5);
  }, [searchQuery, activeIncidents, combinedPOIs]);
  // Only while the dropdown is open: picking a result fills the box, which must not search (and bill) again.
  const { places, loading: placesLoading } = usePlaceSearch(searchOpen ? searchQuery : '');
  const results = useMemo(() => [...local, ...places], [local, places]);
  useEffect(() => setActiveIdx(0), [searchQuery]);

  const handleSelectResult = (item: Result) => {
    setSearchQuery(item.title);
    setSearchOpen(false);
    setFlyToTarget({
      lat: item.lat,
      lng: item.lng,
      zoom: item.kind === 'place' ? 12 : 11.5,
      timestamp: Date.now(),
      label: item.title,
      detail: item.subtitle,
    });
    setFocusTarget({ lat: item.lat, lng: item.lng, label: item.title, detail: item.subtitle, timestamp: Date.now() });
    setNearbyAnchor({ lat: item.lat, lng: item.lng, label: item.title });
    if (item.kind === 'incident' && item.incident) {
      setSelectedIncident(item.incident);
      setSitrepOpen(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    const [lat, lng] = incident.coordinates ?? [];
    if (Number.isFinite(lat) && Number.isFinite(lng)) setNearbyAnchor({ lat, lng, label: incident.title });
    setSitrepOpen(true);
  };
  const handleCloseSitrep = () => {
    setSitrepOpen(false);
    setSelectedIncident(null);
  };

  useEffect(() => {
    if (focusIncident) {
      setActiveTab('overview');
      setActiveInsightId(focusIncident.id);
      onFocusHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIncident]);

  if (activeInsightId) {
    return (
      <AIInsightDetailView
        incidentId={activeInsightId}
        onBack={() => {
          setActiveTab('overview');
          setActiveInsightId(null);
        }}
      />
    );
  }

  const MODES: { id: MapMode; label: string; Icon: typeof Layers }[] = [
    { id: '3d-layers', label: 'Layers', Icon: Layers },
    { id: '3d', label: 'Terrain', Icon: Box },
    { id: '2d', label: 'Street map', Icon: Square },
  ];

  return (
    <>
      <DataRegion queries={[incidentsQuery]} label="Incidents"><DataRegion queries={[warehousesQuery]} label="Depot locations" keepContent><motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-5">
        <motion.div variants={itemAnim} className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Disaster Intelligence</h1>
            <p className="text-xs text-slate-500 mt-0.5">Where incidents are, what is around them, and which need attention first.</p>
          </div>
          <div role="tablist" aria-label="View" className="inline-flex items-center bg-slate-100 border border-slate-200/70 rounded-lg p-0.5 self-start sm:self-auto">
            {([['map', 'GIS Map'], ['overview', 'Priority Overview']] as const).map(([id, label]) => {
              const on = activeTab === id;
              return (
                <button key={id} role="tab" aria-selected={on} onClick={() => setActiveTab(id)}
                  className={`relative px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${on ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
                  {on && <motion.span layoutId="intel-tab" className="absolute inset-0 bg-white rounded-md shadow-[0_1px_2px_rgba(15,23,42,.08)]" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} />}
                  <span className="relative">{label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {activeTab === 'map' && (
          <motion.div variants={itemAnim} className="relative bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
              <div ref={searchRef} className="relative flex-1 min-w-[220px] max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  role="combobox"
                  aria-expanded={searchOpen && searchQuery.trim().length > 0}
                  aria-controls="gis-search-results"
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    setSearchOpen(true);
                    if (!val.trim()) {
                      setFlyToTarget(null);
                      setFocusTarget(null);
                      setNearbyAnchor(null);
                    }
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(results.length - 1, i + 1)); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
                    else if (e.key === 'Enter' && results[activeIdx]) handleSelectResult(results[activeIdx]);
                    else if (e.key === 'Escape') setSearchOpen(false);
                  }}
                  placeholder="Search a place, facility, address or incident"
                  className="w-full pl-9 pr-8 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-blue-600/10 transition"
                />
                {placesLoading ? (
                  <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                ) : searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchOpen(false); setFlyToTarget(null); setFocusTarget(null); setNearbyAnchor(null); }} aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                    <X size={13} />
                  </button>
                )}

                {searchOpen && searchQuery.trim() && (
                  <div id="gis-search-results" role="listbox"
                    className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-[0_16px_40px_-16px_rgba(15,23,42,.35)] z-[1000] max-h-80 overflow-y-auto py-1">
                    {results.length === 0 ? (
                      <p className="px-3.5 py-3 text-xs text-slate-500">
                        {placesLoading ? 'Searching places…' : searchQuery.trim().length < 3 ? 'Keep typing to search places' : 'No matching place or incident'}
                      </p>
                    ) : (
                      (['incident', 'facility', 'place'] as const).map((kind) => {
                        const group = results.filter((r) => r.kind === kind);
                        if (!group.length) return null;
                        const look = KIND_LOOK[kind];
                        return (
                          <div key={kind}>
                            <p className="px-3.5 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{look.group}</p>
                            {group.map((res) => {
                              const idx = results.indexOf(res);
                              return (
                                <button key={res.id} role="option" aria-selected={idx === activeIdx}
                                  onMouseEnter={() => setActiveIdx(idx)}
                                  onClick={() => handleSelectResult(res)}
                                  className={`w-full px-3.5 py-2 text-left flex items-start gap-2.5 cursor-pointer ${idx === activeIdx ? 'bg-slate-50' : ''}`}>
                                  <look.Icon size={14} className="mt-0.5 shrink-0" style={{ color: look.color }} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] font-semibold text-slate-900 truncate">{res.title}</span>
                                    {res.subtitle && <span className="block text-[11px] text-slate-500 truncate">{res.subtitle}</span>}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })
                    )}
                    {places.length > 0 && <p className="px-3.5 pt-1.5 pb-1 text-[10px] text-slate-400">Places from {places.some((p) => p.google) ? 'Google' : 'OpenStreetMap'}</p>}
                  </div>
                )}
              </div>

              {nearbyAnchor && (
                <div className="inline-flex items-center gap-1.5 min-w-0 max-w-[280px] pl-2.5 pr-1 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-600"
                  title={`Within ${NEARBY_RADIUS_KM} km of ${nearbyAnchor.label}${nearbySources ? ` · Source: ${nearbySources}` : ''}`}>
                  {nearbyQuery.isLoading ? <Loader2 size={13} className="shrink-0 animate-spin text-slate-400" /> : <MapPin size={13} className="shrink-0" style={{ color: TONE.blue }} />}
                  {nearbyQuery.isError ? (
                    <button type="button" onClick={() => nearbyQuery.refetch()} className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer whitespace-nowrap">Nearby failed, retry</button>
                  ) : (
                    <span className="truncate">{nearbyQuery.isLoading ? 'Finding nearby places…' : `${nearbyPois.length} ${nearbyPois.length === 1 ? 'place' : 'places'} near ${nearbyAnchor.label}`}</span>
                  )}
                  <button type="button" onClick={() => setNearbyAnchor(null)} aria-label="Hide nearby places"
                    className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0">
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                <div role="radiogroup" aria-label="Map view" className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
                  {MODES.map(({ id, label, Icon }) => {
                    const on = mapMode === id;
                    return (
                      <button key={id} role="radio" aria-checked={on} onClick={() => setMapMode(id)}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${on ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
                        {on && <motion.span layoutId="intel-mode" className="absolute inset-0 bg-white rounded-md shadow-[0_1px_2px_rgba(15,23,42,.08)]" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} />}
                        <Icon size={13} className="relative" />
                        <span className="relative">{label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                    onClick={() => setLayerPanelOpen((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                      layerPanelOpen ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Globe2 size={13} /> Filters <span className="tabular-nums opacity-70">{Object.values(layers).filter(Boolean).length}</span>
                  </button>
              </div>
            </div>

            <LayerPanel
              layers={layers}
              counts={mapMode === '3d-layers' ? undefined : layerCounts}
              isOpen={layerPanelOpen}
              onClose={() => setLayerPanelOpen(false)}
              onToggleLayer={toggleLayer}
              onResetLayers={handleResetLayers}
              onSelectAllLayers={handleSelectAllLayers}
            />

            {mapMode === '3d-layers' ? (
              <Gis3DLayerExplorer
                layers={layers}
                incidents={activeIncidents}
                pois={combinedPOIs}
                nearbyPois={nearbyPois}
                onSelectIncident={handleSelectIncident}
                onToggleLayer={toggleLayer}
                focusTarget={focusTarget}
              />
            ) : (
              <MapCanvas3D
                layers={layers}
                is3D={mapMode === '3d'}
                flyToTarget={flyToTarget}
                onSelectIncident={handleSelectIncident}
                onToggleLayer={toggleLayer}
                incidents={activeIncidents}
                pois={combinedPOIs}
                nearbyPois={nearbyPois}
                onLayerCounts={setLayerCounts}
              />
            )}
          </motion.div>
        )}

        {activeTab === 'overview' && <IntelligenceOverview onSelectInsight={setActiveInsightId} />}
      </motion.div></DataRegion></DataRegion>

      <SitrepPanel
        incident={sitrepOpen ? selectedIncident : null}
        onClose={handleCloseSitrep}
        onViewFullAnalysis={(incident) => {
          handleCloseSitrep();
          setActiveInsightId(incident.id);
        }}
      />
    </>
  );
};

export default DisasterIntelligence;
