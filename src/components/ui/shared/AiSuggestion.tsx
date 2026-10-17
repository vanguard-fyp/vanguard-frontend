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
  bad: 'text-red-700',
  info: 'text-blue-700',
  neutral: 'text-slate-600',
};

/** "Covered in full. Approve all 60…" with the verdict in its meaning colour. */
export const AiVerdict: React.FC<{ tone: AiTone; verdict: string; children: React.ReactNode }> = ({ tone, verdict, children }) => (
  <>
    <strong className={AI_TONE_TEXT[tone]}>{verdict}.</strong> {children}
  </>
);

interface AiSuggestionProps {
  title?: string;
  meta?: string;
  headline?: React.ReactNode;
  children?: React.ReactNode;
  /** one key consequence, shown in violet */
  impact?: React.ReactNode;
  action?: React.ReactNode;
  loading?: boolean;
  /** hide the footnote (e.g. in dense lists) */
  compact?: boolean;
  basis?: string;
  className?: string;
}

export const AiSuggestion: React.FC<AiSuggestionProps> = ({
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
}) => (
  <div className={`rounded-xl border border-violet-100 bg-violet-50/60 p-3.5 ${className}`}>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-6 h-6 rounded-md bg-violet-600 text-white flex items-center justify-center shrink-0">
          <Sparkles size={13} />
        </span>
        <span className="text-xs font-bold text-violet-950 truncate">{title}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {meta && !loading && <span className="text-[11px] font-mono font-semibold text-violet-700">{meta}</span>}
        {action && !loading && action}
      </div>
    </div>
    {loading ? (
      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
        <Loader2 size={12} className="animate-spin" /> Working it out…
      </p>
    ) : (
      <>
        {headline && <div className="text-xs text-slate-700 mt-2 leading-relaxed">{headline}</div>}
        {children && <div className="text-xs text-slate-600 mt-1.5 space-y-1">{children}</div>}
        {impact && <p className="text-[11px] font-medium text-violet-800 mt-2">{impact}</p>}
        {!compact && (
          <p className="text-[10px] text-violet-700/70 mt-2">
            {basis ? `${basis}. ` : ''}Suggestion only; an officer decides.
          </p>
        )}
      </>
    )}
  </div>
);

/** Small inline action button styled for AI suggestions. */
export const AiAction: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`px-2.5 py-1 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50 ${className}`}
  />
);
