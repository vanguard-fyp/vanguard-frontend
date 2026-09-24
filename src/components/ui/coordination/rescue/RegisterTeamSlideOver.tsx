import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, MapPin, Plus, Search } from 'lucide-react';
import { useCreateRescueTeam } from '../../../../hooks';
import { useToast } from '../../../../context/ToastContext';
import { PhoneInput, isValidMalaysianPhone } from '../../shared/PhoneInput';
import type { AgencyFilter, RescueTeam } from '../../../../types';

interface RegisterTeamSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

const AGENCIES: { id: AgencyFilter; label: string }[] = [
  { id: 'SMART', label: 'SMART (Special Search & Rescue)' },
  { id: 'BOMBA', label: 'BOMBA (Fire & Rescue Dept)' },
  { id: 'APM', label: 'APM (Civil Defence Force)' },
  { id: 'PDRM', label: 'PDRM (Royal Malaysia Police)' },
  { id: 'ATM', label: 'ATM (Malaysian Armed Forces)' },
];

// OSM Nominatim location suggestion
interface NominatimPlace {
  display_name: string;
  lat: string;
  lon: string;
}

export const RegisterTeamSlideOver: React.FC<RegisterTeamSlideOverProps> = ({ isOpen, onClose }) => {
  const createTeamMutation = useCreateRescueTeam();
  const toast = useToast();

  const [name, setName] = useState('');
  const [agency, setAgency] = useState<AgencyFilter>('SMART');
  const [commander, setCommander] = useState('');
  const [commanderContact, setCommanderContact] = useState('');
  const [personnelCount, setPersonnelCount] = useState(12);
  const [currentLocation, setCurrentLocation] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<NominatimPlace[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [specialization, setSpecialization] = useState('Flood Evacuation & Water Rescue');
  const [vehiclesInput, setVehiclesInput] = useState('4x4 Response Truck, Inflatable Rescue Boat');
  const [equipmentInput, setEquipmentInput] = useState('Drone Thermal, VHF Radios, PFD Lifevests');

  // Validation errors (inline, shown as red spans instead of native browser validation)
  const [nameError, setNameError] = useState('');
  const [commanderError, setCommanderError] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const locationSearchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced OSM search
  const handleLocationInput = (val: string) => {
    setLocationQuery(val);
    setCurrentLocation(val);
    clearTimeout(locationSearchTimer.current);
    if (val.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }
    locationSearchTimer.current = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&countrycodes=my&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimPlace[] = await res.json();
        setLocationSuggestions(data);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 500);
  };

  const handleSelectLocation = (place: NominatimPlace) => {
    setCurrentLocation(place.display_name);
    setLocationQuery(place.display_name);
    setLocationSuggestions([]);
  };

  const validateName = (val: string) => {
    if (!val.trim()) {
      setNameError('Team call sign is required');
    } else if (val.trim().length < 3) {
      setNameError('Call sign must be at least 3 characters');
    } else {
      setNameError('');
    }
  };

  const validateCommander = (val: string) => {
    if (!val.trim()) {
      setCommanderError('Commander name is required');
    } else if (!/^[a-zA-Z\s.'-]+$/.test(val)) {
      setCommanderError('Name must contain letters only');
    } else {
      setCommanderError('');
    }
  };

  const commanderContactInvalid = commanderContact.trim().length > 0 && !isValidMalaysianPhone(commanderContact);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    // Run inline validations; surface errors as red spans rather than native bubbles.
    validateName(name);
    validateCommander(commander);

    const nameOk = name.trim().length >= 3;
    const commanderOk = commander.trim().length > 0 && /^[a-zA-Z\s.'-]+$/.test(commander);
    if (!nameOk || !commanderOk || commanderContactInvalid) {
      return;
    }

    try {
      const toList = (raw: string) =>
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

      const vehiclesArray = toList(vehiclesInput);
      const equipmentArray = toList(equipmentInput);

      await createTeamMutation.mutateAsync({
        name,
        agency,
        commander,
        contactNumber: commanderContact || '+60-12-0000000',
        personnelCount: Number(personnelCount) || 10,
        status: 'Available',
        currentLocation: currentLocation || 'To be assigned',
        coordinates: [3.139, 101.6869],
        vehicles: vehiclesArray,
        equipment: equipmentArray,
        specialization,
      } as Partial<RescueTeam>);

      toast.success(`Rescue Unit "${name}" registered successfully and ready for dispatch!`);
      onClose();
      // Reset form
      setName('');
      setCommander('');
      setCommanderContact('');
      setCurrentLocation('');
      setLocationQuery('');
      setVehiclesInput('4x4 Response Truck, Inflatable Rescue Boat');
      setEquipmentInput('Drone Thermal, VHF Radios, PFD Lifevests');
      setNameError('');
      setCommanderError('');
      setAttemptedSubmit(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to register rescue team');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
          />

          {/* Slide-over Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Register Rescue Unit</h2>
                  <p className="text-[10px] text-slate-400">Commission new tactical squad into EOC registry</p>
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
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Team Call Sign / Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (attemptedSubmit || nameError) validateName(e.target.value);
                  }}
                  placeholder="e.g. SMART Strike Echo / BOMBA Water Strike 3"
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors ${
                    nameError ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-600'
                  }`}
                />
                {nameError && (
                  <span className="block mt-1 text-[10px] text-rose-500 font-medium">{nameError}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Deploying Agency *</label>
                  <select
                    value={agency}
                    onChange={(e) => setAgency(e.target.value as AgencyFilter)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    {AGENCIES.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Personnel Headcount</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={personnelCount}
                    onChange={(e) => setPersonnelCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Commander / Team Lead *</label>
                  <input
                    type="text"
                    value={commander}
                    onChange={(e) => {
                      setCommander(e.target.value);
                      validateCommander(e.target.value);
                    }}
                    placeholder="e.g. Capt. Firdaus Mansor"
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors ${
                      commanderError ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-600'
                    }`}
                  />
                  {commanderError && (
                    <span className="block mt-1 text-[10px] text-rose-500 font-medium">{commanderError}</span>
                  )}
                </div>

                <PhoneInput
                  value={commanderContact}
                  onChange={setCommanderContact}
                  label="Direct Contact"
                  placeholder="+60-12-3456 7890"
                />
              </div>

              {/* Base Staging Location with OSM search */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Base Staging Location</label>
                <div className="relative">
                  <div className="relative">
                    {isSearchingLocation ? (
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 animate-pulse" />
                    ) : (
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={(e) => handleLocationInput(e.target.value)}
                      placeholder="Search location (e.g. Balai Bomba Tunjong)..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                  {/* OSM Suggestions Dropdown */}
                  {locationSuggestions.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {locationSuggestions.map((place, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectLocation(place)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer"
                        >
                          <span className="font-medium text-slate-800 line-clamp-1">{place.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Operational Specialization</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Rapid Water Rescue, K9 Search, Heavy Urban SAR, Hazmat"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Assets &amp; Vehicles <span className="text-[10px] text-slate-500">(comma-separated)</span>
                </label>
                <textarea
                  rows={2}
                  value={vehiclesInput}
                  onChange={(e) => setVehiclesInput(e.target.value)}
                  placeholder="4x4 Response Truck, Inflatable Rescue Boat, Rescue Helicopter..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
                <span className="block mt-1 text-[10px] text-slate-400">
                  These appear under the unit's "Assets &amp; Vehicles" on its team card.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Assigned Equipment <span className="text-[10px] text-slate-500">(comma-separated)</span>
                </label>
                <textarea
                  rows={2}
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                  placeholder="First Aid Packs, Thermal Scopes, VHF Radios..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTeamMutation.isPending}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>{createTeamMutation.isPending ? 'Registering...' : 'Register Rescue Team'}</span>
                </button>
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
