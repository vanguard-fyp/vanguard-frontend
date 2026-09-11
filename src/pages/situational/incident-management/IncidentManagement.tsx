import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  ShieldAlert,
} from 'lucide-react';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
import { TriggerAlertPanel } from '../../../components/ui/situational/TriggerAlertPanel';
import { useIncidents } from '../../../hooks';
import { SkeletonList } from '../../../components/ui/shared/SkeletonLoader';
import type { Incident } from '../../../types';

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
  const { data: incidents = [], isLoading } = useIncidents();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Dynamically extract disaster types that actually exist for the currently
  // selected status filter. A category is only shown when at least one disaster
  // of that type exists in the eligible set (0-count categories are hidden).
  const dynamicDisasterTypes = useMemo(() => {
    const eligible =
      filterStatus === 'All'
        ? incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected')
        : incidents.filter((i) => i.status === filterStatus);
    const typesInDb = Array.from(new Set(eligible.map((i) => i.type))).filter(Boolean);
    return ['All', ...typesInDb];
  }, [incidents, filterStatus]);

  // Dynamically extract severities that exist
  const dynamicSeverities = useMemo(() => {
    const sevsInDb = new Set(incidents.map((i) => i.severity).filter(Boolean));
    const order = ['Critical', 'High', 'Medium', 'Low'];
    return ['All', ...order.filter((s) => sevsInDb.has(s as any))];
  }, [incidents]);

  // If the selected disaster category no longer has any eligible incidents
  // (e.g. after changing the status filter), fall back to "All" so the UI
  // never highlights a category that is no longer shown.
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
    // Hide Resolved and Rejected incidents unless user explicitly chooses their status filter
    const matchStatus = filterStatus === 'All' ? (inc.status !== 'Resolved' && inc.status !== 'Rejected') : inc.status === filterStatus;
    return matchCategory && matchSearch && matchSeverity && matchStatus;
  });

  const displayedIncidents = filteredIncidents.slice(0, visibleCount);

  const categoryCounts = dynamicDisasterTypes.reduce((acc, cat) => {
    // When "All Statuses" is selected, only count active (non-resolved, non-rejected) incidents
    const eligible = filterStatus === 'All' ? incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected') : incidents.filter((i) => i.status === filterStatus);
    acc[cat] = cat === 'All' ? eligible.length : eligible.filter((i) => i.type === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemAnim}>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Incident Management</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Metrology-triggered reports · Verify to begin impact tracking in Disaster Intelligence
        </p>
      </motion.div>

      {/* Dynamic Disaster Category Pills (Only shows types with existing incidents) */}
      <motion.div variants={itemAnim} className="flex items-center gap-2 overflow-x-auto pb-1">
        {dynamicDisasterTypes.map((type) => {
          const isSelected = selectedCategory === type;
          const count = categoryCounts[type] || 0;
          return (
            <button
              key={type}
              onClick={() => {
                setSelectedCategory(type);
                setVisibleCount(6);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 border ${isSelected
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              {type !== 'All' && typeIcons[type]}
              <span>{type === 'All' ? 'All Disasters' : type}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </motion.div>

      <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(6);
              }}
              placeholder="Search reports by clean ID (e.g. INC-2026-001), title, location..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={filterSeverity}
              onChange={(e) => {
                setFilterSeverity(e.target.value);
                setVisibleCount(6);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-900"
            >
              {dynamicSeverities.map((sev) => (
                <option key={sev} value={sev}>
                  {sev === 'All' ? 'All Severities' : `${sev} Severity`}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setVisibleCount(6);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-900"
            >
              <option value="All">Active Incidents (Excl. Resolved & Rejected)</option>
              <option value="Unverified">Unverified (predicted)</option>
              <option value="Verified">Verified</option>
              <option value="Responding">Responding</option>
              <option value="Resolved">Resolved (Archived)</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </motion.div>

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
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                          isInactive
                            ? 'text-slate-500 bg-slate-200/70 border-slate-300'
                            : 'text-slate-600 bg-slate-100 border-slate-200'
                        }`}>
                          {getCleanDisplayId(incident.id, incident.displayId)}
                        </span>
                        <div className="flex items-center gap-1">
                          {statusIcons[incident.status]}
                          <span className={`text-xs font-bold ${isInactive ? 'text-slate-500' : 'text-slate-700'}`}>
                            {incident.status}
                          </span>
                        </div>
                      </div>
                      <DisasterBadge type="severity" value={incident.severity} />
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {typeIcons[incident.type]}
                      <h3 className={`text-sm font-extrabold truncate transition-colors ${
                        isInactive
                          ? 'text-slate-600 group-hover:text-slate-800'
                          : 'text-slate-900 group-hover:text-blue-600'
                      }`}>
                        {incident.title}
                      </h3>
                    </div>

                    <p className={`text-xs line-clamp-2 leading-relaxed mb-3 ${
                      isInactive ? 'text-slate-500' : 'text-slate-600'
                    }`}>
                      {incident.description}
                    </p>

                    {incident.status === 'Unverified' && incident.triggerAlert && (
                      <div className="mb-3">
                        <TriggerAlertPanel alert={incident.triggerAlert} size="compact" />
                      </div>
                    )}
                  </div>

                  <div className={`pt-3 border-t flex items-center justify-between text-xs font-medium ${
                    isInactive ? 'border-slate-200 text-slate-400' : 'border-slate-100 text-slate-500'
                  }`}>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin size={12} className={`shrink-0 ${isInactive ? 'text-slate-400' : 'text-slate-400'}`} />
                      {incident.location}, {incident.state}
                    </span>
                    <span className={`flex items-center gap-1 font-bold shrink-0 ${
                      isInactive ? 'text-slate-600 group-hover:text-slate-800' : 'text-blue-600'
                    }`}>
                      View Details <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {filteredIncidents.length > visibleCount && (
            <motion.div variants={itemAnim} className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="px-5 py-2.5 bg-white border border-slate-300 hover:border-slate-900 text-slate-800 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer hover:bg-slate-50"
              >
                <ChevronDown size={14} />
                Show More Incidents ({filteredIncidents.length - visibleCount} remaining)
              </button>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default IncidentManagement;
