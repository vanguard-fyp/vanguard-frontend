import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, Clock, CheckCircle, XCircle, Sparkles, Eye, X, AlertTriangle } from 'lucide-react';
import { DisasterBadge } from '../../dashboard/DisasterBadge';
import type { ResourceRequest, AIRequestRecommendation } from '../../../../types';

interface RequestApprovalStageProps {
  requests: ResourceRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onSelectRequest?: (req: ResourceRequest) => void;
}

function getAIRequestRecommendation(req: ResourceRequest): AIRequestRecommendation {
  if (req.urgency === 'Critical' || req.urgency === 'High') {
    return {
      decision: 'Approve',
      confidence: 94,
      rationale: `High urgency request aligned with verified flood incident in ${req.district}. Recommended depot dispatch route available with negligible safety buffer degradation.`,
      depotImpact: 'Stock remains above 65% minimum safety threshold post-fulfillment.',
    };
  }
  return {
    decision: 'Flag for Review',
    confidence: 78,
    rationale: `Medium/Low urgency item requested. Stock availability is adequate, but logistics dispatch capacity is currently prioritized for Kota Bharu emergency response.`,
    depotImpact: 'Deferred dispatch recommended to prioritize Critical sector operations.',
  };
}

export const RequestApprovalStage: React.FC<RequestApprovalStageProps> = ({
  requests,
  onApprove,
  onReject,
  onSelectRequest,
}) => {
  const [_hilDecisions, setHilDecisions] = useState<Record<string, 'approved' | 'overridden'>>({});
  const [approvingRequest, setApprovingRequest] = useState<ResourceRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<ResourceRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const pendingRequests = requests.filter((r) => r.status === 'Pending Approval');
  const historicalRequests = requests.filter((r) => r.status !== 'Pending Approval');

  const handleOpenApproveModal = (e: React.MouseEvent, req: ResourceRequest) => {
    e.stopPropagation();
    setApprovingRequest(req);
  };

  const handleConfirmApprove = () => {
    if (!approvingRequest) return;
    setHilDecisions((prev) => ({ ...prev, [approvingRequest.id]: 'approved' }));
    onApprove(approvingRequest.id);
    setApprovingRequest(null);
  };

  const handleOpenRejectModal = (e: React.MouseEvent, req: ResourceRequest) => {
    e.stopPropagation();
    setRejectingRequest(req);
    setRejectionReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectingRequest) return;
    setHilDecisions((prev) => ({ ...prev, [rejectingRequest.id]: 'overridden' }));
    onReject(rejectingRequest.id, rejectionReason);
    setRejectingRequest(null);
    setRejectionReason('');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
            2
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClipboardCheck size={16} className="text-amber-600" />
              Request Review & HIL Approval Pipeline
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Human-in-the-Loop decision support · Review pending resupply authorizations and historical approvals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Clock size={12} />
            {pendingRequests.length} Pending Approval
          </span>
        </div>
      </div>

      {/* Pending Queue Section */}
      <div className="divide-y divide-slate-100">
        {pendingRequests.length > 0 ? (
          pendingRequests.map((req) => {
            const aiRec = getAIRequestRecommendation(req);

            return (
              <div
                key={req.id}
                className="p-5 transition-colors hover:bg-slate-50/60"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap md:flex-nowrap">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-400">{req.requestId}</span>
                      <DisasterBadge type="severity" value={req.urgency} />
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        {req.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{req.itemRequested}</h4>

                    <div className="flex items-center gap-3 text-xs font-medium text-slate-600 flex-wrap">
                      <span className="font-bold text-blue-700">
                        {req.quantityRequested.toLocaleString()} {req.unit}
                      </span>
                      <span>·</span>
                      <span>
                        Requested by <strong className="text-slate-800">{req.requestorName}</strong> ({req.agency})
                      </span>
                      <span>·</span>
                      <span>
                        Target: <strong className="text-slate-800">{req.district} Sector</strong>
                      </span>
                    </div>

                    {/* Official Justification preview */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                        Official Justification
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">{req.justification}</p>
                    </div>

                    {/* HIL AI Advisory Card */}
                    <div className="border border-violet-200 bg-gradient-to-r from-violet-50/90 to-indigo-50/90 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                            <Sparkles size={11} className="text-white" />
                          </div>
                          <span className="text-xs font-bold text-violet-900">AI Decision Advisory (HIL)</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                            {aiRec.decision}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-violet-700">{aiRec.confidence}% confidence</span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-normal">{aiRec.rationale}</p>
                      <p className="text-[11px] font-medium text-violet-800 italic">Depot Impact: {aiRec.depotImpact}</p>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col gap-2 shrink-0 self-start">
                    <button
                      onClick={(e) => handleOpenApproveModal(e, req)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      <CheckCircle size={14} />
                      Approve Request
                    </button>

                    <button
                      onClick={(e) => handleOpenRejectModal(e, req)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectRequest?.(req)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 text-slate-500 hover:text-slate-900 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-5 py-8 text-center bg-slate-50/50">
            <CheckCircle size={24} className="text-emerald-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">All pending resource requests have been processed</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Approved items have moved to Stage 3 Allocation Tracker below.</p>
          </div>
        )}
      </div>

      {/* Historical Approvals / Rejections (Collapsible & Viewable) */}
      {historicalRequests.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50/30">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Processed Request History ({historicalRequests.length})
            </span>
            <span className="text-[10px] text-slate-400">Click any row to view audit details</span>
          </div>
          <div className="divide-y divide-slate-100">
            {historicalRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => onSelectRequest?.(req)}
                className="px-5 py-3 flex items-center justify-between text-xs hover:bg-blue-50/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-400">{req.requestId}</span>
                  <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {req.itemRequested}
                  </span>
                  <span className="text-slate-500">
                    ({req.quantityRequested} {req.unit})
                  </span>
                  <span className="text-slate-400">· {req.district}</span>
                </div>
                <div className="flex items-center gap-3">
                  {req.approvedBy && (
                    <span className="text-[11px] text-slate-500 font-medium">By: {req.approvedBy}</span>
                  )}
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] border ${
                      req.status === 'Approved' || req.status === 'Dispatched'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {req.status}
                  </span>
                  <Eye size={13} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <AnimatePresence>
        {approvingRequest && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setApprovingRequest(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-emerald-200 overflow-hidden"
            >
              <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} />
                  <h3 className="text-sm font-bold">Authorize Resource Dispatch</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setApprovingRequest(null)}
                  className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-500">{approvingRequest.requestId}</span>
                    <span className="font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                      {approvingRequest.urgency} Urgency
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">{approvingRequest.itemRequested}</p>
                  <p className="text-slate-700 font-medium">
                    Quantity to Allocate: <strong className="text-emerald-800">{approvingRequest.quantityRequested} {approvingRequest.unit}</strong>
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Destination: <strong className="text-slate-800">{approvingRequest.district} Sector</strong> · Requested by: <strong className="text-slate-800">{approvingRequest.requestorName}</strong> ({approvingRequest.agency})
                  </p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Confirming this request will mark the item as <strong className="text-slate-900">Approved</strong>, stamp your authorization credentials for audit tracking, and transfer the requisition to the active allocation & dispatch pipeline.
                </p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setApprovingRequest(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApprove}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    Confirm Authorization
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Resource Request Modal */}
      <AnimatePresence>
        {rejectingRequest && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setRejectingRequest(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden"
            >
              <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} />
                  <h3 className="text-sm font-bold">Reject Resource Request</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-500">{rejectingRequest.requestId}</span>
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                      {rejectingRequest.urgency} Urgency
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">{rejectingRequest.itemRequested}</p>
                  <p className="text-slate-600">
                    Quantity: <strong>{rejectingRequest.quantityRequested} {rejectingRequest.unit}</strong>
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Requested by: <strong>{rejectingRequest.requestorName}</strong> ({rejectingRequest.agency}) for <strong>{rejectingRequest.district}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Rejection Reason / Operational Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Insufficient regional depot stock, dispatch prioritized for critical flash flood sector..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-600 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRejectingRequest(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReject}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
