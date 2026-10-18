import React from 'react';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, Tooltip } from 'recharts';
import { DASH } from '../../../constants/dashboard';

/* ============================================================
   Dashboard building blocks. One container (white, 16px corner,
   hairline border, no shadow), the operations app's type (bold
   uppercase labels, heavy figures), one blue for data.
   ============================================================ */

interface PanelProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const Panel: React.FC<PanelProps> = ({ title, action, children, className = '', bodyClassName = '' }) => (
  <section className={`bg-white rounded-2xl border border-slate-200/80 flex flex-col min-w-0 ${className}`}>
    <header className="flex items-center justify-between gap-3 px-6 pt-5 pb-4">
      <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">{title}</h2>
      {action}
    </header>
    <div className={`min-h-0 ${bodyClassName}`}>{children}</div>
  </section>
);

/** Placeholder block shown while data loads. */
export const Bone: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <span className={`dash-bone ${className}`} style={style} aria-hidden="true" />
);

export interface RingDatum { name: string; value: number; fill: string; allocated?: number; stock?: number }

/** Units line for a supply category, e.g. "120 of 360 units". */
export const ringUnits = (d: RingDatum) =>
  d.allocated != null && d.stock != null ? `${d.allocated.toLocaleString()} of ${(d.allocated + d.stock).toLocaleString()} units` : `${d.value}%`;

/**
 * Concentric rings: one arc per category, filled to its 0–100 share, outermost first.
 * Hovering a ring (or the matching legend row, via `active`) highlights it and
 * shows its unit count in a tooltip.
 */
export const ConcentricRings: React.FC<{
  data: RingDatum[]; size?: number; active?: number | null; onActive?: (i: number | null) => void;
}> = ({ data, size = 120, active = null, onActive }) => {
  const stroke = 7;
  const gap = 4;
  const c = size / 2;
  const [pt, setPt] = React.useState<{ x: number; y: number } | null>(null);
  const shown = active != null ? data[active] : null;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPt({ x: e.clientX - r.left, y: e.clientY - r.top }); }}
      onMouseLeave={() => { setPt(null); onActive?.(null); }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={data.map((d) => `${d.name} ${d.value}%, ${ringUnits(d)}`).join('; ')}>
        {data.map((d, i) => {
          const r = c - stroke / 2 - i * (stroke + gap);
          if (r <= stroke) return null;
          const circ = 2 * Math.PI * r;
          const v = Math.min(100, Math.max(0, d.value));
          const dim = active != null && active !== i;
          return (
            <g key={d.name} onMouseEnter={() => onActive?.(i)} style={{ opacity: dim ? 0.3 : 1, transition: 'opacity .15s' }}>
              {/* wide invisible ring so the whole lap is hoverable */}
              <circle cx={c} cy={c} r={r} fill="none" stroke="transparent" strokeWidth={stroke + gap} />
              <circle cx={c} cy={c} r={r} fill="none" stroke={DASH.track} strokeWidth={stroke} />
              {v > 0 && (
                <circle cx={c} cy={c} r={r} fill="none" stroke={d.fill} strokeWidth={stroke} strokeLinecap="round"
                  strokeDasharray={`${(v / 100) * circ} ${circ}`} transform={`rotate(-90 ${c} ${c})`}
                  style={{ transition: 'stroke-dasharray .6s cubic-bezier(.16,1,.3,1)' }} />
              )}
            </g>
          );
        })}
      </svg>
      {shown && pt && (
        <div className="pointer-events-none absolute z-20 whitespace-nowrap bg-white rounded-lg border border-slate-200 px-2.5 py-1.5 shadow-[0_6px_20px_-8px_rgba(15,23,42,.25)]"
          style={{ left: pt.x + 12, top: pt.y - 8, transform: 'translateY(-100%)' }}>
          <p className="text-[11px] font-semibold text-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: shown.fill }} />{shown.name}
          </p>
          <p className="text-[11px] font-bold text-slate-900 mt-0.5">{ringUnits(shown)}</p>
        </div>
      )}
    </div>
  );
};

type Trend = 'up' | 'down';
/** good = green, bad = red, neutral = grey. The arrow says which way it moved. */
export interface Pill { text: string; tone?: 'neutral' | 'good' | 'bad'; trend?: Trend }

const PILL: Record<string, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  good: 'bg-emerald-50 text-emerald-700',
  bad: 'bg-red-50 text-red-700',
};

export const TrendPill: React.FC<{ pill: Pill }> = ({ pill }) => {
  const Arrow = pill.trend === 'up' ? TrendingUp : pill.trend === 'down' ? TrendingDown : null;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-md px-1.5 py-0.5 whitespace-nowrap ${PILL[pill.tone ?? 'neutral']}`}>
      {Arrow && <Arrow size={12} strokeWidth={2.25} aria-hidden="true" />}{pill.text}
    </span>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** the card's own muted hue: icon, sparkline, bar */
  accent: string;
  pill?: Pill;
  /** supporting line under the value */
  detail?: string;
  /** trend series and how to draw it */
  spark?: { data?: number[]; labels?: string[]; kind?: 'area' | 'bar'; caption?: string };
  /** 0–100 share drawn as a flat bar instead of a sparkline */
  progress?: number;
  progressCaption?: string;
  /** flat bar split into labelled segments (e.g. crew per agency) */
  segments?: { label: string; filled: number; total: number }[];
  /** data still loading: show the card's shape with placeholders */
  loading?: boolean;
}

const sparkTooltip = (
  <Tooltip cursor={false} wrapperStyle={{ pointerEvents: 'none' }}
    contentStyle={{ fontSize: 10, borderRadius: 6, padding: '2px 6px', border: `1px solid ${DASH.rule}` }}
    labelFormatter={(_, p) => (p?.[0]?.payload?.label as string) ?? ''}
    formatter={(v) => [Number(v).toLocaleString(), '']} separator=""
  />
);

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, accent, pill, detail, spark, progress, progressCaption, segments, loading }) => {
  if (loading) {
    return (
      <div className="min-w-0 bg-white rounded-2xl border border-slate-200/80 px-4 pt-3.5 pb-3 sm:px-5 sm:pt-4 flex flex-col" aria-busy="true" aria-label={`${title}, loading`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 truncate">{title}</p>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}14`, color: accent }}>
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
          </span>
        </div>
        <Bone className="h-7 w-20 mt-1.5" />
        <Bone className="h-3 w-32 mt-2" />
        <div className="mt-auto pt-2">
          <Bone className="h-9 w-full" />
          <div className="mt-2 pt-2 border-t border-slate-100"><Bone className="h-2.5 w-28" /></div>
        </div>
      </div>
    );
  }
  const rows = spark?.data?.map((v, i) => ({ i, v, label: spark.labels?.[i] ?? '' })) ?? [];
  const active = rows.some((r) => r.v > 0);
  const gid = `spark-${title.replace(/\W/g, '')}`;
  const caption = progress != null || segments ? progressCaption : spark?.caption;
  const segs = segments?.filter((g) => g.total > 0) ?? [];
  return (
    <div className="min-w-0 bg-white rounded-2xl border border-slate-200/80 px-4 pt-3.5 pb-3 sm:px-5 sm:pt-4 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 truncate">{title}</p>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}14`, color: accent }}>
          <Icon size={16} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        {pill && <TrendPill pill={pill} />}
      </div>
      {detail && <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{detail}</p>}

      <div className="mt-auto pt-2">
        {segs.length > 0 ? (
          <div className="h-9 flex items-end gap-1.5">
            {segs.map((g) => (
              <div key={g.label} className="group/seg relative flex-1 min-w-0">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: DASH.track }}>
                  <div className="h-full rounded-full" style={{ width: `${(g.filled / g.total) * 100}%`, background: accent }} />
                </div>
                <p className="mt-1 text-[9px] font-semibold text-slate-400 text-center whitespace-nowrap">{g.label}</p>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover/seg:opacity-100 transition-opacity">
                  {g.label}: {g.filled} of {g.total} deployed
                </div>
              </div>
            ))}
          </div>
        ) : progress != null ? (
          <div className="h-9 flex items-end pb-1">
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: DASH.track }}>
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: accent }} />
            </div>
          </div>
        ) : spark && active ? (
          <div className="h-9 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              {spark.kind === 'bar' ? (
                <BarChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barSize={6}>
                  {sparkTooltip}
                  <Bar dataKey="v" fill={`${accent}59`} radius={[2, 2, 0, 0]} activeBar={{ fill: accent }} />
                </BarChart>
              ) : (
                <AreaChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={accent} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  {sparkTooltip}
                  <Area type="monotone" dataKey="v" stroke={accent} strokeWidth={1.75} fill={`url(#${gid})`} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : spark ? (
          <p className="h-9 flex items-end pb-1 text-[11px] text-slate-400">No new records in this window</p>
        ) : null}
        {/* hairline between the chart and its caption */}
        {caption && <p className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 truncate">{caption}</p>}
      </div>
    </div>
  );
};

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: readonly { readonly key: T; readonly label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex items-center bg-slate-100 rounded-lg p-0.5">
      {options.map((o) => (
        <button key={o.key} role="tab" aria-selected={value === o.key} type="button"
          onClick={() => onChange(o.key)}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600
            ${value === o.key ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,.08)]' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
