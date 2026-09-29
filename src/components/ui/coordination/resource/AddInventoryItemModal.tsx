import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Warehouse } from 'lucide-react';
import { useCreateInventoryItem, useWarehouses } from '../../../../hooks';
import { useToast } from '../../../../context/ToastContext';
import type { ResourceCategory, StockStatus, ResourceItem } from '../../../../types';

interface AddInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: ResourceCategory[] = [
  'Food',
  'Medical supplies',
  'Rescue equipment',
  'Vehicles',
  'Emergency supplies',
];

const STANDARD_UNITS = [
  'Boxes',
  'Cartons',
  'Packs',
  'Units',
  'Kits',
  'Bottles',
  'Pallets',
  'Litres',
];

export const AddInventoryItemModal: React.FC<AddInventoryItemModalProps> = ({
  isOpen,
  onClose,
}) => {
  const createItemMutation = useCreateInventoryItem();
  const { data: warehouses = [] } = useWarehouses();
  const toast = useToast();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('Food');
  const [unit, setUnit] = useState('Boxes');
  const [stockLevel, setStockLevel] = useState<number>(200);
  const [minThreshold, setMinThreshold] = useState<number>(50);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  // Validation errors
  const [nameError, setNameError] = useState('');
  const [warehouseError, setWarehouseError] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    let hasError = false;
    if (!name.trim()) {
      setNameError('Item name is required');
      hasError = true;
    } else {
      setNameError('');
    }

    if (!selectedWarehouseId && warehouses.length > 0) {
      setWarehouseError('Please select a warehouse depot');
      hasError = true;
    } else {
      setWarehouseError('');
    }

    if (hasError) return;

    let computedStatus: StockStatus = 'Sufficient';
    if (stockLevel <= minThreshold * 0.5) {
      computedStatus = 'Critical';
    } else if (stockLevel <= minThreshold) {
      computedStatus = 'Low Stock';
    }

    const matchedWh = warehouses.find((w) => w.id === selectedWarehouseId);
    const finalWarehouseName = matchedWh ? `${matchedWh.name} (${matchedWh.state})` : 'Central Logistics Depot';

    try {
      await createItemMutation.mutateAsync({
        name: name.trim(),
        category,
        unit,
        stock_level: Number(stockLevel) || 0,
        min_threshold: Number(minThreshold) || 10,
        warehouse_id: selectedWarehouseId || undefined,
        status: computedStatus,
      } as Partial<ResourceItem>);

      toast.success(`Inventory item "${name.trim()}" added to ${finalWarehouseName}!`);
      onClose();
      // Reset
      setName('');
      setStockLevel(200);
      setMinThreshold(50);
      if (warehouses.length > 0) {
        setSelectedWarehouseId(warehouses[0].id);
      }
      setNameError('');
      setWarehouseError('');
      setAttemptedSubmit(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add inventory item');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
                <Warehouse size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Add Warehouse Catalog Item</h3>
                <p className="text-[10px] text-slate-400">Register new supply stock into central logistics depot</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Item Name / Supply Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (attemptedSubmit && e.target.value.trim()) setNameError('');
                }}
                placeholder="e.g. Ready-to-Eat Food Rations (Pack of 24)"
                className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white ${
                  nameError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-600'
                }`}
              />
              {nameError && (
                <span className="block mt-1 text-[11px] text-red-500 font-medium">{nameError}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ResourceCategory)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Measurement Unit <span className="text-rose-500">*</span>
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  {STANDARD_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Initial Stock Level <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockLevel}
                  onChange={(e) => setStockLevel(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Safety Minimum Threshold <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
            </div>

            {/* Dynamic Warehouse Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Depot / Warehouse Location <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => {
                  setSelectedWarehouseId(e.target.value);
                  if (warehouseError) setWarehouseError('');
                }}
                className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white cursor-pointer ${
                  warehouseError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-600'
                }`}
              >
                {warehouses.length === 0 ? (
                  <option value="">No warehouses registered</option>
                ) : (
                  warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.state}) - {w.full_address || w.district || w.state}
                    </option>
                  ))
                )}
              </select>
              {warehouseError && (
                <span className="block mt-1 text-[11px] text-red-500 font-medium">{warehouseError}</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createItemMutation.isPending}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={13} />
                <span>{createItemMutation.isPending ? 'Adding Item...' : 'Add Catalog Item'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
