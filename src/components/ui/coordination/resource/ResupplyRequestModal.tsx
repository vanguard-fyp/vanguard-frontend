import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Send, ThumbsUp, Package } from 'lucide-react';

import type { ResourceItem, ResourceRequest, Warehouse } from '../../../../types';
import { useStockAdvisory, useWarehouses } from '../../../../hooks';
import { useAuth } from '../../../../context/AuthContext';
import { RISK_TO_URGENCY, StockAdvisoryCard } from './ResourceAdvisory';

interface ResupplyRequestModalProps {
  item: ResourceItem | null;
  onClose: () => void;
  onSubmit: (newReq: Partial<ResourceRequest>) => void;
}

export const ResupplyRequestModal: React.FC<ResupplyRequestModalProps> = ({
  item,
  onClose,
  onSubmit,
}) => {
  const { data: warehouses = [] } = useWarehouses();
  const { user } = useAuth();
  const advisory = useStockAdvisory();
  const [reqQty, setReqQty] = useState<number>(1);
  const [reqDistrict, setReqDistrict] = useState<string>('');
  const [reqAgency, setReqAgency] = useState<string>('');
  const [reqUrgency, setReqUrgency] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('Medium');
  const [reqJustification, setReqJustification] = useState<string>('');
  const [aiApplied, setAiApplied] = useState(false);

  const warehouseMap = useMemo(() => {
    const map: Record<string, Warehouse> = {};
    warehouses.forEach((w) => { map[w.id] = w; });
    return map;
  }, [warehouses]);

  const warehouse = item?.warehouse_id ? warehouseMap[item.warehouse_id] : undefined;
  const warehouseLabel = warehouse ? `${warehouse.name} (${warehouse.district}, ${warehouse.state})` : 'Warehouse not linked';
  const itemAdvisory = item ? advisory.data?.items.find((a) => a.inventory_id === item.id) : undefined;

  // Reset the form for each item. Defaults come from the record and the signed-in
  // officer; the AI suggestion is only applied when the officer clicks "Apply".
  useEffect(() => {
    if (item) {
      setReqQty(1);
      setReqUrgency('Medium');
      setReqDistrict(warehouse?.district ?? '');
      setReqAgency(user?.agency ?? '');
      setReqJustification('');
      setAiApplied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const canApply = !!itemAdvisory && itemAdvisory.reorder_quantity > 0;

  const handleApplyAISuggestion = () => {
    if (!itemAdvisory || !canApply) return;
    setReqQty(itemAdvisory.reorder_quantity);
    setReqUrgency(RISK_TO_URGENCY[itemAdvisory.risk]);
    if (!reqJustification.trim()) {
      setReqJustification(
        `Resupply for ${item.name} at ${warehouseLabel}: stock ${itemAdvisory.stock_level} ${item.unit}, ` +
          `pending demand ${itemAdvisory.pending_demand}, minimum threshold ${itemAdvisory.min_threshold}.`
      );
    }
    setAiApplied(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      resource_type_id: item.resource_type_id,
      warehouse_id: item.warehouse_id,
      quantity_requested: reqQty,
      unit: item.unit,
      district: reqDistrict,
      agency: reqAgency,
      urgency: reqUrgency,
      justification: reqJustification,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              <Package size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Create Resupply Request</h3>
              <p className="text-[11px] text-slate-300">
                {item.name} · {warehouseLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Backend stock advisory (deterministic; advisory only) */}
          <StockAdvisoryCard
            item={itemAdvisory}
            unit={item.unit}
            isLoading={advisory.isLoading}
            isError={advisory.isError}
            onRetry={() => advisory.refetch()}
          />
          {canApply && (
            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={handleApplyAISuggestion}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  aiApplied ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-blue-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ThumbsUp size={12} />
                {aiApplied ? 'Applied ✓ (you can still edit)' : `Use suggested ${itemAdvisory!.reorder_quantity} ${item.unit}`}
              </button>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Requested Qty ({item.unit}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={reqQty}
                onChange={(e) => setReqQty(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Urgency Level *
              </label>
              <select
                value={reqUrgency}
                onChange={(e) => setReqUrgency(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="Critical">Critical (Immediate)</option>
                <option value="High">High (Within 6h)</option>
                <option value="Medium">Medium (Standard)</option>
                <option value="Low">Low (Buffer Restock)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Target District
              </label>
              <input
                type="text"
                value={reqDistrict}
                onChange={(e) => setReqDistrict(e.target.value)}
                placeholder="e.g. Kota Bharu"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Requesting Agency
              </label>
              <input
                type="text"
                value={reqAgency}
                onChange={(e) => setReqAgency(e.target.value)}
                placeholder="e.g. JKM Kelantan"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Operational Justification
            </label>
            <textarea
              rows={3}
              value={reqJustification}
              onChange={(e) => setReqJustification(e.target.value)}
              placeholder="State the operational reason for this resupply..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Send size={13} />
              Submit Request to Queue
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
