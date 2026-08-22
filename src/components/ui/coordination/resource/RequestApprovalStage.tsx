import React, { useState } from 'react';
import { ClipboardCheck, Clock, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { DisasterBadge } from '../../dashboard/DisasterBadge';
import type { ResourceRequest, AIRequestRecommendation } from '../../../../types';

interface RequestApprovalStageProps {
  requests: ResourceRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
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
}) => {
  const [_hilDecisions, setHilDecisions] = useState<Record<string, 'approved' | 'overridden'>>({});

  const pendingRequests = requests.filter((r) => r.status === 'Pending Approval');
  const historicalRequests = requests.filter((r) => r.status !== 'Pending Approval');

  const handleApproveWithHIL = (id: string) => {
    setHilDecisions((prev) => ({ ...prev, [id]: 'approved' }));
    onApprove(id);
  };

  const handleRejectWithHIL = (id: string) => {
    setHilDecisions((prev) => ({ ...prev, [id]: 'overridden' }));
    onReject(id);
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
              <div key={req.id} className="p-5 transition-colors hover:bg-slate-50/40">
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
                      <span className="font-bold text-blue-700">{req.quantityRequested.toLocaleString()} {req.unit}</span>
                      <span>·</span>
                      <span>Requested by <strong className="text-slate-800">{req.requestorName}</strong> ({req.agency})</span>
                      <span>·</span>
                      <span>Target: <strong className="text-slate-800">{req.district} Sector</strong></span>
                    </div>

                    {/* Official Justification preview */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Official Justification</p>
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
                      onClick={() => handleApproveWithHIL(req.id)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                    >
                      <CheckCircle size={14} />
                      Approve Request
                    </button>

                    <button
                      onClick={() => handleRejectWithHIL(req.id)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-colors"
                    >
                      <XCircle size={14} />
                      Reject
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

      {/* Historical Approvals / Rejections (Collapsible) */}
      {historicalRequests.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50/30">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Processed Request History ({historicalRequests.length})</span>
          </div>
          <div className="divide-y divide-slate-100">
            {historicalRequests.map((req) => (
              <div key={req.id} className="px-5 py-3 flex items-center justify-between text-xs hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-400">{req.requestId}</span>
                  <span className="font-bold text-slate-800">{req.itemRequested}</span>
                  <span className="text-slate-500">({req.quantityRequested} {req.unit})</span>
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
