import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Warehouse, Search, ChevronDown, ChevronUp, Plus, Send, History, Sparkles, ThumbsUp } from 'lucide-react';
import type { ResourceItem, ResourceRequest, AIStockAdvisory } from '../../../../types';

interface InventoryStageProps {
  inventory: ResourceItem[];
  requests: ResourceRequest[];
  onRequestCreated: (newReq: Partial<ResourceRequest>) => void;
}

const categoryColors: Record<string, string> = {
  Food: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Medical supplies': 'bg-pink-50 text-pink-800 border-pink-200',
  'Rescue equipment': 'bg-blue-50 text-blue-800 border-blue-200',
  Vehicles: 'bg-amber-50 text-amber-800 border-amber-200',
  'Emergency supplies': 'bg-purple-50 text-purple-800 border-purple-200',
};

function getAIStockAdvisory(item: ResourceItem): AIStockAdvisory {
  if (item.status === 'Critical') {
    return {
      suggestedQty: item.minThreshold * 3,
      urgency: 'Critical',
      confidence: 96,
      forecastRationale: `Critical stock depletion detected at ${item.warehouseLocation}. High evacuation influx in Kelantan requires immediate regional allocation.`,
      depletionTrend: 'Depletion rate: 15% per hour (Projected zero-stock in ~3.2 hours).',
    };
  }
  if (item.status === 'Low Stock') {
    return {
      suggestedQty: item.minThreshold * 2,
      urgency: 'High',
      confidence: 88,
      forecastRationale: `Stock level approaching minimum threshold. Preemptive resupply recommended prior to next rain surge.`,
      depletionTrend: 'Depletion rate: 6% per hour (Projected threshold breach in ~8 hours).',
    };
  }
  return {
    suggestedQty: item.minThreshold,
    urgency: 'Medium',
    confidence: 82,
    forecastRationale: `Current stock buffer is sufficient. Routine restock scheduled to maintain optimal emergency buffer.`,
    depletionTrend: 'Depletion rate: <2% per hour (Buffer stable).',
  };
}

export const InventoryStage: React.FC<InventoryStageProps> = ({
  inventory,
  requests,
  onRequestCreated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [requestingItemId, setRequestingItemId] = useState<string | null>(null);

  // Form fields for resupply request
  const [reqQty, setReqQty] = useState<number>(100);
  const [reqDistrict, setReqDistrict] = useState<string>('Kota Bharu');
  const [reqAgency, setReqAgency] = useState<string>('JKM Kelantan');
  const [reqUrgency, setReqUrgency] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [reqJustification, setReqJustification] = useState<string>('');
  const [, setHilDecision] = useState<'applied' | 'overridden' | null>(null);

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.warehouseLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenRequest = (item: ResourceItem) => {
    const aiAdvisory = getAIStockAdvisory(item);
    setRequestingItemId(item.id);
    setReqQty(aiAdvisory.suggestedQty);
    setReqUrgency(aiAdvisory.urgency);
    setReqJustification(`[HIL AI Advisory] Emergency resupply request for ${item.name} at ${item.warehouseLocation}. ${aiAdvisory.forecastRationale}`);
    setHilDecision(null);
  };

  const handleApplyAISuggestion = (item: ResourceItem) => {
    const aiAdvisory = getAIStockAdvisory(item);
    setReqQty(aiAdvisory.suggestedQty);
    setReqUrgency(aiAdvisory.urgency);
    setHilDecision('applied');
  };

  const handleSubmitRequest = (item: ResourceItem) => {
    onRequestCreated({
      itemRequested: item.name,
      resourceCategory: item.category,
      quantityRequested: reqQty,
      unit: item.unit,
      district: reqDistrict,
      agency: reqAgency,
      urgency: reqUrgency,
      justification: reqJustification,
      requestorName: 'Logistics Officer (HIL AI Supported)',
    });
    setRequestingItemId(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Stage Header */}
      <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
            1
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Warehouse size={16} className="text-blue-600" />
              Warehouse Inventory Stock & HIL Analytics
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Real-time depot stock tracking & HIL AI depletion forecasting · Click item for AI resupply advisories
            </p>
          </div>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inventory items..."
            className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 w-56 shadow-2xs transition-colors"
          />
        </div>
      </div>

      {/* Inventory List */}
      <div className="divide-y divide-slate-100">
        {filteredInventory.map((item) => {
          const isExpanded = expandedItemId === item.id;
          const isRequesting = requestingItemId === item.id;
          const itemRequests = requests.filter((r) => r.itemRequested === item.name);
          const pct = Math.min((item.stockLevel / (item.minThreshold * 4)) * 100, 100);
          const aiAdvisory = getAIStockAdvisory(item);

          return (
            <div key={item.id} className="transition-colors hover:bg-slate-50/50">
              {/* Row summary */}
              <div
                onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                className="px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-slate-400">{item.id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${categoryColors[item.category]}`}>
                      {item.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.status === 'Critical'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : item.status === 'Low Stock'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.status !== 'Sufficient' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-1">
                        <Sparkles size={10} /> AI Advisory Available
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{item.warehouseLocation}</p>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  {/* Stock Bar */}
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs font-bold text-slate-900">{item.stockLevel.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{item.unit}</span>
                    </div>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.status === 'Critical'
                            ? 'bg-red-500'
                            : item.status === 'Low Stock'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRequest(item);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg transition-colors shadow-2xs"
                  >
                    <Plus size={13} />
                    Request Resupply
                  </button>

                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {/* Expanded details & history & HIL Advisory */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden bg-slate-50/80 border-t border-slate-100 px-5 py-4 space-y-4"
                  >
                    {/* Item Stats Detail */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Available Stock</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">{item.stockLevel.toLocaleString()} {item.unit}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Min Safety Threshold</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">{item.minThreshold.toLocaleString()} {item.unit}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Depot Location</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">{item.warehouseLocation}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Active Requests</p>
                        <p className="text-xs font-bold text-blue-700 mt-0.5">{itemRequests.length} pending/issued</p>
                      </div>
                    </div>

                    {/* HIL AI Stock Analytics & Depletion Forecast */}
                    <div className="border border-violet-200 bg-gradient-to-r from-violet-50/90 to-indigo-50/90 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                            <Sparkles size={12} className="text-white" />
                          </div>
                          <span className="text-xs font-bold text-violet-900">HIL AI Inventory Analytics</span>
                        </div>
                        <span className="text-[11px] font-bold text-violet-700">{aiAdvisory.confidence}% confidence</span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-normal">{aiAdvisory.forecastRationale}</p>
                      <p className="text-[11px] font-semibold text-violet-800 italic">{aiAdvisory.depletionTrend}</p>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            handleOpenRequest(item);
                            handleApplyAISuggestion(item);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-2xs"
                        >
                          <ThumbsUp size={12} />
                          Apply AI Suggested Resupply ({aiAdvisory.suggestedQty} {item.unit})
                        </button>
                      </div>
                    </div>

                    {/* Resupply Request Inline Form */}
                    {isRequesting && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                            <Plus size={14} className="text-blue-600" />
                            Create Resource Request for: {item.name}
                          </h5>
                          <button
                            onClick={() => setRequestingItemId(null)}
                            className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Quantity ({item.unit})</label>
                            <input
                              type="number"
                              value={reqQty}
                              onChange={(e) => {
                                setReqQty(Number(e.target.value));
                                setHilDecision('overridden');
                              }}
                              className="mt-1 w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Target District</label>
                            <input
                              type="text"
                              value={reqDistrict}
                              onChange={(e) => setReqDistrict(e.target.value)}
                              className="mt-1 w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Requesting Agency</label>
                            <input
                              type="text"
                              value={reqAgency}
                              onChange={(e) => setReqAgency(e.target.value)}
                              className="mt-1 w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Official Justification</label>
                          <textarea
                            rows={2}
                            value={reqJustification}
                            onChange={(e) => setReqJustification(e.target.value)}
                            className="mt-1 w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-normal resize-none"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSubmitRequest(item)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                          >
                            <Send size={13} />
                            Submit to Approval Pipeline
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Related Requests History */}
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <History size={12} />
                        Request Lifecycle History ({itemRequests.length})
                      </h5>
                      {itemRequests.length > 0 ? (
                        <div className="space-y-2">
                          {itemRequests.map((req) => (
                            <div
                              key={req.id}
                              className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-mono font-bold text-slate-400 mr-2">{req.requestId}</span>
                                <span className="font-bold text-slate-800">{req.quantityRequested} {req.unit}</span>
                                <span className="text-slate-500 ml-2">by {req.agency} ({req.district})</span>
                              </div>
                              <span
                                className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                  req.status === 'Approved' || req.status === 'Dispatched'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : req.status === 'Pending Approval'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {req.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium italic">No prior request history recorded for this inventory item.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
