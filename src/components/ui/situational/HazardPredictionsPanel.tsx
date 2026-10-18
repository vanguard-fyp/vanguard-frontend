import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, ChevronLeft, ChevronRight, CloudFog, CloudLightning, CloudRain, Flame, Loader2, Mountain, RefreshCw, Sun, Waves, Wind,
  CheckCircle2, CircleDashed, X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDismissPrediction, useHazardPredictions, useRunPredictionScan } from '../../../hooks';
import { INTEL_KEYS, usePredictionScanStatus } from '../../../hooks/useIntelligence';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { fmtNumber, fmtText, isNum, relativeTime } from '../../../utils/display';
import type { HazardPrediction } from '../../../types/intelligence';
import { IconTile, LevelTag, Tag, TONE, type Tone } from '../shared/Tag';
import { NavyIcon, Overlay } from '../shared/Modal';
import { FormattedMessageText } from '../../../utils/messageFormatter';

/**
 * Emerging-hazard predictions from the scheduled scan: the forecast watch
 * (flood, flash flood, landslide, storm, fire, drought at every district),
 * the PM2.5 haze forecast and GDACS alerts near Malaysia. These are NOT incidents: nothing here has been reported
 * or verified, and nothing is dispatched from it.
 *
 * Shown in a side drawer opened from the page header, so it never takes space
 * from the incident list.
 */
/** Risk band from the hazard score: red only at 80+, orange from 65, otherwise the app's blue. */
const band = (score: number | null): { tone: Tone; label: string } =>
  score == null ? { tone: 'slate', label: 'Unscored' }
    : score >= 80 ? { tone: 'red', label: 'High risk' }
      : score >= 65 ? { tone: 'orange', label: 'Elevated' }
        : { tone: 'blue', label: 'Watch' };
const scoreColor = (score: number | null) => TONE[band(score).tone];
const confidenceWord = (c: number) => (c >= 75 ? 'high' : c >= 50 ? 'moderate' : 'low');

/** Score on a 0–100 scale with the three bands marked, and the model's confidence under it. */
const ScoreScale: React.FC<{ score: number | null; confidence: number | null }> = ({ score, confidence }) => {
  const b = band(score);
  const c = TONE[b.tone];
  return (
    <div className="rounded-xl border border-slate-200/80 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-slate-500">Hazard score</p>
          <p className="text-[28px] font-bold leading-none tabular-nums mt-1 text-slate-900">
            {isNum(score) ? score : 'n/a'}<span className="text-sm font-semibold text-slate-400"> /100</span>
          </p>
        </div>
        <Tag tone={b.tone}>{b.label}</Tag>
      </div>
      <div className="mt-4">
        <div className="relative h-3.5 flex items-center">
          <div className="flex w-full h-1.5 rounded-full overflow-hidden">
            <span className="bg-blue-100" style={{ width: '65%' }} />
            <span className="bg-orange-100" style={{ width: '15%' }} />
            <span className="bg-red-100" style={{ width: '20%' }} />
          </div>
          {isNum(score) && (
            <span className="absolute top-0 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow"
              style={{ left: `${Math.min(97, Math.max(3, score))}%`, background: c }} />
          )}
        </div>
        <div className="relative h-4 mt-2 text-[10px] text-slate-400">
          <span className="absolute left-0">Watch</span>
          <span className="absolute -translate-x-1/2" style={{ left: '72.5%' }}>Elevated</span>
          <span className="absolute right-0">High</span>
        </div>
      </div>
      {isNum(confidence) && (
        <p className="mt-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
          Confidence <span className="font-semibold text-slate-800 tabular-nums">{confidence}%</span> · {confidenceWord(confidence)}
        </p>
      )}
    </div>
  );
};

const HAZARD_ICON: Record<string, typeof Waves> = {
  Haze: CloudFog,
  Flood: Waves,
  'Flash Flood': CloudRain,
  Landslide: Mountain,
  'Severe Storm': Wind,
  'Tropical Cyclone': Wind,
  'Forest Fire': Flame,
  'Forest Fire / Wildfire': Flame,
  Drought: Sun,
  Earthquake: Activity,
};
const iconFor = (t?: string | null) => HAZARD_ICON[t ?? ''] ?? CloudLightning;

/** Same hues as the disaster-type filter chips on the incident page. */
const HAZARD_COLOR: Record<string, string> = {
  Flood: '#2563eb',
  'Flash Flood': '#0891b2',
  Landslide: '#d97706',
  'Forest Fire': '#dc2626',
  'Forest Fire / Wildfire': '#dc2626',
  'Severe Storm': '#9333ea',
  'Tropical Cyclone': '#9333ea',
  Haze: '#4f46e5',
  Earthquake: '#e11d48',
  Drought: '#f97316',
};
const hazardColor = (t?: string | null) => HAZARD_COLOR[t ?? ''] ?? '#64748b';

/** Split an advisory body into a short summary and the actions it recommends,
 *  so a long AI paragraph reads as a few lines and a checklist. */
const ACTION_WORDS = /\b(should|must|need to|needs to|recommend|advise|ensure|evacuate|restrict|establish|prepare|monitor|deploy|issue|activate|avoid|close)\b/i;
const splitAdvisory = (body: string): { summary: string[]; actions: string[] } => {
  const sentences = body
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((x) => x.trim())
    .filter(Boolean);
  const summary: string[] = [];
  const actions: string[] = [];
  sentences.forEach((x, i) => (i > 0 && ACTION_WORDS.test(x) ? actions : summary).push(x));
  // Long action sentences that list several steps ("restrict travel, open shelters and …") stay whole.
  return { summary, actions };
};

const SOURCE_LABEL: Record<string, string> = {
  forecast: 'weather forecast',
  river: 'river flow',
  fire_satellite: 'satellite fire detections',
  air_quality: 'air-quality forecast',
  gdacs: 'GDACS alerts',
};

/** The scan's signals as labelled readings, each formatted with its unit. */
const readings = (p: HazardPrediction): { label: string; value: string }[] => {
  const s = p.signals ?? {};
  const n = (k: string) => (isNum(s[k] as number) ? (s[k] as number) : null);
  const out: { label: string; value: string }[] = [];
  const add = (label: string, v: number | null, fmt: (v: number) => string) => { if (v != null) out.push({ label, value: fmt(v) }); };
  if (s.alert_level) out.push({ label: 'GDACS alert', value: String(s.alert_level) });
  if (p.hazard_type === 'Haze') {
    add('PM2.5 (24 h peak)', n('peak_pm25_24h_ugm3'), (v) => `${v} µg/m³`);
    if (s.peak_aqi != null) out.push({ label: 'Air quality', value: `AQI ${s.peak_aqi}${s.aqi_category ? ` · ${s.aqi_category}` : ''}` });
  }
  add('Rain, 24 h', n('rainfall_24h_mm'), (v) => `${v} mm`);
  add('Rain, 72 h', n('rainfall_72h_mm'), (v) => `${v} mm`);
  add('Heaviest hour', n('heaviest_hour_mm'), (v) => `${v} mm`);
  if (p.hazard_type === 'Landslide') add('Rain, past 7 days', n('rain_past_7d_mm'), (v) => `${v} mm`);
  add('Rain, 7 d + forecast', n('rain_past_7d_plus_forecast_mm'), (v) => `${v} mm`);
  add('Rain, past 30 days', n('rain_past_30d_mm'), (v) => `${v} mm`);
  add('River peak', n('river_peak_vs_today'), (v) => `${v}× today`);
  add('River vs usual', n('river_vs_usual'), (v) => `${Math.round(v * 100)}%`);
  add('Wind gusts', n('max_gust_kmh'), (v) => `${Math.round(v)} km/h`);
  const fires = n('fire_detections_24h');
  if (fires != null && fires > 0) out.push({ label: 'Fire detections', value: `${fires} in 24 h` });
  add('Hot, dry hours', n('hot_dry_hours'), (v) => `${v} h`);
  const districts = Array.isArray(s.districts_affected) ? s.districts_affected.length : 0;
  if (districts > 1) out.push({ label: 'Districts affected', value: String(districts) });
  return out;
};

/** "administrative_areas" -> "Administrative areas" */
const sentence = (t: string) => { const c = (t ?? '').replace(/_/g, ' ').trim(); return c ? c.charAt(0).toUpperCase() + c.slice(1) : c; };

/**
 * The scan's advisory arrives as one markdown-ish string:
 * "**Title** Body … Recommended disaster level: Level 1: District".
 * Split it into a heading, readable body and the recommended level.
 */
const parseAdvisory = (text: string) => {
  let body = text.trim();
  let title: string | null = null;
  const t = body.match(/^\*\*(.+?)\*\*\s*/);
  if (t) {
    title = t[1].trim().replace(/:$/, '');
    body = body.slice(t[0].length);
  }
  let level: string | null = null;
  const l = body.match(/\s*Recommended disaster level:\s*(.+?)\.?\s*$/i);
  if (l) {
    level = l[1].trim();
    body = body.slice(0, l.index).trim();
  }
  return { title, body, level };
};

/** Header button that opens the drawer: count, plus how many are high risk. */
export const EarlyWarningsTrigger: React.FC<{ onClick: () => void; active?: boolean }> = ({ onClick, active }) => {
  const { data: predictions = [], isLoading } = useHazardPredictions();
  const count = predictions.length;
  const urgent = predictions.filter((p) => (p.hazard_score ?? 0) >= 80).length;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`relative flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer
        ${active ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
    >
      <IconTile color={urgent > 0 ? TONE.red : TONE.blue} size={24}><CloudLightning size={13} strokeWidth={2.2} /></IconTile>
      Early warnings
      {!isLoading && (
        <span className="min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums flex items-center justify-center"
          style={urgent > 0 ? { color: TONE.red, background: `${TONE.red}14` } : { color: '#475569', background: '#f1f5f9' }}>
          {count}
        </span>
      )}
    </button>
  );
};

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  onPromoteToIncident?: (p: HazardPrediction) => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Early warnings in a side drawer: the list, and one hazard at a time as its
 * own screen (Back returns to the list). No nested dropdowns.
 */
export const HazardPredictionsDrawer: React.FC<DrawerProps> = ({ open, onClose, onPromoteToIncident }) => {
  const { data: predictions = [], isLoading, isError, refetch, dataUpdatedAt } = useHazardPredictions();
  const dismiss = useDismissPrediction();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const scan = useRunPredictionScan();
  const { data: scanStatus } = usePredictionScanStatus();
  const qc = useQueryClient();
  const scanning = scan.isPending || !!scanStatus?.running;
  const downSources = Object.entries(scanStatus?.sources ?? {})
    .filter(([, ok]) => ok === false)
    .map(([k]) => SOURCE_LABEL[k] ?? k);
  // When a scan we started finishes, refresh the list and report the result once.
  const watching = React.useRef(false);
  React.useEffect(() => {
    if (!watching.current || scanStatus?.running !== false) return;
    watching.current = false;
    qc.invalidateQueries({ queryKey: INTEL_KEYS.predictions });
    const r = scanStatus.result;
    if (!r || r.status !== 'ok') {
      toast.warning('Scan not completed', r?.reason ?? 'The prediction scan did not finish.');
      return;
    }
    toast.success(
      'Hazard scan complete',
      `${r.candidates ?? 0} hazard(s) found · ${r.written ?? 0} new/updated${r.expired ? ` · ${r.expired} cleared` : ''}`
    );
  }, [scanStatus, qc, toast]);
  const canManage = hasPermission('MANAGE_INCIDENTS');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');

  // Escape: back from a hazard first, then close.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedId) setSelectedId(null); else onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, selectedId, onClose]);

  const sorted = [...predictions].sort((a, b) => (b.hazard_score ?? -1) - (a.hazard_score ?? -1));
  const types = Object.entries(
    sorted.reduce<Record<string, number>>((acc, p) => {
      const k = p.hazard_type || 'Other';
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const filtered = filter === 'All' ? sorted : sorted.filter((p) => (p.hazard_type || 'Other') === filter);
  const selected = selectedId ? predictions.find((p) => p.id === selectedId) ?? null : null;
  const urgent = sorted.filter((p) => (p.hazard_score ?? 0) >= 80).length;
  const checked = dataUpdatedAt ? relativeTime(new Date(dataUpdatedAt).toISOString()) : null;

  const runScan = () =>
    scan.mutate(undefined, {
      onSuccess: () => { watching.current = true; },
      onError: (e) => toast.error('Scan failed', e instanceof Error ? e.message : 'Prediction scan failed'),
    });

  const handleDismiss = (id: string) =>
    dismiss.mutate(id, {
      onSuccess: () => { setSelectedId(null); toast.success('Warning cleared', 'Marked as no action needed.'); },
      onError: (e) => toast.error('Could not clear the warning', e instanceof Error ? e.message : 'Please try again.'),
    });

  const whenText = (p: HazardPrediction) =>
    isNum(p.projected_within_hours) ? (p.projected_within_hours === 0 ? 'Now' : `In about ${p.projected_within_hours} h`) : 'Timing unknown';

  return (
    <Overlay>
    <AnimatePresence>
      {open && (
        <motion.div key="ew" className="fixed inset-0 z-[55]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} aria-hidden="true" />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Early warnings"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ duration: 0.32, ease }}
            className="absolute right-0 top-0 h-dvh w-full max-w-[460px] bg-white shadow-[-24px_0_60px_-24px_rgba(15,23,42,.35)] flex flex-col"
          >
            {/* Header (sidebar navy) */}
            <header className="px-5 py-4 text-white flex items-center justify-between gap-3 shrink-0" style={{ background: '#1e293b' }}>
              <div className="flex items-center gap-3 min-w-0">
              <NavyIcon icon={CloudLightning} />
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold">Early warnings</h2>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {isLoading ? 'Loading…' : isError ? 'Unavailable right now' : predictions.length === 0
                    ? `No hazards predicted${checked ? ` · checked ${checked}` : ''}`
                    : `${predictions.length} forecast hazards${urgent ? ` · ${urgent} high risk` : ''} · not incidents yet`}
                </p>
              </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {canManage && (
                  <button type="button" onClick={runScan} disabled={scanning}
                    title="Checks every district's forecast (rain, river, wind, fire, drought, haze) and GDACS alerts now. It also runs automatically."
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 disabled:opacity-50 cursor-pointer">
                    {scanning ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    {scanning ? 'Scanning…' : 'Scan now'}
                  </button>
                )}
                <button type="button" onClick={onClose} aria-label="Close early warnings"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
            </header>
            {downSources.length > 0 && (
              <p className="px-5 py-2 text-[11px] text-amber-800 shrink-0" style={{ background: `${TONE.amber}12` }}>Last scan ran without {downSources.join(', ')}.</p>
            )}

            <div className="relative flex-1 min-h-0 overflow-hidden">
              <AnimatePresence initial={false} mode="popLayout">
                {!selected ? (
                  /* ── List ── */
                  <motion.div key="list" className="absolute inset-0 flex flex-col"
                    initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.22, ease }}>
                    {types.length > 1 && (
                      <div className="px-5 pt-4 pb-3 flex items-center gap-1.5 flex-wrap shrink-0" role="tablist" aria-label="Filter by hazard">
                        {[['All', sorted.length] as const, ...types].map(([t, n]) => {
                          const TIcon = t === 'All' ? null : iconFor(t);
                          return (
                            <button key={t} type="button" role="tab" aria-selected={filter === t} onClick={() => setFilter(t)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${filter === t ? 'bg-[#1e293b] text-white' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}>
                              {TIcon && <TIcon size={13} style={{ color: hazardColor(t) }} />}
                              {t} <span className="text-slate-400">{n}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto">
                      {isError ? (
                        <p className="p-5 text-sm text-slate-600">Predictions could not be loaded. <button onClick={() => refetch()} className="font-semibold text-blue-600 cursor-pointer">Retry</button></p>
                      ) : isLoading ? (
                        <div className="p-5 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}</div>
                      ) : filtered.length === 0 ? (
                        <div className="p-10 text-center">
                          <p className="text-sm font-semibold text-slate-700">Nothing predicted right now</p>
                          <p className="text-xs text-slate-400 mt-1">The scan runs automatically; use Scan now to check again.</p>
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-100 border-t border-slate-100">
                          {filtered.map((p) => {
                            const color = scoreColor(p.hazard_score);
                            const Icon = iconFor(p.hazard_type);
                            return (
                              <li key={p.id}>
                                <button type="button" onClick={() => setSelectedId(p.id)}
                                  className="group w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600">
                                  <IconTile color={hazardColor(p.hazard_type)}><Icon size={16} strokeWidth={2} /></IconTile>
                                  <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold text-slate-900 truncate">
                                      {fmtText(p.hazard_type, 'Hazard')} · {fmtText(p.district, 'Unknown district')}
                                    </span>
                                    <span className="block text-xs text-slate-500 truncate mt-0.5">
                                      {p.state ? `${p.state} · ` : ''}{whenText(p)}{isNum(p.exposed_population) ? ` · ${fmtNumber(p.exposed_population)} exposed` : ''}
                                    </span>
                                  </span>
                                  <span className="flex flex-col items-end gap-1 w-14 shrink-0" title="Hazard score (0–100)">
                                    <span className="text-sm font-bold tabular-nums" style={{ color: (p.hazard_score ?? 0) >= 65 ? color : '#0f172a' }}>{isNum(p.hazard_score) ? p.hazard_score : 'n/a'}</span>
                                    <span className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                                      <span className="block h-full rounded-full" style={{ width: `${Math.min(100, p.hazard_score ?? 0)}%`, background: color }} />
                                    </span>
                                  </span>
                                  <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  /* ── One hazard ── */
                  <motion.div key={selected.id} className="absolute inset-0 flex flex-col"
                    initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.22, ease }}>
                    <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 space-y-5">
                      <button type="button" onClick={() => setSelectedId(null)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer">
                        <ChevronLeft size={15} /> All warnings
                      </button>

                      {(() => {
                        const p = selected;
                        const Icon = iconFor(p.hazard_type);
                        const rs = readings(p);
                        const a = p.advisory ? parseAdvisory(p.advisory) : null;
                        return (
                          <>
                            <div className="flex items-start gap-3">
                              <IconTile color={hazardColor(p.hazard_type)} size={42}><Icon size={20} strokeWidth={2} /></IconTile>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                                  {fmtText(p.hazard_type, 'Hazard')} · {fmtText(p.district, 'Unknown district')}
                                </h3>
                                {p.state && <p className="text-xs text-slate-500 mt-0.5">{p.state}</p>}
                              </div>
                            </div>

                            <dl className="grid grid-cols-2 gap-2">
                              <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
                                <dt className="text-[11px] text-slate-500">Expected</dt>
                                <dd className="text-sm font-semibold text-slate-900 mt-0.5">{whenText(p)}</dd>
                              </div>
                              <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
                                <dt className="text-[11px] text-slate-500">People exposed</dt>
                                <dd className="text-sm font-semibold text-slate-900 mt-0.5 tabular-nums">{isNum(p.exposed_population) ? fmtNumber(p.exposed_population) : 'Not estimated'}</dd>
                              </div>
                            </dl>

                            <ScoreScale score={p.hazard_score} confidence={p.confidence} />

                            {rs.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Readings</p>
                                <dl className="rounded-xl border border-slate-200/80 divide-y divide-slate-100">
                                  {rs.map((r) => (
                                    <div key={r.label} className="flex items-center justify-between gap-3 px-3.5 py-2">
                                      <dt className="text-xs text-slate-500">{r.label}</dt>
                                      <dd className="text-xs font-semibold text-slate-900 tabular-nums">{r.value}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>
                            )}

                            {a && (
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">AI advisory</p>
                                  <span className="text-[11px] text-slate-400" title="Written from the readings above. An officer decides.">Suggestion only</span>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 px-4 py-3.5">
                                  {a.title && <p className="text-sm font-semibold text-slate-900 mb-2">{a.title}</p>}
                                  {(() => {
                                    const { summary, actions } = splitAdvisory(a.body);
                                    if (!summary.length && !actions.length) {
                                      return <div className="text-[13px] leading-relaxed text-slate-700"><FormattedMessageText text={a.body} /></div>;
                                    }
                                    return (
                                      <>
                                        {summary.length > 0 && (
                                          <div className="space-y-2 text-[13px] leading-relaxed text-slate-700">
                                            {summary.map((x, i) => <p key={i}>{x}</p>)}
                                          </div>
                                        )}
                                        {actions.length > 0 && (
                                          <div className="mt-3">
                                            <p className="text-xs font-semibold text-slate-800 mb-1.5">Suggested actions</p>
                                            <ul className="space-y-1.5">
                                              {actions.map((x, i) => (
                                                <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-700">
                                                  <CheckCircle2 size={14} className="shrink-0 mt-[3px]" style={{ color: TONE.blue }} />
                                                  <span>{x}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                  {a.level && (
                                    <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
                                      <span className="text-xs text-slate-500">Recommended level</span>
                                      <LevelTag level={a.level} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {p.evidence.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Sources</p>
                                <ul className="space-y-2">
                                  {p.evidence.map((e) => {
                                    const ok = e.status === 'available';
                                    return (
                                      <li key={e.key} className="flex items-start gap-2 text-xs">
                                        {ok
                                          ? <CheckCircle2 size={14} className="shrink-0 mt-px" style={{ color: TONE.teal }} />
                                          : <CircleDashed size={14} className="shrink-0 mt-px text-slate-400" />}
                                        <span className="min-w-0">
                                          <span className="font-semibold text-slate-800">{sentence(e.source)}</span>
                                          {!ok && <span className="text-slate-400"> · {e.status}</span>}
                                          {e.detail && <span className="block text-slate-500">{sentence(e.detail)}</span>}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}

                            {p.uncertainty.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Limits</p>
                                <ul className="space-y-1.5 list-disc pl-4 marker:text-slate-300">
                                  {p.uncertainty.map((u, i) => <li key={i} className="text-xs text-slate-600 leading-relaxed">{sentence(u)}</li>)}
                                </ul>
                              </div>
                            )}

                            <p className="text-[11px] text-slate-400">Scanned {relativeTime(p.generated_at)} · version {p.version}</p>
                          </>
                        );
                      })()}
                    </div>

                    {/* Actions stay in reach */}
                    {(canManage || onPromoteToIncident) && (
                      <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 bg-white">
                        {canManage && (
                          <button type="button" disabled={dismiss.isPending} onClick={() => handleDismiss(selected.id)}
                            title="Removes this warning from the list. Use it when no response is needed."
                            className="mr-auto px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-50">
                            {dismiss.isPending ? 'Clearing…' : 'No action needed'}
                          </button>
                        )}
                        {onPromoteToIncident && (
                          <button type="button" onClick={() => { onPromoteToIncident(selected); onClose(); }}
                            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
                            Create incident
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
    </Overlay>
  );
};
