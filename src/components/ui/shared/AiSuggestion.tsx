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
 * A plain white card; a thin left edge and the verdict words carry the meaning colour.
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

/** Thin left edge in the verdict's meaning colour; the card itself stays white like every other card. */
const AI_EDGE: Record<AiTone, string> = {
  good: '#059669',
  caution: '#d97706',
  bad: '#e11d48',
  info: '#2563eb',
  neutral: '#cbd5e1',
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
  title = 'AI suggestion',
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
  return (
    <div className={`relative rounded-lg border border-slate-200 bg-white pl-4 pr-3.5 py-3 overflow-hidden ${className}`}>
      <span className="absolute left-0 inset-y-0 w-[3px]" style={{ background: loading ? AI_EDGE.neutral : AI_EDGE[tone] ?? AI_EDGE.neutral }} aria-hidden="true" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
          <span className="text-[11px] font-medium text-slate-500 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {meta && !loading && <span className="text-[11px] text-slate-500 tabular-nums">{meta}</span>}
          {action && !loading && action}
        </div>
      </div>
      {loading ? (
        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5">
          <Loader2 size={12} className="animate-spin" /> Evaluating data…
        </p>
      ) : (
        <>
          {headline && <div className="text-[13px] text-slate-900 mt-1 leading-relaxed">{headline}</div>}
          {children && <div className="text-xs text-slate-600 mt-1 space-y-0.5">{children}</div>}
          {impact && <p className="text-xs font-medium text-slate-700 mt-1.5">{impact}</p>}
          {!compact && (
            <p className="text-[11px] text-slate-400 mt-2">
              {basis ? `${basis} · ` : ''}suggestion only, an officer decides.
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
    className={`px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-blue-700 text-[11px] font-semibold cursor-pointer disabled:opacity-50 ${className}`}
  />
);
