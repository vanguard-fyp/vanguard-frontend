import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ClipboardCheck,
  FileText,
} from 'lucide-react';
import { DisasterBadge } from '../../dashboard/DisasterBadge';
import type { ResourceRequest } from '../../../../types';

interface RequestDetailModalProps {
  request: ResourceRequest | null;
  onClose: () => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({ request, onClose }) => {
  if (!request) return null;

  const isApproved = request.status === 'Approved' || request.status === 'Dispatched';
  const isDispatched = request.status === 'Dispatched';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
                <ClipboardCheck size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{request.agency} — {request.district}</h3>
                  <span className="font-mono text-[10px] text-blue-300 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                    {request.display_id}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Resource Requisition & Dispatch Record</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Status Strip */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2">
                <DisasterBadge type="severity" value={request.urgency} />
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    request.status === 'Dispatched'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : request.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : request.status === 'Pending Approval'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {request.status}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Quantity: {request.quantity_requested.toLocaleString()} {request.unit}
              </span>
            </div>

            {/* Request Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Requesting Agency
                </span>
                <p className="font-bold text-slate-800">{request.agency}</p>
                <p className="text-slate-500">{request.agency} Emergency Response Unit</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Target Sector & Evacuation Center
                </span>
                <p className="font-bold text-slate-800">{request.district} Sector</p>
                <p className="text-slate-500">Relief Center / PPS Dropoff</p>
              </div>
            </div>

            {/* Rejection Justification / Reason (if rejected) */}
            {request.status === 'Rejected' && (
              <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 space-y-1">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                  <FileText size={12} /> Rejection Justification & Review Notes
                </span>
                <p className="text-xs text-red-800 leading-relaxed font-medium">
                  {request.rejection_reason || 'Requisition denied by EOC logistics review.'}
                </p>
              </div>
            )}

            {/* Official Justification */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FileText size={12} /> Official Field Justification
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">{request.justification}</p>
            </div>

            {/* Dispatch & Approval Audit Trail */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Lifecycle & Fulfillment Audit Trail
              </span>

              <div className="space-y-3 relative pl-4 border-l-2 border-slate-200">
                {/* Step 1: Raised */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />
                  <p className="text-xs font-bold text-slate-800">Requisition Logged</p>
                  <p className="text-[11px] text-slate-500">
                    Created via Field Dispatch · {request.requested_at ? new Date(request.requested_at).toLocaleString() : 'Recent'}
                  </p>
                </div>

                {/* Step 2: Approval or Rejection */}
                {isApproved && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white" />
                    <p className="text-xs font-bold text-slate-800">
                      Approved by Disaster Management Officer (NADMA)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Depot allocation confirmed · Automated buffer check verified
                    </p>
                  </div>
                )}

                {request.status === 'Rejected' && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-red-600 ring-4 ring-white" />
                    <p className="text-xs font-bold text-red-800">
                      Rejected by EOC Duty Officer
                    </p>
                    <p className="text-[11px] text-red-600">
                      Reason: {request.rejection_reason || 'Requisition denied by logistics review'}
                    </p>
                  </div>
                )}

                {/* Step 3: Dispatch */}
                {isDispatched && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-purple-600 ring-4 ring-white" />
                    <p className="text-xs font-bold text-slate-800">Dispatched & In Transit</p>
                    <p className="text-[11px] text-slate-500">
                      Conveyance en route to {request.district} PPS dropoff point
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
