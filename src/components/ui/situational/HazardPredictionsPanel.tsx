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
import { parseAdvisory, splitAdvisory } from '../../../utils/advisoryText';
import { formatDateTime } from '../../../utils/dateFormatter';

/** Said once under the context rows, rather than after each one. */
const CONTEXT_NOTE = /\s*Context only, not part of the score\.$/;

/** History behind the "historically …-prone" tag: context only, never part of the score. */
const historyText = (p: HazardPrediction): string => {
  const h = p.history;
  if (!h) return '';
  const where = h.scope === 'district' ? 'this district' : 'this state';
  const last = h.last_event_at ? `, latest ${relativeTime(h.last_event_at)}` : '';
  return `${h.confirmed_events} confirmed events in ${where} in the last ${h.years} years${last}. `;
};

/** JKM's open relief centres in this prediction's districts: context only, never the score. */
const reliefText = (p: HazardPrediction): string => {
  const r = p.relief_centres;
  if (!r?.open) return '';
  return `${r.open} relief centre${r.open === 1 ? '' : 's'} open · ${r.victims.toLocaleString()} victims${r.nearly_full ? ` · ${r.nearly_full} nearly full` : ''}`;
};

/** Official MET warning(s) behind the "MET warning" tag: context only, never part of the score. */
const warningText = (p: HazardPrediction): string =>
  (p.official_warnings ?? [])
    .map((w) => `${w.title} for ${w.districts?.join(', ') ?? 'the whole state'}${w.valid_to ? `, until ${formatDateTime(w.valid_to)}` : ''}`)
    .join('; ') + ' (MET Malaysia, official).';

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
/** Muted band colours for score bars and markers; the tag and figure carry the exact level. */
const BAR_COLOR: Partial<Record<Tone, string>> = { red: '#e3a5a5', orange: '#ecbd98', blue: '#a8c2ec' };
const barColor = (score: number | null) => BAR_COLOR[band(score).tone] ?? '#c3ccd8';
const confidenceWord = (c: number) => (c >= 75 ? 'high' : c >= 50 ? 'moderate' : 'low');

/** Score on a 0–100 scale with the three bands marked, and the model's confidence under it. */
const ScoreScale: React.FC<{ score: number | null; confidence: number | null }> = ({ score, confidence }) => {
  const b = band(score);
  const c = barColor(score);
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

const SOURCE_LABEL: Record<string, string> = {
  forecast: 'weather forecast',
  river: 'river flow',
  fire_satellite: 'satellite fire detections',
  air_quality: 'air-quality forecast',
  gdacs: 'GDACS alerts',
  jps_gauges: 'JPS river & rain gauges',
};

/** The scan's signals as labelled readings, each formatted with its unit. */
const readings = (p: HazardPrediction): { label: string; value: string }[] => {
  const s = p.signals ?? {};
  const n = (k: string) => (isNum(s[k] as number) ? (s[k] as number) : null);
  const out: { label: string; value: string }[] = [];
  const add = (label: string, v: number | null, fmt: (v: number) => string) => { if (v != null) out.push({ label, value: fmt(v) }); };
  if (s.alert_level) out.push({ label: 'GDACS alert', value: String(s.alert_level) });
  // Measured now by JPS gauges (not a forecast).
  if (s.basis === 'observed') out.push({ label: 'Basis', value: 'Measured now · JPS gauges' });
  if (s.worst_indicator) {
    out.push({
      label: 'River level',
      value: `${s.worst_indicator} · ${n('river_level_m')} m (alert ${n('alert_level_m')} m)`,
    });
    if (s.worst_station) out.push({ label: 'Station', value: String(s.worst_station) });
  }
  add('Stations at alert+', n('stations_at_alert'), (v) => String(v));
  add('Gauge rain, last hour', n('gauge_rain_last_hour_mm'), (v) => `${v} mm`);
  add('Gauge rain, today', n('gauge_rain_today_mm'), (v) => `${v} mm`);
  if (p.hazard_type === 'Haze') {
    add('PM2.5 (24 h peak)', n('peak_pm25_24h_ugm3'), (v) => `${v} µg/m³`);
    if (s.peak_aqi != null) out.push({ label: 'Air quality', value: `AQI ${s.peak_aqi}${s.aqi_category ? ` · ${s.aqi_category}` : ''}` });
  }
  add('Rain, 24 h', n('rainfall_24h_mm'), (v) => `${v} mm`);
  add('How rare (24 h)', n('rain_24h_return_period_years'), (v: number) => (v >= 1000 ? 'rarer than 1 in 1000 years' : v < 2 ? 'common here (under 1 in 2 years)' : `about 1 in ${Math.round(v)} years here`));
  add('Rain, 72 h', n('rainfall_72h_mm'), (v) => `${v} mm`);
  add('How rare (72 h)', n('rain_72h_return_period_years'), (v: number) => (v >= 1000 ? 'rarer than 1 in 1000 years' : v < 2 ? 'common here (under 1 in 2 years)' : `about 1 in ${Math.round(v)} years here`));
  add('Local 1-in-2-year day', n('rain_24h_1in2y_mm'), (v) => `${v} mm`);
  add('Heaviest hour', n('heaviest_hour_mm'), (v) => `${v} mm`);
  if (p.hazard_type === 'Landslide') add('Rain, past 7 days', n('rain_past_7d_mm'), (v) => `${v} mm`);
  add('Slope', n('slope_deg'), (v) => `${v}°`);
  if (typeof s.slope_basis === 'string') out.push({ label: 'Slope', value: s.slope_basis });
  add('Rain, 7 d + forecast', n('rain_past_7d_plus_forecast_mm'), (v) => `${v} mm`);
  add('Rain, past 30 days', n('rain_past_30d_mm'), (v) => `${v} mm`);
  add('River peak', n('river_peak_vs_today'), (v) => `${v}× today`);
  if (n('river_peak_m3s') != null) {
    out.push({ label: 'River peak', value: `${n('river_peak_m3s')} m³/s (2-year flood level ${n('river_1in2y_m3s')} m³/s)` });
  }
  add('How rare (river)', n('river_return_period_years'), (v: number) => (v >= 1000 ? 'rarer than 1 in 1000 years' : v < 2 ? 'common here (under 1 in 2 years)' : `about 1 in ${Math.round(v)} years here`));
  add('River vs usual', n('river_vs_usual'), (v) => `${Math.round(v * 100)}%`);
  add('River vs usual for the month', n('river_vs_month_median'), (v) => `${Math.round(v * 100)}%`);
  add('Driest-10% month here', n('rain_30d_dry_p10_mm'), (v) => `${v} mm in 30 days`);
  if (typeof s.threshold_basis === 'string') out.push({ label: 'Danger line', value: String(s.threshold_basis) });
  add('Wind gusts', n('max_gust_kmh'), (v) => `${Math.round(v)} km/h`);
  const fires = n('fire_detections_24h');
  if (fires != null && fires > 0) out.push({ label: 'Fire detections', value: `${fires} in 24 h` });
  add('Hot, dry hours', n('hot_dry_hours'), (v) => `${v} h`);
  const districts = Array.isArray(s.districts_affected) ? s.districts_affected.length : 0;
  // The per-district list replaces this count when the scan sent one.
  if (districts > 1 && !districtScores(p).length) out.push({ label: 'Districts affected', value: String(districts) });
  const points = n('rain_points_checked');
  if (points != null && points > 1 && typeof s.rain_point === 'string') {
    out.push({ label: 'Wettest point', value: s.rain_point === 'district centre' ? `district centre (of ${points} checked)` : `${s.rain_point} (of ${points} checked)` });
  }
  if (typeof s.river_point === 'string') out.push({ label: 'River read at', value: s.river_point });
  return out;
};

type DistrictScore = { district: string; score: number; population: number | null };

/** Each affected district with its own score, worst first (state-level warnings only). */
const districtScores = (p: HazardPrediction): DistrictScore[] => {
  const rows = p.signals?.district_scores;
  return Array.isArray(rows) ? (rows as DistrictScore[]).filter((r) => r && typeof r.district === 'string' && isNum(r.score)) : [];
};

type BacktestFigure = { band: string; alarms: number; followed_by_flood: number; region?: string; period?: string; source?: string; note?: string };

/** How often a flood alarm of this strength was followed by a recorded flood in the back-test. */
const backtestOf = (p: HazardPrediction): BacktestFigure | null => {
  const b = (p.signals ?? {}).backtest as BacktestFigure | undefined;
  return b && isNum(b.alarms) && b.alarms > 0 && isNum(b.followed_by_flood) ? b : null;
};

/** "administrative_areas" -> "Administrative areas" */
const sentence = (t: string) => { const c = (t ?? '').replace(/_/g, ' ').trim(); return c ? c.charAt(0).toUpperCase() + c.slice(1) : c; };

/** What else is known about this place: tag on the left, plain fact beside it. */
const ContextRows: React.FC<{ p: HazardPrediction }> = ({ p }) => {
  const items: { label: string; tone: Tone; text: string }[] = [
    ...(p.relief_centres?.open ? [{ label: 'JKM', tone: 'red' as Tone, text: reliefText(p) }] : []),
    ...(p.official_warnings?.length ? [{ label: 'MET warning', tone: 'red' as Tone, text: warningText(p) }] : []),
    ...(p.history?.label ? [{ label: p.history.label, tone: 'amber' as Tone, text: historyText(p) }] : []),
  ];
  if (!items.length) return null;
  return (
    <div>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
        {items.map((x) => (
          <React.Fragment key={x.label}>
            <dt><Tag tone={x.tone}>{x.label}</Tag></dt>
            <dd className="text-xs leading-relaxed text-slate-600 pt-0.5">{x.text.replace(CONTEXT_NOTE, '')}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
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
    .map(([k]) => {
      const note = scanStatus?.source_notes?.[k];
      return `${SOURCE_LABEL[k] ?? k}${note ? ` (${note})` : ''}`;
    });
  // When a scan we started finishes, refresh the list and report the result once.
  const watching = React.useRef(false);
  React.useEffect(() => {
    if (!watching.current || scanStatus?.running !== false) return;
    watching.current = false;
    qc.invalidateQueries({ queryKey: INTEL_KEYS.predictions });
    const r = scanStatus.result;
    if (r?.status === 'partial') {
      toast.warning(
        'Scan finished with gaps',
        `${r.written ?? 0} new/updated · ${(r.failed ?? []).length} could not be saved (${(r.failed ?? []).join(', ')}). Run it again to retry.`
      );
      return;
    }
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
                                    {(p.history?.label || !!p.official_warnings?.length || !!p.relief_centres?.open) && (
                                      <span className="flex flex-wrap gap-1.5 mt-1">
                                        {!!p.relief_centres?.open && <Tag tone="red" title={reliefText(p)}>JKM centres open</Tag>}
                                        {!!p.official_warnings?.length && <Tag tone="red" title={warningText(p)}>MET warning</Tag>}
                                        {p.history?.label && <Tag tone="amber" title={historyText(p)}>{p.history.label}</Tag>}
                                      </span>
                                    )}
                                  </span>
                                  <span className="flex flex-col items-end gap-1 w-14 shrink-0" title="Hazard score (0–100)">
                                    <span className="text-sm font-bold tabular-nums" style={{ color: (p.hazard_score ?? 0) >= 65 ? color : '#0f172a' }}>{isNum(p.hazard_score) ? p.hazard_score : 'n/a'}</span>
                                    <span className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                                      <span className="block h-full rounded-full" style={{ width: `${Math.min(100, p.hazard_score ?? 0)}%`, background: barColor(p.hazard_score) }} />
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

                            <ContextRows p={p} />

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

                            {p.district_profile && (
                              <div title={`${p.district_profile.source}: poverty ${p.district_profile.poverty_year}, population ${p.district_profile.population_year}. Context only; not part of the hazard score.`}>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Who's at risk here</p>
                                <dl className="grid grid-cols-3 gap-2">
                                  {[
                                    { label: p.district_profile.poverty_scope === 'state' ? 'Poverty (state)' : 'In poverty', value: p.district_profile.poverty_pct },
                                    { label: 'Aged 65+', value: p.district_profile.age_65_plus_pct },
                                    { label: 'Under 5', value: p.district_profile.under_5_pct },
                                  ].map((x) => (
                                    <div key={x.label} className="rounded-xl bg-slate-50 px-3 py-2.5 min-w-0">
                                      <dt className="text-[11px] text-slate-500 truncate">{x.label}</dt>
                                      <dd className="text-sm font-semibold text-slate-900 mt-0.5 tabular-nums">{x.value}%</dd>
                                    </div>
                                  ))}
                                </dl>
                                {/* <p className="mt-1.5 text-[10px] text-slate-400">{p.district_profile.source}</p> */}
                              </div>
                            )}

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

                            {(() => {
                              const ds = districtScores(p);
                              return ds.length > 0 && (
                                <div>
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Districts</p>
                                  <dl className="rounded-xl border border-slate-200/80 divide-y divide-slate-100">
                                    {ds.map((d) => (
                                      <div key={d.district} className="flex items-center justify-between gap-3 px-3.5 py-2">
                                        <dt className="text-xs text-slate-700">{d.district}</dt>
                                        <dd className="text-xs text-slate-500 tabular-nums">
                                          {isNum(d.population) && <span className="mr-3">{fmtNumber(d.population)} people</span>}
                                          <span className="font-semibold text-slate-900">{Math.round(d.score)}</span>
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                              );
                            })()}

                            {(() => {
                              const b = backtestOf(p);
                              return b && (
                                <p className="text-xs text-slate-600 leading-relaxed rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5"
                                  title={[b.source, b.note].filter(Boolean).join('. ')}>
                                  <span className="font-semibold text-slate-900">Track record: </span>
                                  in {b.region ?? 'the back-test'} ({b.period}), {b.followed_by_flood} of {b.alarms} alarms {b.band} were
                                  followed by a recorded flood within 3 days ({Math.round((100 * b.followed_by_flood) / b.alarms)}%).
                                </p>
                              );
                            })()}

                            {a && (
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">AI advisory</p>
                                  {/* <span className="text-[11px] text-slate-400" title="Written from the readings above. An officer decides.">Suggestion only</span> */}
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
                                            {summary.map((x, i) => <FormattedMessageText key={i} text={x} />)}
                                          </div>
                                        )}
                                        {actions.length > 0 && (
                                          <div className="mt-3">
                                            <p className="text-xs font-semibold text-slate-800 mb-1.5">Suggested actions</p>
                                            <ul className="space-y-1.5">
                                              {actions.map((x, i) => (
                                                <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-700">
                                                  <CheckCircle2 size={14} className="shrink-0 mt-[3px]" style={{ color: TONE.blue }} />
                                                  <span className="min-w-0"><FormattedMessageText text={x} /></span>
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
