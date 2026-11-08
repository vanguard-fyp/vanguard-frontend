import React from 'react';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
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
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-6 pt-5 pb-4">
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
  /** drawn large and faint, cropped by the card's corner, to say what the figure counts */
  icon: LucideIcon;
  /** the card's own muted hue, used by the icon */
  accent: string;
  pill?: Pill;
  /** data still loading: show the card's shape with a placeholder */
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, accent, pill, loading }) => (
  <div className="relative overflow-hidden min-w-0 min-h-[116px] bg-white rounded-2xl border border-slate-200/80 px-4 py-4 sm:px-5 sm:py-5"
    aria-busy={loading || undefined} aria-label={loading ? `${title}, loading` : undefined}
  >
    <Icon size={112} strokeWidth={1.5} aria-hidden="true" fill="currentColor" fillOpacity={0.35}
      className="absolute -right-3 -bottom-7 pointer-events-none" style={{ color: accent, opacity: 0.16 }} />
    <div className="relative">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 truncate">{title}</p>
      {loading ? (
        <Bone className="block h-9 w-20 mt-2.5" />
      ) : (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2.5">
          <p className="text-[28px] leading-9 font-bold text-slate-900 tabular-nums">{value}</p>
          {pill && <TrendPill pill={pill} />}
        </div>
      )}
    </div>
  </div>
);

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
