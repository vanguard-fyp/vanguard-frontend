import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { StockAdvisoryItem } from '../../../../services/resourceService';
import { useRequestRecommendation } from '../../../../hooks';
import type { ResourceRequest } from '../../../../types';
import { AiSuggestion, AiVerdict } from '../../shared/AiSuggestion';
import { describeRecommendation, ExplainWithAi } from './ResourceUI';
import { fmtNumber, relativeTime } from '../../../../utils/display';

/**
 * Backend resource advice (GET /resources/inventory/advisory and
 * GET /resources/requests/{id}/recommendation). Every figure is computed by the
 * backend's deterministic rules; only the "AI explanation" text comes from the
 * LLM. Advice never approves or moves stock — that stays a human action.
 */

export const RISK_LABEL: Record<StockAdvisoryItem['risk'], string> = {
  critical: 'Out of stock',
  high: 'Short of pending requests',
  elevated: 'Will drop below safety level',
  normal: 'Enough stock',
};

export const RISK_CLASS: Record<StockAdvisoryItem['risk'], string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  elevated: 'bg-amber-50 text-amber-800 border-amber-200',
  normal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

/** Urgency a requisition form would start from for a given stock risk (officer can change it). */
export const RISK_TO_URGENCY: Record<StockAdvisoryItem['risk'], 'Critical' | 'High' | 'Medium' | 'Low'> = {
  critical: 'Critical',
  high: 'High',
  elevated: 'Medium',
  normal: 'Low',
};

export const AdvisoryUnavailable: React.FC<{ onRetry?: () => void; what?: string }> = ({ onRetry, what = 'Advisory' }) => (
  <div className="flex items-center justify-between gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
    <span className="flex items-center gap-1.5">
      <AlertTriangle size={12} /> {what} unavailable. The request and stock data above are unaffected.
    </span>
    {onRetry && (
      <button type="button" onClick={onRetry} className="flex items-center gap-1 font-bold underline cursor-pointer">
        <RefreshCw size={11} /> Retry
      </button>
    )}
  </div>
);

/** Stock advisory for one inventory line, in the shared AI-suggestion form. */
export const StockAdvisoryCard: React.FC<{
  item: StockAdvisoryItem | undefined;
  unit?: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}> = ({ item, unit = '', isLoading, isError, onRetry }) => {
  if (isLoading) return <AiSuggestion loading />;
  if (isError) return <AdvisoryUnavailable onRetry={onRetry} what="AI suggestion" />;
  // The advisory list was fetched before this stock line existed (or changed).
  if (!item) return <AdvisoryUnavailable onRetry={onRetry} what="AI suggestion for this new item" />;
  const tone = item.risk === 'critical' || item.risk === 'high' ? 'bad' : item.risk === 'elevated' ? 'caution' : 'good';
  const headline =
    item.reorder_quantity > 0
      ? `Restock ${fmtNumber(item.reorder_quantity)} ${unit} to cover pending requests and the safety level.`
      : 'No restock needed; stock covers pending requests and the safety level.';
  return (
    <AiSuggestion
      headline={<AiVerdict tone={tone} verdict={RISK_LABEL[item.risk]}>{headline}</AiVerdict>}
      basis="Computed from stock, safety level and pending requests"
    >
      <p>
        {fmtNumber(item.pending_demand)} {unit} already requested · {fmtNumber(item.stock_after_pending)} {unit} left after those
        {item.shortfall > 0 && <span className="text-red-700 font-semibold"> · short by {fmtNumber(item.shortfall)}</span>}
      </p>
      {item.transfer_options.length > 0 && (
        <p>
          Could transfer from{' '}
          {item.transfer_options.map((t) => `${t.warehouse_name ?? 'another depot'} (${fmtNumber(t.spare_quantity)} spare)`).join(', ')}.
        </p>
      )}
      {item.data_stale && <p className="text-amber-700">Stock record is stale ({relativeTime(item.data_updated_at) ?? 'unknown age'}); confirm with the depot first.</p>}
    </AiSuggestion>
  );
};

/** Full recommendation for one pending request (details dialog), in the shared AI-suggestion form. */
export const RequestRecommendationCard: React.FC<{ req: ResourceRequest }> = ({ req }) => {
  const { data: rec, isLoading, isError, refetch } = useRequestRecommendation(req.id);
  if (isLoading) return <AiSuggestion loading />;
  if (isError || !rec) return <AdvisoryUnavailable onRetry={() => refetch()} what="AI suggestion" />;
  const d = describeRecommendation(rec, req);
  const others = rec.decision === 'choose_depot' ? rec.alternatives.slice(1) : rec.alternatives;
  return (
    <AiSuggestion
      headline={<AiVerdict tone={d.tone} verdict={d.status}>{rec.action ?? d.headline}</AiVerdict>}
      basis="Computed from depot stock, the request queue and the incident"
    >
      {(rec.reasons ?? []).map((r, i) => (
        <p key={`r${i}`}>{r}</p>
      ))}
      <ExplainWithAi requestId={req.id} />
      {rec.constraints.filter((c) => c !== d.headline).map((c, i) => (
        <p key={i}>{c}</p>
      ))}
      {others.length > 0 && (
        <p>
          Other depots:{' '}
          {others.map((a) => `${a.warehouse_name ?? 'depot'} (${fmtNumber(a.stock_level ?? a.spare_quantity)} ${req.unit})`).join(', ')}.
        </p>
      )}
    </AiSuggestion>
  );
};
