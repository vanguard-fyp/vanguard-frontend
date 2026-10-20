import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, PackagePlus } from 'lucide-react';
import { useCreateResourceRequest, useIncidents, useInventory, useStockAdvisory, useWarehouses } from '../../../../hooks';
import { RISK_LABEL, RISK_TO_URGENCY } from './ResourceAdvisory';
import { AiAction, AiSuggestion, AiVerdict } from '../../shared/AiSuggestion';
import type { StockAdvisoryItem } from '../../../../services/resourceService';
import { useToast } from '../../../../context/ToastContext';
import { useAuth } from '../../../../context/AuthContext';
import type { SeverityLevel, AgencyFilter, ResourceItem } from '../../../../types';

interface CreateResourceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: ResourceItem | null;
  /** Flow to open in when started from an item: send to an incident, or restock the depot. */
  initialType?: 'requisition' | 'replenishment';
}


/**
 * Stock in one line, and a suggestion only when it would change something:
 * a restock size for replenishments, a warning when a requisition would eat
 * into stock already promised to other pending requests.
 */
const StockHint: React.FC<{
  item: ResourceItem;
  advisory?: StockAdvisoryItem;
  loading: boolean;
  restock: boolean;
  quantity: number;
  onUse: (quantity: number, urgency?: SeverityLevel) => void;
}> = ({ item, advisory, loading, restock, quantity, onUse }) => {
  const pending = advisory?.pending_demand ?? 0;
  const after = advisory?.stock_after_pending;
  const suggest = restock && advisory && advisory.reorder_quantity > 0 && advisory.reorder_quantity !== quantity;
  const overPromised = !restock && after != null && quantity > after && quantity <= item.stock_level;
  return (
    <div className="text-xs space-y-1.5 -mt-1">
      <p className={item.stock_level > 0 ? 'text-slate-600' : 'text-red-700 font-medium'}>
        {item.stock_level.toLocaleString()} {item.unit} in stock
        {pending > 0 && <span className="text-slate-400"> · {pending.toLocaleString()} already requested</span>}
        {loading && <span className="text-slate-400"> · checking demand…</span>}
      </p>
      {overPromised && (
        <p className="text-amber-700">Only {Math.max(0, after ?? 0).toLocaleString()} {item.unit} are not already promised to other requests.</p>
      )}
      {suggest && (
        <AiSuggestion
          headline={
            <AiVerdict tone={advisory!.risk === 'normal' ? 'good' : advisory!.risk === 'elevated' ? 'caution' : 'bad'} verdict={RISK_LABEL[advisory!.risk]}>
              Restock <strong>{advisory!.reorder_quantity.toLocaleString()} {item.unit}</strong> to cover pending requests and the safety level.
            </AiVerdict>
          }
          action={<AiAction onClick={() => onUse(advisory!.reorder_quantity, RISK_TO_URGENCY[advisory!.risk])}>Use</AiAction>}
          compact
        />
      )}
    </div>
  );
};

export const CreateResourceRequestModal: React.FC<CreateResourceRequestModalProps> = ({
  isOpen,
  onClose,
  initialItem = null,
  initialType = 'replenishment',
}) => {
  const createMutation = useCreateResourceRequest();
  const { data: inventory = [] } = useInventory();
  const toast = useToast();
  const { user } = useAuth();

  const [requisitionType, setRequisitionType] = useState<'downstream' | 'upstream'>(
    initialItem ? 'upstream' : 'downstream'
  );
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [customItemName, setCustomItemName] = useState('');
  const [unit, setUnit] = useState('Units');
  const [quantity, setQuantity] = useState<number>(50);
  const [urgency, setUrgency] = useState<SeverityLevel>('High');
  const [agency, setAgency] = useState<AgencyFilter>((user?.agency as AgencyFilter) || 'APM');
  const [justification, setJustification] = useState('');
  // requisition (downstream): the incident being supplied; replenishment (upstream): the supplier.
  const [incidentId, setIncidentId] = useState('');
  const [supplier, setSupplier] = useState('');
  const { data: incidents = [] } = useIncidents();
  const { data: warehouses = [] } = useWarehouses();
  const activeIncidents = incidents.filter((i) => !['Resolved', 'Rejected', 'Archived'].includes(i.status));

  // Validation errors
  const [itemError, setItemError] = useState('');
  const [districtError, setDistrictError] = useState('');
  const [justificationError, setJustificationError] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);


  const selectedCatalogItem: ResourceItem | undefined = inventory.find((i) => i.id === selectedItemId);
  const depot = warehouses.find((w) => w.id === selectedCatalogItem?.warehouse_id);
  const targetIncident = activeIncidents.find((i) => i.id === incidentId);

  useEffect(() => {
    if (!isOpen || !initialItem) return;
    const restock = initialType === 'replenishment';
    setRequisitionType(restock ? 'upstream' : 'downstream');
    setSelectedItemId(initialItem.id);
    setCustomItemName(initialItem.name);
    setUnit(initialItem.unit || 'Units');
    setQuantity(restock ? Math.max(initialItem.min_threshold, 1) : Math.max(1, Math.min(50, initialItem.stock_level)));
    setUrgency(
      restock
        ? initialItem.status === 'Critical' ? 'Critical' : initialItem.status === 'Low Stock' ? 'High' : 'Medium'
        : 'High'
    );
  }, [initialItem, initialType, isOpen]);

  // Backend stock advisory (deterministic: stock, threshold and pending demand).
  // It is only a suggestion; nothing is applied until the officer clicks.
  const advisory = useStockAdvisory();
  const itemAdvisory = selectedCatalogItem
    ? advisory.data?.items.find((a) => a.inventory_id === selectedCatalogItem.id)
    : undefined;

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    if (itemId === 'OTHER') {
      setCustomItemName('');
      setUnit('Units');
    } else {
      const found = inventory.find((i) => i.id === itemId);
      if (found) {
        setCustomItemName(found.name);
        setUnit(found.unit || 'Units');
      }
    }
    if (attemptedSubmit) setItemError('');
  };

  const isDownstreamStockExceeded =
    requisitionType === 'downstream' && selectedCatalogItem && quantity > selectedCatalogItem.stock_level;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    const finalItemName = selectedCatalogItem ? selectedCatalogItem.name : customItemName.trim();
    let hasError = false;

    if (!finalItemName) {
      setItemError('Please select or specify a resource item');
      hasError = true;
    } else if (isDownstreamStockExceeded) {
      setItemError(
        `Only ${selectedCatalogItem.stock_level} ${selectedCatalogItem.unit} in stock. Reduce the quantity or restock the depot first.`
      );
      hasError = true;
    } else {
      setItemError('');
    }

    if (requisitionType === 'downstream' && !targetIncident) {
      setDistrictError('Choose the incident these supplies are for');
      hasError = true;
    } else if (requisitionType === 'upstream' && !depot) {
      setDistrictError('The selected item is not linked to a warehouse');
      hasError = true;
    } else {
      setDistrictError('');
    }

    if (!justification.trim()) {
      setJustificationError('Operational justification is required');
      hasError = true;
    } else {
      setJustificationError('');
    }

    if (hasError) return;


    try {
      await createMutation.mutateAsync({
        resource_type_id: selectedCatalogItem?.resource_type_id,
        warehouse_id: selectedCatalogItem?.warehouse_id,
        quantity_requested: Number(quantity) || 1,
        unit: selectedCatalogItem ? selectedCatalogItem.unit : unit,
        urgency,
        // Requisition: the incident's district. Replenishment: the receiving depot's district.
        district: (requisitionType === 'downstream' ? targetIncident?.district : depot?.district) ?? '',
        agency,
        justification: justification.trim(),
        request_type: requisitionType === 'upstream' ? 'replenishment' : 'requisition',
        incident_id: requisitionType === 'downstream' ? targetIncident?.id : undefined,
        supplier: requisitionType === 'upstream' ? supplier.trim() || undefined : undefined,
      } as any);

      toast.success(
        requisitionType === 'upstream'
          ? 'Replenishment order submitted for approval'
          : 'Incident requisition submitted for approval'
      );
      onClose();
      setSelectedItemId('');
      setCustomItemName('');
      setIncidentId('');
      setSupplier('');
      setJustification('');
      setAttemptedSubmit(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit resource request');
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
          <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className='bg-blue-600 p-2 rounded-xl'><PackagePlus size={18} /></div>
              <div>
                <h3 className="text-sm font-bold">New Resource Request</h3>
                <p className="text-xs text-slate-300">Sent to the review queue for approval</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Requisition Flow Selector */}
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
              <button
                type="button"
                onClick={() => setRequisitionType('downstream')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  requisitionType === 'downstream'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>Send to an incident</span>
              </button>
              <button
                type="button"
                onClick={() => setRequisitionType('upstream')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  requisitionType === 'upstream'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>Restock a depot</span>
              </button>
            </div>
            {/* Catalog Item Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Item <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => handleItemSelect(e.target.value)}
                className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors cursor-pointer ${
                  itemError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-600'
                }`}
              >
                <option value="">Choose an item</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}: {item.stock_level.toLocaleString()} {item.unit} in stock
                  </option>
                ))}
              </select>
              {itemError && (
                <span className="block mt-1 text-[11px] text-red-500 font-medium">{itemError}</span>
              )}
            </div>

            {selectedItemId === 'OTHER' && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Item Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="e.g. Heavy Duty Tarpaulin 50x50m"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>
            )}

            {selectedCatalogItem && (
              <StockHint
                item={selectedCatalogItem}
                advisory={itemAdvisory}
                loading={advisory.isLoading}
                restock={requisitionType === 'upstream'}
                quantity={quantity}
                onUse={(q, u) => {
                  setQuantity(q);
                  if (u) setUrgency(u);
                }}
              />
            )}

            {/* Quantity and Locked Unit */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:border-blue-600 font-mono ${
                    isDownstreamStockExceeded ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Unit</label>
                <input
                  type="text"
                  readOnly
                  value={selectedCatalogItem ? selectedCatalogItem.unit : unit}
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-semibold cursor-not-allowed"
                />
              </div>
            </div>

            {/* Urgency & Requesting Agency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Urgency <span className="text-rose-500">*</span>
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as SeverityLevel)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="Critical">Critical (Immediate Dispatch)</option>
                  <option value="High">High (Urgent)</option>
                  <option value="Medium">Medium (Standard)</option>
                  <option value="Low">Low (Scheduled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Agency <span className="text-rose-500">*</span>
                </label>
                <select
                  value={agency}
                  onChange={(e) => setAgency(e.target.value as AgencyFilter)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="APM">APM (Civil Defence)</option>
                  <option value="BOMBA">BOMBA (Fire &amp; Rescue)</option>
                  <option value="SMART">SMART Heavy SAR</option>
                  <option value="ATM">ATM (Armed Forces)</option>
                  <option value="PDRM">PDRM (Police)</option>
                </select>
              </div>
            </div>

            {/* Destination: the incident (requisition) or the receiving depot + supplier (replenishment) */}
            {requisitionType === 'downstream' ? (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  For incident <span className="text-rose-500">*</span>
                </label>
                <select
                  value={incidentId}
                  onChange={(e) => {
                    setIncidentId(e.target.value);
                    if (attemptedSubmit) setDistrictError('');
                  }}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none cursor-pointer ${
                    districtError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-600'
                  }`}
                >
                  <option value="">-- Choose an active incident --</option>
                  {activeIncidents.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.display_id} · {i.title} ({i.district})
                    </option>
                  ))}
                </select>
                {selectedCatalogItem && (
                  <p className="text-[11px] text-slate-500 mt-1">From depot: {depot?.name ?? 'warehouse not linked'}</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Receiving depot</label>
                  <input
                    type="text"
                    readOnly
                    value={depot ? `${depot.name} (${depot.district})` : selectedCatalogItem ? 'Item not linked to a warehouse' : 'Choose an item first'}
                    className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-semibold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={supplier}
                    maxLength={120}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. NADMA Federal Logistics Hub"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            )}
            {districtError && <span className="block -mt-2 text-[11px] text-red-500 font-medium">{districtError}</span>}

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => {
                  setJustification(e.target.value);
                  if (attemptedSubmit && e.target.value.trim()) setJustificationError('');
                }}
                placeholder="e.g. 450 evacuees at SK Kampung Jawa need two days of food"
                className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white ${
                  justificationError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-600'
                }`}
              />
              {justificationError && (
                <span className="block mt-1 text-[11px] text-red-500 font-medium">{justificationError}</span>
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
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send size={13} />
                <span>{createMutation.isPending ? 'Submitting…' : 'Submit for approval'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
