import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Truck, Package, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, MapPin, Sparkles, Clock } from 'lucide-react';
import type { ResourceRequest } from '../../../../types';
import { lifecycleSteps } from '../../../../constants';

interface AllocationTrackerStageProps {
  requests: ResourceRequest[];
}

function getStepIndex(status: string): number {
  if (status === 'Delivered') return 3;
  if (status === 'Dispatched') return 2;
  if (status === 'Approved') return 1;
  return 0;
}

export const AllocationTrackerStage: React.FC<AllocationTrackerStageProps> = ({ requests }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeAllocations = requests.filter(
    (r) => r.status === 'Approved' || r.status === 'Dispatched'
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
            3
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Send size={16} className="text-blue-600" />
              Active Resource Allocation & Delivery Tracker
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Real-time transit pipeline · Click allocation row for end-to-end lifecycle tracking & estimated arrival times
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
          {activeAllocations.length} Active Logistics Transits
        </span>
      </div>

      {/* Allocation List */}
      <div className="divide-y divide-slate-100">
        {activeAllocations.length > 0 ? (
          activeAllocations.map((req) => {
            const isExpanded = expandedId === req.id;
            const currentStepIdx = getStepIndex(req.status);

            return (
              <div key={req.id} className="transition-colors hover:bg-slate-50/40">
                {/* Summary Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="px-5 py-4 flex items-center justify-between gap-4 cursor-pointer flex-wrap sm:flex-nowrap"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-400">{req.requestId}</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          req.status === 'Dispatched'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {req.status}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium ml-auto sm:ml-0">{req.timestamp}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{req.itemRequested}</h4>

                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 flex-wrap">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Package size={14} className="text-slate-400" />
                        <span>{req.quantityRequested.toLocaleString()} {req.unit}</span>
                      </div>
                      <ArrowRight size={13} className="text-slate-400" />
                      <div className="flex items-center gap-1.5 text-blue-800 font-bold">
                        <Truck size={14} className="text-blue-600" />
                        <span>{req.district} Sector ({req.agency})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-blue-600 hover:text-blue-700 underline">
                      {isExpanded ? 'Hide Lifecycle' : 'Track Lifecycle'}
                    </span>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Lifecycle View */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden bg-slate-50/80 border-t border-slate-100 px-5 py-5 space-y-5"
                    >
                      {/* Lifecycle Progress Pipeline */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">
                          End-to-End Delivery Milestone Progress
                        </p>

                        <div className="flex items-center justify-between relative px-2">
                          {lifecycleSteps.map((step, idx) => {
                            const isDone = idx < currentStepIdx;
                            const isCurrent = idx === currentStepIdx;

                            return (
                              <React.Fragment key={step}>
                                <div className="flex flex-col items-center gap-1.5 z-10">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                      isDone
                                        ? 'bg-emerald-600 text-white border-2 border-emerald-600'
                                        : isCurrent
                                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 border-2 border-blue-600'
                                        : 'bg-white text-slate-400 border-2 border-slate-300'
                                    }`}
                                  >
                                    {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                                  </div>
                                  <span
                                    className={`text-[11px] font-bold ${
                                      isDone ? 'text-emerald-700' : isCurrent ? 'text-blue-700' : 'text-slate-400'
                                    }`}
                                  >
                                    {step}
                                  </span>
                                </div>

                                {idx < lifecycleSteps.length - 1 && (
                                  <div className="flex-1 h-0.5 mx-2 bg-slate-200 relative -top-3">
                                    <div
                                      className={`h-full transition-all ${
                                        idx < currentStepIdx ? 'bg-emerald-600' : 'bg-slate-200'
                                      }`}
                                    />
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>

                      {/* AI Transit Estimation Box */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3.5 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles size={12} className="text-white" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-blue-900">AI Logistics Telemetry</span>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock size={10} /> ETA: ~1 hr 45 mins
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-normal">
                            Optimal highway transport route calculated avoiding inundated B14 arterial road. Fleet convoy maintaining 60 km/h speed profile.
                          </p>
                        </div>
                      </div>

                      {/* Detail Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white border border-slate-200 rounded-lg p-3 text-xs">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Dispatch Origin</p>
                          <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" />
                            NADMA Regional Depot
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Destination Drop point</p>
                          <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                            <MapPin size={12} className="text-blue-500" />
                            {req.district} Staging Post
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Fulfillment Officer</p>
                          <p className="font-bold text-slate-800 mt-0.5">{req.approvedBy || 'Resource Manager Ismail'}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          <div className="px-5 py-8 text-center bg-slate-50/50">
            <Package size={24} className="text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No active resource allocations currently in transit</p>
          </div>
        )}
      </div>
    </div>
  );
};
