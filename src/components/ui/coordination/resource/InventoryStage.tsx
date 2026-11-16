import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  PackagePlus,
  Search,
  Send,
  Trash2,
  Warehouse as WarehouseIcon,
} from 'lucide-react';

import type { ResourceItem, ResourceRequest, Warehouse } from '../../../../types';
import { useDeleteInventoryItem, useInventory, useStockAdvisory, useWarehouses } from '../../../../hooks';
import { useToast } from '../../../../context/ToastContext';
import { StockAdvisoryCard } from './ResourceAdvisory';
import { Tag, type Tone } from '../../shared/Tag';
import { requestFlow } from '../../../../utils/resourceFlow';
import { relativeTime } from '../../../../utils/display';

/** resource_types.category values allowed by the schema (refine-schema.sql). */
const RESOURCE_CATEGORIES = ['Food', 'Medical supplies', 'Rescue equipment', 'Vehicles', 'Emergency supplies', 'Other'];

/** One colour language for stock everywhere: red = critical, amber = low, green = sufficient. */
const STOCK_TONE: Record<string, { bar: string; text: string; dot: string }> = {
  Critical: { bar: 'bg-red-500', text: 'text-red-700', dot: 'bg-red-500' },
  'Low Stock': { bar: 'bg-amber-500', text: 'text-amber-700', dot: 'bg-amber-500' },
  Sufficient: { bar: 'bg-emerald-500', text: 'text-slate-900', dot: 'bg-emerald-500' },
};

/** Request status as an outline tag, the same way incident status is shown. */
const REQUEST_TONE: Record<string, Tone> = {
  'Pending Approval': 'amber',
  Approved: 'blue',
  Dispatched: 'cyan',
  Delivered: 'teal',
  Rejected: 'red',
};

interface InventoryStageProps {
  requests: ResourceRequest[];
  onCreateRequisition: (item: ResourceItem, type: 'requisition' | 'replenishment') => void;
  /** inventory id to open and scroll to (header search deep link) */
  focusItemId?: string | null;
}

export const InventoryStage: React.FC<InventoryStageProps> = ({ requests, onCreateRequisition, focusItemId }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [openDepots, setOpenDepots] = useState<Record<string, boolean>>({});
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  /** The stock line whose full request history is open (others show the latest 3). */
  const [showAllHistory, setShowAllHistory] = useState<string | null>(null);

  const { data: inventory = [], isLoading, isError, refetch } = useInventory();
  const { data: warehouses = [] } = useWarehouses();
  const advisory = useStockAdvisory();
  const deleteItem = useDeleteInventoryItem();
  const toast = useToast();

  const advisoryById = useMemo(() => {
    const map: Record<string, NonNullable<typeof advisory.data>['items'][number]> = {};
    advisory.data?.items.forEach((a) => {
      map[a.inventory_id] = a;
    });
    return map;
  }, [advisory.data]);

  // Warehouse → its items (filtered). Depots needing attention come first.
  const depots = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (i: ResourceItem) =>
      (category === 'All' || i.category === category) && (!q || i.name.toLowerCase().includes(q));
    const byId: Record<string, ResourceItem[]> = {};
    inventory.filter(match).forEach((i) => {
      (byId[i.warehouse_id ?? 'none'] ??= []).push(i);
    });
    const rank = (s: string) => (s === 'Critical' ? 0 : s === 'Low Stock' ? 1 : 2);
    const rows: { key: string; warehouse?: Warehouse; items: ResourceItem[]; critical: number; low: number }[] = [
      ...warehouses.map((w) => ({ key: w.id, warehouse: w, items: byId[w.id] ?? [] })),
      ...(byId.none ? [{ key: 'none', warehouse: undefined, items: byId.none }] : []),
    ]
      .filter((d) => d.items.length > 0 || (!q && category === 'All'))
      .map((d) => ({
        ...d,
        items: [...d.items].sort((a, b) => rank(a.status) - rank(b.status) || a.name.localeCompare(b.name)),
        critical: d.items.filter((i) => i.status === 'Critical').length,
        low: d.items.filter((i) => i.status === 'Low Stock').length,
      }));
    return rows.sort((a, b) => b.critical - a.critical || b.low - a.low || (a.warehouse?.name ?? '~').localeCompare(b.warehouse?.name ?? '~'));
  }, [inventory, warehouses, search, category]);

  useEffect(() => {
    if (!focusItemId) return;
    const item = inventory.find((i) => i.id === focusItemId);
    if (!item) return;
    setOpenDepots((s) => ({ ...s, [item.warehouse_id ?? 'none']: true }));
    setExpandedItemId(item.id);
    requestAnimationFrame(() =>
      document.getElementById(`stock-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    );
  }, [focusItemId, inventory]);

  const filtering = search.trim() !== '' || category !== 'All';
  const isDepotOpen = (key: string) => openDepots[key] ?? (filtering || depots.length === 1);

  const handleDelete = async (item: ResourceItem) => {
    try {
      await deleteItem.mutateAsync(item.id);
      toast.success(`"${item.name}" removed from this depot's stock. The catalog entry is kept.`);
      setConfirmDeleteId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove inventory item');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <WarehouseIcon size={16} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Depots &amp; stock</h3>
          <span className="text-[11px] text-slate-400">{warehouses.length} depots · {inventory.length} stock lines</span>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search item…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            {['All', ...RESOURCE_CATEGORIES].map((c) => (
              <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">Loading inventory…</div>}
      {isError && (
        <div className="bg-white border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm font-bold text-red-700">Inventory could not be loaded</p>
          <button onClick={() => refetch()} className="text-xs font-bold text-blue-700 underline mt-1 cursor-pointer">Retry</button>
        </div>
      )}
      {!isLoading && !isError && depots.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">No stock matches these filters.</div>
      )}

      {/* Depot → items */}
      {depots.map((d) => {
        const open = isDepotOpen(d.key);
        return (
          <div key={d.key} className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenDepots((s) => ({ ...s, [d.key]: !open }))}
              className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                {open ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{d.warehouse?.name ?? 'Not linked to a depot'}</p>
                  {d.warehouse && <p className="text-[11px] text-slate-500 truncate">{d.warehouse.district}, {d.warehouse.state}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[11px] font-semibold">
                <span className="text-slate-500">{d.items.length} items</span>
                {d.critical > 0 && <Tag tone="red">{d.critical} critical</Tag>}
                {d.low > 0 && <Tag tone="amber">{d.low} low</Tag>}
              </div>
            </button>

            {open && (
              <div className="border-t border-slate-100 divide-y divide-slate-100">
                {d.items.length === 0 && <p className="px-4 py-4 text-xs text-slate-400">No stock recorded at this depot.</p>}
                {d.items.map((item) => {
                  const tone = STOCK_TONE[item.status] ?? STOCK_TONE.Sufficient;
                  const pct = item.min_threshold > 0
                    ? Math.min(100, Math.round((item.stock_level / (item.min_threshold * 2)) * 100))
                    : item.stock_level > 0 ? 100 : 0;
                  const isExpanded = expandedItemId === item.id;
                  const history = requests.filter(
                    (r) => r.resource_type_id === item.resource_type_id && (!r.warehouse_id || r.warehouse_id === item.warehouse_id)
                  );
                  return (
                    <div key={item.id} id={`stock-${item.id}`} className={focusItemId === item.id ? 'ring-2 ring-blue-400 ring-inset' : ''}>
                      <div
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="px-4 py-2.5 grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_180px_auto] items-center gap-3 cursor-pointer hover:bg-slate-50/70"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} title={item.status} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{item.category}</p>
                          </div>
                        </div>
                        <div className="hidden md:block">
                          <div className="flex items-baseline justify-between text-[11px]">
                            <span className={`font-bold ${tone.text}`}>{item.stock_level.toLocaleString()} <span className="font-medium text-slate-400">{item.unit}</span></span>
                            <span className="text-[10px] text-slate-400">min {item.min_threshold.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                            <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onCreateRequisition(item, 'requisition')}
                            disabled={item.stock_level <= 0}
                            title={item.stock_level <= 0 ? 'Nothing in stock to send' : 'Send this item to an incident'}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Send size={12} /> Send
                          </button>
                          <button
                            onClick={() => onCreateRequisition(item, 'replenishment')}
                            title="Order a restock for this depot"
                            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md cursor-pointer ${
                              item.status === 'Sufficient' ? 'text-slate-600 hover:bg-slate-100' : 'text-white bg-amber-600 hover:bg-amber-700'
                            }`}
                          >
                            <PackagePlus size={12} /> Restock
                          </button>
                          {confirmDeleteId === item.id ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 pl-1">
                              <AlertTriangle size={11} /> Remove?
                              <button onClick={() => handleDelete(item)} disabled={deleteItem.isPending} className="px-1.5 py-0.5 bg-red-600 text-white rounded cursor-pointer">Yes</button>
                              <button onClick={() => setConfirmDeleteId(null)} className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded cursor-pointer">No</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              title="Remove from this depot"
                              className="p-1.5 text-slate-300 hover:text-red-600 rounded-md cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden bg-slate-50/50 px-4 py-3 space-y-3"
                          >
                            <StockAdvisoryCard
                              item={advisoryById[item.id]}
                              unit={item.unit}
                              isLoading={advisory.isLoading}
                              isError={advisory.isError}
                              onRetry={() => advisory.refetch()}
                            />
                            <div>
                              <p className="text-[11px] font-medium text-slate-500 mb-1">
                                Request history{history.length > 0 && <span className="text-slate-400"> · {history.length}</span>}
                              </p>
                              {history.length === 0 ? (
                                <p className="text-xs text-slate-400">No requests for this item yet.</p>
                              ) : (
                                <>
                                  <ul className="divide-y divide-slate-200/70 border-y border-slate-200/70">
                                    {(showAllHistory === item.id ? history : history.slice(0, 3)).map((r) => {
                                      const when = r.delivered_at ?? r.dispatched_at ?? r.approved_at ?? r.requested_at;
                                      return (
                                        <li key={r.id} className="grid grid-cols-[104px_minmax(0,1fr)_auto_64px] items-center gap-3 py-1.5 text-xs">
                                          <span className="text-[11px] text-slate-400">{r.display_id}</span>
                                          <span className="text-slate-700 truncate">
                                            {requestFlow(r) === 'replenishment' ? 'Restock' : 'To incident'} · <span className="tabular-nums">{r.quantity_requested.toLocaleString()}</span> {r.unit}
                                          </span>
                                          <Tag variant="outline" tone={REQUEST_TONE[r.status] ?? 'slate'}>{r.status}</Tag>
                                          <span className="text-right text-[11px] text-slate-400 tabular-nums">{relativeTime(when) ?? ''}</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                  {history.length > 3 && (
                                    <button
                                      type="button"
                                      onClick={() => setShowAllHistory(showAllHistory === item.id ? null : item.id)}
                                      className="mt-1.5 text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                                    >
                                      {showAllHistory === item.id ? 'Show latest 3' : `Show all ${history.length}`}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
