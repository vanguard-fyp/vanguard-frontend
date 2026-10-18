import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

/**
 * The one way AI output is shown across Vanguard (resource advisories, hazard
 * early warnings, the incident decision brief):
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [✦] AI Decision Advisory  (Status pill)       94% conf.  │  ← meta only when real
 *   │ Headline in plain words.                                 │
 *   │ Supporting lines.                                        │
 *   │ Impact: one key consequence                              │
 *   │ Based on …. Suggestion only; an officer decides.         │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Violet is reserved for AI. The status pill carries the meaning colour.
 */
export type AiTone = 'good' | 'caution' | 'bad' | 'info' | 'neutral';

/** Meaning colour for an inline verdict word inside an AI suggestion's text. */
export const AI_TONE_TEXT: Record<AiTone, string> = {
  good: 'text-emerald-700',
  caution: 'text-amber-700',
  bad: 'text-rose-700',
  info: 'text-blue-700',
  neutral: 'text-slate-700',
};

export const AI_TONE_BADGE: Record<AiTone, string> = {
  good: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  caution: 'bg-amber-100 text-amber-800 border-amber-300',
  bad: 'bg-rose-100 text-rose-800 border-rose-300',
  info: 'bg-sky-100 text-sky-800 border-sky-300',
  neutral: 'bg-slate-100 text-slate-700 border-slate-300',
};

const AI_CONTAINER_TONE: Record<AiTone, {
  container: string;
  iconColor: string;
  titleColor: string;
  headlineColor: string;
  bodyColor: string;
  impactColor: string;
  footnoteColor: string;
  metaBadge: string;
}> = {
  good: {
    container: 'border-emerald-200/90 bg-emerald-50/80',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-950',
    headlineColor: 'text-emerald-900',
    bodyColor: 'text-emerald-800/90',
    impactColor: 'text-emerald-800',
    footnoteColor: 'text-emerald-700/80',
    metaBadge: 'bg-emerald-100/80 text-emerald-800 border-emerald-300/70',
  },
  caution: {
    container: 'border-amber-200/90 bg-amber-50/80',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-950',
    headlineColor: 'text-amber-900',
    bodyColor: 'text-amber-800/90',
    impactColor: 'text-amber-800',
    footnoteColor: 'text-amber-700/80',
    metaBadge: 'bg-amber-100/80 text-amber-800 border-amber-300/70',
  },
  bad: {
    container: 'border-rose-200/90 bg-rose-50/80',
    iconColor: 'text-rose-600',
    titleColor: 'text-rose-950',
    headlineColor: 'text-rose-900',
    bodyColor: 'text-rose-800/90',
    impactColor: 'text-rose-800',
    footnoteColor: 'text-rose-700/80',
    metaBadge: 'bg-rose-100/80 text-rose-800 border-rose-300/70',
  },
  info: {
    container: 'border-sky-200/90 bg-sky-50/80',
    iconColor: 'text-sky-600',
    titleColor: 'text-sky-950',
    headlineColor: 'text-sky-900',
    bodyColor: 'text-sky-800/90',
    impactColor: 'text-sky-800',
    footnoteColor: 'text-sky-700/80',
    metaBadge: 'bg-sky-100/80 text-sky-800 border-sky-300/70',
  },
  neutral: {
    container: 'border-slate-200 bg-white',
    iconColor: 'text-blue-600',
    titleColor: 'text-slate-900',
    headlineColor: 'text-slate-800',
    bodyColor: 'text-slate-600',
    impactColor: 'text-slate-700',
    footnoteColor: 'text-slate-400',
    metaBadge: 'bg-slate-50 text-slate-600 border-slate-200',
  },
};

/** "Covered in full. Approve all 60…" with the verdict in its meaning colour badge/text. */
export const AiVerdict: React.FC<{ tone: AiTone; verdict: string; children: React.ReactNode }> = ({ tone, verdict, children }) => (
  <>
    <strong className={AI_TONE_TEXT[tone]}>{verdict}.</strong> {children}
  </>
);

interface AiSuggestionProps {
  tone?: AiTone;
  title?: string;
  meta?: string;
  headline?: React.ReactNode;
  children?: React.ReactNode;
  /** one key consequence */
  impact?: React.ReactNode;
  action?: React.ReactNode;
  loading?: boolean;
  /** hide the footnote (e.g. in dense lists) */
  compact?: boolean;
  basis?: string;
  className?: string;
}

export const AiSuggestion: React.FC<AiSuggestionProps> = ({
  tone = 'neutral',
  title = 'AI Decision Advisory',
  meta,
  headline,
  children,
  impact,
  action,
  loading,
  compact,
  basis,
  className = '',
}) => {
  const t = AI_CONTAINER_TONE[tone] ?? AI_CONTAINER_TONE.neutral;
  return (
    <div className={`rounded-xl border ${t.container} p-3.5 shadow-2xs ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={15} className={`${t.iconColor} shrink-0`} />
          <span className={`text-xs font-bold ${t.titleColor} truncate`}>{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {meta && !loading && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${t.metaBadge}`}>
              {meta}
            </span>
          )}
          {action && !loading && action}
        </div>
      </div>
      {loading ? (
        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
          <Loader2 size={12} className="animate-spin" /> Evaluating data…
        </p>
      ) : (
        <>
          {headline && <div className={`text-xs font-medium ${t.headlineColor} mt-2 leading-relaxed`}>{headline}</div>}
          {children && <div className={`text-xs ${t.bodyColor} mt-1.5 space-y-1`}>{children}</div>}
          {impact && <p className={`text-[11px] font-medium ${t.impactColor} mt-2`}>{impact}</p>}
          {!compact && (
            <p className={`text-[10px] ${t.footnoteColor} mt-2`}>
              {basis ? `${basis}. ` : ''}Suggestion only; an officer decides.
            </p>
          )}
        </>
      )}
    </div>
  );
};

/** Small inline action button styled for AI suggestions. */
export const AiAction: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`px-2.5 py-1 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50 ${className}`}
  />
);
