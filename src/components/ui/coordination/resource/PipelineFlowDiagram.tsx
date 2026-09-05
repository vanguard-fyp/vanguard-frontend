import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  FileCheck,
  Truck,
  Home,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
} from 'lucide-react';
import type { ResourceItem, ResourceRequest } from '../../../../types';

interface PipelineFlowDiagramProps {
  inventory: ResourceItem[];
  requests: ResourceRequest[];
  onNavigateStage?: (stage: 1 | 2 | 3) => void;
}

interface StatItem {
  label: string;
  value: string;
  alert?: boolean;
}

interface StageItem {
  title: string;
  meta: string;
  badge: string;
  badgeColor: string;
}

interface Stage {
  id: string;
  stageNumber: 1 | 2 | 3;
  number: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  border: string;
  bg: string;
  badge: string;
  badgeText: string;
  stats: StatItem[];
  items: StageItem[];
}

export const PipelineFlowDiagram: React.FC<PipelineFlowDiagramProps> = ({
  inventory,
  requests,
  onNavigateStage,
}) => {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Compute metrics for each pipeline stage
  const totalStockUnits = inventory.reduce((sum, i) => sum + i.stockLevel, 0);
  const criticalItems = inventory.filter((i) => i.status === 'Critical');
  const lowStockItems = inventory.filter((i) => i.status === 'Low Stock');

  const pendingRequests = requests.filter((r) => r.status === 'Pending Approval');
  const approvedRequests = requests.filter((r) => r.status === 'Approved');
  const inTransitRequests = requests.filter((r) => r.status === 'Dispatched');
  const deliveredRequests = requests.filter((r) => r.status === 'Dispatched');

  const stages: Stage[] = [
    {
      id: 'depots',
      stageNumber: 1,
      number: '01',
      title: 'Strategic Supply Depots & Warehouses',
      subtitle: 'Source Storage Hubs',
      icon: Building2,
      color: 'blue',
      border: 'border-blue-200 hover:border-blue-400',
      bg: 'bg-blue-50/50',
      badge: 'bg-blue-100 text-blue-800',
      badgeText: `${inventory.length} Stock Categories`,
      stats: [
        { label: 'Total Volume', value: `${totalStockUnits.toLocaleString()} units` },
        { label: 'Critical Stock', value: `${criticalItems.length} items`, alert: criticalItems.length > 0 },
        { label: 'Low Buffer', value: `${lowStockItems.length} items` },
      ],
      items: inventory.map((i) => ({
        title: i.name,
        meta: `${i.warehouseLocation} · ${i.stockLevel.toLocaleString()} ${i.unit}`,
        badge: i.status,
        badgeColor: i.status === 'Critical' ? 'bg-red-100 text-red-800' : i.status === 'Low Stock' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
      })),
    },
    {
      id: 'allocation',
      stageNumber: 2,
      number: '02',
      title: 'EOC Intake & Resource Allocation',
      subtitle: 'Verification & Approval Queue',
      icon: FileCheck,
      color: 'violet',
      border: 'border-violet-200 hover:border-violet-400',
      bg: 'bg-violet-50/50',
      badge: 'bg-violet-100 text-violet-800',
      badgeText: `${pendingRequests.length + approvedRequests.length} Active Demands`,
      stats: [
        { label: 'Pending Approval', value: `${pendingRequests.length} requests`, alert: pendingRequests.length > 0 },
        { label: 'Approved & Enqueued', value: `${approvedRequests.length} requests` },
        { label: 'Demand Districts', value: `${new Set(requests.map((r) => r.district)).size} zones` },
      ],
      items: requests.filter((r) => r.status === 'Pending Approval' || r.status === 'Approved').map((r) => ({
        title: `${r.itemRequested} (${r.quantityRequested} ${r.unit})`,
        meta: `Requested by ${r.agency} for ${r.district}`,
        badge: r.status,
        badgeColor: r.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
      })),
    },
    {
      id: 'transit',
      stageNumber: 3,
      number: '03',
      title: 'Logistics Convoys & Mobilisation',
      subtitle: 'In-Transit Ground Transport',
      icon: Truck,
      color: 'amber',
      border: 'border-amber-200 hover:border-amber-400',
      bg: 'bg-amber-50/50',
      badge: 'bg-amber-100 text-amber-800',
      badgeText: `${inTransitRequests.length} Shipments Rolling`,
      stats: [
        { label: 'Active Convoys', value: `${inTransitRequests.length} in-transit` },
        { label: 'Average ETA', value: '~2.4 hours' },
        { label: 'Fleet Route Status', value: 'High Waterway Alert' },
      ],
      items: inTransitRequests.map((r) => ({
        title: `${r.itemRequested} — Dispatched`,
        meta: `En route to ${r.district} · Destination: ${r.agency}`,
        badge: 'Dispatched',
        badgeColor: 'bg-blue-100 text-blue-800 animate-pulse',
      })),
    },
    {
      id: 'destination',
      stageNumber: 3,
      number: '04',
      title: 'Evacuation Centers & Frontline Relief Hubs',
      subtitle: 'Final Staging & Distribution',
      icon: Home,
      color: 'emerald',
      border: 'border-emerald-200 hover:border-emerald-400',
      bg: 'bg-emerald-50/50',
      badge: 'bg-emerald-100 text-emerald-800',
      badgeText: `${deliveredRequests.length} Deliveries Received`,
      stats: [
        { label: 'Fulfilled Missions', value: `${deliveredRequests.length} completed` },
        { label: 'Relief Capacity', value: '88% Supplied' },
        { label: 'Field Status', value: 'Active Distribution' },
      ],
      items: deliveredRequests.map((r) => ({
        title: `${r.itemRequested} (${r.quantityRequested} ${r.unit})`,
        meta: `Delivered to ${r.district} (${r.agency})`,
        badge: 'Dispatched',
        badgeColor: 'bg-emerald-100 text-emerald-800',
      })),
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Top-to-Bottom Flow Sequence */}
      <div className="space-y-3 relative">
        {stages.map((stage, idx) => {
          const isSelected = selectedStage === stage.id;
          const Icon = stage.icon;

          return (
            <React.Fragment key={stage.id}>
              <div
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all cursor-pointer relative overflow-hidden ${
                  isSelected ? 'ring-2 ring-blue-500 border-blue-400 shadow-md' : stage.border
                }`}
                onClick={() => setSelectedStage(isSelected ? null : stage.id)}
              >
                {/* Card Top Row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shrink-0">
                      {stage.number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon size={16} className="text-slate-700" />
                        <h3 className="text-sm font-bold text-slate-900">{stage.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${stage.badge}`}>
                          {stage.badgeText}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{stage.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onNavigateStage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateStage(stage.stageNumber);
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Stage {stage.stageNumber} View</span>
                        <ArrowUpRight size={12} />
                      </button>
                    )}
                    <button className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800">
                      <span>{isSelected ? 'Collapse' : 'Inspect Items'}</span>
                      {isSelected ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Key Summary Metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 bg-slate-50/60 rounded-xl p-3">
                  {stage.stats.map((stat, sIdx) => (
                    <div key={sIdx} className="text-center sm:text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {stat.label}
                      </span>
                      <span
                        className={`text-xs font-bold block mt-0.5 ${
                          stat.alert ? 'text-red-600 font-extrabold' : 'text-slate-800'
                        }`}
                      >
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Expandable Key Item List */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Active Stage Inventory & Queue Items ({stage.items.length})
                          </p>
                          {onNavigateStage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateStage(stage.stageNumber);
                              }}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                            >
                              <span>Open Stage {stage.stageNumber} Workspace</span>
                              <ArrowUpRight size={11} />
                            </button>
                          )}
                        </div>
                        {stage.items.length === 0 ? (
                          <div className="p-3 bg-slate-50 rounded-lg text-center text-xs text-slate-400">
                            No active items currently stationed in this phase
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                            {stage.items.map((item, iIdx) => (
                              <div
                                key={iIdx}
                                onClick={(e) => {
                                  if (onNavigateStage) {
                                    e.stopPropagation();
                                    onNavigateStage(stage.stageNumber);
                                  }
                                }}
                                className={`bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-2xs transition-all ${
                                  onNavigateStage ? 'hover:border-blue-400 hover:shadow-xs cursor-pointer' : ''
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{item.meta}</p>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor}`}>
                                  {item.badge}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Connecting Top-to-Bottom Downward Flow Arrow */}
              {idx < stages.length - 1 && (
                <div className="flex items-center justify-center py-1">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-3 bg-gradient-to-b from-slate-300 to-blue-400" />
                    <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                      <ArrowDown size={12} className="animate-bounce" />
                    </div>
                    <div className="w-0.5 h-3 bg-gradient-to-b from-blue-400 to-slate-300" />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
