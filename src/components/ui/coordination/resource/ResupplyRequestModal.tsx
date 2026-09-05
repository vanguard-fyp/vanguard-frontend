import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Sparkles, ThumbsUp, Package } from 'lucide-react';

import type { ResourceItem, ResourceRequest, AIStockAdvisory } from '../../../../types';

interface ResupplyRequestModalProps {
  item: ResourceItem | null;
  onClose: () => void;
  onSubmit: (newReq: Partial<ResourceRequest>) => void;
}

function getAIStockAdvisory(item: ResourceItem): AIStockAdvisory {
  if (item.status === 'Critical') {
    return {
      suggestedQty: item.minThreshold * 3,
      urgency: 'Critical',
      confidence: 96,
      forecastRationale: `Critical stock depletion detected at ${item.warehouseLocation}. High evacuation influx requires immediate regional allocation.`,
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

export const ResupplyRequestModal: React.FC<ResupplyRequestModalProps> = ({
  item,
  onClose,
  onSubmit,
}) => {
  const [reqQty, setReqQty] = useState<number>(100);
  const [reqDistrict, setReqDistrict] = useState<string>('Kota Bharu');
  const [reqAgency, setReqAgency] = useState<string>('JKM Kelantan');
  const [reqUrgency, setReqUrgency] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [reqJustification, setReqJustification] = useState<string>('');
  const [aiApplied, setAiApplied] = useState(false);

  useEffect(() => {
    if (item) {
      const adv = getAIStockAdvisory(item);
      setReqQty(adv.suggestedQty);
      setReqUrgency(adv.urgency);
      setReqJustification(`[HIL AI Advisory] Emergency resupply request for ${item.name} at ${item.warehouseLocation}. ${adv.forecastRationale}`);
      setAiApplied(false);
    }
  }, [item]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const advisory = getAIStockAdvisory(item);

  const handleApplyAISuggestion = () => {
    setReqQty(advisory.suggestedQty);
    setReqUrgency(advisory.urgency);
    setAiApplied(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
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
                {item.name} · {item.warehouseLocation}
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
          {/* AI Stock Advisory Box */}
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50/60 border border-violet-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-white">
                  <Sparkles size={11} />
                </div>
                <span className="text-xs font-bold text-violet-900">AI Stock Forecaster (HIL)</span>
              </div>
              <span className="text-[11px] font-bold text-violet-700 font-mono">
                {advisory.confidence}% confidence
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {advisory.forecastRationale}
            </p>

            <div className="text-[11px] text-slate-500 font-mono">
              ⚡ {advisory.depletionTrend}
            </div>

            <div className="pt-2 border-t border-violet-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600">
                Recommended Qty: <span className="text-violet-900 font-extrabold">{advisory.suggestedQty} {item.unit}</span> ({advisory.urgency})
              </span>
              <button
                type="button"
                onClick={handleApplyAISuggestion}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  aiApplied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-2xs'
                }`}
              >
                <ThumbsUp size={12} />
                {aiApplied ? 'Applied ✓' : 'Apply AI Suggestion'}
              </button>
            </div>
          </div>

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
