import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Users, ShieldAlert, Activity,
  MapPin, Share2, Sparkles, ChevronDown, ChevronUp,
  TrendingUp, Zap,
} from 'lucide-react';

import KPICard from '../../components/ui/dashboard/KPICard';
import { DisasterBadge } from '../../components/ui/dashboard/DisasterBadge';
import { NetworkTopology } from '../../components/ui/dashboard/NetworkTopology';
import { DashboardMap } from '../../components/ui/dashboard/DashboardMap';
import {
  useIncidents, useRescueTeams, useMissions,
  useKpiTrends, useNetworkGraph, useActivityFeed,
  useSeverityDist, useResponseTrends, useTeamCapacity, useResourceUtilization,
} from '../../hooks';
import {
  SEVERITY_COLORS,
  SEVERITY_BADGE_STYLES,
  DASHBOARD_ANIMATIONS,
} from '../../constants/theme';
import type { Incident } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, CartesianGrid,
  RadialBarChart, RadialBar, Legend,
} from 'recharts';

// ─── Component ──────────────────────────────────────────────────────
const EOCCommandCenter: React.FC = () => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [centerViewMode, setCenterViewMode] = useState<'topology' | 'map'>('map');
  const [activeBottomTab, setActiveBottomTab] = useState<'roster' | 'logs' | 'deployments' | 'missions' | 'aiChart'>('roster');
  const [bottomExpanded, setBottomExpanded] = useState(true);

  // ── API Data ───────────────────────────────────────────────────────
  const { data: incidents = [] } = useIncidents();
  const { data: rescueTeams = [] } = useRescueTeams();
  const { data: missions = [] } = useMissions();
  const { data: kpiTrends } = useKpiTrends();
  const { data: networkGraph } = useNetworkGraph();
  const { data: activityFeed = [] } = useActivityFeed();
  const { data: severityDist = [] } = useSeverityDist();
  const { data: responseTrend = [] } = useResponseTrends();
  const { data: teamCapacity = [] } = useTeamCapacity();
  const { data: resourceRadial = [] } = useResourceUtilization();

  // ── Derived Values: Only show ACTIVE/UNRESOLVED items ─────────────────────
  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected');
  const activeMissions = missions.filter((m) => m.status !== 'Completed' && m.status !== 'Aborted');
  const activeTeams = rescueTeams.filter((t) => t.status === 'Deployed');

  const criticalIncidents = activeIncidents.filter((i) => i.severity === 'Critical');
  const totalAffected = activeIncidents.reduce((sum, i) => sum + (i.affected_population || 0), 0);
  const deployedTeams = rescueTeams.filter((t) => (t.committed_personnel ?? 0) > 0 || t.status === 'Deployed' || t.status === 'En Route');
  const uniqueDistricts = Array.from(new Set(activeIncidents.map((i) => i.district || i.state).filter(Boolean)));
  const deployedAgencies = Array.from(new Set(deployedTeams.map((t) => t.agency))).slice(0, 4).join(' · ') || 'Active Standby';
  // Personnel-based utilisation from the SAME capacity rule as Rescue Operations
  // (backend capacity_service). Off-duty personnel are not deployable, so they are
  // excluded from the denominator and reported separately.
  const capacityTotals = teamCapacity.reduce(
    (acc: { onDuty: number; deployed: number; offDuty: number }, t: { deployed?: number; available?: number; unavailable?: number }) => ({
      onDuty: acc.onDuty + (t.deployed ?? 0) + (t.available ?? 0),
      deployed: acc.deployed + (t.deployed ?? 0),
      offDuty: acc.offDuty + (t.unavailable ?? 0),
    }),
    { onDuty: 0, deployed: 0, offDuty: 0 }
  );
  const capacityPct = capacityTotals.onDuty > 0 ? Math.round((capacityTotals.deployed / capacityTotals.onDuty) * 100) : 0;
  const onDutyTeams = rescueTeams.filter((t) => t.status !== 'Off Duty' && t.status !== 'Deleted');
  const offDutyTeamCount = rescueTeams.length - onDutyTeams.length;
  const inProgressMissions = activeMissions.filter((m) => m.status === 'In Progress');
  const pendingMissions = activeMissions.filter((m) => m.status === 'Pending');

  const byPriority = (a: { ai_priority_score: number | null }, b: { ai_priority_score: number | null }) =>
    (b.ai_priority_score ?? -1) - (a.ai_priority_score ?? -1);
  // Only incidents with a backend-computed priority are charted.
  const priorityChartData = [...activeIncidents]
    .filter((inc) => inc.ai_priority_score != null)
    .sort(byPriority)
    // One bar per incident (the score is per incident, not per district).
    .map((inc) => ({
      name: inc.display_id || inc.district,
      score: inc.ai_priority_score as number,
      severity: inc.severity,
      detail: `${inc.title} · ${inc.district}`,
    }));

  const incidentList = activeIncidents.map((i) => ({
    id: i.id, title: i.title, severity: i.severity, district: i.district,
    affectedPopulation: i.affected_population, aiPriorityScore: i.ai_priority_score ?? null, status: i.status,
  }));

  const topRoster = [...activeIncidents].sort(byPriority).slice(0, 5);

  // Sparklines show NEW records per bucket (hour or day, chosen by the backend);
  // the caption says which window, which moves to the latest record when nothing
  // happened recently.
  const perUnit = kpiTrends?.bucket === 'hour' ? 'hour' : 'day';
  const lastLabel = kpiTrends?.labels?.[kpiTrends.labels.length - 1];
  const sparkWindow = kpiTrends?.window_end
    ? kpiTrends.is_current_window
      ? perUnit === 'hour' ? 'last 12 h' : 'last 7 days'
      : `${perUnit === 'hour' ? '12 h' : '7 days'} to ${lastLabel ?? kpiTrends.window_end.slice(0, 10)}`
    : undefined;
  const sparkCaption = (what: string) => (sparkWindow ? `${what}/${perUnit} · ${sparkWindow}` : undefined);

  // Set first active incident as default selection when loaded
  React.useEffect(() => {
    if (activeIncidents.length > 0 && !selectedIncident) {
      setSelectedIncident(activeIncidents[0]);
    }
  }, [incidents]);

  // ── Derived Response Trend Metrics ────────────────────────────────
  // No default response time is assumed: with no measurements the card says so.
  const latestResp: number | null = responseTrend.length > 0 ? (responseTrend[responseTrend.length - 1]?.response_min ?? responseTrend[responseTrend.length - 1]?.responseMin ?? null) : null;
  const firstResp: number | null = responseTrend.length > 0 ? (responseTrend[0]?.response_min ?? responseTrend[0]?.responseMin ?? null) : null;
  const respDeltaPct = latestResp != null && firstResp != null && firstResp > 0 ? Math.round(((latestResp - firstResp) / firstResp) * 100) : 0;

  return (
    <motion.div variants={DASHBOARD_ANIMATIONS.container} initial="hidden" animate="show"
      className="space-y-4 sm:space-y-5 max-w-[1400px] mx-auto overflow-x-hidden"
    >

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">EOC Command Center</h1>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 leading-snug">
            National Disaster Response Platform · Real-time Analytics &amp; Network Intelligence
          </p>
        </div>
      </motion.div>

      {/* ─── KPI Cards Grid ─────────────────────────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard title="Active Incidents" value={activeIncidents.length}
          subtitle={`${criticalIncidents.length} Critical Priority`}
          icon={<AlertTriangle size={18} />} accentColor="red"
          sparkData={kpiTrends?.incidents} chartType="area" sparkCaption={sparkCaption('New')} sparkLabels={kpiTrends?.labels}
          trend={{ direction: criticalIncidents.length > 0 ? 'up' : 'stable', label: `${criticalIncidents.length} Urgent` }}
        />
        <KPICard title="Affected Population" value={totalAffected.toLocaleString()}
          subtitle={`Across ${uniqueDistricts.length} affected zones`}
          icon={<Users size={18} />} accentColor="orange"
          sparkData={kpiTrends?.population} chartType="bar" sparkCaption={sparkWindow ? `Running total · ${sparkWindow}` : undefined} sparkLabels={kpiTrends?.labels}
          trend={{ direction: totalAffected > 10000 ? 'up' : 'stable', label: `${uniqueDistricts.length} Active Sectors` }}
        />
        <KPICard title="Teams Deployed" value={`${deployedTeams.length}/${onDutyTeams.length}`}
          subtitle={`${deployedAgencies}${offDutyTeamCount > 0 ? ` · ${offDutyTeamCount} off duty` : ''}`}
          icon={<ShieldAlert size={18} />} accentColor="blue"
          progressValue={capacityPct}
          chartType="progress"
          trend={{ direction: capacityPct > 60 ? 'up' : 'stable', label: capacityTotals.onDuty > 0 ? `${capacityTotals.deployed} of ${capacityTotals.onDuty} personnel deployed` : 'No on-duty personnel' }}
        />
        <KPICard title="Active Missions" value={activeMissions.length}
          subtitle={`${inProgressMissions.length} Active · ${pendingMissions.length} Queued`}
          icon={<Activity size={18} />} accentColor="purple"
          sparkData={kpiTrends?.missions} chartType="area" sparkCaption={sparkCaption('New')} sparkLabels={kpiTrends?.labels}
          trend={{ direction: inProgressMissions.length > 0 ? 'stable' : 'down', label: `${inProgressMissions.length} in progress` }}
        />
      </motion.div>

      {/* ─── Analytics Row ─────────────────────────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">

        {/* Severity Distribution Donut */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-red-600 shrink-0" />
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">Severity Distribution</p>
          </div>
          <div className="flex items-center justify-around gap-2 my-auto">
            <div className="w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityDist} cx="50%" cy="50%" innerRadius={28} outerRadius={46}
                    dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                    {severityDist.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {severityDist.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-slate-600 truncate text-[11px]">{s.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs ml-1">{s.value}</span>
                </div>
              ))}
              <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                {incidents.length} total active
              </div>
            </div>
          </div>
        </div>

        {/* Response Time Trend Line */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp size={14} className="text-emerald-600 shrink-0" />
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">Avg Response Time</p>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 border ${
              respDeltaPct <= 0
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-amber-700 bg-amber-50 border-amber-200'
            }`}>
              {respDeltaPct <= 0 ? `↓ ${Math.abs(respDeltaPct)}%` : `↑ ${respDeltaPct}%`}
            </span>
          </div>
          <div className="h-[90px] w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={responseTrend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} unit="m" />
                <Tooltip formatter={(v) => [`${v} min`, 'Response']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Line type="monotone" dataKey="response_min" stroke="#10b981" strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 text-right font-mono">
            Latest: <span className="font-bold text-slate-700">{latestResp != null ? `${latestResp} min` : 'No measurements yet'}</span>
          </p>
        </div>

        {/* Resource Utilisation Radial */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between md:col-span-2 xl:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} className="text-blue-600 shrink-0" />
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">Resource Utilisation</p>
          </div>
          <div className="h-[105px] w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="25%" outerRadius="95%" data={resourceRadial} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#f1f5f9' }} />
                <Legend
                  iconSize={6} layout="vertical" verticalAlign="middle" align="right"
                  formatter={(value) => <span style={{ fontSize: 9, color: '#64748b' }}>{value}</span>}
                />
                <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* ─── Team Capacity Bar ─────────────────────────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-blue-600 shrink-0" />
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Team Deployment Capacity</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /> Deployed</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available</span>
          </div>
        </div>
        <div className="h-[110px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamCapacity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={2} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: '#e2e8f0' }} />
              <Bar dataKey="deployed" name="Deployed" stackId="a" fill="#2563eb" />
              <Bar dataKey="available" name="Available" radius={[3, 3, 0, 0]} stackId="a" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ─── Full-Width Command View ──────────────────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item} className="flex flex-col space-y-3">
        <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-xs">
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles size={16} className="text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Command View</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setCenterViewMode('map')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${centerViewMode === 'map' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <MapPin size={13} /> Live Map
            </button>
            <button
              onClick={() => setCenterViewMode('topology')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${centerViewMode === 'topology' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Share2 size={13} /> Network Topology
            </button>
          </div>
        </div>

        {centerViewMode === 'topology' ? (
          <NetworkTopology
            nodes={networkGraph?.nodes ?? []}
            edges={networkGraph?.edges ?? []}
            selectedNodeId={selectedIncident?.id}
            onSelectNode={(nodeId) => {
              const found = incidents.find((i) => i.id === nodeId);
              if (found) setSelectedIncident(found);
            }}
            incidents={incidentList}
            activityFeed={activityFeed}
          />
        ) : (
          <DashboardMap
            incidents={incidents}
            selectedIncident={selectedIncident}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
          />
        )}
      </motion.div>

      {/* ─── AI Priority Bar Chart ──────────────────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Zap size={14} className="text-amber-500 shrink-0" />
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Priority Score</p>
          <span className="text-[10px] text-slate-400 font-medium">by incident, 0–100</span>
        </div>
        <div className="h-[180px] w-full">
          {priorityChartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
              <Zap size={20} className="text-amber-500/60 mb-1.5" />
              <p className="text-xs font-bold text-slate-700">No AI-Scored Incidents</p>
              <p className="text-[11px] text-slate-400 max-w-sm mt-0.5 leading-snug">
                Incidents await automated priority scoring or execution of the hazard intelligence scan.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityChartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  labelFormatter={(label, p) => `${label} · ${(p?.[0]?.payload as { detail?: string } | undefined)?.detail ?? ''}`}
                />
                <Bar dataKey="score" name="AI Score" radius={[5, 5, 0, 0]} barSize={28}>
                  {priorityChartData.map((entry, idx) => (
                    <Cell key={idx} fill={SEVERITY_COLORS[entry.severity] || '#2563eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ─── Bottom Panel ─────────────────────────────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-3.5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg flex-wrap">
            {([
              { key: 'roster', label: 'Priority Roster' },
              { key: 'deployments', label: 'Team Status' },
              { key: 'missions', label: 'Missions' },
            ] as const).map(({ key, label }) => (
              <button key={key}
                onClick={() => { setActiveBottomTab(key); setBottomExpanded(true); }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${activeBottomTab === key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setBottomExpanded(!bottomExpanded)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all cursor-pointer self-end sm:self-auto"
          >
            {bottomExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {bottomExpanded && (
          <div className="p-3.5 sm:p-5">
            {activeBottomTab === 'roster' && (
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                      <th className="pb-2 pr-3">#</th>
                      <th className="pb-2 pr-3">Incident</th>
                      <th className="pb-2 pr-3">District</th>
                      <th className="pb-2 pr-3">Severity</th>
                      <th className="pb-2 pr-3 text-right">AI Score</th>
                      <th className="pb-2 text-right">Affected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {topRoster.map((inc, i) => (
                      <tr key={inc.id}
                        onClick={() => setSelectedIncident(incidents.find(x => x.id === inc.id) ?? null)}
                        className={`cursor-pointer transition-colors hover:bg-slate-50 ${selectedIncident?.id === inc.id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="py-2.5 pr-3 font-mono font-bold text-slate-400">{i + 1}</td>
                        <td className="py-2.5 pr-3 font-semibold text-slate-900 max-w-[140px] sm:max-w-[180px] truncate">{inc.title}</td>
                        <td className="py-2.5 pr-3 text-slate-500">{inc.district}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${SEVERITY_BADGE_STYLES[inc.severity]}`}>
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono font-bold text-blue-700">{inc.ai_priority_score}</td>
                        <td className="py-2.5 text-right text-slate-500 font-medium font-mono">{(inc.affected_population ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeBottomTab === 'deployments' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeTeams.map((team) => (
                  <div key={team.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{team.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${team.status === 'Deployed' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>{team.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">{team.agency} · {team.personnel_count} Personnel</p>
                    <p className="text-[11px] text-slate-600 mt-1 font-medium truncate">📍 {team.current_location}</p>
                  </div>
                ))}
              </div>
            )}

            {activeBottomTab === 'missions' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeMissions.map((mis) => (
                  <div key={mis.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-blue-700 shrink-0">{mis.display_id || mis.id}</span>
                      <DisasterBadge type="severity" value={mis.priority} />
                    </div>
                    <p className="text-xs font-bold text-slate-900 mt-1.5 truncate">{mis.title}</p>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{mis.objective}</p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-end text-[10px] text-slate-500 gap-2">
                      <span className="font-semibold text-emerald-700 shrink-0">{mis.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default EOCCommandCenter;
