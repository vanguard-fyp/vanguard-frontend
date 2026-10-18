import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  Rocket,
  Send,
  Truck,
  User,
} from 'lucide-react';
import type { ResourceRequest } from '../../../../types';
import { FLOW_STEPS, nextAction, requestFlow, stepIndex } from '../../../../utils/resourceFlow';
import { formatDateTime } from '../../../../utils/dateFormatter';
import { relativeTime } from '../../../../utils/display';
import { useUpdateRequestStatus } from '../../../../hooks/useResources';
import { useToast } from '../../../../context/ToastContext';
import { RequestSummary, ResourceDialog, requestRoute } from './ResourceUI';

interface AllocationTrackerStageProps {
  requests: ResourceRequest[];
  onSelectRequest?: (req: ResourceRequest) => void;
}

type Pending = { req: ResourceRequest; to: 'Dispatched' | 'Delivered'; label: string };

export const AllocationTrackerStage: React.FC<AllocationTrackerStageProps> = ({ requests, onSelectRequest }) => {
  const updateStatus = useUpdateRequestStatus();
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Pending | null>(null);
  const [showDone, setShowDone] = useState(false);

  const active = requests.filter((r) => r.status === 'Approved' || r.status === 'Dispatched');
  const delivered = requests
    .filter((r) => r.status === 'Delivered')
    .sort((a, b) => (b.delivered_at ?? b.updated_at ?? '').localeCompare(a.delivered_at ?? a.updated_at ?? ''))
    .slice(0, 8);

  const advance = ({ req, to }: Pending) =>
    updateStatus.mutate(
      { id: req.id, status: to },
      {
        onSuccess: () => {
          if (to === 'Delivered' && requestFlow(req) === 'replenishment') {
            toast.success('Stock received', `${req.quantity_requested.toLocaleString()} ${req.unit} added to ${req.warehouse_name ?? 'the depot'}.`);
          } else {
            toast.success(to === 'Delivered' ? 'Marked delivered' : 'Supplies dispatched', `${req.display_id} updated.`);
          }
          setConfirming(null);
        },
        onError: (err) => toast.error('Update failed', err instanceof Error ? err.message : 'Could not update the request.'),
      }
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Send size={15} />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Active Resource Allocation &amp; Delivery Tracker</h3>
            <p className="text-[11px] text-slate-500">
              · {active.length} Active Dispatch{active.length === 1 ? '' : 'es'}
            </p>
          </div>
        </div>
      </div>

      {active.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-10 text-center">
          <Package size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Nothing in transit</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Requests appear here once they are approved.</p>
        </div>
      )}

      {active.map((req) => {
        const open = expandedId === req.id;
        const flow = requestFlow(req);
        const steps = FLOW_STEPS[flow];
        const at = stepIndex(req);
        const action = nextAction(req);
        const busy = updateStatus.isPending && updateStatus.variables?.id === req.id;
        const { from, to } = requestRoute(req);
        const stamps = [req.requested_at, req.approved_at, req.dispatched_at, req.delivered_at];
        const dispatched = req.status === 'Dispatched';
        return (
          <div key={req.id} className={`bg-white border rounded-2xl shadow-xs overflow-hidden ${open ? 'border-blue-200' : 'border-slate-200'}`}>
            {/* Summary */}
            <div className="p-5 flex items-start justify-between gap-4 flex-wrap md:flex-nowrap">
              <button type="button" onClick={() => setExpandedId(open ? null : req.id)} className="min-w-0 space-y-1.5 text-left cursor-pointer">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-400">{req.display_id}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${dispatched ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                  >
                    {steps[at]?.label ?? req.status}
                  </span>
                  {req.requested_at && <span className="text-[11px] text-slate-400">{formatDateTime(req.requested_at)}</span>}
                </span>
                <span className="block text-sm font-bold text-slate-900">{req.item_requested ?? 'Requested supplies'}</span>
                <span className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Package size={13} className="text-amber-600" />
                    {req.quantity_requested.toLocaleString()} {req.unit}
                  </span>
                  <span className="text-slate-300">&#8594;</span>
                  <span className="flex items-center gap-1 font-semibold text-blue-700">
                    <MapPin size={13} />
                    {to} ({req.agency})
                  </span>
                </span>
              </button>

              <div className="flex items-center gap-3 shrink-0">
                {action && (
                  <button
                    onClick={() => setConfirming({ req, to: action.to, label: action.label })}
                    disabled={busy}
                    className={`px-3 py-1.5 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${action.to === 'Delivered' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : action.to === 'Delivered' ? <Check size={13} /> : <Rocket size={13} />}
                    {action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : req.id)}
                  aria-expanded={open}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  {open ? 'Hide Lifecycle' : 'Track Lifecycle'}
                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {/* Lifecycle */}
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-4">
                        {flow === 'replenishment' ? 'Supplier depot milestones' : 'End-to-end delivery milestones'}
                      </p>
                      <ol className="flex items-start">
                        {steps.map((st, i) => {
                          const done = i < at;
                          const cur = i === at;
                          return (
                            <li key={st.status} className="flex-1 flex flex-col items-center text-center relative">
                              {i > 0 && <span className={`absolute top-4 right-1/2 w-full h-0.5 ${i <= at ? 'bg-emerald-500' : 'bg-slate-200'}`} aria-hidden />}
                              <span
                                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-600 text-white' : cur ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-100 border-2 border-slate-300 text-slate-400'
                                  }`}
                              >
                                {done ? <CheckCircle2 size={15} /> : i + 1}
                              </span>
                              <span className={`mt-2 text-xs font-semibold ${done ? 'text-emerald-700' : cur ? 'text-blue-700' : 'text-slate-400'}`}>{st.label}</span>
                              {i <= at && stamps[i] && <span className="text-[10px] text-slate-400 tabular-nums">{formatDateTime(stamps[i] as string)}</span>}
                              {st.stock && <span className="text-[10px] text-slate-400">{st.stock}</span>}
                            </li>
                          );
                        })}
                      </ol>
                    </div>

                    {/* Timing from recorded times only */}
                    {/* <div className="flex items-start gap-3 bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
                      <span className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Clock size={14} />
                      </span>
                      <div className="text-xs">
                        <p className="font-bold text-slate-800">Delivery timing</p>
                        <p className="text-slate-600 mt-0.5">
                          {dispatched
                            ? req.dispatched_at
                              ? `Left ${from} ${relativeTime(req.dispatched_at)}; in transit for ${span(req.dispatched_at)}.`
                              : 'Dispatched; departure time not recorded.'
                            : req.approved_at
                              ? `Approved ${relativeTime(req.approved_at)}; waiting ${span(req.approved_at)} to leave ${from}.`
                              : 'Approved; approval time not recorded.'}
                          {req.requested_at && ` ${span(req.requested_at)} since it was requested.`}
                        </p>
                      </div>
                    </div> */}

                    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{flow === 'replenishment' ? 'Supplier' : 'Dispatch origin'}</dt>
                        <dd className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" />{from}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{flow === 'replenishment' ? 'Receiving depot' : 'Destination drop point'}</dt>
                        <dd className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5 pr-2">
                          <Navigation size={13} className="text-slate-400" />
                          {flow === 'requisition' && req.incident_title ? `${to}· ${req.incident_title}` : to}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Approved by</dt>
                        <dd className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5"><User size={13} className="text-slate-400" />{req.approved_by_name ?? 'Not recorded'}</dd>
                      </div>
                    </dl>
                    {/* {onSelectRequest && (
                      <button type="button" onClick={() => onSelectRequest(req)} className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer">
                        View full record
                      </button>
                    )} */}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {delivered.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="w-full px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide hover:bg-slate-50 cursor-pointer flex items-center justify-between"
          >
            Recently delivered ({delivered.length})
            {showDone ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showDone && (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {delivered.map((req) => (
                <button
                  type="button"
                  key={req.id}
                  onClick={() => onSelectRequest?.(req)}
                  className="w-full px-5 py-2.5 flex items-center justify-between gap-3 text-left text-xs hover:bg-slate-50 cursor-pointer"
                >
                  <span className="truncate">
                    <span className="font-mono text-slate-400 mr-2">{req.display_id}</span>
                    <span className="font-semibold text-slate-800">{req.item_requested || 'Supplies'}</span>
                    <span className="text-slate-500"> ({req.quantity_requested.toLocaleString()} {req.unit}) · {requestRoute(req).to}</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                    {req.delivered_at ? `Delivered ${relativeTime(req.delivered_at)}` : 'Delivered'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {confirming && (
          <ResourceDialog
            tone={confirming.to === 'Delivered' ? 'approve' : 'dispatch'}
            icon={confirming.to === 'Delivered' ? <PackageCheck size={20} /> : <Truck size={20} />}
            title={confirming.label}
            onClose={() => setConfirming(null)}
            footer={
              <>
                <button onClick={() => setConfirming(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={() => advance(confirming)}
                  disabled={updateStatus.isPending}
                  className={`px-4 py-2 text-white rounded-full text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 ${confirming.to === 'Delivered' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                    }`}
                >
                  Confirm
                </button>
              </>
            }
          >
            <RequestSummary req={confirming.req} tone={confirming.to === 'Delivered' ? 'approve' : 'dispatch'} />
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              {confirming.to === 'Dispatched'
                ? 'Records that the supplies have left and starts the transit clock.'
                : requestFlow(confirming.req) === 'replenishment'
                  ? 'Records the delivery as received and adds the quantity to depot stock.'
                  : 'Records the supplies as delivered and closes this request.'}
            </p>
          </ResourceDialog>
        )}
      </AnimatePresence>
    </div>
  );
};
