import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  LayoutDashboard,
  FileText,
  MapPin,
  Radio,
  Users,
  Building2,
  CloudRain,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Activity,
  TrendingUp,
  Navigation,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle } from 'react-leaflet';
import { DisasterBadge } from '../dashboard/DisasterBadge';
import { useRescueTeams, useMissions, useActivityFeed } from '../../../hooks';
import type { Incident, SitrepTab } from '../../../types';
import { severityHex, statusConfig, activityTypeStyle, TABS } from '../../../constants';
import 'leaflet/dist/leaflet.css';

interface SitrepPanelProps {
  incident: Incident | null;
  onClose: () => void;
  onViewFullAnalysis: (incident: Incident) => void;
}

function formatDateTime(ts: string) {
  const d = new Date(ts.replace(' ', 'T'));
  return isNaN(d.getTime())
    ? ts
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tabs (Light Theme)
// ─────────────────────────────────────────────────────────────────────────────

const DashboardTab: React.FC<{ incident: Incident }> = ({ incident }) => {
  const { data: rescueTeams = [] } = useRescueTeams();
  const { data: missions = [] } = useMissions();
  const assignedTeams = rescueTeams.filter(t => t.assignedIncidentId === incident.id);
  const assignedMissions = missions.filter(m => m.incidentId === incident.id);
  const scoreColor =
    incident.aiPriorityScore >= 85
      ? '#ef4444'
      : incident.aiPriorityScore >= 65
        ? '#f97316'
        : '#eab308';

  const stat = statusConfig[incident.status] ?? statusConfig.Unverified;

  return (
    <div className="space-y-4">
      {/* Priority Progress & Status Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${stat.bg} ${stat.color}`}>
            {stat.icon}
            {incident.status.toUpperCase()}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">AI Score:</span>
            <span className="text-sm font-extrabold" style={{ color: scoreColor }}>
              {incident.aiPriorityScore}/100
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${incident.aiPriorityScore}%`, background: scoreColor }}
          />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1 text-blue-700">
            <Users size={14} />
            <p className="text-[10px] font-bold uppercase tracking-wide">Affected Population</p>
          </div>
          <p className="text-lg font-extrabold text-slate-900">{incident.affectedPopulation.toLocaleString()}</p>
        </div>

        <div className="bg-red-50/60 border border-red-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1 text-red-700">
            <AlertTriangle size={14} />
            <p className="text-[10px] font-bold uppercase tracking-wide">Casualties Count</p>
          </div>
          <p className="text-lg font-extrabold text-slate-900">{incident.casualtiesCount}</p>
        </div>

        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1 text-amber-700">
            <Navigation size={14} />
            <p className="text-[10px] font-bold uppercase tracking-wide">Accessibility Index</p>
          </div>
          <p className="text-lg font-extrabold text-slate-900">{incident.accessibilityScore}/100</p>
        </div>

        <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1 text-slate-700">
            <Building2 size={14} />
            <p className="text-[10px] font-bold uppercase tracking-wide">Infrastructure Damage</p>
          </div>
          <p className="text-sm font-extrabold text-slate-900 mt-1">{incident.infrastructureDamage}</p>
        </div>
      </div>

      {/* Weather & Meteorological Context */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-slate-800">
          <CloudRain size={16} className="text-blue-600" />
          <span className="text-xs font-bold">{incident.weatherCondition}</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">{incident.description}</p>
      </div>

      {/* Assigned Response Squads */}
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
                  <p className="text-[10px] text-slate-500 mt-0.5">{t.agency} · {t.currentLocation}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-blue-600">{t.personnelCount} pax</span>
                  <p className="text-[10px] font-semibold text-emerald-600">{t.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Missions */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-amber-600" />
          Active Operations & Missions ({assignedMissions.length})
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
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shrink-0">
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

/** EXECUTIVE TAB: Official Malaysian Government Situational Report (PDF/Poster format) */
const ExecutiveTab: React.FC<{ incident: Incident }> = ({ incident }) => {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const content = document.getElementById('malaysia-gov-sitrep-print');
    if (!content) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SITREP OFFICIAL REPORT - ${incident.id}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #ffffff; }
          .header-banner { border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .gov-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.05em; }
          .sub-gov { font-size: 10px; text-transform: uppercase; color: #475569; letter-spacing: 0.1em; font-weight: 700; margin-top: 2px; }
          .doc-ref { font-family: monospace; font-size: 10px; color: #64748b; text-align: right; }
          .classification { font-size: 9px; font-weight: bold; background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; display: inline-block; text-transform: uppercase; }
          h1 { font-size: 18px; font-weight: 800; color: #0f172a; margin: 12px 0 4px; }
          .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; }
          .meta-card { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; }
          .meta-card .label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
          .meta-card .val { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 9px; color: #334155; }
          .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 18px; }
          .sig-block { margin-top: 30px; display: flex; justify-content: space-between; }
          .sig-line { width: 200px; border-top: 1px solid #475569; margin-top: 40px; text-align: center; font-size: 10px; font-weight: 700; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <div className="space-y-4">
      {/* Export action bar */}
      <div className="flex gap-2">
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Printer size={14} /> Print / Export Official PDF
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer"
        >
          <Download size={14} /> Poster
        </button>
      </div>

      {/* Official Government Template View */}
      <div
        id="malaysia-gov-sitrep-print"
        className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4 text-slate-900 font-sans"
      >
        {/* Government Header */}
        <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-blue-900" />
              <div>
                <p className="text-[10px] font-extrabold tracking-wider uppercase text-blue-950">
                  AGENSI PENGURUSAN BENCANA NEGARA (NADMA)
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  JABATAN PERDANA MENTERI · MALAYSIA
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2 py-0.5 bg-red-100 text-red-800 text-[9px] font-extrabold uppercase rounded">
              TERHAD / RESTRICTED
            </span>
            <p className="text-[9px] font-mono text-slate-500 mt-1">REF: {incident.id}</p>
          </div>
        </div>

        {/* Report Subject */}
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">LAPORAN SITUASI BENCANA (SITREP)</p>
          <h2 className="text-base font-extrabold text-slate-900 mt-0.5">{incident.title}</h2>
          <p className="text-xs font-medium text-slate-600 mt-0.5">
            LOKASI: {incident.location.toUpperCase()}, {incident.district.toUpperCase()}, {incident.state.toUpperCase()}
          </p>
        </div>

        {/* Structured Metrics Table */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Tarikh / Masa</p>
            <p className="text-xs font-extrabold text-slate-900 mt-0.5">{formatDateTime(incident.timestamp)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Tahap Bencana</p>
            <p className="text-xs font-extrabold text-blue-800 mt-0.5">{incident.disasterLevel}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Tahap Keparahan</p>
            <p className="text-xs font-extrabold text-red-600 mt-0.5">{incident.severity}</p>
          </div>
        </div>

        {/* Impact Analysis Table */}
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
            1. Ringkasan Impak & Mangsa
          </p>
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px]">
              <tr>
                <th className="p-1.5 border border-slate-200">Parameter</th>
                <th className="p-1.5 border border-slate-200">Nilai / Status</th>
                <th className="p-1.5 border border-slate-200">Catatan Ringkas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              <tr>
                <td className="p-1.5 border font-semibold">Anggaran Mangsa Terjejas</td>
                <td className="p-1.5 border font-extrabold text-blue-700">{incident.affectedPopulation.toLocaleString()} orang</td>
                <td className="p-1.5 border text-slate-500">Kawasan Zon Merah</td>
              </tr>
              <tr>
                <td className="p-1.5 border font-semibold">Jumlah Kematian / Kecederaan</td>
                <td className="p-1.5 border font-extrabold text-red-600">{incident.casualtiesCount} kes</td>
                <td className="p-1.5 border text-slate-500">Dikemas kini oleh BOMBA / KKM</td>
              </tr>
              <tr>
                <td className="p-1.5 border font-semibold">Kerosakan Infrastruktur</td>
                <td className="p-1.5 border font-bold">{incident.infrastructureDamage}</td>
                <td className="p-1.5 border text-slate-500">Jalan raya & pencawang elektrik</td>
              </tr>
              <tr>
                <td className="p-1.5 border font-semibold">Indeks Kebolehcapaian</td>
                <td className="p-1.5 border font-bold text-amber-700">{incident.accessibilityScore}/100</td>
                <td className="p-1.5 border text-slate-500">Laluan terputus dipantau JKR</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Narrative */}
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 mb-1">
            2. Perihalan Kejadian & Cuaca
          </p>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
            {incident.description} Laporan meterologi terkini menunjukkan status cuaca: <strong>{incident.weatherCondition}</strong>. Sumber data diperoleh daripada {incident.source}.
          </p>
        </div>

        {/* Signature & Verification Block */}
        <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Disahkan Oleh:</p>
            <p className="text-xs font-bold text-slate-900 mt-0.5">{incident.verifiedBy ?? 'Pusat Kawalan Operasi NADMA'}</p>
            <p className="text-[9px] text-slate-500">Pusat Kawalan Operasi Bencana Negara (NDCC)</p>
          </div>
          <div className="text-right">
            <div className="w-24 border-b border-slate-400 mb-1 ml-auto" />
            <p className="text-[9px] font-bold text-slate-600 uppercase">Cop & Tandatangan Pengesahan</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/** TACTICAL TAB: Clean Leaflet mini-map & spatial telemetry */
const TacticalTab: React.FC<{ incident: Incident }> = ({ incident }) => {
  const [lat, lng] = incident.coordinates;
  const { data: rescueTeams = [] } = useRescueTeams();
  const nearbyTeams = rescueTeams.filter(t => t.assignedIncidentId === incident.id);

  return (
    <div className="space-y-3">
      {/* Map box */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-800">Tactical Sector Map</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500 font-semibold">
            {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
          </span>
        </div>

        <div style={{ height: 260 }}>
          <MapContainer
            key={incident.id}
            center={[lat, lng]}
            zoom={10}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution="&copy; CARTO"
              subdomains={['a', 'b', 'c', 'd'] as any}
            />

            <Circle
              center={[lat, lng]}
              radius={10000}
              fillColor={severityHex[incident.severity]}
              color={severityHex[incident.severity]}
              weight={2}
              fillOpacity={0.15}
            />
            <CircleMarker
              center={[lat, lng]}
              radius={11}
              fillColor={severityHex[incident.severity]}
              color="white"
              weight={2.5}
              fillOpacity={0.95}
            >
              <Tooltip permanent direction="top" offset={[0, -12]}>
                <span className="text-[10px] font-bold text-slate-900">{incident.title}</span>
              </Tooltip>
            </CircleMarker>

            {nearbyTeams.map(t => (
              <CircleMarker
                key={t.id}
                center={[t.coordinates[0], t.coordinates[1]]}
                radius={7}
                fillColor="#2563eb"
                color="white"
                weight={1.5}
                fillOpacity={0.9}
              >
                <Tooltip direction="top" offset={[0, -8]}>
                  <span className="text-[10px] font-bold text-blue-900">{t.name}</span>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Spatial Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase">Daerah & Negeri</p>
          <p className="text-xs font-bold text-slate-900 mt-0.5">{incident.district}, {incident.state}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase">Sumber Intelegen</p>
          <p className="text-xs font-bold text-slate-900 mt-0.5">{incident.source}</p>
        </div>
      </div>
    </div>
  );
};

/** OPERATIONS TAB: Properly formatted Light-Mode Activity Feed */
const OperationsTab: React.FC<{ incident: Incident }> = ({ incident }) => {
  const { data: activityFeed = [] } = useActivityFeed();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Live Incident Stream
          </h4>
        </div>
        <span className="text-[10px] font-mono text-slate-400">{incident.id}</span>
      </div>

      {/* Timeline items */}
      <div className="space-y-2.5">
        {activityFeed.map((evt) => {
          const style = activityTypeStyle[evt.type] ?? activityTypeStyle.info;
          return (
            <div
              key={evt.id}
              className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${style.bg} border-slate-200 shadow-2xs`}
            >
              <span className={`size-2.5 rounded-full ${style.dot} mt-1 shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[9px] font-extrabold uppercase tracking-wider ${style.text}`}>
                    {style.label} · {evt.actor}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{evt.time}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-snug">{evt.event}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main SitrepPanel Component (Light Theme, Backdrop Click-to-Close)
// ─────────────────────────────────────────────────────────────────────────────
export const SitrepPanel: React.FC<SitrepPanelProps> = ({
  incident,
  onClose,
  onViewFullAnalysis,
}) => {
  const [activeTab, setActiveTab] = useState<SitrepTab>('dashboard');

  return (
    <AnimatePresence>
      {incident && (
        <>
          {/* Backdrop (CLICKABLE to close drawer on blur) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer Panel (Light Mode UI) */}
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
                      {incident.id}
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
                <DisasterBadge type="level" value={incident.disasterLevel} />
              </div>
            </div>

            {/* Segmented Tab Bar */}
            <div className="shrink-0 flex border-b border-slate-200 bg-slate-50/50 p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
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
                  {activeTab === 'executive' && <ExecutiveTab incident={incident} />}
                  {activeTab === 'tactical' && <TacticalTab incident={incident} />}
                  {activeTab === 'operations' && <OperationsTab incident={incident} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Drawer Footer */}
            {incident.status !== 'Unverified' && incident.impactTimeline?.length ? (
              <div className="shrink-0 p-4 border-t border-slate-200 bg-slate-50/50">
                <button
                  onClick={() => onViewFullAnalysis(incident)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Activity size={14} /> View Full AI Intelligence Analysis
                </button>
              </div>
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
