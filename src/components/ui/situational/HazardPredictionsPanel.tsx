import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CloudFog, CloudLightning, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useDismissPrediction, useHazardPredictions, useRunPredictionScan } from '../../../hooks';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { fmtNumber, fmtScore, fmtText, isNum, relativeTime } from '../../../utils/display';
import type { HazardPrediction } from '../../../types/intelligence';
import { AiSuggestion } from '../shared/AiSuggestion';

/**
 * Emerging-hazard predictions from the scheduled scan (GDACS alerts + CAMS
 * PM2.5 haze forecast). These are NOT incidents: nothing here has been reported
 * or verified, and nothing is dispatched from it. The panel is a single line
 * when nothing is predicted and only opens when there is something to review.
 */
export interface HazardPredictionsPanelProps {
  onPromoteToIncident?: (p: HazardPrediction) => void;
}

const PAGE = 5;

/** Score → accent: ≥ 80 red, ≥ 65 orange, otherwise amber. */
const tone = (score: number | null) =>
  score == null
    ? { bar: 'bg-slate-300', chip: 'bg-slate-100 text-slate-600 border-slate-200' }
    : score >= 80
      ? { bar: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-200' }
      : score >= 65
        ? { bar: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700 border-orange-200' }
        : { bar: 'bg-amber-400', chip: 'bg-amber-50 text-amber-800 border-amber-200' };

/** One-line headline signal per hazard type, from the scan's own signals. */
const headline = (p: HazardPrediction): string | null => {
  const s = p.signals ?? {};
  if (p.hazard_type === 'Haze' && isNum(s.peak_pm25_24h_ugm3 as number)) {
    const n = Array.isArray(s.districts_affected) ? s.districts_affected.length : 0;
    return `PM2.5 ${s.peak_pm25_24h_ugm3} µg/m³ (AQI ${s.peak_aqi}, ${s.aqi_category})${n > 1 ? ` · ${n} districts` : ''}`;
  }
  if (!s.alert_level) return null;
  // The measurement that corroborates this hazard (river for floods, gusts for
  // storms, fire weather for fires …), only when the scan retrieved it.
  const parts = [`GDACS ${String(s.alert_level)} alert`];
  if (isNum(s.river_peak_vs_today as number)) parts.push(`river flow peak ${s.river_peak_vs_today}× today`);
  if (isNum(s.max_gust_kmh as number)) parts.push(`gusts to ${Math.round(s.max_gust_kmh as number)} km/h`);
  if (isNum(s.hot_dry_hours as number)) parts.push(`${s.hot_dry_hours} hot-dry hours`);
  if (isNum(s.rain_past_7d_plus_forecast_mm as number)) parts.push(`${s.rain_past_7d_plus_forecast_mm} mm rain (7 d + forecast)`);
  if (isNum(s.rainfall_24h_mm as number)) parts.push(`${s.rainfall_24h_mm} mm rain / 24 h`);
  if (s.corroboration === 'none applicable') parts.push('no weather signal applies');
  return parts.join(' · ');
};

export const HazardPredictionsPanel: React.FC<HazardPredictionsPanelProps> = ({ onPromoteToIncident }) => {
  const { data: predictions = [], isLoading, isError, refetch, dataUpdatedAt } = useHazardPredictions();
  const dismiss = useDismissPrediction();
  const scan = useRunPredictionScan();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const canManage = hasPermission('MANAGE_INCIDENTS');
  const count = predictions.length;
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [showAll, setShowAll] = useState(false);

  // Triage order: highest score first. Group counts drive the filter chips.
  const sorted = [...predictions].sort((a, b) => (b.hazard_score ?? -1) - (a.hazard_score ?? -1));
  const types = Object.entries(
    sorted.reduce<Record<string, number>>((acc, p) => {
      const k = p.hazard_type || 'Other';
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const filtered = filter === 'All' ? sorted : sorted.filter((p) => (p.hazard_type || 'Other') === filter);
  const visible = showAll ? filtered : filtered.slice(0, PAGE);

  // Starts closed on every visit; the officer opens it when they want to review.

  const runScan = () =>
    scan.mutate(undefined, {
      onSuccess: (r) => {
        const res = r as { status?: string; written?: number; candidates?: number; expired?: number; reason?: string; haze_forecast_available?: boolean };
        if (res.status !== 'ok') {
          toast.warning('Scan not completed', res.reason ?? 'The prediction scan did not run.');
          return;
        }
        toast.success(
          'Hazard scan complete',
          `${res.candidates ?? 0} hazard(s) above threshold · ${res.written ?? 0} new/updated${res.expired ? ` · ${res.expired} cleared` : ''}${
            res.haze_forecast_available === false ? ' · air-quality forecast unavailable' : ''
          }`
        );
      },
      onError: (e) => toast.error('Scan failed', e instanceof Error ? e.message : 'Prediction scan failed'),
    });

  const handleDismiss = (id: string) =>
    dismiss.mutate(id, {
      onError: (e) => toast.error('Dismiss failed', e instanceof Error ? e.message : 'Could not dismiss the prediction.'),
    });

  const lead = sorted[0];
  const leadTone = tone(lead?.hazard_score ?? null);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="flex items-stretch">
        <span className={`w-1 shrink-0 ${count > 0 ? leadTone.bar : 'bg-emerald-400'}`} />
        <div className="flex-1 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => count > 0 && setOpen((v) => !v)}
            className={`flex items-center gap-2 min-w-0 text-left ${count > 0 ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {count > 0 ? (
              <CloudLightning size={16} className="text-orange-600 shrink-0" />
            ) : (
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            )}
            <span className="text-xs font-bold text-slate-900">Early-warning hazard predictions</span>
            <span className="text-[11px] text-slate-500 truncate">
              {isLoading
                ? 'Loading…'
                : isError
                  ? 'unavailable'
                  : count === 0
                    ? `None predicted${dataUpdatedAt ? ` · checked ${relativeTime(new Date(dataUpdatedAt).toISOString())}` : ''}`
                    : `${count} to review · highest: ${fmtText(lead.hazard_type, 'Hazard')}, ${fmtText(lead.state, '')}`}
            </span>
            {count > 0 && (open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />)}
          </button>
          <div className="flex items-center gap-2">
            {isError && (
              <button type="button" onClick={() => refetch()} className="text-[11px] font-bold text-amber-700 underline cursor-pointer">Retry</button>
            )}
            {canManage && (
              <button
                type="button"
                onClick={runScan}
                disabled={scan.isPending}
                title="Runs the hazard scan now (GDACS alerts + PM2.5 haze forecast). It also runs automatically every hour."
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                {scan.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Scan now
              </button>
            )}
          </div>
        </div>
      </div>

      {open && count > 0 && (
        <div className="border-t border-slate-100">
          {/* Filter by hazard type — counts make the mix visible at a glance */}
          {types.length > 1 && (
            <div className="px-4 pt-3 flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Filter by hazard">
              {[['All', count] as const, ...types].map(([t, n]) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={filter === t}
                  onClick={() => {
                    setFilter(t);
                    setShowAll(false);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                    filter === t ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {t} <span className={filter === t ? 'text-slate-300' : 'text-slate-400'}>{n}</span>
                </button>
              ))}
            </div>
          )}

          {/* One line per prediction, highest score first; details open in place */}
          <ul className="px-2 py-2">
            {visible.map((p) => {
              const t = tone(p.hazard_score);
              const isOpen = expanded === p.id;
              const line = headline(p);
              const when = isNum(p.projected_within_hours)
                ? p.projected_within_hours === 0 ? 'now' : `in ~${p.projected_within_hours} h`
                : 'timing unknown';
              return (
                <li key={p.id} className={`rounded-lg ${isOpen ? 'bg-slate-50' : ''}`}>
                  <div className="flex items-center gap-3 px-2 py-2">
                    <span className={`w-1 self-stretch rounded-full ${t.bar}`} aria-hidden />
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : p.id)}
                      aria-expanded={isOpen}
                      className="flex-1 min-w-0 text-left flex items-center gap-2 cursor-pointer"
                    >
                      {p.hazard_type === 'Haze' ? <CloudFog size={14} className="text-slate-500 shrink-0" /> : <CloudLightning size={14} className="text-slate-500 shrink-0" />}
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-900 truncate">
                          {fmtText(p.hazard_type, 'Hazard')} in {fmtText(p.district, 'unknown district')}{p.state ? `, ${p.state}` : ''}
                        </span>
                        <span className="block text-[11px] text-slate-500 truncate">
                          {when}{isNum(p.exposed_population) ? ` · ${fmtNumber(p.exposed_population)} people exposed` : ''}
                        </span>
                      </span>
                    </button>
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${t.chip}`} title="Hazard score (0–100)">
                      {fmtScore(p.hazard_score, 100, 'n/a')}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {canManage && (
                        <button
                          type="button"
                          disabled={dismiss.isPending}
                          onClick={() => handleDismiss(p.id)}
                          className="px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      )}
                      {onPromoteToIncident && (
                        <button
                          type="button"
                          onClick={() => onPromoteToIncident(p)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-900 hover:bg-slate-700 text-white cursor-pointer"
                        >
                          Create incident
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="pl-7 pr-3 pb-3 space-y-1.5 text-[11px]">
                      {line && <p className="font-semibold text-slate-700">{line}</p>}
                      {p.advisory && (
                        <AiSuggestion
                          headline={p.advisory}
                          basis="Written from the scan signals below"
                          className="max-w-prose"
                        />
                      )}
                      <p className="text-slate-400">
                        Confidence {fmtScore(p.confidence)}% · scanned {relativeTime(p.generated_at)} · version {p.version}
                      </p>
                      {p.evidence.map((e) => (
                        <p key={e.key} className="text-slate-500">
                          <span className={e.status === 'available' ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>{e.status}</span>
                          {' '}{e.source}{e.detail ? `: ${e.detail}` : ''}
                        </p>
                      ))}
                      {p.uncertainty.map((u, i) => (
                        <p key={i} className="text-slate-500 italic">{u}</p>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {filtered.length > PAGE && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 border-t border-slate-100 cursor-pointer"
            >
              {showAll ? 'Show top 5 only' : `Show ${filtered.length - PAGE} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
