import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Send, MapPin, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCreateResourceRequest, useInventory } from '../../../../hooks';
import { useToast } from '../../../../context/ToastContext';
import { useAuth } from '../../../../context/AuthContext';
import type { SeverityLevel, AgencyFilter, ResourceItem } from '../../../../types';

interface CreateResourceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NominatimPlace {
  display_name: string;
  lat: string;
  lon: string;
}

export const CreateResourceRequestModal: React.FC<CreateResourceRequestModalProps> = ({
  isOpen,
  onClose,
}) => {
  const createMutation = useCreateResourceRequest();
  const { data: inventory = [] } = useInventory();
  const toast = useToast();
  const { user } = useAuth();

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [customItemName, setCustomItemName] = useState('');
  const [unit, setUnit] = useState('Units');
  const [quantity, setQuantity] = useState<number>(50);
  const [urgency, setUrgency] = useState<SeverityLevel>('High');
  const [district, setDistrict] = useState('');
  const [districtQuery, setDistrictQuery] = useState('');
  const [districtSuggestions, setDistrictSuggestions] = useState<NominatimPlace[]>([]);
  const [isSearchingDistrict, setIsSearchingDistrict] = useState(false);
  const [agency, setAgency] = useState<AgencyFilter>((user?.agency as AgencyFilter) || 'APM');
  const [justification, setJustification] = useState('');
  
  // Validation errors
  const [itemError, setItemError] = useState('');
  const [districtError, setDistrictError] = useState('');
  const [justificationError, setJustificationError] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const districtTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selectedCatalogItem: ResourceItem | undefined = inventory.find((i) => i.id === selectedItemId);

  // When catalog item changes, update unit
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

  const handleDistrictInput = (val: string) => {
    setDistrictQuery(val);
    setDistrict(val);
    if (attemptedSubmit && val.trim()) setDistrictError('');
    clearTimeout(districtTimer.current);
    if (val.trim().length < 3) {
      setDistrictSuggestions([]);
      return;
    }
    districtTimer.current = setTimeout(async () => {
      setIsSearchingDistrict(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&countrycodes=my&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimPlace[] = await res.json();
        setDistrictSuggestions(data);
      } catch {
        setDistrictSuggestions([]);
      } finally {
        setIsSearchingDistrict(false);
      }
    }, 500);
  };

  const handleSelectDistrict = (place: NominatimPlace) => {
    const shortName = place.display_name.split(',')[0].trim();
    setDistrict(shortName);
    setDistrictQuery(place.display_name);
    setDistrictSuggestions([]);
    if (attemptedSubmit) setDistrictError('');
  };

  const isStockExceeded = selectedCatalogItem && quantity > selectedCatalogItem.stockLevel;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    const finalItemName = selectedCatalogItem ? selectedCatalogItem.name : customItemName.trim();
    let hasError = false;

    if (!finalItemName) {
      setItemError('Please select or specify a resource item');
      hasError = true;
    } else if (isStockExceeded) {
      setItemError(
        `Requested quantity (${quantity}) exceeds current available warehouse stock (${selectedCatalogItem.stockLevel} ${selectedCatalogItem.unit}). Reduce quantity or select another depot item.`
      );
      hasError = true;
    } else {
      setItemError('');
    }

    if (!district.trim()) {
      setDistrictError('Target sector/district location is required');
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
        resourceItemId: selectedCatalogItem ? selectedCatalogItem.id : undefined,
        itemRequested: finalItemName,
        resourceCategory: selectedCatalogItem ? selectedCatalogItem.category : 'General',
        quantityRequested: Number(quantity) || 1,
        unit: selectedCatalogItem ? selectedCatalogItem.unit : unit,
        urgency,
        district: district.trim(),
        requestUserId: user?.id,
        agency,
        justification: justification.trim(),
        status: 'Pending Approval',
        timestamp: new Date().toISOString(),
      } as any);

      toast.success('Resource requisition submitted successfully!');
      onClose();
      // Reset
      setSelectedItemId('');
      setCustomItemName('');
      setDistrict('');
      setDistrictQuery('');
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
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
                <Package size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Create Resource Requisition</h3>
                <p className="text-[10px] text-slate-400">Request field supplies linked directly to depot catalog</p>
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
            {/* Catalog Item Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Select Catalog Item / Supply <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => handleItemSelect(e.target.value)}
                className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors cursor-pointer ${
                  itemError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-600'
                }`}
              >
                <option value="">-- Choose item from central warehouse catalog --</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category}) — Avail: {item.stockLevel} {item.unit} ({item.warehouseLocation})
                  </option>
                ))}
                <option value="OTHER">Custom / Non-catalog item</option>
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

            {/* Availability Badge */}
            {selectedCatalogItem && (
              <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                selectedCatalogItem.stockLevel > 0 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="flex items-center gap-2">
                  {selectedCatalogItem.stockLevel > 0 ? (
                    <CheckCircle2 size={15} className="text-emerald-600" />
                  ) : (
                    <AlertCircle size={15} className="text-rose-600" />
                  )}
                  <div>
                    <span className="font-bold">Depot Stock: </span>
                    <span>{selectedCatalogItem.stockLevel} {selectedCatalogItem.unit}</span>
                    <span className="text-[10px] opacity-75 ml-1">({selectedCatalogItem.warehouseLocation})</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-emerald-200">
                  Unit: {selectedCatalogItem.unit}
                </span>
              </div>
            )}

            {/* Quantity and Locked Unit */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Requested Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:border-blue-600 font-mono ${
                    isStockExceeded ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                  }`}
                />
                {isStockExceeded && (
                  <span className="block mt-1 text-[11px] text-amber-600 font-medium">
                    ⚠️ Note: Quantity ({quantity}) exceeds current warehouse stock ({selectedCatalogItem?.stockLevel} {selectedCatalogItem?.unit}).
                  </span>
                )}
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
                  Urgency Priority <span className="text-rose-500">*</span>
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
                  Requesting Agency <span className="text-rose-500">*</span>
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

            {/* Target Sector / Depot Location — with OSM search */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Target Sector / Delivery Destination <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="relative">
                  {isSearchingDistrict ? (
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 animate-pulse" />
                  ) : (
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  )}
                  <input
                    type="text"
                    value={districtQuery}
                    onChange={(e) => handleDistrictInput(e.target.value)}
                    placeholder="Search destination (e.g. SK Pasir Mas Relief Centre, Kota Bharu)"
                    className={`w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white ${
                      districtError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-600'
                    }`}
                  />
                </div>
                {districtSuggestions.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                    {districtSuggestions.map((place, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectDistrict(place)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer"
                      >
                        <div className="font-medium text-slate-800 line-clamp-1">{place.display_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {districtError && (
                <span className="block mt-1 text-[11px] text-red-500 font-medium">{districtError}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Operational Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => {
                  setJustification(e.target.value);
                  if (attemptedSubmit && e.target.value.trim()) setJustificationError('');
                }}
                placeholder="State civilian population count, shelter location, or tactical team necessity..."
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
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>{createMutation.isPending ? 'Submitting...' : 'Submit Requisition'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
