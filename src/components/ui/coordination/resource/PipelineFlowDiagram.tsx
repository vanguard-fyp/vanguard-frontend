import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  Box,
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
  /** open the 3D flow with this request selected */
  onShowIn3D?: (req: ResourceRequest) => void;
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

/* Same road, lots and status colours as the 3D flow, so both views read alike. */
const ROAD = '#c5cdd8';
const LOT = '#dfe5ec';
type Mark = 'Pending Approval' | 'Approved' | 'Dispatched' | 'Delivered';
const STATUS_MARK: Record<Mark, { hex: string; label: string; at: number }> = {
  'Pending Approval': { hex: '#f59e0b', label: 'Waiting for approval', at: 5 },
  Approved: { hex: '#3b82f6', label: 'Approved, at the origin', at: 22 },
  Dispatched: { hex: '#06b6d4', label: 'On the way', at: 58 },
  Delivered: { hex: '#14b8a6', label: 'Delivered', at: 95 },
};
const MARKS = Object.keys(STATUS_MARK) as Mark[];

/** Side view of the 3D flow's truck: body in the status colour. */
const TruckGlyph: React.FC<{ hex: string }> = ({ hex }) => (
  <svg width="30" height="18" viewBox="0 0 30 18" aria-hidden>
    <rect x="1" y="2" width="18" height="10" rx="1.6" fill={hex} />
    <rect x="1" y="2" width="18" height="3" rx="1.6" fill="#ffffff" opacity="0.25" />
    <path d="M20 5h5.2l3.3 3.6V12H20z" fill="#f8fafc" stroke="#64748b" strokeWidth="0.9" strokeLinejoin="round" />
    <path d="M22 6.4h2.6l1.7 1.9H22z" fill="#93c5fd" />
    <rect x="0.5" y="12" width="28.5" height="1.6" rx="0.8" fill="#334155" />
    <circle cx="6.5" cy="14.4" r="2.6" fill="#1e293b" />
    <circle cx="6.5" cy="14.4" r="1" fill="#cbd5e1" />
    <circle cx="23" cy="14.4" r="2.6" fill="#1e293b" />
    <circle cx="23" cy="14.4" r="1" fill="#cbd5e1" />
  </svg>
);

/** Delivered supplies: the crates the 3D flow leaves at the destination. */
const CrateGlyph: React.FC<{ hex: string }> = ({ hex }) => (
  <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden>
    {[[1, 9], [11, 9], [6, 1]].map(([x, y]) => (
      <g key={`${x},${y}`}>
        <rect x={x} y={y} width="9" height="8" rx="1.2" fill={hex} />
        <path d={`M${x} ${y + 3}h9M${x + 4.5} ${y}v8`} stroke="#ffffff" strokeWidth="0.8" opacity="0.55" />
      </g>
    ))}
  </svg>
);

/** A request not yet approved: the amber beacon from the 3D flow. */
const BeaconGlyph: React.FC<{ hex: string; still: boolean }> = ({ hex, still }) => (
  <span className="relative flex w-4 h-4 items-center justify-center" aria-hidden>
    {!still && <span className="absolute inset-0 rounded-sm rotate-45 animate-ping opacity-50" style={{ background: hex }} />}
    <span className="relative w-3 h-3 rounded-[3px] rotate-45" style={{ background: hex }} />
  </span>
);

/* ── Flow chart: origin lot ══ road with each request on it ══ destination lot ── */

type NodeKind = 'supplier' | 'depot' | 'incident';
const NODE: Record<NodeKind, { icon: React.ReactNode; caption: string }> = {
  supplier: { icon: <Factory size={15} />, caption: 'Supplier' },
  depot: { icon: <Warehouse size={15} />, caption: 'Depot' },
  incident: { icon: <AlertTriangle size={15} />, caption: 'Incident' },
};

/** A place on the map: a paved lot with its building, named beside it. */
const FlowNode: React.FC<{ kind: NodeKind; label: string; end?: boolean }> = ({ kind, label, end }) => (
  <span className={`flex items-center gap-2.5 min-w-0 ${end ? 'flex-row-reverse text-right' : ''}`}>
    <span
      className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${kind === 'incident' ? 'text-red-600' : 'text-slate-700'}`}
      style={{ background: LOT, boxShadow: 'inset 0 -3px 0 rgba(15,23,42,0.08)' }}
    >
      {NODE[kind].icon}
    </span>
    <span className="min-w-0">
      <span className="block text-[10px] font-medium text-slate-400 leading-tight">{NODE[kind].caption}</span>
      <span className="block truncate text-xs font-semibold text-slate-800" title={label}>{label}</span>
    </span>
  </span>
);

const RouteFlow: React.FC<Pick<PipelineFlowDiagramProps, 'requests' | 'onSelectRequest' | 'onShowIn3D'>> = ({ requests, onSelectRequest, onShowIn3D }) => {
  const [openRoute, setOpenRoute] = useState<string | null>(null);
  const still = !!useReducedMotion();
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
        const open = openRoute === key;
        const units = [...new Set(r.items.map((i) => i.unit))];
        const marks = MARKS
          .map((status) => ({ status, n: r.items.filter((i) => (i.status === 'Fulfilled' ? 'Delivered' : i.status) === status).length }))
          .filter((g) => g.n > 0);
        // the furthest group sets how much of the road is lit and names the route's state
        const lead = marks[marks.length - 1];
        const leadMark = lead ? STATUS_MARK[lead.status] : null;
        return (
          <li key={key} className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenRoute(open ? null : key);
              }}
              aria-expanded={open}
              className="w-full px-3 py-3 grid grid-cols-[minmax(0,190px)_1fr_minmax(0,190px)_auto] items-center gap-3 text-left cursor-pointer rounded-xl"
            >
              <FlowNode kind={r.fromKind} label={r.from} />
              <span className="min-w-[150px]">
                <span className="flex items-baseline justify-between gap-2 text-[10px] leading-none mb-4">
                  <span className="font-medium text-slate-500 whitespace-nowrap">
                    {r.items.length} request{r.items.length === 1 ? '' : 's'}
                    {units.length === 1 ? ` · ${sumQty(r.items).toLocaleString()} ${units[0]}` : ''}
                  </span>
                  {leadMark && <span className="font-semibold whitespace-nowrap" style={{ color: leadMark.hex }}>{leadMark.label}</span>}
                </span>
                {/* the road: asphalt, a dashed centre line, and the stretch already covered lit in the status colour */}
                <span className="relative block h-3 rounded-full" style={{ background: ROAD }}>
                  <span className="absolute inset-x-2 top-1/2 border-t border-dashed border-white" aria-hidden />
                  {leadMark && (
                    <motion.span
                      aria-hidden
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{ background: leadMark.hex, opacity: 0.28 }}
                      initial={still ? false : { width: 0 }}
                      animate={{ width: `${leadMark.at}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                    />
                  )}
                  {marks.map(({ status, n }) => {
                    const mark = STATUS_MARK[status];
                    return (
                      <motion.span
                        key={status}
                        title={`${n} ${mark.label.toLowerCase()}`}
                        className="absolute bottom-[3px] -translate-x-1/2 flex items-end"
                        initial={still || status === 'Pending Approval' ? false : { left: '4%' }}
                        animate={{ left: `${mark.at}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                      >
                        {status === 'Pending Approval' ? <BeaconGlyph hex={mark.hex} still={still} /> : status === 'Delivered' ? <CrateGlyph hex={mark.hex} /> : <TruckGlyph hex={mark.hex} />}
                        {n > 1 && (
                          <span className="-ml-1 mb-1.5 px-1 rounded-full bg-white border text-[9px] font-bold leading-[14px] tabular-nums" style={{ color: mark.hex, borderColor: mark.hex }}>
                            {n}
                          </span>
                        )}
                      </motion.span>
                    );
                  })}
                </span>
              </span>
              <FlowNode kind={r.toKind} label={r.to} end />
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
                    <li key={q.id} className="flex items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRequest?.(q);
                        }}
                        className="flex-1 min-w-0 px-4 py-2 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_200px_auto] items-center gap-3 text-left text-xs hover:bg-slate-50 cursor-pointer"
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
                      {onShowIn3D && q.status !== 'Rejected' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShowIn3D(q);
                          }}
                          title="Show in 3D flow"
                          aria-label={`Show ${q.display_id} in 3D flow`}
                          className="shrink-0 mr-2 p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                        >
                          <Box size={14} />
                        </button>
                      )}
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

export const PipelineFlowDiagram: React.FC<PipelineFlowDiagramProps> = ({ inventory, requests, onNavigateStage, onSelectRequest, onShowIn3D }) => {
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
    <div className="max-w-4xl mx-auto py-2">
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
                      <RouteFlow requests={stage.flows} onSelectRequest={onSelectRequest} onShowIn3D={onShowIn3D} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* a short stretch of road joins one stage to the next */}
            {idx < stages.length - 1 && (
              <div className="flex justify-center" aria-hidden>
                <span className="block w-2.5 h-7" style={{ background: ROAD }}>
                  <span className="block mx-auto w-0 h-full border-l border-dashed border-white" />
                </span>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
