import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MapPin,
  Users,
  Building2,
  CloudRain,
  ShieldAlert,
  AlertTriangle,
  Activity,
  TrendingUp,
  Navigation,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle } from 'react-leaflet';
import { DisasterBadge } from '../dashboard/DisasterBadge';
import { useRescueTeams, useMissions, useIncidentLogs } from '../../../hooks';
import { LogDetailBody } from './LogDetailBody';
import type { Incident, SitrepTab } from '../../../types';
import { severityHex, statusConfig, activityTypeStyle, TABS } from '../../../constants';
import { formatDateTime } from '../../../utils/dateFormatter';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import { fmtScore, isNum } from '../../../utils/display';

interface SitrepPanelProps {
  incident: Incident | null;
  onClose: () => void;
  onViewFullAnalysis: (incident: Incident) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tactical SITREP Tab (Unified Dashboard + Spatial Map)
// ─────────────────────────────────────────────────────────────────────────────

const DashboardTab: React.FC<{ incident: Incident }> = ({ incident }) => {
  const { data: rescueTeams = [] } = useRescueTeams();
  const { data: missions = [] } = useMissions();
  const [lat, lng] = incident.coordinates || [4.2105, 101.9758];

  const assignedMissions = missions.filter((m) => m.incident_id === incident.id);

  // Identify rescue teams specifically assigned to missions for this incident
  const assignedTeamIds = new Set<string>();
  const assignedTeamNames = new Set<string>();
  assignedMissions.forEach((m) => {
    if (m.assigned_team_id) assignedTeamIds.add(m.assigned_team_id);
    if (Array.isArray(m.team_ids)) {
      m.team_ids.forEach((id) => assignedTeamIds.add(id));
    }
    if (m.team_name) assignedTeamNames.add(m.team_name.trim().toLowerCase());
  });

  const assignedTeams = rescueTeams.filter(
    (t) =>
      t.status !== 'Deleted' &&
      (assignedTeamIds.has(t.id) ||
        assignedTeamIds.has(t.display_id) ||
        assignedTeamNames.has(t.name.trim().toLowerCase()))
  );
  const stat = statusConfig[incident.status] ?? statusConfig.Unverified;

  return (
    <div className="space-y-4">
      {/* Priority Progress & Status Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${stat.bg} ${stat.color}`}>
            {stat.icon}
            {incident.status.toUpperCase()}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">AI Priority:</span>
            <span className="text-sm font-extrabold text-blue-700">
              {fmtScore(incident.ai_priority_score, 100, 'Not yet scored')}
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 bg-blue-600"
            style={{ width: `${isNum(incident.ai_priority_score) ? Math.min(100, Math.max(0, incident.ai_priority_score)) : 0}%` }}
          />
        </div>
      </div>

      {/* Structured Operational KPIs (Consistent Slate/Navy Theme) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 mb-1 text-slate-600">
            <Users size={14} className="text-blue-600" />
            <p className="text-[10px] font-bold uppercase tracking-wide">Affected Population</p>
          </div>
          <p className="text-base font-extrabold text-slate-900">{incident.affected_population.toLocaleString()}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 mb-1 text-slate-600">
            <AlertTriangle size={14} className="text-slate-800" />
            <p className="text-[10px] font-bold uppercase tracking-wide">Casualties Recorded</p>
          </div>
          <p className="text-base font-extrabold text-slate-900">{incident.casualties_count}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 mb-1 text-slate-600">
            <Navigation size={14} className="text-blue-600" />
            <p className="text-[10px] font-bold uppercase tracking-wide">Accessibility Score</p>
          </div>
          <p className="text-base font-extrabold text-slate-900">{incident.accessibility_score}/100</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 mb-1 text-slate-600">
            <Building2 size={14} className="text-slate-800" />
            <p className="text-[10px] font-bold uppercase tracking-wide">Infrastructure Damage</p>
          </div>
          <p className="text-xs font-bold text-slate-900 mt-1">{incident.infrastructure_damage}</p>
        </div>
      </div>

      {/* Interactive Tactical Mini-Map Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-blue-600" />
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Tactical Geo-Sector</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500 font-semibold">
            {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
          </span>
        </div>

        <div style={{ height: 180 }}>
          <MapContainer
            key={incident.id}
            center={[lat, lng]}
            zoom={10}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <Circle
              center={[lat, lng]}
              radius={8000}
              fillColor="#2563eb"
              fillOpacity={0.15}
              stroke={true}
              color="#1d4ed8"
              weight={1.5}
            />
            <CircleMarker
              center={[lat, lng]}
              radius={7}
              fillColor="#1e40af"
              fillOpacity={1}
              stroke={true}
              color="#ffffff"
              weight={2}
            >
              <Tooltip permanent={false} direction="top">
                <span className="font-bold text-xs">{incident.title}</span>
              </Tooltip>
            </CircleMarker>
          </MapContainer>
        </div>
      </div>

      {/* Meteorological & Situation Narrative */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-slate-800">
          <CloudRain size={15} className="text-blue-600" />
          <span className="text-xs font-bold">{incident.weather_condition || 'Normal conditions recorded'}</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">{incident.description}</p>
      </div>

      {/* Deployed Response Units */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldAlert size={14} className="text-blue-600" />
          Deployed Response Units ({assignedTeams.length})
        </h4>
        {assignedTeams.length === 0 ? (
          <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            No specific response team assigned to this sector yet.
          </p>
        ) : (
          <div className="space-y-2">
            {assignedTeams.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">{t.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{t.agency} · {t.current_location}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-blue-700">{t.personnel_count} pax</span>
                  <p className="text-[10px] font-semibold text-slate-600">{t.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Operations & Missions */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-slate-700" />
          Active Operations &amp; Missions ({assignedMissions.length})
        </h4>
        {assignedMissions.length === 0 ? (
          <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            No active search and rescue missions currently logged.
          </p>
        ) : (
          <div className="space-y-2">
            {assignedMissions.map(m => (
              <div
                key={m.id}
                className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs flex items-start justify-between gap-2"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">{m.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{m.objective}</p>
                </div>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md shrink-0">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Live Ops Feed Tab
// ─────────────────────────────────────────────────────────────────────────────

// Maps incident_logs action values to a display style consistent with activityTypeStyle
const actionToType = (action: string): 'critical' | 'alert' | 'info' | 'success' => {
  if (action === 'Incident Created') return 'info';
  if (action === 'Incident Verified') return 'success';
  if (action === 'Severity Changed') return 'alert';
  if (action === 'Incident Resolved' || action === 'Incident Closed') return 'success';
  if (action === 'Team Assigned' || action === 'Team Status Updated') return 'info';
  if (action === 'Mission Created' || action === 'Mission Status Updated') return 'info';
  if (action === 'Resource Requested') return 'alert';
  if (action === 'Resource Allocated' || action === 'Resource Dispatched') return 'success';
  return 'info';
};

const OperationsTab: React.FC<{ incident: Incident }> = ({ incident }) => {
  const { data: logs = [], isLoading } = useIncidentLogs(incident.id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Operational Audit Log ({logs.length})
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          {isLoading ? 'Loading...' : logs.length > 0 ? `Latest: ${formatDateTime(logs[0].logged_at)}` : 'No entries'}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
          <Clock size={24} className="mx-auto text-slate-400 mb-2" />
          <p className="text-xs text-slate-500 font-medium">No operational events logged for this incident yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log, idx) => {
            const evtType = actionToType(log.action);
            const style = activityTypeStyle[evtType] ?? activityTypeStyle.info;
            const actor = [log.actor, log.actor_role, log.actor_agency]
              .filter(Boolean).join(' · ');
            return (
              <div
                key={log.id ?? idx}
                className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white shadow-2xs"
              >
                <span className={`mt-1 size-2 rounded-full shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {log.action} · {actor || 'EOC System'}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                      {formatDateTime(log.logged_at)}
                    </span>
                  </div>
                  <LogDetailBody detail={log.detail} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main SitrepPanel Component (Navy/Slate/Charcoal Theme)
// ─────────────────────────────────────────────────────────────────────────────

export const SitrepPanel: React.FC<SitrepPanelProps> = ({
  incident,
  onClose,
  onViewFullAnalysis,
}) => {
  const [activeTab, setActiveTab] = useState<SitrepTab>('dashboard');
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {incident && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[480px] max-w-full flex flex-col bg-white border-l border-slate-200 shadow-2xl"
          >
            {/* Header Banner */}
            <div className="shrink-0 px-5 pt-5 pb-4 bg-slate-50/80 border-b border-slate-200">
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    {incident.display_id || incident.id}
                  </span>
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ background: severityHex[incident.severity] }}
                    />
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                    {incident.title}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {incident.location} · {incident.district}, {incident.state}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Disaster Badges */}
              <div className="flex items-center gap-2">
                <DisasterBadge type="severity" value={incident.severity} />
                <DisasterBadge type="level" value={incident.disaster_level} />
              </div>
            </div>

            {/* Segmented Tab Bar */}
            <div className="shrink-0 flex border-b border-slate-200 bg-slate-50/50 p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Scrollable Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === 'dashboard' && <DashboardTab incident={incident} />}
                  {activeTab === 'operations' && <OperationsTab incident={incident} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Drawer Footer with Direct Command Action Navigation */}
            <div className="shrink-0 p-4 border-t border-slate-200 bg-slate-50/80 space-y-2">
              <button
                onClick={() => {
                  onClose();
                  navigate(`/situational/incidents/${incident.id}`);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <ShieldCheck size={14} className="text-blue-400" /> Open Incident Command Center &amp; Actions &rarr;
              </button>
              {incident.status !== 'Unverified' && incident.impact_timeline?.length ? (
                <button
                  onClick={() => onViewFullAnalysis(incident)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  <Activity size={13} className="text-blue-600" /> View AI Predictive Analysis
                </button>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
