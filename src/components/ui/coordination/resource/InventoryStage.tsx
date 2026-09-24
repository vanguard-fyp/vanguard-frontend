import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Warehouse, Search, ChevronDown, ChevronUp, Plus, History, Sparkles } from 'lucide-react';

import type { ResourceItem, ResourceRequest, AIStockAdvisory } from '../../../../types';
import { getWarehouseContext } from '../../../../constants/components/resource';
import { ResupplyRequestModal } from './ResupplyRequestModal';

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
      forecastRationale: `Stock below safety reserve at ${item.warehouseLocation}. Proactive replenishment recommended.`,
      depletionTrend: 'Depletion rate: 6% per hour (Projected zero-stock in ~14 hours).',
    };
  }
  return {
    suggestedQty: item.minThreshold,
    urgency: 'Medium',
    confidence: 75,
    forecastRationale: `Stock level optimal at ${item.warehouseLocation}. Standard replenishment scheduled.`,
    depletionTrend: 'Nominal consumption rate.',
  };
}

export const InventoryStage: React.FC<InventoryStageProps> = ({
  inventory,
  requests,
  onRequestCreated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [requestModalItem, setRequestModalItem] = useState<ResourceItem | null>(null);

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.warehouseLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getWarehouseContext(item.warehouseLocation).nearDisaster.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...Array.from(new Set(inventory.map((i) => i.category)))];

  const handleOpenRequest = (item: ResourceItem) => {
    setRequestModalItem(item);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Warehouse size={16} className="text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Warehouse Inventory Stock & HIL Analytics
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time supply depot tracking mapped directly to active disaster zones and evacuation sectors.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search items, depots, sectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory List */}
      <div className="space-y-3">
        {filteredInventory.map((item) => {
          const isExpanded = expandedItemId === item.id;
          const itemRequests = requests.filter((r) => r.itemRequested === item.name);
          const pct = Math.min(100, Math.round((item.stockLevel / (item.minThreshold * 2)) * 100));
          const locCtx = getWarehouseContext(item.warehouseLocation);
          const aiAdvisory = getAIStockAdvisory(item);

          return (
            <motion.div
              key={item.id}
              layout
              className={`bg-white border rounded-xl overflow-hidden transition-all shadow-2xs ${
                isExpanded ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Main Card Row */}
              <div
                onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {item.displayId || (item.id.startsWith('res-') ? item.id.split('-').slice(0, 3).join('-').toUpperCase() : item.id.length > 13 ? `RES-${item.id.slice(0, 6).toUpperCase()}` : item.id)}
                    </span>
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
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5 flex-wrap">
                    <span className="text-slate-700 font-semibold">{item.warehouseLocation}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">
                      📍 {locCtx.nearDisaster}
                    </span>
                  </div>
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
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Depot Location & Sector</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">{item.warehouseLocation}</p>
                        <p className="text-[10px] text-blue-600 font-medium mt-0.5">{locCtx.nearDisaster}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Active Requests</p>
                        <p className="text-xs font-bold text-blue-700 mt-0.5">{itemRequests.length} pending/issued</p>
                      </div>
                    </div>

                    {/* HIL AI Analytics Card */}
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50/60 border border-violet-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-white">
                            <Sparkles size={11} />
                          </div>
                          <span className="text-xs font-bold text-violet-900">HIL AI Inventory Analytics</span>
                        </div>
                        <span className="text-[11px] font-bold text-violet-700 font-mono">{aiAdvisory.confidence}% confidence</span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-normal">{aiAdvisory.forecastRationale}</p>
                      <p className="text-[11px] font-semibold text-violet-800 italic">{aiAdvisory.depletionTrend}</p>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 text-violet-900 border border-violet-200 text-xs font-semibold rounded-lg shadow-2xs">
                          <Sparkles size={12} className="text-violet-600" />
                          <span>AI Target Buffer: <strong>+{aiAdvisory.suggestedQty} {item.unit}</strong></span>
                        </span>
                      </div>
                    </div>

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
                                <span className="font-mono font-bold text-slate-400 mr-2">{req.requestId || req.id}</span>
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
            </motion.div>
          );
        })}

        {filteredInventory.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <Search size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No related searching criteria found</p>
            <p className="text-xs text-slate-400 mt-1">
              No warehouse inventory items match your search &ldquo;{searchQuery}&rdquo; or category filter.
            </p>
          </div>
        )}
      </div>

      {/* Resupply Request Modal */}
      <AnimatePresence>
        {requestModalItem && (
          <ResupplyRequestModal
            item={requestModalItem}
            onClose={() => setRequestModalItem(null)}
            onSubmit={onRequestCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

