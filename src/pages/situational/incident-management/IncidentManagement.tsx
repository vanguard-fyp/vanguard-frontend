import React, { useState } from 'react';
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
  ArrowUpRight,
} from 'lucide-react';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
import { TriggerAlertPanel } from '../../../components/ui/situational/TriggerAlertPanel';
import { useIncidents, useUpdateIncident } from '../../../hooks';
import type { Incident } from '../../../types';
import { IncidentDetailView } from './IncidentDetailView';

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
};

const DISASTER_TYPES = ['All', 'Flood', 'Flash Flood', 'Landslide', 'Forest Fire', 'Severe Storm'] as const;

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

const IncidentManagement: React.FC<IncidentManagementProps> = ({ onTrackInIntelligence }) => {
  const { data: incidents = [] } = useIncidents();
  const updateIncident = useUpdateIncident();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);

  const filteredIncidents = incidents.filter((inc) => {
    const matchCategory = selectedCategory === 'All' || inc.type === selectedCategory;
    const matchSearch =
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSeverity = filterSeverity === 'All' || inc.severity === filterSeverity;
    const matchStatus = filterStatus === 'All' || inc.status === filterStatus;
    return matchCategory && matchSearch && matchSeverity && matchStatus;
  });

  const categoryCounts = DISASTER_TYPES.reduce((acc, cat) => {
    acc[cat] = cat === 'All' ? incidents.length : incidents.filter((i) => i.type === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const handleVerify = (id: string) => {
    updateIncident.mutate({ id, updates: { status: 'Verified', verifiedBy: 'Officer Rosli (NADMA)' } });
    if (activeIncident?.id === id) {
      setActiveIncident((prev) =>
        prev ? { ...prev, status: 'Verified', verifiedBy: 'Officer Rosli (NADMA)' } : null
      );
    }
  };

  if (activeIncident) {
    return (
      <IncidentDetailView
        incident={activeIncident}
        onBack={() => setActiveIncident(null)}
        onVerify={handleVerify}
        onTrackInIntelligence={onTrackInIntelligence}
      />
    );
  }

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemAnim}>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Incident Management</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Metrology-triggered reports · Verify to begin impact tracking in Disaster Intelligence
        </p>
      </motion.div>

      <motion.div variants={itemAnim} className="flex items-center gap-2 overflow-x-auto pb-1">
        {DISASTER_TYPES.map((type) => {
          const isSelected = selectedCategory === type;
          const count = categoryCounts[type] || 0;
          return (
            <button
              key={type}
              onClick={() => setSelectedCategory(type)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 border ${isSelected
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search external reports by ID, title, location..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-900"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-900"
            >
              <option value="All">All Statuses</option>
              <option value="Unverified">Unverified (predicted)</option>
              <option value="Verified">Verified</option>
              <option value="Responding">Responding</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIncidents.map((incident) => (
          <div
            key={incident.id}
            onClick={() => setActiveIncident(incident)}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {incident.id}
                  </span>
                  <div className="flex items-center gap-1">
                    {statusIcons[incident.status]}
                    <span className="text-xs font-bold text-slate-700">{incident.status}</span>
                  </div>
                </div>
                <DisasterBadge type="severity" value={incident.severity} />
              </div>

              <div className="flex items-center gap-2 mb-2">
                {typeIcons[incident.type]}
                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {incident.title}
                </h3>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">{incident.description}</p>

              {incident.status === 'Unverified' && incident.triggerAlert && (
                <div className="mb-3">
                  <TriggerAlertPanel alert={incident.triggerAlert} size="compact" />
                </div>
              )}

              {incident.status !== 'Unverified' && (
                <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 w-fit">
                  <ArrowUpRight size={12} /> Tracked in Disaster Intelligence
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1 truncate">
                <MapPin size={12} className="shrink-0 text-slate-400" />
                {incident.location}, {incident.state}
              </span>
              <span className="flex items-center gap-1 font-bold text-blue-600 shrink-0">
                View Details <ChevronRight size={14} />
              </span>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default IncidentManagement;