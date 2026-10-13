import React from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, HelpCircle, Loader2, XCircle } from 'lucide-react';
import type { AnalysisState, AssessmentStatus } from '../../../types';

type AnyState = AnalysisState | AssessmentStatus;

const META: Record<AnyState, { label: string; className: string; icon: React.ElementType; spin?: boolean }> = {
  not_analysed: { label: 'Not analysed', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: CircleDashed },
  queued: { label: 'Queued', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
  processing: { label: 'Analysing', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2, spin: true },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  partial: { label: 'Partial', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
  insufficient_evidence: { label: 'Insufficient evidence', className: 'bg-amber-50 text-amber-800 border-amber-200', icon: HelpCircle },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  superseded: { label: 'Superseded', className: 'bg-slate-100 text-slate-500 border-slate-200', icon: CircleDashed },
};

export const ANALYSIS_STATE_LABEL = (s: AnyState) => META[s]?.label ?? s;

/** Pipeline state chip. Unrecognised states are shown verbatim, never hidden. */
export const AssessmentStatusBadge: React.FC<{ state: AnyState; className?: string }> = ({ state, className = '' }) => {
  const m = META[state] ?? { label: String(state), className: 'bg-slate-100 text-slate-600 border-slate-200', icon: HelpCircle };
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${m.className} ${className}`}>
      <Icon size={10} className={m.spin ? 'animate-spin' : undefined} />
      {m.label}
    </span>
  );
};

/** Visual band for a 0–100 priority score; null means "no score" and is never coloured as low. */
export function priorityTone(score: number | null | undefined): string {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'bg-slate-100 text-slate-500 border-slate-200';
  if (score >= 80) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (score >= 60) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (score >= 40) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-blue-100 text-blue-700 border-blue-200';
}
