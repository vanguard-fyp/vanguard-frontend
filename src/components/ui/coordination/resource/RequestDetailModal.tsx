import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Package, X } from 'lucide-react';
import type { ResourceRequest } from '../../../../types';
import { requestFlow } from '../../../../utils/resourceFlow';
import { formatDateTime } from '../../../../utils/dateFormatter';
import { requestRoute } from './ResourceUI';

interface RequestDetailModalProps {
  request: ResourceRequest | null;
  onClose: () => void;
}

const URGENCY_PILL: Record<string, { pill: string; dot: string }> = {
  Critical: { pill: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  High: { pill: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  Medium: { pill: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  Low: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};
const STATUS_PILL: Record<string, string> = {
  'Pending Approval': 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Dispatched: 'bg-blue-50 text-blue-700 border-blue-200',
  Delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

const Card: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
    {children}
  </div>
);

type Step = { title: string; detail: string; at?: string | null; dot: string; tone?: string };

/** The full record of one request or replenishment. Only recorded fields are shown. */
export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({ request, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!request) return null;

  const restock = requestFlow(request) === 'replenishment';
  const { from, to } = requestRoute(request);
  const u = URGENCY_PILL[request.urgency] ?? URGENCY_PILL.Medium;
  const reached = (s: string) => ['Approved', 'Dispatched', 'Delivered'].indexOf(request.status) >= ['Approved', 'Dispatched', 'Delivered'].indexOf(s);

  // Audit trail from recorded times; each step appears once it has happened.
  const trail: Step[] = [
    {
      title: restock ? 'Replenishment requested' : 'Requisition logged',
      detail: `By ${request.requested_by_name ?? request.agency}`,
      at: request.requested_at,
      dot: 'bg-blue-600',
    },
  ];
  if (request.status === 'Rejected') {
    trail.push({
      title: 'Rejected',
      detail: `${request.approved_by_name ? `By ${request.approved_by_name} · ` : ''}${request.rejection_reason || 'No reason recorded'}`,
      at: request.updated_at,
      dot: 'bg-red-600',
      tone: 'text-red-800',
    });
  } else {
    if (reached('Approved')) {
      trail.push({
        title: restock ? 'Order approved' : 'Approved, stock reserved',
        detail: `${request.approved_by_name ? `By ${request.approved_by_name}` : 'Approver not recorded'}${request.warehouse_name ? ` · from ${request.warehouse_name}` : ''}`,
        at: request.approved_at,
        dot: 'bg-emerald-600',
      });
    }
    if (reached('Dispatched')) {
      trail.push({ title: restock ? 'In transit to depot' : 'Dispatched from depot', detail: `${from} → ${to}`, at: request.dispatched_at, dot: 'bg-violet-600' });
    }
    if (reached('Delivered')) {
      trail.push({
        title: restock ? 'Received at depot, stock added' : 'Delivered to incident',
        detail: `${request.quantity_requested.toLocaleString()} ${request.unit} at ${to}`,
        at: request.delivered_at,
        dot: 'bg-emerald-700',
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${request.display_id} record`}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-bold truncate">{request.agency} — {restock ? to : request.district || to}</h3>
                <span className="text-[11px] font-bold text-blue-200 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700/60 shrink-0">
                  {request.display_id}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{restock ? 'Depot Replenishment Record' : 'Resource Requisition & Dispatch Record'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status strip */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${u.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
                {request.urgency} Urgency
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_PILL[request.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {request.status}
              </span>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Quantity: {request.quantity_requested.toLocaleString()} {request.unit}
            </span>
          </div>

          {/* Item */}
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <Package size={16} className="text-blue-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Requested Supplies</span>
              <p className="text-xs font-bold text-slate-900">{request.item_requested ?? 'Item not recorded'}</p>
            </div>
          </div>

          {/* Structured Logistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card label="Requesting Agency">
              <p className="text-xs font-bold text-slate-800">{request.agency}</p>
              {request.requested_by_name && (
                <p className="text-[11px] text-slate-500 mt-0.5">Officer: {request.requested_by_name}</p>
              )}
            </Card>
            <Card label={restock ? 'Receiving Depot' : 'Target Destination'}>
              <p className="text-xs font-bold text-slate-800">{to}</p>
              {request.district && (
                <p className="text-[11px] text-slate-500 mt-0.5">District: {request.district}</p>
              )}
            </Card>
            <Card label={restock ? 'Supplier' : 'Supplying Depot'}>
              <p className="text-xs font-bold text-slate-800">{from}</p>
            </Card>
            <Card label="Decision Status">
              <p className="text-xs font-bold text-slate-800">
                {request.approved_by_name ? `Approved by ${request.approved_by_name}` : request.status === 'Pending Approval' ? 'Awaiting Decision' : 'Status: ' + request.status}
              </p>
              {request.approved_at && (
                <p className="text-[11px] text-slate-500 mt-0.5">{formatDateTime(request.approved_at)}</p>
              )}
            </Card>
          </div>

          {/* Justification - only if provided */}
          {request.justification && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FileText size={12} /> Official Field Justification
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">{request.justification}</p>
            </div>
          )}

          {/* Audit trail */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fulfilment Audit Trail</p>
            <ol className="space-y-3 relative pl-4 border-l-2 border-slate-200">
              {trail.map((s) => (
                <li key={s.title} className="relative">
                  <span className={`absolute -left-[21px] top-0.5 w-3 h-3 rounded-full ring-4 ring-white ${s.dot}`} />
                  <p className={`text-xs font-bold ${s.tone ?? 'text-slate-800'}`}>{s.title}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-1 mt-0.5">
                    <span>{s.detail}</span>
                    {s.at && <span className="text-slate-400 font-medium">{formatDateTime(s.at)}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">
            Close View
          </button>
        </div>
      </motion.div>
    </div>
  );
};
