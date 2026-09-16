import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  CheckCircle,
  Clock,
  Radio,
  MapPin,
  Droplets,
  Mountain,
  Flame,
  Activity,
  ChevronRight,
  ChevronDown,
  XCircle,
  Plus,
  X,
  User,
  RadioTower,
  ShieldAlert,
  Globe,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
import { useIncidents, useCreateIncident, useGlobalIncidents } from '../../../hooks';
import { SkeletonList } from '../../../components/ui/shared/SkeletonLoader';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import type { Incident, DisasterType, SeverityLevel, DisasterLevel, GdacsEvent } from '../../../types';

const typeIcons: Record<string, React.ReactNode> = {
  Flood: <Droplets size={16} className="text-blue-600" />,
  'Flash Flood': <Droplets size={16} className="text-cyan-600" />,
  Landslide: <Mountain size={16} className="text-amber-600" />,
  'Forest Fire': <Flame size={16} className="text-red-600" />,
  'Severe Storm': <Activity size={16} className="text-purple-600" />,
};

const statusIcons: Record<string, React.ReactNode> = {
  Unverified: <Clock size={14} className="text-amber-600" />,
  Verified: <CheckCircle size={14} className="text-blue-600" />,
  Responding: <Radio size={14} className="text-orange-600 animate-pulse" />,
  Resolved: <CheckCircle size={14} className="text-emerald-600" />,
  Rejected: <XCircle size={14} className="text-rose-600" />,
};

const containerAnim = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

interface IncidentManagementProps {
  onTrackInIntelligence?: (incident: Incident) => void;
}

function getCleanDisplayId(id: string, displayId?: string): string {
  if (displayId) return displayId;
  if (id.startsWith('inc-')) {
    const parts = id.split('-');
    if (parts.length >= 3) return `${parts[0].toUpperCase()}-${parts[1]}-${parts[2]}`;
  }
  if (id.length > 13) {
    return `INC-${id.slice(0, 8).toUpperCase()}`;
  }
  return id.toUpperCase();
}

const IncidentManagement: React.FC<IncidentManagementProps> = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { data: incidents = [], isLoading } = useIncidents();
  const { data: globalDisasters = [], isLoading: isGlobalLoading, refetch: refetchGlobal, isFetching: isGlobalFetching } = useGlobalIncidents();
  const createIncidentMutation = useCreateIncident();

  // Scope Switcher: National EOC DB vs Global Live GDACS
  const [viewScope, setViewScope] = useState<'national' | 'global'>('national');

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Global filters
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalAlertLevel, setGlobalAlertLevel] = useState<string>('All');
  const [globalHazardType, setGlobalHazardType] = useState<string>('All');
  const [globalVisibleCount, setGlobalVisibleCount] = useState<number>(6);

  // New Incident Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<DisasterType>('Flood');
  const [newLocation, setNewLocation] = useState('');
  const [newState, setNewState] = useState('Kelantan');
  const [newDistrict, setNewDistrict] = useState('Kota Bharu');
  const [newSeverity, setNewSeverity] = useState<SeverityLevel>('High');
  const [newDisasterLevel, setNewDisasterLevel] = useState<DisasterLevel>('Level 2: State');
  const [newSourceType, setNewSourceType] = useState<'Citizen Reported' | 'Metrological / Sensor' | 'Agency Patrol' | 'Emergency 999'>('Citizen Reported');
  const [newDescription, setNewDescription] = useState('');
  const [newReporterContact, setNewReporterContact] = useState('');
  const [newLat, setNewLat] = useState('6.1254');
  const [newLng, setNewLng] = useState('102.2381');

  const dynamicDisasterTypes = useMemo(() => {
    const eligible =
      filterStatus === 'All'
        ? incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected')
        : incidents.filter((i) => i.status === filterStatus);
    const typesInDb = Array.from(new Set(eligible.map((i) => i.type))).filter(Boolean);
    return ['All', ...typesInDb];
  }, [incidents, filterStatus]);

  useEffect(() => {
    if (selectedCategory !== 'All' && !dynamicDisasterTypes.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [dynamicDisasterTypes, selectedCategory]);

  const filteredIncidents = incidents.filter((inc) => {
    const matchCategory = selectedCategory === 'All' || inc.type === selectedCategory;
    const matchSearch =
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.displayId && inc.displayId.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchSeverity = filterSeverity === 'All' || inc.severity === filterSeverity;
    const matchStatus = filterStatus === 'All' ? (inc.status !== 'Resolved' && inc.status !== 'Rejected') : inc.status === filterStatus;
    return matchCategory && matchSearch && matchSeverity && matchStatus;
  });

  const displayedIncidents = filteredIncidents.slice(0, visibleCount);

  // Global Disasters Filter
  const filteredGlobalDisasters = useMemo(() => {
    return (globalDisasters as GdacsEvent[]).filter((g) => {
      const matchSearch =
        !globalSearch.trim() ||
        g.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
        g.country.toLowerCase().includes(globalSearch.toLowerCase()) ||
        g.hazardType.toLowerCase().includes(globalSearch.toLowerCase()) ||
        g.eventId.toLowerCase().includes(globalSearch.toLowerCase());
      const matchAlert = globalAlertLevel === 'All' || g.alertLevel === globalAlertLevel;
      const matchHazard = globalHazardType === 'All' || g.hazardType === globalHazardType;
      return matchSearch && matchAlert && matchHazard;
    });
  }, [globalDisasters, globalSearch, globalAlertLevel, globalHazardType]);

  const displayedGlobalDisasters = filteredGlobalDisasters.slice(0, globalVisibleCount);

  const categoryCounts = dynamicDisasterTypes.reduce((acc, cat) => {
    const eligible = filterStatus === 'All' ? incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected') : incidents.filter((i) => i.status === filterStatus);
    acc[cat] = cat === 'All' ? eligible.length : eligible.filter((i) => i.type === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const handleEscalateGdacs = (gdacs: GdacsEvent) => {
    setNewTitle(`[GDACS] ${gdacs.title}`);
    setNewLocation(`${gdacs.country} (Regional Telemetry)`);
    setNewState('Regional / Transboundary');
    setNewDistrict(gdacs.country);
    setNewLat(String(gdacs.lat || 4.2105));
    setNewLng(String(gdacs.lng || 101.9758));
    setNewSeverity(gdacs.alertLevel === 'Red' ? 'Critical' : gdacs.alertLevel === 'Orange' ? 'High' : 'Medium');
    setNewDisasterLevel('Level 3: Federal');
    setNewSourceType('Metrological / Sensor');
    setNewDescription(
      `Escalated from live GDACS Event ID: ${gdacs.eventId}\nSeverity metric: ${gdacs.severity}\nAffected population estimate: ${gdacs.affectedPopulation?.toLocaleString() || 'N/A'}\nSource portal: ${gdacs.link}\n\nSummary:\n${gdacs.description}`
    );
    setReportModalOpen(true);
  };

  const handleCreateIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newLocation.trim()) {
      toast.error('Please provide a valid title and location');
      return;
    }

    try {
      const latNum = parseFloat(newLat) || 6.1254;
      const lngNum = parseFloat(newLng) || 102.2381;

      await createIncidentMutation.mutateAsync({
        title: newTitle,
        type: newType,
        location: newLocation,
        state: newState,
        district: newDistrict,
        coordinates: [latNum, lngNum],
        severity: newSeverity,
        disasterLevel: newDisasterLevel,
        occurredAt: new Date().toISOString(),
        source: newSourceType === 'Citizen Reported' ? 'Citizen Report' : (newSourceType === 'Metrological / Sensor' ? 'JPS Water Sensor' : 'APM Patrol'),
        sourceType: newSourceType,
        reportedByUserId: user?.id,
        reporterName: user?.name || 'Citizen Reporter',
        reporterContact: newReporterContact || '012-3456789',
        status: 'Unverified',
        weatherCondition: 'Heavy Monsoon Rain',
        description: newDescription || `Incident reported via ${newSourceType} at ${newLocation}.`,
        affectedPopulation: newSeverity === 'Critical' ? 1200 : 350,
        infrastructureDamage: newSeverity === 'Critical' ? 'Severe' : 'Moderate',
        accessibilityScore: 50,
        aiPriorityScore: newSeverity === 'Critical' ? 92.0 : 75.0,
      });

      toast.success('Disaster report created and linked to your user account!');
      setReportModalOpen(false);
      setNewTitle('');
      setNewLocation('');
      setNewDescription('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create incident report');
    }
  };

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-6">
      {/* ── Header Title, Scope Switcher & Actions ── */}
      <motion.div variants={itemAnim} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Incident Management</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            National EOC situational database and live Global Disaster Alert and Coordination System (GDACS) feed
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Scope Toggle: National vs Global */}
          <div className="flex bg-slate-200/80 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewScope('national')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewScope === 'national'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert size={14} />
              <span>National EOC</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  viewScope === 'national' ? 'bg-blue-700 text-white' : 'bg-slate-300 text-slate-700'
                }`}
              >
                {incidents.length}
              </span>
            </button>
            <button
              onClick={() => setViewScope('global')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewScope === 'global'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe size={14} />
              <span>Global GDACS</span>
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live
              </span>
            </button>
          </div>

          <button
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer self-start sm:self-auto"
          >
            <Plus size={15} />
            <span>Report New Incident</span>
          </button>
        </div>
      </motion.div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── VIEW 1: NATIONAL EOC INCIDENTS ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {viewScope === 'national' && (
        <>
          {/* ── Filter Bar ── */}
          <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search incidents by ID, title, or location..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <Filter size={14} className="text-slate-500" />
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Severity</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="All">Active Only</option>
                    <option value="Unverified">Unverified</option>
                    <option value="Verified">Verified</option>
                    <option value="Responding">Responding</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs scrollbar-none">
              {dynamicDisasterTypes.map((category) => {
                const isSelected = selectedCategory === category;
                const count = categoryCounts[category] || 0;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {typeIcons[category] && <span>{typeIcons[category]}</span>}
                    <span>{category}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Incidents List Grid */}
          {isLoading ? (
            <SkeletonList count={4} />
          ) : filteredIncidents.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              <p className="text-sm font-semibold">No incidents found matching criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedIncidents.map((incident) => {
                  const isInactive = incident.status === 'Resolved' || incident.status === 'Rejected';
                  return (
                    <div
                      key={incident.id}
                      onClick={() => navigate(`/situational/incidents/${incident.displayId || incident.id}`)}
                      className={`border rounded-xl p-5 transition-all cursor-pointer relative group flex flex-col justify-between ${
                        isInactive
                          ? 'bg-slate-100/75 border-slate-300 text-slate-500 hover:border-slate-400'
                          : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                                isInactive
                                  ? 'text-slate-500 bg-slate-200/70 border-slate-300'
                                  : 'text-slate-600 bg-slate-100 border-slate-200'
                              }`}
                            >
                              {getCleanDisplayId(incident.id, incident.displayId)}
                            </span>
                            <div className="flex items-center gap-1">
                              {statusIcons[incident.status]}
                              <span className={`text-xs font-semibold ${isInactive ? 'text-slate-500' : 'text-slate-700'}`}>
                                {incident.status}
                              </span>
                            </div>
                          </div>
                          <DisasterBadge type="severity" value={incident.severity} />
                        </div>

                        <h3
                          className={`text-sm font-bold leading-snug mb-1.5 transition-colors ${
                            isInactive ? 'text-slate-600' : 'text-slate-900 group-hover:text-blue-600'
                          }`}
                        >
                          {incident.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <MapPin size={13} className="shrink-0 text-slate-400" />
                          <span className="truncate">
                            {incident.location}, {incident.district}, {incident.state}
                          </span>
                        </div>

                        {/* Source & Reporter attribution */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 flex items-center gap-1">
                            <RadioTower size={11} className="text-blue-500" />
                            <span>Source: {incident.sourceType || incident.source}</span>
                          </span>
                          {incident.reporterName && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <User size={10} />
                              <span>
                                Reported by: <strong>{incident.reporterName}</strong>
                              </span>
                            </span>
                          )}
                        </div>

                        <p className={`text-xs line-clamp-2 leading-relaxed mb-4 ${isInactive ? 'text-slate-400' : 'text-slate-600'}`}>
                          {incident.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                        <span>
                          Disaster Level: <strong>{incident.disasterLevel}</strong>
                        </span>
                        <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          View Details <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              {/* Pagination / Load More */}
              {filteredIncidents.length > 6 && (
                <motion.div variants={itemAnim} className="flex justify-center pt-2">
                  <button
                    onClick={() => setVisibleCount((prev) => (prev >= filteredIncidents.length ? 6 : prev + 6))}
                    className="px-6 py-2.5 bg-white border border-slate-200 hover:border-slate-900 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
                  >
                    <span>
                      {visibleCount >= filteredIncidents.length
                        ? 'Show Less Reports'
                        : `Load More Reports (${filteredIncidents.length - visibleCount} remaining)`}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        visibleCount >= filteredIncidents.length ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── VIEW 2: GLOBAL GDACS LIVE DISASTERS FEED ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {viewScope === 'global' && (
        <div className="space-y-4">
          {/* ── Global Filter & Telemetry HUD ── */}
          <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search global hazards by country, event title, or magnitude..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <span className="text-[11px] font-bold text-slate-500">Alert:</span>
                  <select
                    value={globalAlertLevel}
                    onChange={(e) => setGlobalAlertLevel(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Alert Levels</option>
                    <option value="Red">Red Alert (Severe)</option>
                    <option value="Orange">Orange Warning</option>
                    <option value="Green">Green Advisory</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <select
                    value={globalHazardType}
                    onChange={(e) => setGlobalHazardType(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Hazards</option>
                    <option value="Earthquake">Earthquake</option>
                    <option value="Tropical Cyclone">Tropical Cyclone</option>
                    <option value="Flood">Flood</option>
                    <option value="Volcanic Eruption">Volcanic Eruption</option>
                    <option value="Forest Fire / Wildfire">Wildfire / Peatland</option>
                    <option value="Drought">Drought</option>
                  </select>
                </div>

                <button
                  onClick={() => refetchGlobal()}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  title="Refresh Live GDACS Telemetry"
                >
                  <RefreshCw size={14} className={isGlobalFetching ? 'animate-spin text-blue-600' : ''} />
                </button>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1.5 font-medium">
                <Globe size={13} className="text-blue-600" />
                Live GDACS Multilateral Network ({filteredGlobalDisasters.length} Worldwide Events)
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                Feed source: UN / EC Global Disaster Alert System
              </span>
            </div>
          </motion.div>

          {/* ── Global Disaster Cards Grid ── */}
          {isGlobalLoading ? (
            <SkeletonList count={4} />
          ) : filteredGlobalDisasters.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              <Globe size={32} className="mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-semibold">No global disaster events match your search.</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting the hazard type or alert level filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedGlobalDisasters.map((gEvent) => {
                  const isRed = gEvent.alertLevel === 'Red';
                  const isOrange = gEvent.alertLevel === 'Orange';

                  return (
                    <div
                      key={gEvent.id}
                      className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Top Meta Bar */}
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                                isRed
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : isOrange
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {gEvent.alertLevel} Alert
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                              {gEvent.hazardCode} · {gEvent.eventId}
                            </span>
                          </div>

                          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            <MapPin size={11} className="text-blue-500" />
                            <span>{gEvent.country}</span>
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1.5 group-hover:text-blue-600 transition-colors">
                          {gEvent.title}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                          {gEvent.description}
                        </p>

                        {/* Metric Pills Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Hazard Category</span>
                            <strong className="text-slate-800 font-semibold">{gEvent.hazardType}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Severity Telemetry</span>
                            <strong className="text-slate-800 font-semibold">{gEvent.severity}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Coordinates</span>
                            <span className="font-mono text-slate-700">
                              {gEvent.lat.toFixed(2)}°, {gEvent.lng.toFixed(2)}°
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Est. Population</span>
                            <strong className="text-slate-800">
                              {gEvent.affectedPopulation > 0 ? gEvent.affectedPopulation.toLocaleString() : 'N/A'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <a
                          href={gEvent.link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          <ExternalLink size={12} />
                          <span>GDACS Portal</span>
                        </a>

                        <button
                          onClick={() => handleEscalateGdacs(gEvent)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <Plus size={13} />
                          <span>Escalate to National EOC</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              {/* Global Load More */}
              {filteredGlobalDisasters.length > 6 && (
                <motion.div variants={itemAnim} className="flex justify-center pt-2">
                  <button
                    onClick={() =>
                      setGlobalVisibleCount((prev) =>
                        prev >= filteredGlobalDisasters.length ? 6 : prev + 6
                      )
                    }
                    className="px-6 py-2.5 bg-white border border-slate-200 hover:border-slate-900 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
                  >
                    <span>
                      {globalVisibleCount >= filteredGlobalDisasters.length
                        ? 'Show Less Global Events'
                        : `Load More Global Events (${filteredGlobalDisasters.length - globalVisibleCount} remaining)`}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        globalVisibleCount >= filteredGlobalDisasters.length ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Report Incident Modal ── */}
      <AnimatePresence>
        {reportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Report New Disaster Incident</h3>
                    <p className="text-[10px] text-slate-300">Linked to Officer User ID: {user?.id || 'Public User'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateIncidentSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Incident Title *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    placeholder="e.g. Flash Flooding at Jalan Merbau Residential Sector"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Disaster Type</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as DisasterType)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    >
                      <option value="Flood">Flood</option>
                      <option value="Flash Flood">Flash Flood</option>
                      <option value="Landslide">Landslide</option>
                      <option value="Forest Fire">Forest Fire</option>
                      <option value="Severe Storm">Severe Storm</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Source Origin</label>
                    <select
                      value={newSourceType}
                      onChange={(e) => setNewSourceType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    >
                      <option value="Citizen Reported">Citizen Reported</option>
                      <option value="Metrological / Sensor">Metrological / Sensor</option>
                      <option value="Agency Patrol">Agency Patrol</option>
                      <option value="Emergency 999">Emergency 999 Dispatch</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Severity</label>
                    <select
                      value={newSeverity}
                      onChange={(e) => setNewSeverity(e.target.value as SeverityLevel)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Disaster Level</label>
                    <select
                      value={newDisasterLevel}
                      onChange={(e) => setNewDisasterLevel(e.target.value as DisasterLevel)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    >
                      <option value="Level 1: District">Level 1: District</option>
                      <option value="Level 2: State">Level 2: State</option>
                      <option value="Level 3: Federal">Level 3: Federal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">State</label>
                    <input
                      type="text"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">District</label>
                    <input
                      type="text"
                      value={newDistrict}
                      onChange={(e) => setNewDistrict(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Specific Location *</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      required
                      placeholder="e.g. Kampung Sireh, Seksyen 4"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Latitude</label>
                    <input
                      type="text"
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Longitude</label>
                    <input
                      type="text"
                      value={newLng}
                      onChange={(e) => setNewLng(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Reporter Contact (Optional)</label>
                  <input
                    type="text"
                    value={newReporterContact}
                    onChange={(e) => setNewReporterContact(e.target.value)}
                    placeholder="012-3456789"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Description / On-site Observations</label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe flood depth, trapped civilians, road blockages..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createIncidentMutation.isPending}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    {createIncidentMutation.isPending ? 'Submitting...' : 'Submit Incident Report'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default IncidentManagement;
