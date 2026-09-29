import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, MapPin, Plus, Search } from 'lucide-react';
import { useCreateRescueTeam, useUpdateRescueTeam } from '../../../../hooks';
import { useToast } from '../../../../context/ToastContext';
import { PhoneInput, isValidMalaysianPhone } from '../../shared/PhoneInput';
import type { AgencyFilter, RescueTeam } from '../../../../types';

interface RegisterTeamSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  teamToEdit?: RescueTeam | null;
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

export const RegisterTeamSlideOver: React.FC<RegisterTeamSlideOverProps> = ({
  isOpen,
  onClose,
  teamToEdit,
}) => {
  const createTeamMutation = useCreateRescueTeam();
  const updateTeamMutation = useUpdateRescueTeam();
  const toast = useToast();

  const isEditing = Boolean(teamToEdit);

  const [name, setName] = useState('');
  const [agency, setAgency] = useState<RescueTeam['agency']>('SMART');
  const [commander, setCommander] = useState('');
  const [commanderContact, setCommanderContact] = useState('');
  const [personnelCount, setPersonnelCount] = useState(12);
  const [currentLocation, setCurrentLocation] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<NominatimPlace[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [specialization, setSpecialization] = useState('Flood Evacuation & Water Rescue');
  
  // Interactive badge tag states for vehicles and equipment
  const [vehiclesList, setVehiclesList] = useState<string[]>([
    '4x4 Response Truck',
    'Inflatable Rescue Boat',
  ]);
  const [vehicleInputText, setVehicleInputText] = useState('');

  const [equipmentList, setEquipmentList] = useState<string[]>([
    'Drone Thermal',
    'VHF Radios',
    'PFD Lifevests',
  ]);
  const [equipmentInputText, setEquipmentInputText] = useState('');

  // Validation errors (inline, shown as red spans instead of native browser validation)
  const [nameError, setNameError] = useState('');
  const [commanderError, setCommanderError] = useState('');
  const [personnelError, setPersonnelError] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const locationSearchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync state when teamToEdit or isOpen changes
  useEffect(() => {
    if (teamToEdit) {
      setName(teamToEdit.name || '');
      setAgency(teamToEdit.agency || 'SMART');
      setCommander(teamToEdit.commander || '');
      setCommanderContact(teamToEdit.contact_number || '');
      setPersonnelCount(teamToEdit.personnel_count || 10);
      setCurrentLocation(teamToEdit.current_location || '');
      setLocationQuery(teamToEdit.current_location || '');
      setSpecialization(teamToEdit.specialization || '');
      setVehiclesList(teamToEdit.vehicles || []);
      setEquipmentList(teamToEdit.equipment || []);
    } else {
      setName('');
      setAgency('SMART');
      setCommander('');
      setCommanderContact('');
      setPersonnelCount(12);
      setCurrentLocation('');
      setLocationQuery('');
      setSpecialization('Flood Evacuation & Water Rescue');
      setVehiclesList(['4x4 Response Truck', 'Inflatable Rescue Boat']);
      setEquipmentList(['Drone Thermal', 'VHF Radios', 'PFD Lifevests']);
    }
    setNameError('');
    setCommanderError('');
    setPersonnelError('');
    setAttemptedSubmit(false);
  }, [teamToEdit, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Badge tag handlers for Vehicles
  const handleAddVehicleTag = (text: string) => {
    const trimmed = text.trim().replace(/^,+|,+$/g, '');
    if (trimmed && !vehiclesList.includes(trimmed)) {
      setVehiclesList([...vehiclesList, trimmed]);
    }
    setVehicleInputText('');
  };

  const handleVehicleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter' || (e.key === ' ' && vehicleInputText.trim().length > 0 && vehicleInputText.endsWith(','))) {
      e.preventDefault();
      handleAddVehicleTag(vehicleInputText);
    } else if (e.key === 'Backspace' && !vehicleInputText && vehiclesList.length > 0) {
      setVehiclesList(vehiclesList.slice(0, -1));
    }
  };

  const handleVehicleInputChange = (val: string) => {
    if (val.includes(',')) {
      const parts = val.split(',');
      parts.forEach((p, idx) => {
        if (idx < parts.length - 1) {
          if (p.trim() && !vehiclesList.includes(p.trim())) {
            setVehiclesList((prev) => [...prev, p.trim()]);
          }
        }
      });
      setVehicleInputText(parts[parts.length - 1]);
    } else {
      setVehicleInputText(val);
    }
  };

  const handleRemoveVehicle = (idx: number) => {
    setVehiclesList(vehiclesList.filter((_, i) => i !== idx));
  };

  // Badge tag handlers for Equipment
  const handleAddEquipmentTag = (text: string) => {
    const trimmed = text.trim().replace(/^,+|,+$/g, '');
    if (trimmed && !equipmentList.includes(trimmed)) {
      setEquipmentList([...equipmentList, trimmed]);
    }
    setEquipmentInputText('');
  };

  const handleEquipmentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter' || (e.key === ' ' && equipmentInputText.trim().length > 0 && equipmentInputText.endsWith(','))) {
      e.preventDefault();
      handleAddEquipmentTag(equipmentInputText);
    } else if (e.key === 'Backspace' && !equipmentInputText && equipmentList.length > 0) {
      setEquipmentList(equipmentList.slice(0, -1));
    }
  };

  const handleEquipmentInputChange = (val: string) => {
    if (val.includes(',')) {
      const parts = val.split(',');
      parts.forEach((p, idx) => {
        if (idx < parts.length - 1) {
          if (p.trim() && !equipmentList.includes(p.trim())) {
            setEquipmentList((prev) => [...prev, p.trim()]);
          }
        }
      });
      setEquipmentInputText(parts[parts.length - 1]);
    } else {
      setEquipmentInputText(val);
    }
  };

  const handleRemoveEquipment = (idx: number) => {
    setEquipmentList(equipmentList.filter((_, i) => i !== idx));
  };

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

  const [locationError, setLocationError] = useState('');
  const [vehiclesError, setVehiclesError] = useState('');
  const [equipmentError, setEquipmentError] = useState('');
  const [contactError, setContactError] = useState('');

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
      setCommanderError('Commander name must contain letters only');
    } else {
      setCommanderError('');
    }
  };

  const validatePersonnel = (val: number) => {
    if (!val || val < 1) {
      setPersonnelError('Personnel headcount must be at least 1');
    } else {
      setPersonnelError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    // Run inline validations; surface errors as red spans
    validateName(name);
    validateCommander(commander);
    validatePersonnel(personnelCount);

    const nameOk = name.trim().length >= 3;
    const commanderOk = commander.trim().length > 0 && /^[a-zA-Z\s.'-]+$/.test(commander);
    const personnelOk = personnelCount >= 1;
    
    // Contact validation
    let contactOk = true;
    if (!commanderContact.trim()) {
      setContactError('Commander contact is required');
      contactOk = false;
    } else if (!isValidMalaysianPhone(commanderContact)) {
      setContactError('Enter a valid Malaysian phone number, e.g. +60-12-3456 7890');
      contactOk = false;
    } else {
      setContactError('');
    }

    // Location validation
    let locationOk = true;
    const finalLocation = locationQuery.trim() || currentLocation.trim();
    if (!finalLocation) {
      setLocationError('Base staging location is required');
      locationOk = false;
    } else {
      setLocationError('');
    }

    // Vehicles validation
    const finalVehicles = [...vehiclesList];
    if (vehicleInputText.trim() && !finalVehicles.includes(vehicleInputText.trim())) {
      finalVehicles.push(vehicleInputText.trim());
    }
    let vehiclesOk = true;
    if (finalVehicles.length === 0) {
      setVehiclesError('At least 1 vehicle or transport asset is required');
      vehiclesOk = false;
    } else {
      setVehiclesError('');
    }

    // Equipment validation
    const finalEquipment = [...equipmentList];
    if (equipmentInputText.trim() && !finalEquipment.includes(equipmentInputText.trim())) {
      finalEquipment.push(equipmentInputText.trim());
    }
    let equipmentOk = true;
    if (finalEquipment.length === 0) {
      setEquipmentError('At least 1 emergency equipment item is required');
      equipmentOk = false;
    } else {
      setEquipmentError('');
    }

    if (!nameOk || !commanderOk || !personnelOk || !contactOk || !locationOk || !vehiclesOk || !equipmentOk) {
      return;
    }

    try {
      if (isEditing && teamToEdit) {
        await updateTeamMutation.mutateAsync({
          id: teamToEdit.id,
          updates: {
            name,
            agency,
            commander,
            contact_number: commanderContact,
            personnel_count: Number(personnelCount) || 10,
            current_location: finalLocation,
            vehicles: finalVehicles,
            equipment: finalEquipment,
            specialization: specialization || undefined,
          },
        });
        toast.success(`Rescue Unit "${name}" updated successfully!`);
      } else {
        await createTeamMutation.mutateAsync({
          name,
          agency,
          commander,
          contact_number: commanderContact,
          personnel_count: Number(personnelCount) || 10,
          status: 'Available',
          current_location: finalLocation,
          coordinates: [3.139, 101.6869],
          vehicles: finalVehicles,
          equipment: finalEquipment,
          specialization: specialization || undefined,
        } as Partial<RescueTeam>);
        toast.success(`Rescue Unit "${name}" registered successfully and ready for dispatch!`);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || (isEditing ? 'Failed to update rescue team' : 'Failed to register rescue team'));
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
                  <h2 className="text-sm font-bold text-white">{isEditing ? 'Edit Rescue Unit' : 'Register Rescue Unit'}</h2>
                  <p className="text-[10px] text-slate-400">
                    {isEditing ? 'Update squad personnel, equipment, and assets' : 'Commission new tactical squad into EOC registry'}
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

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Team Call Sign / Name <span className="text-rose-500">*</span>
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
                    nameError ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-blue-600'
                  }`}
                />
                {nameError && (
                  <span className="block mt-1 text-[11px] text-red-500 font-medium">{nameError}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Deploying Agency <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={agency}
                    onChange={(e) => setAgency(e.target.value as RescueTeam['agency'])}
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
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Personnel Headcount <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={personnelCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPersonnelCount(val);
                      if (attemptedSubmit || personnelError) validatePersonnel(val);
                    }}
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:border-blue-600 font-mono ${
                      personnelError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  />
                  {personnelError && (
                    <span className="block mt-1 text-[11px] text-red-500 font-medium">{personnelError}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Commander / Team Lead <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={commander}
                    onChange={(e) => {
                      setCommander(e.target.value);
                      if (attemptedSubmit || commanderError) validateCommander(e.target.value);
                    }}
                    placeholder="e.g. Capt. Firdaus Mansor"
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors ${
                      commanderError ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-blue-600'
                    }`}
                  />
                  {commanderError && (
                    <span className="block mt-1 text-[11px] text-red-500 font-medium">{commanderError}</span>
                  )}
                </div>

                <div>
                  <PhoneInput
                    value={commanderContact}
                    onChange={(val) => {
                      setCommanderContact(val);
                      if (contactError) setContactError('');
                    }}
                    label="Direct Contact"
                    placeholder="+60-12-3456 7890"
                    required
                    showValidation={false}
                  />
                  {contactError && (
                    <span className="block mt-1 text-[11px] text-red-500 font-medium">{contactError}</span>
                  )}
                </div>
              </div>

              {/* Base Staging Location with OSM search */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Base Staging Location <span className="text-rose-500">*</span>
                </label>
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
                      onChange={(e) => {
                        handleLocationInput(e.target.value);
                        if (locationError) setLocationError('');
                      }}
                      placeholder="Search location (e.g. Balai Bomba Tunjong)..."
                      className={`w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white ${
                        locationError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-600'
                      }`}
                    />
                  </div>
                  {/* OSM Suggestions Dropdown */}
                  {locationSuggestions.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {locationSuggestions.map((place, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            handleSelectLocation(place);
                            if (locationError) setLocationError('');
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer"
                        >
                          <span className="font-medium text-slate-800 line-clamp-1">{place.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {locationError && (
                  <span className="block mt-1 text-[11px] text-red-500 font-medium">{locationError}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Operational Specialization <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Rapid Water Rescue, K9 Search, Heavy Urban SAR, Hazmat"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Interactive Assets & Vehicles Tags */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Assets &amp; Vehicles <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Press comma or enter to add badge</span>
                </div>
                
                <div className={`p-2 bg-slate-50 border rounded-lg focus-within:border-blue-600 focus-within:bg-white transition-colors ${
                  vehiclesError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {vehiclesList.map((vehicle, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-xs font-semibold group animate-in fade-in zoom-in-95 duration-150"
                      >
                        <span>{vehicle}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVehicle(idx)}
                          className="text-blue-400 hover:text-rose-600 hover:bg-blue-100/50 p-0.5 rounded transition-colors cursor-pointer"
                          title="Remove vehicle"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={vehicleInputText}
                      onChange={(e) => {
                        handleVehicleInputChange(e.target.value);
                        if (vehiclesError) setVehiclesError('');
                      }}
                      onKeyDown={handleVehicleKeyDown}
                      placeholder={vehiclesList.length === 0 ? "Type vehicle name and press Comma or Enter..." : "Add more vehicles..."}
                      className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none py-1 px-1"
                    />
                    {vehicleInputText.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          handleAddVehicleTag(vehicleInputText);
                          if (vehiclesError) setVehiclesError('');
                        }}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded cursor-pointer"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
                {vehiclesError && (
                  <span className="block mt-1 text-[11px] text-red-500 font-medium">{vehiclesError}</span>
                )}
              </div>

              {/* Interactive Assigned Equipment Tags */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Assigned Equipment <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Press comma or enter to add badge</span>
                </div>

                <div className={`p-2 bg-slate-50 border rounded-lg focus-within:border-blue-600 focus-within:bg-white transition-colors ${
                  equipmentError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {equipmentList.map((eq, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-semibold group animate-in fade-in zoom-in-95 duration-150"
                      >
                        <span>{eq}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEquipment(idx)}
                          className="text-emerald-400 hover:text-rose-600 hover:bg-emerald-100/50 p-0.5 rounded transition-colors cursor-pointer"
                          title="Remove equipment"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={equipmentInputText}
                      onChange={(e) => {
                        handleEquipmentInputChange(e.target.value);
                        if (equipmentError) setEquipmentError('');
                      }}
                      onKeyDown={handleEquipmentKeyDown}
                      placeholder={equipmentList.length === 0 ? "Type equipment name and press Comma or Enter..." : "Add more equipment..."}
                      className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none py-1 px-1"
                    />
                    {equipmentInputText.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          handleAddEquipmentTag(equipmentInputText);
                          if (equipmentError) setEquipmentError('');
                        }}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded cursor-pointer"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
                {equipmentError && (
                  <span className="block mt-1 text-[11px] text-red-500 font-medium">{equipmentError}</span>
                )}
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
                  disabled={createTeamMutation.isPending || updateTeamMutation.isPending}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>
                    {isEditing
                      ? updateTeamMutation.isPending
                        ? 'Saving Changes...'
                        : 'Save Team Changes'
                      : createTeamMutation.isPending
                      ? 'Registering...'
                      : 'Register Rescue Team'}
                  </span>
                </button>
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
