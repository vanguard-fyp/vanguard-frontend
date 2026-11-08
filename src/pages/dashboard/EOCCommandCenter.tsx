import { DataRegion } from '../../components/common/DataRegion';
import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Users, ShieldCheck, Route, Waves } from 'lucide-react';

import { Panel, StatCard, Segmented, ConcentricRings, TrendPill, ringUnits, Bone } from '../../components/ui/dashboard/Panel';
import { DashboardMap } from '../../components/ui/dashboard/DashboardMap';
import { ResponseChain } from '../../components/ui/dashboard/ResponseChain';
import { PriorityList, SeverityLegend } from '../../components/ui/dashboard/PriorityList';
import {
  useIncidents, useRescueTeams, useMissions, useResponseTrends, useResourceUtilization, useSensorNodes,
} from '../../hooks';
import { criticalSensors, sensorLevelCm, sensorName } from '../../utils/sensors';
import { DASHBOARD_ANIMATIONS } from '../../constants/theme';
import { DASH, ACCENT, CATEGORY, CHART_TOOLTIP } from '../../constants/dashboard';
import type { Incident } from '../../types';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from 'recharts';

const VIEWS = [
  { key: 'map', label: 'Live map' },
  { key: 'chain', label: 'Response chain' },
] as const;

const axisTick = { fill: DASH.inkFaint, fontSize: 10 };

const EOCCommandCenter: React.FC = () => {
  // What the officer picked. Nothing is picked on load, so no row looks active by accident.
  const [pickedIncident, setPickedIncident] = useState<Incident | null>(null);
  const [view, setView] = useState<'map' | 'chain'>('map');
  const [stockHover, setStockHover] = useState<number | null>(null);
  const navigate = useNavigate();

  const incidentsQuery = useIncidents();
  const { data: incidents = [], isPending: incLoading } = incidentsQuery;
  const teamsQuery = useRescueTeams();
  const { data: rescueTeams = [], isPending: teamsLoading } = teamsQuery;
  const missionsQuery = useMissions();
  const { data: missions = [], isPending: misLoading } = missionsQuery;
  const responseTrendQuery = useResponseTrends();
  const { data: responseTrend = [], isPending: respLoading } = responseTrendQuery;
  const { data: sensorNodes = [] } = useSensorNodes();
  const utilizationQuery = useResourceUtilization();
  const { data: resourceUtil = [], isPending: stockLoading } = utilizationQuery;

  // ── Derived Values: Only show ACTIVE/UNRESOLVED items ─────────────────────
  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected');
  const activeIncidentIds = new Set(activeIncidents.map((i) => i.id));
  const activeMissions = missions.filter(
    (m) =>
      !m.title.toLowerCase().includes('test') &&
      m.status !== 'Completed' &&
      m.status !== 'Aborted' &&
      ['Pending', 'In Progress'].includes(m.status) &&
      (activeIncidentIds.size === 0 || !m.incident_id || activeIncidentIds.has(m.incident_id))
  );

  const criticalCount = activeIncidents.filter((i) => i.severity === 'Critical').length;
  const sensorNow = Date.now();
  const sensorAlerts = criticalSensors(sensorNodes, sensorNow);
  const totalAffected = activeIncidents.reduce((sum, i) => sum + (i.affected_population || 0), 0);
  const deployedTeams = rescueTeams.filter((t) => (t.committed_personnel ?? 0) > 0 || t.status === 'Deployed' || t.status === 'En Route');
  const onDutyTeams = rescueTeams.filter((t) => t.status !== 'Off Duty' && t.status !== 'Deleted');
  const inProgressCount = activeMissions.filter((m) => m.status === 'In Progress').length;
  const stockData = resourceUtil.map((r, i) => ({ ...r, fill: CATEGORY[i % CATEGORY.length] }));

  // ── Response time ────────────────────────────────────────────────
  const respAt = (i: number): number | null => responseTrend[i]?.response_min ?? responseTrend[i]?.responseMin ?? null;
  const latestResp = responseTrend.length > 0 ? respAt(responseTrend.length - 1) : null;
  const firstResp = responseTrend.length > 0 ? respAt(0) : null;
  const respDeltaPct = latestResp != null && firstResp != null && firstResp > 0 ? Math.round(((latestResp - firstResp) / firstResp) * 100) : null;

  const selectIncident = useCallback((inc: Incident) => setPickedIncident(inc), []);
  const clearIncident = useCallback(() => setPickedIncident(null), []);
  // The map's info card falls back to the most urgent incident.
  const mapIncident = pickedIncident ?? activeIncidents.reduce<Incident | null>(
    (top, i) => (top && (top.ai_priority_score ?? -1) >= (i.ai_priority_score ?? -1) ? top : i), null);
  const openIncident = useCallback((inc: Incident) => navigate(`/situational/incidents/${inc.id}`), [navigate]);

  return (
    <motion.div variants={DASHBOARD_ANIMATIONS.container} initial="hidden" animate="show"
      className="space-y-5 sm:space-y-6 max-w-[1400px] mx-auto overflow-x-hidden"
    >
      <motion.h1 variants={DASHBOARD_ANIMATIONS.item} className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
        EOC Command Center
      </motion.h1>

      {sensorAlerts.length > 0 && (
        <motion.button variants={DASHBOARD_ANIMATIONS.item} type="button" onClick={() => navigate('/situational/sensors')}
          className="w-full flex items-center gap-3 rounded-2xl border px-5 py-3 text-left cursor-pointer"
          style={{ background: DASH.criticalSoft, borderColor: DASH.critical, color: DASH.critical }}
        >
          <Waves size={18} aria-hidden="true" className="shrink-0" />
          <span className="flex-1 min-w-0 text-sm font-bold truncate">
            {sensorAlerts
              .map((node) => `${sensorName(node)} critical · ${sensorLevelCm(node, sensorNow)?.toFixed(1) ?? '--'} cm`)
              .join('  |  ')}
          </span>
          <ChevronRight size={18} aria-hidden="true" className="shrink-0" />
        </motion.button>
      )}

      {/* ─── Row 1: headline numbers ───────────────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item} className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        <DataRegion queries={[incidentsQuery]} label="Active Incidents"><StatCard title="Active Incidents" value={activeIncidents.length} icon={AlertTriangle} accent={ACCENT.incident}
          loading={incLoading}
          pill={criticalCount > 0 ? { text: `${criticalCount} critical`, tone: 'bad', trend: 'up' } : undefined}
        /></DataRegion>
        <DataRegion queries={[incidentsQuery]} label="People Affected"><StatCard title="People Affected" value={totalAffected.toLocaleString()} icon={Users} accent={ACCENT.people}
          loading={incLoading}
        /></DataRegion>
        <DataRegion queries={[teamsQuery]} label="Teams Deployed"><StatCard title="Teams Deployed" value={`${deployedTeams.length}/${onDutyTeams.length}`} icon={ShieldCheck} accent={ACCENT.team}
          loading={teamsLoading}
        /></DataRegion>
        <DataRegion queries={[missionsQuery, incidentsQuery]} label="Active Missions"><StatCard title="Active Missions" value={activeMissions.length} icon={Route} accent={ACCENT.mission}
          loading={misLoading}
          pill={inProgressCount > 0 ? { text: `${inProgressCount} in progress`, tone: 'neutral' } : undefined}
        /></DataRegion>
      </motion.div>

      {/* ─── Row 2: performance and supply. ── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item} className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
        <DataRegion queries={[responseTrendQuery]} label="Avg response time"><Panel title="Avg response time" bodyClassName="@container px-6 pb-6 flex-1"
          action={respDeltaPct != null ? (
            <TrendPill pill={respDeltaPct === 0
              ? { text: 'No change', tone: 'neutral' }
              : respDeltaPct < 0
                ? { text: `${Math.abs(respDeltaPct)}% lower`, tone: 'good', trend: 'down' }
                : { text: `${respDeltaPct}% higher`, tone: 'bad', trend: 'up' }} />
          ) : undefined}
        >
          {respLoading ? (
            <div className="flex flex-col @md:flex-row gap-4 @md:gap-5 h-full" aria-busy="true" aria-label="Loading response time">
              <div className="@md:w-36 shrink-0 flex flex-col justify-center gap-2">
                <Bone className="h-8 w-24" />
                <Bone className="h-2.5 w-28" />
              </div>
              <Bone className="h-[140px] flex-1 rounded-lg" />
            </div>
          ) : (
          <div className="flex flex-col @md:flex-row gap-4 @md:gap-5 h-full">
            <div className="@md:w-36 shrink-0 flex items-baseline @md:items-start @md:flex-col @md:justify-center gap-x-3 gap-y-1">
              <p className="text-3xl font-bold text-slate-900 tabular-nums">
                {latestResp != null ? latestResp : '–'}<span className="text-sm font-semibold text-slate-500 ml-1">min</span>
              </p>
              <p className="text-[11px] text-slate-400">{latestResp != null ? 'Latest · lower is better' : 'No measurements yet'}</p>
            </div>
            <div className="h-[140px] flex-1 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={responseTrend} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="resp-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={DASH.blue} stopOpacity={0.14} />
                      <stop offset="100%" stopColor={DASH.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={DASH.track} vertical={false} />
                  <XAxis dataKey="time" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={58} tickFormatter={(v) => `${v} min`} />
                  <Tooltip {...CHART_TOOLTIP} cursor={{ stroke: DASH.rule }} formatter={(v) => [`${v} min`, 'Response']} />
                  <Area type="monotone" dataKey="response_min" stroke={DASH.blue} strokeWidth={2}
                    fill="url(#resp-fill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}
        </Panel></DataRegion>

        <DataRegion queries={[utilizationQuery]} label="Supplies allocated"><Panel title="Supplies allocated" bodyClassName="@container px-6 pb-6 flex-1 flex flex-col justify-center">
          {stockLoading ? (
            <div className="flex flex-col items-center gap-4 @sm:flex-row @sm:gap-8" aria-busy="true" aria-label="Loading supplies">
              <Bone className="w-[120px] h-[120px] shrink-0" style={{ borderRadius: '50%' }} />
              <div className="w-full @sm:w-auto flex-1 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-3"><Bone className="h-3 w-2/3" /><Bone className="h-3 w-8" /></div>
                ))}
              </div>
            </div>
          ) : stockData.length === 0 ? (
            <p className="text-xs text-slate-400 py-6">No supplies or approved requests yet.</p>
          ) : (
            <>
            <div className="flex flex-col items-center gap-4 @sm:flex-row @sm:gap-8">
              <ConcentricRings data={stockData} active={stockHover} onActive={setStockHover} />
              <ul className="w-full @sm:w-auto flex-1 min-w-0 space-y-1" onMouseLeave={() => setStockHover(null)}>
                {stockData.map((s, i) => (
                  <li key={s.name} onMouseEnter={() => setStockHover(i)}
                    className={`flex items-center justify-between gap-3 text-xs rounded-md px-2 py-1 -mx-2 transition-colors cursor-default ${stockHover === i ? 'bg-slate-50' : ''}`}>
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.fill }} />
                      <span className="font-semibold text-slate-700 truncate">{s.name}</span>
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums shrink-0">
                      {stockHover === i ? <span className="font-medium text-slate-600">{ringUnits(s)}</span> : `${s.value}%`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-[11px] text-slate-400">% of each supply type sent to approved requests · hover for units</p>
            </>
          )}
        </Panel></DataRegion>
      </motion.div>

      {/* ─── Row 3: command view ─────────────────────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item}>
        <DataRegion queries={[incidentsQuery, teamsQuery]} label="Command view"><Panel title="Command view"
          action={<Segmented label="Command view" value={view} options={VIEWS} onChange={setView} />}
          bodyClassName="h-[340px] sm:h-[380px]"
        >
          {view === 'chain' ? (
            <ResponseChain
              incidents={activeIncidents}
              missions={activeMissions}
              teams={onDutyTeams}
              selectedIncidentId={pickedIncident?.id}
              onSelectIncident={selectIncident}
              onClearIncident={clearIncident}
            />
          ) : (
            <DashboardMap incidents={incidents} selectedIncident={mapIncident}
              onSelectIncident={openIncident} />
          )}
        </Panel></DataRegion>
      </motion.div>

      {/* ─── Row 4: AI priority ──────────────────────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item}>
        <DataRegion queries={[incidentsQuery]} label="AI priority score"><Panel title="AI priority score" action={<SeverityLegend />}>
          <PriorityList incidents={activeIncidents} selectedIncidentId={pickedIncident?.id} onSelectIncident={selectIncident} loading={incLoading} />
        </Panel></DataRegion>
      </motion.div>
    </motion.div>
  );
};

export default EOCCommandCenter;
