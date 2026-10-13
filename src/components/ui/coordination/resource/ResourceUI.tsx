/**
 * Shared building blocks for the resource screens, so the review queue, the
 * delivery tracker, the pipeline and every dialog read the same way:
 * amber = waiting, blue = moving, emerald = done, red = rejected / short.
 */
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { AiSuggestion, AiVerdict, type AiTone } from '../../shared/AiSuggestion';
import type { RequestRecommendation } from '../../../../services/resourceService';
import type { ResourceRequest } from '../../../../types';
import { FLOW_STEPS, requestFlow, stepIndex } from '../../../../utils/resourceFlow';
import { useRecommendationExplanation, useRequestRecommendation } from '../../../../hooks';
import { fmtNumber } from '../../../../utils/display';

export const STATUS_TEXT: Record<string, string> = {
  'Pending Approval': 'text-amber-700',
  Approved: 'text-blue-700',
  Dispatched: 'text-blue-700',
  Delivered: 'text-emerald-700',
  Fulfilled: 'text-emerald-700',
  Rejected: 'text-red-700',
};

/** Where the goods come from and go to, in plain words. */
export function requestRoute(req: ResourceRequest): { from: string; to: string } {
  if (requestFlow(req) === 'replenishment') {
    return { from: req.supplier || 'Supplier not recorded', to: req.warehouse_name || 'Depot not set' };
  }
  return {
    from: req.warehouse_name || 'Depot not chosen yet',
    to: req.incident_display_id ? `${req.incident_display_id}· ${req.district}` : req.district || 'Incident not set',
  };
}

/** Item Ã— quantity, the one line every row leads with. */
export const ItemLine: React.FC<{ req: ResourceRequest }> = ({ req }) => (
  <p className="text-sm font-semibold text-slate-900 truncate">
    {req.item_requested || 'Requested supplies'}{' '}
    <span className="font-normal text-slate-500">
      {req.quantity_requested.toLocaleString()} {req.unit}
    </span>
  </p>
);

export const RouteLine: React.FC<{ req: ResourceRequest; showAgency?: boolean }> = ({ req, showAgency = true }) => {
  const { from, to } = requestRoute(req);
  return (
    <p className="text-xs text-slate-600 flex items-center gap-1.5 min-w-0">
      {showAgency && <span className="font-semibold text-slate-700 shrink-0">{req.agency}</span>}
      {showAgency && <span className="text-slate-300">|</span>}
      <span className="truncate">{from}</span>
      <ArrowRight size={12} className="text-slate-400 shrink-0" />
      <span className="truncate font-medium text-slate-800">{to}</span>
    </p>
  );
};

/** Four-dot progress for a request's own flow (requisition vs replenishment wording). */
export const MiniTrack: React.FC<{ req: ResourceRequest; showLabel?: boolean }> = ({ req, showLabel = true }) => {
  const steps = FLOW_STEPS[requestFlow(req)];
  const idx = stepIndex(req);
  return (
    <div className="flex items-center gap-2" title={steps.map((s) => s.label).join(' · ')}>
      <div className="flex items-center" aria-hidden>
        {steps.map((s, i) => (
          <React.Fragment key={s.status}>
            <span
              className={`w-2 h-2 rounded-full ${i < idx ? 'bg-emerald-500' : i === idx ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-slate-200'
                }`}
            />
            {i < steps.length - 1 && <span className={`w-4 h-0.5 ${i < idx ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>
      {showLabel && <span className="text-xs font-medium text-slate-700">{steps[idx]?.label ?? req.status}</span>}
    </div>
  );
};

/** A request recommendation in the shared AI-suggestion form. */
export function describeRecommendation(
  rec: RequestRecommendation,
  req: ResourceRequest
): { status: string; tone: AiTone; headline: string } {
  const unit = req.unit;
  const depot = req.warehouse_name ?? 'the assigned depot';
  const best = rec.alternatives[0];
  const bestName = best?.warehouse_name ?? 'another depot';
  switch (rec.decision) {
    case 'approve_full':
      return {
        status: 'Covered in full',
        tone: 'good',
        headline: `Approve ${fmtNumber(rec.recommended_quantity)} ${unit} from ${depot}${rec.stock_after_recommendation != null ? `; ${fmtNumber(rec.stock_after_recommendation)} ${unit} remain` : ''
          }${rec.below_threshold_after ? ', below the safety level' : ''}.`,
      };
    case 'approve_partial':
      return {
        status: 'Partly covered',
        tone: 'caution',
        headline: `${depot} can give ${fmtNumber(rec.recommended_quantity)} of ${fmtNumber(rec.requested_quantity)} ${unit}${best ? `; ${bestName} has ${fmtNumber(best.spare_quantity)} spare for the rest` : ''
          }.`,
      };
    case 'cannot_fulfil':
      return {
        status: 'Not enough stock',
        tone: 'bad',
        headline: best
          ? `${depot} cannot cover this. ${bestName} has ${fmtNumber(best.spare_quantity)} ${unit} spare.`
          : `No depot has enough ${req.item_requested ?? 'stock'} for this request.`,
      };
    case 'choose_depot':
      return {
        status: 'Depot needed',
        tone: 'info',
        headline: best
          ? `Supply from ${bestName}: ${fmtNumber(best.stock_level ?? best.spare_quantity)} ${unit} in stock${best.covers_request === false ? ' (not enough for all of it)' : ''}.`
          : 'No depot currently stocks this item.',
      };
    default:
      return { status: 'Not enough data', tone: 'neutral', headline: rec.constraints[0] ?? 'There is not enough data to recommend.' };
  }
}

/** The recommendation for a request, in the shared AI-suggestion card. */
export const RecommendationLine: React.FC<{ req: ResourceRequest; compact?: boolean }> = ({ req, compact = true }) => {
  const { data: rec, isLoading, isError } = useRequestRecommendation(req.id);
  if (isError) return <p className="text-xs text-slate-400">AI decision advisory unavailable</p>;
  if (isLoading || !rec) return <AiSuggestion title="AI Decision Advisory" loading compact />;
  const d = describeRecommendation(rec, req);
  // The backend plan: one action sentence plus the facts behind it (queue,
  // safety level, incident). The LLM wording is on request, in full view only.
  return (
    <AiSuggestion
      title="AI Decision Advisory"
      meta={rec.confidence != null ? `${Math.round(rec.confidence)}% confidence` : undefined}
      headline={<AiVerdict tone={d.tone} verdict={d.status}>{rec.action ?? d.headline}</AiVerdict>}
      compact={compact}
      basis="Computed from depot stock, the request queue and the incident"
    >
      {(rec.reasons ?? []).map((r, i) => (
        <p key={i}>{r}</p>
      ))}
      {!compact && <ExplainWithAi requestId={req.id} />}
    </AiSuggestion>
  );
};

/**
 * "Explain with AI": asks the language model to word the plan above, only when
 * clicked. The server caches the answer per stock situation, so repeat clicks
 * (or other officers) do not spend tokens again.
 */
export const ExplainWithAi: React.FC<{ requestId: string }> = ({ requestId }) => {
  const [asked, setAsked] = React.useState(false);
  const { data, isFetching, isError } = useRecommendationExplanation(requestId, asked);
  if (!asked) {
    return (
      <button
        type="button"
        onClick={() => setAsked(true)}
        className="mt-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
      >
        Explain with AI
      </button>
    );
  }
  if (isFetching) return <p className="text-[11px] text-slate-400 mt-1">Asking the AI…</p>;
  const ok = data && (data.status === 'ok' || data.status === 'flagged');
  if (isError || !ok) {
    return (
      <p className="text-[11px] text-slate-500 mt-1">
        AI explanation unavailable{data?.reason ? ` (${data.reason})` : ''}. The plan above is complete without it.
      </p>
    );
  }
  return (
    <div className="mt-1 space-y-1">
      {data.rationale && <p className="text-slate-700">{data.rationale}</p>}
      {(data.considerations ?? []).map((c, i) => (
        <p key={i} className="text-slate-600">{c}</p>
      ))}
      {data.status === 'flagged' && <p className="text-amber-700">Check: the explanation mentions figures not in the data.</p>}
    </div>
  );
};

/**
 * Dialog colours carry meaning: approve / receive = emerald, reject = red,
 * dispatch = blue, create = blue, record (read-only details) = slate.
 */
export type DialogTone = 'approve' | 'reject' | 'dispatch' | 'create' | 'record';
const DIALOG_TONE: Record<DialogTone, { head: string; sub: string; ring: string }> = {
  approve: { head: 'bg-emerald-600', sub: 'text-emerald-100', ring: 'border-emerald-200' },
  reject: { head: 'bg-red-600', sub: 'text-red-100', ring: 'border-red-200' },
  dispatch: { head: 'bg-blue-600', sub: 'text-blue-100', ring: 'border-blue-200' },
  create: { head: 'bg-blue-600', sub: 'text-blue-100', ring: 'border-blue-200' },
  record: { head: 'bg-slate-800', sub: 'text-slate-300', ring: 'border-slate-200' },
};

/** One dialog frame for every resource confirmation and detail view. */
export const ResourceDialog: React.FC<{
  title: string;
  subtitle?: string;
  tone?: DialogTone;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}> = ({ title, subtitle, tone = 'record', icon, onClose, children, footer, wide }) => {
  const t = DIALOG_TONE[tone];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'} bg-white rounded-2xl shadow-2xl border ${t.ring} overflow-hidden`}
      >
        <div className={`px-6 py-4 ${t.head} text-white flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {icon}
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-tight">{title}</h3>
              {subtitle && <p className={`text-xs mt-0.5 ${t.sub}`}>{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-6 pb-5 -mt-1 flex items-center justify-end gap-3">{footer}</div>}
      </motion.div>
    </div>
  );
};

/** Grey summary box at the top of a dialog. */
export const SummaryBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">{children}</div>
);

const URGENCY_PILL: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700 border-red-200',
  High: 'bg-orange-50 text-orange-700 border-orange-200',
  Medium: 'bg-amber-50 text-amber-800 border-amber-200',
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

/** Request at a glance inside a dialog (the earlier layout, shorter). */
export const RequestSummary: React.FC<{ req: ResourceRequest; tone: DialogTone; quantityLabel?: string }> = ({ req, tone, quantityLabel = 'Quantity' }) => {
  const { from, to } = requestRoute(req);
  const qtyTone = tone === 'approve' ? 'text-emerald-700' : tone === 'reject' ? 'text-slate-900' : 'text-blue-700';
  return (
    <SummaryBox>
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-slate-600">{req.display_id}</span>
        <span className={`font-bold px-2 py-0.5 rounded-full border text-[10px] ${URGENCY_PILL[req.urgency] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {req.urgency} Urgency
        </span>
      </div>
      <p className="font-bold text-slate-900 text-sm">{req.item_requested || 'Requested supplies'}</p>
      <p className="text-slate-700 font-medium">
        {quantityLabel}: <strong className={qtyTone}>{req.quantity_requested.toLocaleString()} {req.unit}</strong>
      </p>
      <p className="text-slate-500 text-[11px]">
        {from} ·  <strong className="text-slate-800">{to}</strong> · Agency: <strong className="text-slate-800">{req.agency}</strong>
      </p>
    </SummaryBox>
  );
};

/** Label / value rows used inside dialogs. */
export const Facts: React.FC<{ rows: [string, React.ReactNode][] }> = ({ rows }) => (
  <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-xs">
    {rows.map(([k, v]) => (
      <React.Fragment key={k}>
        <dt className="text-slate-500">{k}</dt>
        <dd className="text-slate-900 font-medium min-w-0 break-words">{v}</dd>
      </React.Fragment>
    ))}
  </dl>
);

export const btn = {
  ghost: 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer',
  approve: 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
  reject: 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 cursor-pointer disabled:opacity-50',
  outlineReject: 'px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer',
  primary: 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:opacity-50',
};
