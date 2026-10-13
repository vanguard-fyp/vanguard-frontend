import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUpRight,
  Building2,
  ChevronDown,
  ChevronUp,
  Factory,
  FileCheck,
  Home,
  Truck,
  Warehouse,
} from 'lucide-react';
import type { ResourceItem, ResourceRequest } from '../../../../types';
import { requestFlow } from '../../../../utils/resourceFlow';
import { relativeTime } from '../../../../utils/display';
import { MiniTrack, STATUS_TEXT, requestRoute } from './ResourceUI';

interface PipelineFlowDiagramProps {
  inventory: ResourceItem[];
  requests: ResourceRequest[];
  onNavigateStage?: (stage: 1 | 2 | 3) => void;
  onSelectRequest?: (req: ResourceRequest) => void;
}

interface StatItem {
  label: string;
  value: string;
  alert?: boolean;
}

interface Stage {
  id: string;
  stageNumber: 1 | 2 | 3;
  number: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  border: string;
  badge: string;
  badgeText: string;
  stats: StatItem[];
  /** requests whose routes are drawn when the stage is expanded */
  flows: ResourceRequest[];
  flowTitle: string;
}

const sumQty = (rs: ResourceRequest[]) => rs.reduce((s, r) => s + (r.quantity_requested || 0), 0);

/* ── Flow chart: source node ──(n requests)──▶ destination node ───────────── */

type NodeKind = 'supplier' | 'depot' | 'incident';
const NODE: Record<NodeKind, { icon: React.ReactNode; cls: string }> = {
  supplier: { icon: <Factory size={13} />, cls: 'border-slate-300 bg-slate-50 text-slate-700' },
  depot: { icon: <Warehouse size={13} />, cls: 'border-amber-300 bg-amber-50 text-amber-900' },
  incident: { icon: <AlertTriangle size={13} />, cls: 'border-rose-300 bg-rose-50 text-rose-900' },
};

const FlowNode: React.FC<{ kind: NodeKind; label: string }> = ({ kind, label }) => (
  <span className={`inline-flex items-center gap-1.5 max-w-[220px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${NODE[kind].cls}`}>
    <span className="shrink-0">{NODE[kind].icon}</span>
    <span className="truncate">{label}</span>
  </span>
);

/** Edge colour follows the least-advanced request on the route (where attention is needed). */
const edgeTone = (rs: ResourceRequest[]) =>
  rs.some((r) => r.status === 'Pending Approval')
    ? { line: 'bg-amber-400', head: 'border-l-amber-400', text: 'text-amber-800' }
    : rs.some((r) => r.status === 'Approved' || r.status === 'Dispatched')
      ? { line: 'bg-blue-500', head: 'border-l-blue-500', text: 'text-blue-800' }
      : { line: 'bg-emerald-500', head: 'border-l-emerald-500', text: 'text-emerald-800' };

const RouteFlow: React.FC<{ requests: ResourceRequest[]; onSelectRequest?: (r: ResourceRequest) => void }> = ({ requests, onSelectRequest }) => {
  const [openRoute, setOpenRoute] = useState<string | null>(null);
  const routes = useMemo(() => {
    const m = new Map<string, { from: string; to: string; fromKind: NodeKind; toKind: NodeKind; items: ResourceRequest[] }>();
    requests.forEach((r) => {
      const { from, to } = requestRoute(r);
      const restock = requestFlow(r) === 'replenishment';
      const key = `${from}→${to}`;
      if (!m.has(key)) m.set(key, { from, to, fromKind: restock ? 'supplier' : 'depot', toKind: restock ? 'depot' : 'incident', items: [] });
      m.get(key)!.items.push(r);
    });
    return [...m.entries()].sort((a, b) => b[1].items.length - a[1].items.length);
  }, [requests]);

  if (routes.length === 0) {
    return <p className="p-3 bg-slate-50 rounded-lg text-center text-xs text-slate-400">No requests at this stage.</p>;
  }
  return (
    <ul className="space-y-2">
      {routes.map(([key, r]) => {
        const tone = edgeTone(r.items);
        const open = openRoute === key;
        const units = [...new Set(r.items.map((i) => i.unit))];
        return (
          <li key={key} className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenRoute(open ? null : key);
              }}
              aria-expanded={open}
              className="w-full px-3 py-2.5 grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 text-left cursor-pointer hover:bg-slate-50 rounded-xl"
            >
              <FlowNode kind={r.fromKind} label={r.from} />
              {/* edge */}
              <span className="relative flex items-center min-w-[90px]">
                <span className={`flex-1 h-0.5 ${tone.line}`} />
                <span className={`w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] ${tone.head}`} />
                <span className={`absolute left-1/2 -translate-x-1/2 -top-4 whitespace-nowrap text-[10px] font-semibold ${tone.text}`}>
                  {r.items.length} request{r.items.length === 1 ? '' : 's'}
                  {units.length === 1 ? ` · ${sumQty(r.items).toLocaleString()} ${units[0]}` : ''}
                </span>
              </span>
              <FlowNode kind={r.toKind} label={r.to} />
              {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden border-t border-slate-100"
                >
                  {r.items.map((q) => (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRequest?.(q);
                        }}
                        className="w-full px-4 py-2 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_200px_auto] items-center gap-3 text-left text-xs hover:bg-slate-50 cursor-pointer"
                      >
                        <span className="font-mono text-slate-400">{q.display_id}</span>
                        <span className="truncate text-slate-800">
                          <span className="font-semibold">{q.item_requested || 'Supplies'}</span> {q.quantity_requested.toLocaleString()} {q.unit}
                          <span className="text-slate-400"> · {q.agency}</span>
                        </span>
                        <span className="hidden sm:block">
                          {q.status === 'Rejected' ? <span className="text-red-700 font-semibold">Rejected</span> : <MiniTrack req={q} />}
                        </span>
                        <span className={`text-[11px] ${STATUS_TEXT[q.status] ?? 'text-slate-500'}`}>{relativeTime(q.updated_at ?? q.requested_at) ?? ''}</span>
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
};

/* ── Stage cards ──────────────────────────────────────────────────────────── */

export const PipelineFlowDiagram: React.FC<PipelineFlowDiagramProps> = ({ inventory, requests, onNavigateStage, onSelectRequest }) => {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const criticalItems = inventory.filter((i) => i.status === 'Critical');
  const lowStockItems = inventory.filter((i) => i.status === 'Low Stock');
  const pending = requests.filter((r) => r.status === 'Pending Approval');
  const approved = requests.filter((r) => r.status === 'Approved');
  const dispatched = requests.filter((r) => r.status === 'Dispatched');
  const delivered = requests.filter((r) => r.status === 'Delivered' || r.status === 'Fulfilled');
  const open = requests.filter((r) => r.status !== 'Rejected' && r.status !== 'Delivered' && r.status !== 'Fulfilled');
  const oldestDispatch = dispatched
    .map((r) => r.dispatched_at)
    .filter((t): t is string => !!t)
    .sort()[0];

  const stages: Stage[] = [
    {
      id: 'depots',
      stageNumber: 1,
      number: '01',
      title: 'Depots & stock',
      subtitle: 'Where supplies are held',
      icon: Building2,
      border: 'border-blue-200 hover:border-blue-400',
      badge: 'bg-blue-100 text-blue-800',
      badgeText: `${inventory.length} stock lines`,
      stats: [
        { label: 'Units in stock', value: inventory.reduce((s, i) => s + i.stock_level, 0).toLocaleString() },
        { label: 'Critical', value: `${criticalItems.length} items`, alert: criticalItems.length > 0 },
        { label: 'Low', value: `${lowStockItems.length} items` },
      ],
      flows: open,
      flowTitle: 'All open flows',
    },
    {
      id: 'review',
      stageNumber: 2,
      number: '02',
      title: 'Waiting for approval',
      subtitle: 'Requests an officer still has to decide',
      icon: FileCheck,
      border: 'border-amber-200 hover:border-amber-400',
      badge: 'bg-amber-100 text-amber-800',
      badgeText: `${pending.length} waiting`,
      stats: [
        { label: 'Requests', value: String(pending.length), alert: pending.length > 0 },
        { label: 'Agencies asking', value: String(new Set(pending.map((r) => r.agency)).size) },
        { label: 'Destinations', value: String(new Set(pending.map((r) => requestRoute(r).to)).size) },
      ],
      flows: pending,
      flowTitle: 'Requested routes',
    },
    {
      id: 'transit',
      stageNumber: 3,
      number: '03',
      title: 'On the way',
      subtitle: 'Approved and moving',
      icon: Truck,
      border: 'border-blue-200 hover:border-blue-400',
      badge: 'bg-blue-100 text-blue-800',
      badgeText: `${approved.length + dispatched.length} moving`,
      stats: [
        { label: 'Approved, not left', value: String(approved.length) },
        { label: 'Dispatched', value: String(dispatched.length) },
        { label: 'Longest in transit', value: oldestDispatch ? (relativeTime(oldestDispatch) ?? '—').replace(' ago', '') : '—' },
      ],
      flows: [...approved, ...dispatched],
      flowTitle: 'Active routes',
    },
    {
      id: 'delivered',
      stageNumber: 3,
      number: '04',
      title: 'Delivered',
      subtitle: 'Arrived at the incident or received at the depot',
      icon: Home,
      border: 'border-emerald-200 hover:border-emerald-400',
      badge: 'bg-emerald-100 text-emerald-800',
      badgeText: `${delivered.length} delivered`,
      stats: [
        { label: 'Requests', value: String(delivered.length) },
        { label: 'To incidents', value: String(delivered.filter((r) => requestFlow(r) === 'requisition').length) },
        { label: 'Restocks received', value: String(delivered.filter((r) => requestFlow(r) === 'replenishment').length) },
      ],
      flows: delivered,
      flowTitle: 'Completed routes',
    },
  ];

  return (
    <div className="space-y-3 max-w-4xl mx-auto py-2">
      {stages.map((stage, idx) => {
        const isSelected = selectedStage === stage.id;
        const Icon = stage.icon;
        return (
          <React.Fragment key={stage.id}>
            <div
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                isSelected ? 'ring-2 ring-blue-500 border-blue-400 shadow-md' : stage.border
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedStage(isSelected ? null : stage.id)}
                aria-expanded={isSelected}
                className="w-full flex items-start justify-between gap-4 text-left cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shrink-0">
                    {stage.number}
                  </span>
                  <span>
                    <span className="flex items-center gap-2 flex-wrap">
                      <Icon size={16} className="text-slate-700" />
                      <span className="text-sm font-bold text-slate-900">{stage.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>{stage.badgeText}</span>
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">{stage.subtitle}</span>
                  </span>
                </span>
                <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 shrink-0">
                  {isSelected ? 'Hide flows' : 'Show flows'}
                  {isSelected ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>

              <div className="grid grid-cols-3 gap-2 mt-4 bg-slate-50/70 rounded-xl p-3">
                {stage.stats.map((stat) => (
                  <div key={stat.label}>
                    <span className="text-[11px] text-slate-500 block">{stat.label}</span>
                    <span className={`text-sm font-bold block mt-0.5 ${stat.alert ? 'text-red-600' : 'text-slate-800'}`}>{stat.value}</span>
                  </div>
                ))}
              </div>

              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-600">
                          {stage.flowTitle} <span className="text-slate-400 font-normal">· click a route to see its requests</span>
                        </p>
                        {onNavigateStage && (
                          <button
                            type="button"
                            onClick={() => onNavigateStage(stage.stageNumber)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                          >
                            Open stage {stage.stageNumber}
                            <ArrowUpRight size={11} />
                          </button>
                        )}
                      </div>
                      <RouteFlow requests={stage.flows} onSelectRequest={onSelectRequest} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {idx < stages.length - 1 && (
              <div className="flex justify-center" aria-hidden>
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-3 bg-slate-300" />
                  <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <ArrowDown size={12} />
                  </div>
                  <div className="w-0.5 h-3 bg-slate-300" />
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
