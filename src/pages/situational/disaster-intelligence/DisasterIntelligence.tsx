import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Map, Search, Layers, X, MapPin, AlertTriangle, Navigation, Box, Square } from 'lucide-react';
import type { Incident, MapPOI, GISLayerState, FlyToTarget, DisasterIntelligenceProps } from '../../../types';
import { IntelligenceOverview } from './IntelligenceOverview';
import { LayerPanel } from '../../../components/ui/situational/LayerPanel';
import { AIInsightDetailView } from './AIInsightDetailView';
import { MapCanvas3D } from '../../../components/ui/situational/MapCanvas';
import { Gis3DLayerExplorer } from '../../../components/ui/situational/Gis3DLayerExplorer';
import { SitrepPanel } from '../../../components/ui/situational/SitrepPanel';
import { useIncidents, useMapPOIs, useCities, useWarehouses } from '../../../hooks';
import { containerAnim, defaultLayers, itemAnim, tabs } from '../../../constants';

const DisasterIntelligence: React.FC<DisasterIntelligenceProps> = ({ focusIncident, onFocusHandled }) => {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Map');
  const [layers, setLayers] = useState<GISLayerState>(defaultLayers);
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'2d' | '3d' | '3d-layers'>('3d-layers');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activeInsight, setActiveInsight] = useState<Incident | null>(focusIncident ?? null);
  const [sitrepOpen, setSitrepOpen] = useState(false);

  const { data: incidents = [] } = useIncidents();
  const activeIncidents = useMemo(
    () => incidents.filter(inc => inc.status !== 'Resolved' && inc.status !== 'Rejected'),
    [incidents]
  );

  const { data: mapPOIs = [] } = useMapPOIs();
  const { data: backendCities = [] } = useCities();
  const { data: warehouses = [] } = useWarehouses();

  const combinedPOIs = useMemo(() => {
    const list: MapPOI[] = [...mapPOIs];
    warehouses.forEach((w) => {
      const lat = typeof w.lat === 'number' && !isNaN(w.lat) ? w.lat : 4.5;
      const lng = typeof w.lng === 'number' && !isNaN(w.lng) ? w.lng : 102.0;
      list.push({
        id: `wh-${w.id}`,
        name: `${w.name} (Logistics Depot)`,
        category: 'Warehouse',
        coordinates: [lat, lng],
        details: `${w.full_address || w.name} · ${w.district}, ${w.state}`,
        contact: w.contact_number,
      });
    });
    return list;
  }, [mapPOIs, warehouses]);

  const searchRef = useRef<HTMLDivElement>(null);

  const toggleLayer = (key: keyof GISLayerState) =>
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const handleResetLayers = () => setLayers(defaultLayers);

  const handleSelectAllLayers = () => {
    setLayers({
      disasterHotspots: true,
      floodAreas: true,
      landslideAreas: true,
      fireZones: true,
      emergencyShelters: true,
      hospitals: true,
      evacuationSchools: true,
      utilityElectricity: true,
      utilityWater: true,
      utilityTelecom: true,
      trafficConditions: true,
      roadAccessibility: true,
      rescueTeamLocations: true,
    });
  };

  const searchIndex = useMemo(() => {
    const list: {
      id: string;
      title: string;
      subtitle: string;
      type: 'incident' | 'poi' | 'city';
      lat: number;
      lng: number;
      incidentObj?: Incident;
    }[] = [];

    activeIncidents.forEach(inc => {
      list.push({
        id: `inc-${inc.id}`,
        title: inc.title,
        subtitle: `${inc.location}, ${inc.state} · ${inc.severity} Hazard`,
        type: 'incident',
        lat: inc.coordinates[0],
        lng: inc.coordinates[1],
        incidentObj: inc,
      });
    });

    combinedPOIs.forEach(poi => {
      list.push({
        id: `poi-${poi.id}`,
        title: poi.name,
        subtitle: `${poi.category}`,
        type: 'poi',
        lat: poi.coordinates[0],
        lng: poi.coordinates[1],
      });
    });

    backendCities.forEach((c) => {
      list.push({
        id: c.id || `city-${c.title}`,
        title: c.title,
        subtitle: c.subtitle,
        type: 'city',
        lat: c.lat,
        lng: c.lng,
      });
    });

    return list;
  }, [activeIncidents, combinedPOIs, backendCities]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchIndex.filter(
      item => item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
    ).slice(0, 7);
  }, [searchQuery, searchIndex]);

  const handleSelectSearchResult = (item: (typeof searchIndex)[number]) => {
    setSearchQuery(item.title);
    setSearchOpen(false);
    setFlyToTarget({
      lat: item.lat,
      lng: item.lng,
      zoom: item.type === 'city' ? 9 : 11.5,
      timestamp: Date.now(),
    });

    if (item.type === 'incident' && item.incidentObj) {
      setSelectedIncident(item.incidentObj);
      setSitrepOpen(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setSitrepOpen(true);
  };

  const handleCloseSitrep = () => {
    setSitrepOpen(false);
    setSelectedIncident(null);
  };

  React.useEffect(() => {
    if (focusIncident) {
      setActiveTab('Intelligence Overview');
      setActiveInsight(focusIncident);
      onFocusHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIncident]);

  if (activeInsight) {
    return (
      <AIInsightDetailView
        incident={activeInsight}
        onBack={() => setActiveInsight(null)}
        onSelectPeer={setActiveInsight}
        allIncidents={incidents}
      />
    );
  }

  return (
    <>
      <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-6">
        {/* Page header */}
        <motion.div variants={itemAnim}>
          <h1 className="text-xl font-bold text-slate-900">Disaster Intelligence</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Operational GIS map and AI-ranked priority overview · Click any incident marker to open SITREP
          </p>
        </motion.div>

        {/* Tab bar */}
        <motion.div
          variants={itemAnim}
          className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs w-fit"
        >
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === tab
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              {tab}
            </button>
          ))}
        </motion.div>

        {/* ── MAP TAB ── */}
        {activeTab === 'Map' && (
          <motion.div variants={itemAnim} className="w-full">
            <div className="relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">

              {/* ── MAP TOOLBAR ── */}
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">

                {/* Left: GIS Title & Status Badge */}
                <div className="flex items-center gap-2.5">
                  <Map size={17} className="text-blue-600 shrink-0" />
                  <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    GIS Map Engine
                  </h2>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
                    {mapMode === '3d-layers' ? '3D GIS Layer Stack · Anime.js' : mapMode === '3d' ? '3D Vector Engine' : '2D Leaflet Vector'}
                  </span>
                </div>

                {/* Right Controls Container */}
                <div className="flex items-center gap-2.5">

                  {/* 1. Functional Location Search Input */}
                  <div ref={searchRef} className="relative">
                    <div className="relative flex items-center">
                      <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => {
                          setSearchQuery(e.target.value);
                          setSearchOpen(true);
                        }}
                        onFocus={() => setSearchOpen(true)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && searchResults.length > 0) {
                            handleSelectSearchResult(searchResults[0]);
                          }
                        }}
                        placeholder="Search location, incident, POI..."
                        className="pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 w-56 shadow-2xs transition-all"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSearchOpen(false);
                          }}
                          className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Results Dropdown */}
                    {searchOpen && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 min-w-[260px]">
                        {searchResults.map(res => (
                          <button
                            key={res.id}
                            onClick={() => handleSelectSearchResult(res)}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2.5 transition-colors cursor-pointer"
                          >
                            <div className="mt-0.5 shrink-0">
                              {res.type === 'incident' && <AlertTriangle size={14} className="text-red-500" />}
                              {res.type === 'poi' && <MapPin size={14} className="text-blue-600" />}
                              {res.type === 'city' && <Navigation size={14} className="text-emerald-600" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">{res.title}</p>
                              <p className="text-[10px] text-slate-500">{res.subtitle}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. 2D / 3D / 3D GIS Stack Mode Toggle Switch */}
                  <div className="flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-200 shrink-0">
                    <button
                      onClick={() => setMapMode('3d-layers')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${mapMode === '3d-layers'
                        ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                      title="3D Layer Stack View with Anime.js"
                    >
                      <Layers size={11} /> 3D GIS Layers (Anime.js)
                    </button>
                    <button
                      onClick={() => setMapMode('3d')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${mapMode === '3d'
                        ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                      title="3D Vector Terrain & Columns"
                    >
                      <Box size={11} /> 3D Globe
                    </button>
                    <button
                      onClick={() => setMapMode('2d')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${mapMode === '2d'
                        ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                      title="2D Standard Leaflet Map"
                    >
                      <Square size={11} /> 2D Map
                    </button>
                  </div>

                  {/* 3. Layers Filter Panel (applicable in standard 2D/3D map mode) */}
                  {mapMode !== '3d-layers' && (
                    <button
                      onClick={() => setLayerPanelOpen(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${layerPanelOpen
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      <Layers size={14} /> Layers ({Object.values(layers).filter(Boolean).length})
                    </button>
                  )}
                </div>
              </div>

              {/* Floating layer matrix overlay */}
              {mapMode !== '3d-layers' && (
                <LayerPanel
                  layers={layers}
                  isOpen={layerPanelOpen}
                  onClose={() => setLayerPanelOpen(false)}
                  onToggleLayer={toggleLayer}
                  onResetLayers={handleResetLayers}
                  onSelectAllLayers={handleSelectAllLayers}
                />
              )}

              {/* Dynamic Map Canvas Mode */}
              {mapMode === '3d-layers' ? (
                <Gis3DLayerExplorer
                  layers={layers}
                  incidents={activeIncidents}
                  pois={combinedPOIs}
                  onSelectIncident={handleSelectIncident}
                  onToggleLayer={toggleLayer}
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
                />
              )}
            </div>
          </motion.div>
        )}

        {/* ── INTELLIGENCE OVERVIEW TAB ── */}
        {activeTab === 'Intelligence Overview' && (
          <IntelligenceOverview onSelectInsight={setActiveInsight} incidents={incidents} />
        )}
      </motion.div>

      {/* ── SITREP DRAWER ── */}
      <SitrepPanel
        incident={sitrepOpen ? selectedIncident : null}
        onClose={handleCloseSitrep}
        onViewFullAnalysis={incident => {
          handleCloseSitrep();
          setActiveInsight(incident);
        }}
      />
    </>
  );
};

export default DisasterIntelligence;