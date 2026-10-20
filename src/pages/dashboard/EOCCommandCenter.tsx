import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Users, ShieldCheck, Route } from 'lucide-react';

import { Panel, StatCard, Segmented, ConcentricRings, TrendPill, ringUnits, Bone } from '../../components/ui/dashboard/Panel';
import { DashboardMap } from '../../components/ui/dashboard/DashboardMap';
import { ResponseChain } from '../../components/ui/dashboard/ResponseChain';
import { PriorityList } from '../../components/ui/dashboard/PriorityList';
import {
  useIncidents, useRescueTeams, useMissions, useKpiTrends,
  useSeverityDist, useResponseTrends, useTeamCapacity, useResourceUtilization,
} from '../../hooks';
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

// ─── Component ──────────────────────────────────────────────────────
const EOCCommandCenter: React.FC = () => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [view, setView] = useState<'map' | 'chain'>('map');
  const [stockHover, setStockHover] = useState<number | null>(null);
  const navigate = useNavigate();

  // ── API Data ───────────────────────────────────────────────────────
  const { data: incidents = [], isPending: incLoading } = useIncidents();
  const { data: rescueTeams = [], isPending: teamsLoading } = useRescueTeams();
  const { data: missions = [], isPending: misLoading } = useMissions();
  const { data: kpiTrends, isPending: kpiLoading } = useKpiTrends();
  const { data: severityDist = [] } = useSeverityDist();
  const { data: responseTrend = [], isPending: respLoading } = useResponseTrends();
  const { data: teamCapacity = [], isPending: capLoading } = useTeamCapacity();
  const { data: resourceUtil = [], isPending: stockLoading } = useResourceUtilization();

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
  const totalAffected = activeIncidents.reduce((sum, i) => sum + (i.affected_population || 0), 0);
  const deployedTeams = rescueTeams.filter((t) => (t.committed_personnel ?? 0) > 0 || t.status === 'Deployed' || t.status === 'En Route');
  const uniqueDistricts = Array.from(new Set(activeIncidents.map((i) => i.district || i.state).filter(Boolean)));
  const deployedAgencies = Array.from(new Set(deployedTeams.map((t) => t.agency))).join(', ');
  // Personnel-based utilisation from the SAME capacity rule as Rescue Operations
  // (backend capacity_service). Off-duty personnel are not deployable, so they are
  // excluded from the denominator.
  const capacityTotals = teamCapacity.reduce(
    (acc: { onDuty: number; deployed: number }, t: { deployed?: number; available?: number }) => ({
      onDuty: acc.onDuty + (t.deployed ?? 0) + (t.available ?? 0),
      deployed: acc.deployed + (t.deployed ?? 0),
    }),
    { onDuty: 0, deployed: 0 }
  );
  const capacityPct = capacityTotals.onDuty > 0 ? Math.round((capacityTotals.deployed / capacityTotals.onDuty) * 100) : 0;
  const onDutyTeams = rescueTeams.filter((t) => t.status !== 'Off Duty' && t.status !== 'Deleted');
  const offDutyTeamCount = rescueTeams.length - onDutyTeams.length;
  const inProgressCount = activeMissions.filter((m) => m.status === 'In Progress').length;
  const pendingCount = activeMissions.filter((m) => m.status === 'Pending').length;
  const severityLine = severityDist.filter((s) => s.value > 0 && s.name !== 'Critical').map((s) => `${s.value} ${s.name.toLowerCase()}`).join(' · ');
  // Per-category colours from the API are replaced by the dashboard's palette.
  const stockData = resourceUtil.map((r, i) => ({ ...r, fill: CATEGORY[i % CATEGORY.length] }));

  // Sparklines show NEW records per bucket (hour or day, chosen by the backend).
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

  // ── Response time ────────────────────────────────────────────────
  // No default response time is assumed: with no measurements the panel says so.
  const respAt = (i: number): number | null => responseTrend[i]?.response_min ?? responseTrend[i]?.responseMin ?? null;
  const latestResp = responseTrend.length > 0 ? respAt(responseTrend.length - 1) : null;
  const firstResp = responseTrend.length > 0 ? respAt(0) : null;
  const respDeltaPct = latestResp != null && firstResp != null && firstResp > 0 ? Math.round(((latestResp - firstResp) / firstResp) * 100) : null;

  const selectIncident = useCallback((inc: Incident) => setSelectedIncident(inc), []);
  const openIncident = useCallback((inc: Incident) => navigate(`/situational/incidents/${inc.id}`), [navigate]);

  return (
    <motion.div variants={DASHBOARD_ANIMATIONS.container} initial="hidden" animate="show"
      className="space-y-5 sm:space-y-6 max-w-[1400px] mx-auto overflow-x-hidden"
    >
      <motion.h1 variants={DASHBOARD_ANIMATIONS.item} className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
        EOC Command Center
      </motion.h1>

      {/* ─── Row 1: headline numbers with trends ─────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item} className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        <StatCard title="Active Incidents" value={activeIncidents.length} icon={AlertTriangle} accent={ACCENT.incident}
          loading={incLoading || kpiLoading}
          pill={criticalCount > 0 ? { text: `${criticalCount} critical`, tone: 'bad', trend: 'up' } : undefined}
          detail={severityLine || undefined}
          spark={{ data: kpiTrends?.incidents, labels: kpiTrends?.labels, kind: 'area', caption: sparkCaption('New') }}
        />
        <StatCard title="People Affected" value={totalAffected.toLocaleString()} icon={Users} accent={ACCENT.people}
          loading={incLoading || kpiLoading}
          detail={`Across ${uniqueDistricts.length} ${uniqueDistricts.length === 1 ? 'area' : 'areas'}`}
          spark={{ data: kpiTrends?.population, labels: kpiTrends?.labels, kind: 'bar', caption: sparkWindow ? `Running total · ${sparkWindow}` : undefined }}
        />
        <StatCard title="Teams Deployed" value={`${deployedTeams.length}/${onDutyTeams.length}`} icon={ShieldCheck} accent={ACCENT.team}
          loading={teamsLoading || capLoading}
          detail={[deployedAgencies, offDutyTeamCount > 0 ? `${offDutyTeamCount} off duty` : ''].filter(Boolean).join(' · ') || 'No teams deployed'}
          segments={teamCapacity.map((t) => ({ label: t.name, filled: t.deployed ?? 0, total: (t.deployed ?? 0) + (t.available ?? 0) }))}
          progressCaption={capacityTotals.onDuty > 0 ? `${capacityTotals.deployed} of ${capacityTotals.onDuty} on-duty crew deployed (${capacityPct}%)` : undefined}
        />
        <StatCard title="Active Missions" value={activeMissions.length} icon={Route} accent={ACCENT.mission}
          loading={misLoading || kpiLoading}
          pill={inProgressCount > 0 ? { text: `${inProgressCount} in progress`, tone: 'neutral' } : undefined}
          detail={`${pendingCount} queued`}
          spark={{ data: kpiTrends?.missions, labels: kpiTrends?.labels, kind: 'area', caption: sparkCaption('New') }}
        />
      </motion.div>

      {/* ─── Row 2: performance and supply. Two halves that line up with
           the four cards above (team capacity already lives on the Teams card). ── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item} className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
        <Panel title="Avg response time" bodyClassName="@container px-6 pb-6 flex-1"
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
        </Panel>

        {/* Share of each supply type assigned to approved requests (backend: resource utilisation). */}
        <Panel title="Supplies allocated" bodyClassName="@container px-6 pb-6 flex-1 flex flex-col justify-center">
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
        </Panel>
      </motion.div>

      {/* ─── Row 3: command view ─────────────────────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item}>
        <Panel title="Command view"
          action={<Segmented label="Command view" value={view} options={VIEWS} onChange={setView} />}
          bodyClassName="h-[340px] sm:h-[380px]"
        >
          {view === 'chain' ? (
            <ResponseChain
              incidents={activeIncidents}
              missions={activeMissions}
              teams={onDutyTeams}
              selectedIncidentId={selectedIncident?.id}
              onSelectIncident={selectIncident}
            />
          ) : (
            <DashboardMap incidents={incidents} selectedIncident={selectedIncident}
              onSelectIncident={openIncident} />
          )}
        </Panel>
      </motion.div>

      {/* ─── Row 4: AI priority ──────────────────────────────────────── */}
      <motion.div variants={DASHBOARD_ANIMATIONS.item}>
        <Panel title="AI priority score" action={<span className="text-[10px] font-medium text-slate-400">by incident, 0–100</span>}>
          <PriorityList incidents={activeIncidents} selectedIncidentId={selectedIncident?.id} onSelectIncident={selectIncident} loading={incLoading} />
        </Panel>
      </motion.div>
    </motion.div>
  );
};

export default EOCCommandCenter;
