import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Send, MapPin, Search } from 'lucide-react';
import { useCreateResourceRequest } from '../../../../hooks';
import { useToast } from '../../../../context/ToastContext';
import type { SeverityLevel, AgencyFilter } from '../../../../types';

interface CreateResourceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NominatimPlace {
  display_name: string;
  lat: string;
  lon: string;
}

// Standardized units of measure for resource requests. "Custom…" reveals a free-text field.
const UNIT_OPTIONS = ['Units', 'Kits', 'Vessels', 'Boxes', 'Pallets', 'Litres', 'Personnel'] as const;
const CUSTOM_UNIT = 'Custom';

export const CreateResourceRequestModal: React.FC<CreateResourceRequestModalProps> = ({
  isOpen,
  onClose,
}) => {
  const createMutation = useCreateResourceRequest();
  const toast = useToast();

  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Units');
  const [customUnit, setCustomUnit] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [urgency, setUrgency] = useState<SeverityLevel>('High');
  const [district, setDistrict] = useState('');
  const [districtQuery, setDistrictQuery] = useState('');
  const [districtSuggestions, setDistrictSuggestions] = useState<NominatimPlace[]>([]);
  const [isSearchingDistrict, setIsSearchingDistrict] = useState(false);
  const [requestorName, setRequestorName] = useState('');
  const [agency, setAgency] = useState<AgencyFilter>('APM');
  const [justification, setJustification] = useState('');
  const districtTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleDistrictInput = (val: string) => {
    setDistrictQuery(val);
    setDistrict(val);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !district.trim() || !requestorName.trim()) {
      toast.error('Please fill in item, target sector, and requestor name');
      return;
    }

    try {
      await createMutation.mutateAsync({
        requestId: `REQ-${Date.now().toString().slice(-6)}`,
        itemRequested: itemName.trim(),
        resourceCategory: itemName.trim().split(' ')[0] || 'General',
        quantityRequested: Number(quantity) || 100,
        unit: (unit === CUSTOM_UNIT ? customUnit.trim() : unit) || 'Units',
        urgency,
        district,
        requestorName,
        agency,
        justification,
        status: 'Pending Approval',
        timestamp: new Date().toISOString(),
      } as any);
      toast.success('Resource requisition submitted successfully!');
      onClose();
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
                <p className="text-[10px] text-slate-400">Request field supplies from regional emergency depots</p>
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
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Supply Item — open ended */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">Supply Item *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  placeholder="e.g. Drinking Water, Rescue Boats, Tents..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  <option value={CUSTOM_UNIT}>Custom…</option>
                </select>
                {unit === CUSTOM_UNIT && (
                  <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    autoFocus
                    placeholder="Enter custom unit (e.g. Rolls, Sacks)"
                    className="mt-2 w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Quantity *</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Urgency Priority *</label>
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
            </div>

            {/* Target Sector / Depot Location — with OSM search */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Target Sector / Depot Location *</label>
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
                    required
                    placeholder="Search district or depot (e.g. Kota Bharu, Flood Relief Centre)"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Requesting Agency *</label>
                <select
                  value={agency}
                  onChange={(e) => setAgency(e.target.value as AgencyFilter)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="APM">APM (Civil Defence)</option>
                  <option value="BOMBA">BOMBA (Fire & Rescue)</option>
                  <option value="SMART">SMART Heavy SAR</option>
                  <option value="ATM">ATM (Armed Forces)</option>
                  <option value="PDRM">PDRM (Police)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Requestor Name</label>
                <input
                  type="text"
                  value={requestorName}
                  onChange={(e) => setRequestorName(e.target.value)}
                  required
                  placeholder="EOC Field Dispatcher"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Operational Justification *</label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                required
                placeholder="State civilian population count, shelter location, or tactical team necessity..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
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
