import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BrainCircuit, Gauge, Activity, MapPin, FileText, ShieldCheck, Target, Users, HeartPulse, Route, Building2, type LucideIcon } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle } from 'react-leaflet';
import { useRescueTeams, useMissions, useIncidentLogs, useIncidentAssessment } from '../../../hooks';
import { LogDetailBody } from './LogDetailBody';
import type { FactField, Incident } from '../../../types';
import { formatDateTime } from '../../../utils/dateFormatter';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import { fmtNumber, isNum } from '../../../utils/display';
import { factState } from '../../../utils/facts';
import { Overlay, NAVY } from '../shared/Modal';
import { StatusTag, TONE, IconTile } from '../shared/Tag';
import { Bone } from '../dashboard/Panel';

interface SitrepPanelProps {
  incident: Incident | null;
  onClose: () => void;
  onViewFullAnalysis: (incident: Incident) => void;
}

const SEVERITY_HEX: Record<string, string> = { Critical: TONE.red, High: TONE.orange, Medium: TONE.amber, Low: TONE.slate };
const ON_NAVY_SEVERITY: Record<string, string> = { Critical: '#fca5a5', High: '#fdba74', Medium: '#fcd34d', Low: '#cbd5e1' };
const ON_NAVY_STATUS: Record<string, string> = { Unverified: '#fcd34d', Verified: '#93c5fd', Responding: '#67e8f9', Resolved: '#5eead4', Rejected: '#cbd5e1', Archived: '#cbd5e1' };

const OnNavyTag: React.FC<{ color: string; quiet?: boolean; children: React.ReactNode }> = ({ color, quiet, children }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${quiet ? 'text-slate-200 ring-1 ring-inset ring-white/15' : 'bg-white/10'}`}
    style={quiet ? undefined : { color }}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
    {children}
  </span>
);

/** One card per section: title, optional one-line description, content. No icons. */
/* Icon colours: every section icon uses the same blue (one family, no noise).
   Impact figures carry meaning instead: people indigo, casualties red (the only
   red), road access teal, infrastructure amber, each on a soft 8% wash. */
const Section: React.FC<{ title: string; icon: LucideIcon; desc?: string; count?: number; children: React.ReactNode }> = ({ title, icon: Icon, desc, count, children }) => (
  <section className="rounded-xl border border-slate-200/80 bg-white p-4">
    <div className="mb-3 pb-2.5 border-b border-slate-100">
      <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-700">
        <Icon size={14} strokeWidth={2.2} style={{ color: TONE.blue }} aria-hidden="true" />
        {title}
        {count != null && (
          <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums normal-case tracking-normal inline-flex items-center justify-center ${count > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
            {count}
          </span>
        )}
      </h3>
      {desc && <p className="text-[11px] text-slate-400 mt-0.5 pl-[22px]">{desc}</p>}
    </div>
    {children}
  </section>
);

/** Activity dot colour by what happened. */
const logColor = (action: string) => {
  const a = action.toLowerCase();
  if (a.includes('reject')) return TONE.red;
  if (a.includes('resolv') || a.includes('closed')) return TONE.teal;
  if (a.includes('verif')) return TONE.teal;
  if (a.includes('mission') || a.includes('team') || a.includes('dispatch')) return TONE.cyan;
  if (a.includes('resource')) return TONE.amber;
  if (a.includes('severity') || a.includes('updat')) return TONE.indigo;
  if (a.includes('creat')) return TONE.blue;
  return TONE.slate;
};

/** A reported figure, or "Not reported" when its provenance is unknown. */
const factText = (incident: Incident, field: FactField, fmt: (v: NonNullable<Incident[FactField]>) => string) => {
  const v = incident[field];
  return factState(incident, field) === 'unknown' || v === null || v === undefined ? null : fmt(v);
};

const SummaryTab: React.FC<{ incident: Incident }> = ({ incident }) => {
  const { data: rescueTeams = [] } = useRescueTeams();
  const { data: missions = [] } = useMissions();
  const { data: envelope, isLoading: assessmentLoading } = useIncidentAssessment(incident.id);
  // A run in progress or failed has no figure yet, so fall back to the last completed one.
  const estimatedVictims = [envelope?.current, envelope?.last_usable]
    .map((x) => x?.estimated_affected_population ?? x?.population?.estimated_exposed_population)
    .find(isNum) ?? null;
  const [lat, lng] = incident.coordinates || [4.2105, 101.9758];
  const assignedMissions = missions.filter((m) => m.incident_id === incident.id);
  const teamIds = new Set<string>();
  const teamNames = new Set<string>();
  assignedMissions.forEach((m) => {
    if (m.assigned_team_id) teamIds.add(m.assigned_team_id);
    (m.team_ids ?? []).forEach((id) => teamIds.add(id));
    if (m.team_name) teamNames.add(m.team_name.trim().toLowerCase());
  });
  const teams = rescueTeams.filter(
    (t) => t.status !== 'Deleted' && (teamIds.has(t.id) || teamIds.has(t.display_id) || teamNames.has(t.name.trim().toLowerCase()))
  );
  const score = isNum(incident.ai_priority_score) ? Math.round(incident.ai_priority_score) : null;
  const band = score == null ? TONE.slate : score >= 80 ? TONE.red : score >= 60 ? TONE.orange : TONE.blue;
  const figures = [
    { label: 'People Affected', Icon: Users, color: TONE.indigo, value: factText(incident, 'affected_population', (v) => Number(v).toLocaleString()) },
    { label: 'Casualties', Icon: HeartPulse, color: TONE.red, value: factText(incident, 'casualties_count', (v) => Number(v).toLocaleString()) },
    { label: 'Road Access', Icon: Route, color: TONE.teal, value: factText(incident, 'accessibility_score', (v) => `${v}/100`) },
    { label: 'Infrastructure Damage', Icon: Building2, color: TONE.amber, value: factText(incident, 'infrastructure_damage', (v) => String(v)) },
  ];

  return (
    <div className="space-y-3">
      <Section icon={Gauge} title="AI priority" desc="How urgent this is compared with other active incidents">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tabular-nums" style={{ color: score != null ? band : '#94a3b8' }}>{score ?? '—'}</span>
          <span className="text-sm text-slate-400">{score != null ? 'out of 100' : 'not scored yet'}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score ?? 0}%`, background: band }} />
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2.5">
          <IconTile color={TONE.indigo} size={28}><Users size={14} strokeWidth={2.2} /></IconTile>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-700">Estimated victims</p>
            <p className="text-[11px] text-slate-400">AI estimate of people exposed, not a confirmed count</p>
          </div>
          {assessmentLoading
            ? <Bone className="block h-5 w-14 shrink-0" />
            : estimatedVictims != null
              ? <span className="text-lg font-bold text-slate-900 tabular-nums shrink-0">~{fmtNumber(estimatedVictims)}</span>
              : <span className="text-xs font-medium text-slate-400 shrink-0">Not estimated yet</span>}
        </div>
      </Section>

      <Section icon={Activity} title="Impact" desc="As reported by officers on the ground">
        <dl className="grid grid-cols-2 gap-2">
          {figures.map(({ label, Icon, color, value }) => (
            <div key={label} className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5">
              <dt className="flex items-center gap-2 text-xs text-slate-500">
                <IconTile color={color} size={22}><Icon size={12} strokeWidth={2.2} /></IconTile>
                <span className="truncate">{label}</span>
              </dt>
              <dd className={`mt-0.5 tabular-nums truncate ${value ? 'text-lg font-bold text-slate-900' : 'text-sm font-medium text-slate-400'}`}>{value ?? 'Not reported'}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section icon={MapPin} title="Location" desc={`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`}>
        <div className="rounded-xl overflow-hidden border border-slate-200/80" style={{ height: 170 }}>
          <MapContainer key={incident.id} center={[lat, lng]} zoom={10} style={{ width: '100%', height: '100%' }} zoomControl={false} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <Circle center={[lat, lng]} radius={8000} fillColor={TONE.blue} fillOpacity={0.12} color={TONE.blue} weight={1.2} />
            <CircleMarker center={[lat, lng]} radius={7} fillColor={SEVERITY_HEX[incident.severity] ?? TONE.red} fillOpacity={1} color="#fff" weight={2}>
              <Tooltip direction="top"><span className="text-xs font-semibold">{incident.title}</span></Tooltip>
            </CircleMarker>
          </MapContainer>
        </div>
      </Section>

      {(incident.description || incident.weather_condition) && (
        <Section icon={FileText} title="Situation" desc={incident.weather_condition ? `Weather: ${incident.weather_condition}` : undefined}>
          {incident.description && <p className="text-[13px] text-slate-700 leading-relaxed">{incident.description.replace(/\*\*|__|#+\s/g, '')}</p>}
        </Section>
      )}

      <Section icon={ShieldCheck} title="Teams on scene" count={teams.length}>
        {teams.length === 0 ? (
          <p className="text-xs text-slate-400">No team assigned yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/80">
            {teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{t.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{t.agency} · {t.current_location}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-800 tabular-nums">{t.personnel_count} people</p>
                  <p className="text-[11px] text-slate-500">{t.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={Target} title="Missions" count={assignedMissions.length}>
        {assignedMissions.length === 0 ? (
          <p className="text-xs text-slate-400">No mission logged yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/80">
            {assignedMissions.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900">{m.title}</p>
                  {m.objective && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{m.objective}</p>}
                </div>
                <StatusTag status={m.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};

const dayKey = (iso?: string | null) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unknown';
};
const timeOf = (iso?: string | null) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
};

/** Activity grouped by day: a long log reads as a few short lists, newest first. */
const ActivityTab: React.FC<{ incident: Incident }> = ({ incident }) => {
  const { data: logs = [], isLoading } = useIncidentLogs(incident.id);
  if (isLoading) {
    return <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="space-y-1.5"><Bone className="h-3 w-2/3" /><Bone className="h-2.5 w-1/2" /></div>)}</div>;
  }
  if (logs.length === 0) return <p className="text-xs text-slate-400">No activity recorded yet.</p>;
  const groups: { day: string; items: typeof logs }[] = [];
  logs.forEach((log) => {
    const day = dayKey(log.logged_at);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(log);
    else groups.push({ day, items: [log] });
  });
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.day}>
          <p className="sticky top-0 z-10 -mx-1 px-1 py-1 bg-white text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            {g.day}<span className="text-slate-400 font-semibold normal-case tracking-normal">{g.items.length} event{g.items.length === 1 ? '' : 's'}</span>
          </p>
          <ol className="relative mt-2">
            {g.items.map((log, idx) => {
              const c = logColor(log.action);
              return (
                <li key={log.id ?? idx} className="relative pl-6 pb-3.5 last:pb-0">
                  {idx < g.items.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-slate-200" aria-hidden="true" />}
                  <span className="absolute left-0 top-1 w-[11px] h-[11px] rounded-full ring-4 ring-white" style={{ background: c }} aria-hidden="true" />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900">{log.action}</span>
                    <span className="text-[11px] text-slate-400 tabular-nums shrink-0">{timeOf(log.logged_at) || formatDateTime(log.logged_at)}</span>
                  </div>
                  <div className="mt-0.5 line-clamp-3"><LogDetailBody detail={log.detail} /></div>
                  <p className="mt-0.5 text-[11px] text-slate-400">{[log.actor, log.actor_agency].filter(Boolean).join(' · ') || 'EOC system'}</p>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
};

/** Situation report side panel, opened from a map marker or a search result. */
export const SitrepPanel: React.FC<SitrepPanelProps> = ({ incident, onClose, onViewFullAnalysis }) => {
  const [tab, setTab] = useState<'summary' | 'activity'>('summary');
  const navigate = useNavigate();

  useEffect(() => {
    if (!incident) return;
    setTab('summary');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [incident, onClose]);

  return (
    <Overlay>
      <AnimatePresence>
        {incident && (
          <motion.div key="sitrep" className="fixed inset-0 z-[55]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} aria-hidden="true" />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={`Situation Report: ${incident.title}`}
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-0 h-dvh w-full max-w-[460px] bg-white shadow-[-24px_0_60px_-24px_rgba(15,23,42,.35)] flex flex-col"
            >
              <header className="shrink-0 relative px-5 pt-5 pb-4 border-b border-slate-800 text-white" style={{ background: NAVY }}>
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: SEVERITY_HEX[incident.severity] ?? TONE.slate }} aria-hidden="true" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 tabular-nums">Situation Report · {incident.display_id || incident.id}</p>
                    <h2 className="text-lg font-bold text-white leading-snug mt-1">{incident.title}</h2>
                    <p className="text-[13px] text-slate-300 mt-1 truncate">{[incident.location, incident.district, incident.state].filter(Boolean).join(', ')}</p>
                    <div className="mt-3 flex items-center gap-1.5">
                      <OnNavyTag color={ON_NAVY_SEVERITY[incident.severity] ?? '#cbd5e1'}>{incident.severity}</OnNavyTag>
                      <OnNavyTag color={ON_NAVY_STATUS[incident.status] ?? '#cbd5e1'} quiet>{incident.status}</OnNavyTag>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="p-1.5 -mr-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              </header>

              <div className="shrink-0 px-5 py-3 border-b border-slate-100">
                <div role="tablist" className="grid grid-cols-2 bg-slate-100 rounded-lg p-0.5">
                  {([['summary', 'Summary'], ['activity', 'Activity']] as const).map(([id, label]) => {
                    const on = tab === id;
                    return (
                      <button key={id} role="tab" aria-selected={on} onClick={() => setTab(id)}
                        className={`relative py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${on ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
                        {on && <motion.span layoutId="sitrep-tab" className="absolute inset-0 bg-white rounded-md shadow-[0_1px_2px_rgba(15,23,42,.08)]" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} />}
                        <span className="relative">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto px-5 py-5 ${tab === 'summary' ? 'bg-slate-50/70' : ''}`}>
                {tab === 'summary' ? <SummaryTab incident={incident} /> : <ActivityTab incident={incident} />}
              </div>

              <footer className="shrink-0 px-5 py-3.5 border-t border-slate-100 flex items-center gap-2">
                {incident.status !== 'Unverified' && (
                  <button onClick={() => onViewFullAnalysis(incident)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <BrainCircuit size={13} style={{ color: TONE.indigo }} /> AI assessment
                  </button>
                )}
                <button onClick={() => { onClose(); navigate(`/situational/incidents/${incident.id}`); }}
                  className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
                  Open incident
                </button>
              </footer>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </Overlay>
  );
};
