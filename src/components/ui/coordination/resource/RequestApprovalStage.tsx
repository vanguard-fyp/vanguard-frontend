import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Eye, Sparkles, XCircle } from 'lucide-react';
import type { ResourceRequest } from '../../../../types';
import { requestFlow } from '../../../../utils/resourceFlow';
import { usePaginatedQuery, useRequestRecommendation } from '../../../../hooks';
import { resourceService } from '../../../../services/resourceService';
import { PaginationBar } from '../../shared/PaginationBar';
import type { AiTone } from '../../shared/AiSuggestion';
import { Tag, type Tone } from '../../shared/Tag';
import { describeRecommendation, RequestSummary, ResourceDialog, requestRoute } from './ResourceUI';

const PENDING = 'Pending Approval';
const PENDING_FILTER = { status: PENDING };
const HISTORY_FILTER = { exclude_status: PENDING };

/** Urgency asks for action, so it is a soft tag; type and status are context, so they are outline tags. */
const URGENCY_TONE: Record<string, Tone> = { Critical: 'red', High: 'orange', Medium: 'amber', Low: 'slate' };
const REQUEST_STATUS_TONE: Record<string, Tone> = { Approved: 'blue', Dispatched: 'cyan', Delivered: 'teal', Rejected: 'red' };
const VERDICT_TONE: Record<AiTone, Tone> = { good: 'teal', caution: 'amber', bad: 'red', info: 'blue', neutral: 'slate' };

/** 1-Line Streamlined AI Decision Advisory Banner for review queue */
const CompactRecommendationBanner: React.FC<{ req: ResourceRequest }> = ({ req }) => {
  const { data: rec, isLoading } = useRequestRecommendation(req.id);
  if (isLoading || !rec) {
    return (
      <p className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
        <Sparkles size={12} className="animate-pulse shrink-0" aria-hidden="true" />
        Checking stock…
      </p>
    );
  }
  const d = describeRecommendation(rec, req);
  return (
    <p className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2 min-w-0 text-xs">
      <Sparkles size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
      <Tag tone={VERDICT_TONE[d.tone] ?? 'slate'}>{d.status}</Tag>
      <span className="text-slate-600 truncate" title={rec.action ?? d.headline}>{rec.action ?? d.headline}</span>
    </p>
  );
};

/** Depot select for a request created without one; options are the depots stocking the item, best first. */
const DepotPicker: React.FC<{ req: ResourceRequest; value: string; onChange: (id: string) => void }> = ({ req, value, onChange }) => {
  const { data: rec, isLoading } = useRequestRecommendation(req.id);
  const options = rec?.alternatives ?? [];
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-800 mb-1">
        Supply from depot <span className="text-rose-500">*</span>
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading || options.length === 0}
        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 cursor-pointer disabled:cursor-not-allowed"
      >
        <option value="">{isLoading ? 'Loading depots' : options.length ? 'Choose a depot' : 'No depot stocks this item'}</option>
        {options.map((o) => (
          <option key={o.warehouse_id} value={o.warehouse_id}>
            {o.warehouse_name ?? 'Warehouse'}: {(o.stock_level ?? o.spare_quantity).toLocaleString()} {req.unit} in stock
            {o.covers_request === false ? ' (not enough)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
};

interface RequestApprovalStageProps {
  onApprove: (id: string, warehouseId?: string) => void;
  onReject: (id: string, reason?: string) => void;
  onSelectRequest?: (req: ResourceRequest) => void;
}

type FlowFilter = 'all' | 'requisition' | 'replenishment';

export const RequestApprovalStage: React.FC<RequestApprovalStageProps> = ({ onApprove, onReject, onSelectRequest }) => {
  const [approving, setApproving] = useState<ResourceRequest | null>(null);
  const [rejecting, setRejecting] = useState<ResourceRequest | null>(null);
  const [reason, setReason] = useState('');
  const [depotId, setDepotId] = useState('');
  const [flowFilter, setFlowFilter] = useState<FlowFilter>('all');
  const [showHistory, setShowHistory] = useState(false);

  const getPage = (args: { limit: number; offset: number; status?: string; exclude_status?: string }) =>
    resourceService.getRequestsPage(args);
  const pendingPage = usePaginatedQuery(['resources', 'requests', 'pending'], getPage, PENDING_FILTER, 5);
  const historyPage = usePaginatedQuery(['resources', 'requests', 'history'], getPage, HISTORY_FILTER, 5);
  const pending = pendingPage.items;
  const shown = flowFilter === 'all' ? pending : pending.filter((r) => requestFlow(r) === flowFilter);
  const needsDepot = !!approving && !approving.warehouse_id;

  const confirmApprove = () => {
    if (!approving || (needsDepot && !depotId)) return;
    onApprove(approving.id, needsDepot ? depotId : undefined);
    setApproving(null);
  };
  const confirmReject = () => {
    if (!rejecting) return;
    onReject(rejecting.id, reason.trim() || undefined);
    setRejecting(null);
  };

  const filters: [FlowFilter, string, number, string][] = [
    ['all', 'All', pending.length, 'bg-slate-900'],
    ['requisition', 'To incidents', pending.filter((r) => requestFlow(r) === 'requisition').length, 'bg-slate-900'],
    ['replenishment', 'Depot restock', pending.filter((r) => requestFlow(r) === 'replenishment').length, 'bg-slate-900'],
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center justify-center"><ClipboardCheck size={16} /></div>
          <div className='flex flex-row gap-2 justify-between w-full items-center'>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              Request Review &amp; Approval
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-slate-500">· {pendingPage.total} Pending Approval</p>
            </div>
          </div>
        </div>
      </div>

      {/* Flow filter */}
      <div className="px-5 py-2.5 border-b border-slate-200 flex items-center gap-1.5 text-xs flex-wrap">
        {filters.map(([id, label, n, on]) => (
          <button
            key={id}
            onClick={() => setFlowFilter(id)}
            className={`px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${flowFilter === id ? `${on} text-white` : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {label} ({n})
          </button>
        ))}
      </div>

      {/* Pending queue */}
      <div className="divide-y divide-slate-100">
        {pendingPage.isLoading && <div className="px-5 py-8 text-center text-xs text-slate-400">Loading review queue...</div>}
        {pendingPage.isError && (
          <div className="px-5 py-6 text-center text-xs text-red-700">
            Review queue could not be loaded.{' '}
            <button onClick={() => pendingPage.refetch()} className="underline font-bold cursor-pointer">Retry</button>
          </div>
        )}
        {!pendingPage.isLoading && !pendingPage.isError && shown.length === 0 && (
          <div className="px-5 py-8 text-center bg-slate-50/50">
            <CheckCircle size={24} className="text-emerald-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No requests waiting for approval</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Approved requests continue in the delivery tracker.</p>
          </div>
        )}
        {shown.map((req) => (
          <div key={req.id} className="px-5 py-3">
            <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-3.5 shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                {/* 1. What and how much, where to */}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag tone={URGENCY_TONE[req.urgency] ?? 'slate'}>{req.urgency}</Tag>
                    <h4 className="text-sm font-bold text-slate-900 truncate">{req.item_requested}</h4>
                  </div>
                  <p className="text-[13px] text-slate-700">
                    <span className="font-bold text-slate-900 tabular-nums">{req.quantity_requested.toLocaleString()} {req.unit}</span>
                    <span className="text-slate-400"> → </span>
                    {requestRoute(req).to}
                  </p>
                </div>

                {/* 3. The decision */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectRequest?.(req)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-lg hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
                  >
                    <Eye size={13} className="text-slate-500" /> Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejecting(req);
                      setReason('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setApproving(req);
                      setDepotId('');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                </div>
              </div>

              {/* 2. The AI's answer, in one line */}
              <CompactRecommendationBanner req={req} />
            </div>
          </div>
        ))}
        {pendingPage.total > pendingPage.pageSize && (
          <div className="px-4">
            <PaginationBar
              pageIndex={pendingPage.pageIndex}
              pageCount={pendingPage.pageCount}
              total={pendingPage.total}
              pageSize={pendingPage.pageSize}
              onPageChange={pendingPage.setPageIndex}
              isFetching={pendingPage.isFetching}
              label="pending requests"
            />
          </div>
        )}
      </div>

      {/* Processed history: folded until asked for, five per page */}
      {historyPage.total > 0 && (
        <div className="border-t border-slate-200 bg-slate-50/30">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
            className="w-full px-5 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50"
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Processed request history ({historyPage.total})</span>
            {showHistory ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </button>
          {showHistory && (
            <>
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {historyPage.items.map((req) => (
                  <button
                    type="button"
                    key={req.id}
                    onClick={() => onSelectRequest?.(req)}
                    className="w-full px-5 py-3 flex items-center justify-between gap-3 text-xs text-left hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-semibold text-slate-400 shrink-0">{req.display_id}</span>
                      <span className="font-bold text-slate-800 group-hover:text-blue-600 truncate">
                        {req.item_requested || 'Supplies'} · {req.agency}
                      </span>
                      <span className="text-slate-500 shrink-0">({req.quantity_requested.toLocaleString()} {req.unit})</span>
                      <span className="text-slate-400 truncate hidden sm:inline">· {requestRoute(req).to}</span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <Tag variant="outline" tone={REQUEST_STATUS_TONE[req.status] ?? 'slate'}>{req.status}</Tag>
                      <Eye size={13} className="text-slate-400 group-hover:text-blue-600" />
                    </span>
                  </button>
                ))}
              </div>
              {historyPage.total > historyPage.pageSize && (
                <div className="px-4 border-t border-slate-100">
                  <PaginationBar
                    pageIndex={historyPage.pageIndex}
                    pageCount={historyPage.pageCount}
                    total={historyPage.total}
                    pageSize={historyPage.pageSize}
                    onPageChange={historyPage.setPageIndex}
                    isFetching={historyPage.isFetching}
                    label="processed requests"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {approving && (
          <ResourceDialog
            tone="approve"
            icon={<CheckCircle2 size={20} />}
            title={requestFlow(approving) === 'replenishment' ? 'Authorize Depot Restock' : 'Authorize Resource Dispatch'}
            subtitle="Confirm stock allocation and commit dispatch authorization"
            onClose={() => setApproving(null)}
            footer={
              <>
                <button type="button" onClick={() => setApproving(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmApprove}
                  disabled={needsDepot && !depotId}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Confirm Authorization
                </button>
              </>
            }
          >
            <RequestSummary req={approving} tone="approve" quantityLabel="Quantity to Allocate" />
            {needsDepot && <DepotPicker req={approving} value={depotId} onChange={setDepotId} />}
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200/70 rounded-xl px-4 py-3 leading-relaxed">
              {requestFlow(approving) === 'replenishment'
                ? <>Marks the order <strong className="text-slate-900">Approved</strong>. Stock is added to the depot when received.</>
                : <>Marks it <strong className="text-slate-900">Approved</strong>, reserves the stock and advances to the delivery tracker.</>}
            </p>
          </ResourceDialog>
        )}
        {rejecting && (
          <ResourceDialog
            tone="reject"
            icon={<AlertTriangle size={20} />}
            title="Reject Resource Request"
            subtitle="Specify operational rationale for declining requisition"
            onClose={() => setRejecting(null)}
            footer={
              <>
                <button type="button" onClick={() => setRejecting(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  Confirm Rejection
                </button>
              </>
            }
          >
            <RequestSummary req={rejecting} tone="reject" quantityLabel="Quantity Requested" />
            <label className="block">
              <span className="block text-xs font-bold text-slate-800 mb-1">
                Rejection Reason / Operational Notes <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
              </span>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Supplies already dispatched under REQ-2026-002, or depot stock exhausted."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-red-600 focus:bg-white resize-none transition-colors"
              />
            </label>
          </ResourceDialog>
        )}
      </AnimatePresence>
    </div>
  );
};
