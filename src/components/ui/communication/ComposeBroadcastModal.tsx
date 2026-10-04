import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Megaphone, MapPin, Search } from 'lucide-react';
import { findPostcode, getCities } from 'malaysia-postcodes';
import type { PublicAnnouncement, SeverityLevel } from '../../../types';
import { MALAYSIA_STATES_LIST } from '../../../constants/malaysiaLocations';
import { useAuth } from '../../../context/AuthContext';

const PACKAGE_STATE_MAP: Record<string, string> = {
  'wp kuala lumpur': 'WP Kuala Lumpur',
  'kuala lumpur': 'WP Kuala Lumpur',
  'wp putrajaya': 'WP Putrajaya',
  'putrajaya': 'WP Putrajaya',
  'wp labuan': 'WP Labuan',
  'labuan': 'WP Labuan',
  johor: 'Johor',
  kedah: 'Kedah',
  kelantan: 'Kelantan',
  melaka: 'Melaka',
  malacca: 'Melaka',
  'negeri sembilan': 'Negeri Sembilan',
  pahang: 'Pahang',
  perak: 'Perak',
  perlis: 'Perlis',
  'pulau pinang': 'Pulau Pinang',
  penang: 'Pulau Pinang',
  sabah: 'Sabah',
  sarawak: 'Sarawak',
  selangor: 'Selangor',
  terengganu: 'Terengganu',
};

interface ComposeBroadcastModalProps {
  onClose: () => void;
  onPublish: (announcement: Partial<PublicAnnouncement>) => void;
}

const categories: PublicAnnouncement['category'][] = [
  'Emergency Alert',
  'Evacuation Order',
  'Safety Announcement',
];

export const ComposeBroadcastModal: React.FC<ComposeBroadcastModalProps> = ({
  onClose,
  onPublish,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PublicAnnouncement['category']>('Emergency Alert');
  const [severity, setSeverity] = useState<SeverityLevel>('High');
  const [targetState, setTargetState] = useState('Kelantan');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [postcodeScopeInput, setPostcodeScopeInput] = useState('');
  const [postcodeMatchMsg, setPostcodeMatchMsg] = useState('');
  const [content, setContent] = useState('');

  // Validation
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');
  const [districtError, setDistrictError] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // When targetState changes, pick default districts for that state
  const handleStateChange = (newState: string) => {
    setTargetState(newState);


    setSelectedDistricts([]);
    setPostcodeScopeInput('');
    setPostcodeMatchMsg('');
  };

  const handlePostcodeScope = (code: string) => {
    // Only allow numbers
    const clean = code.replace(/\D/g, '').slice(0, 5);

    setPostcodeScopeInput(clean);

    // Wait until a complete Malaysian postcode is entered
    if (clean.length !== 5) {
      setPostcodeMatchMsg('');
      return;
    }

    try {
      const found = findPostcode(clean);

      if (
        found &&
        'found' in found &&
        found.found &&
        'state' in found &&
        'city' in found
      ) {
        const rawState = found.state.trim().toLowerCase();

        const mappedState =
          PACKAGE_STATE_MAP[rawState] ||
          MALAYSIA_STATES_LIST.find(
            (state) => state.toLowerCase() === rawState
          );

        const city = found.city?.trim();

        if (!mappedState || !city) {
          setPostcodeMatchMsg('Location information unavailable');
          return;
        }

        // Automatically update state
        setTargetState(mappedState);

        // Automatically use the postcode's city/locality
        // as the target district/area.
        setSelectedDistricts([city]);

        setPostcodeMatchMsg(`Found: ${city}, ${mappedState}`);

        if (attemptedSubmit) {
          setDistrictError('');
        }

        return;
      }

      setPostcodeMatchMsg('Postcode not found in Malaysia postcode directory');
      setSelectedDistricts([]);
    } catch (error) {
      console.error('Postcode lookup failed:', error);

      setPostcodeMatchMsg('Unable to look up postcode');
      setSelectedDistricts([]);
    }
  };

  const handleToggleDistrict = (d: string) => {
    if (selectedDistricts.includes(d)) {
      setSelectedDistricts(selectedDistricts.filter((item) => item !== d));
    } else {
      setSelectedDistricts([...selectedDistricts, d]);
    }
    if (attemptedSubmit) setDistrictError('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    let hasError = false;
    if (!title.trim()) {
      setTitleError('Broadcast title is required');
      hasError = true;
    } else {
      setTitleError('');
    }

    if (!content.trim()) {
      setContentError('Broadcast message content is required');
      hasError = true;
    } else {
      setContentError('');
    }

    if (selectedDistricts.length === 0) {
      setDistrictError('Select at least one target district');
      hasError = true;
    } else {
      setDistrictError('');
    }

    if (hasError) return;

    onPublish({
      title: title.trim(),
      category,
      severity,
      target_state: targetState,
      target_districts: selectedDistricts,
      content: content.trim(),
      issued_by_user_id: user?.id,
    });
  };

  const availableDistrictsForState = getCities(targetState);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Megaphone size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Broadcast Public Communication</h3>
              <p className="text-[10px] text-slate-400">Distribute official disaster bulletin via multi-channel telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} noValidate className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Broadcast Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (attemptedSubmit && e.target.value.trim()) setTitleError('');
              }}
              placeholder="e.g. MANDATORY EVACUATION ORDER FOR KOTA BHARU FLOOD ZONES"
              className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white transition-colors ${titleError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-600'
                }`}
            />
            {titleError && (
              <span className="block mt-1 text-[11px] text-red-500 font-medium">{titleError}</span>
            )}
          </div>

          {/* Category & Severity Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Notice Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PublicAnnouncement['category'])}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Severity Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                {(['Critical', 'High', 'Medium', 'Low'] as SeverityLevel[]).map((sev) => (
                  <option key={sev} value={sev}>
                    {sev}
                  </option>
                ))}
              </select>
            </div>
          </div>


          {/* Real Target State Selection */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Target State (Malaysia) <span className="text-rose-500">*</span>
            </label>
            <select
              value={targetState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              {MALAYSIA_STATES_LIST.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Scope by Postcode */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Search size={13} className="text-blue-600" />
                <span>Auto-Scope by Malaysian Postcode</span>
              </label>

              {postcodeMatchMsg && (
                <span className="text-[11px] font-semibold text-blue-700">
                  {postcodeMatchMsg}
                </span>
              )}
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={postcodeScopeInput}
              onChange={(e) => handlePostcodeScope(e.target.value)}
              placeholder="Enter 5-digit postcode (e.g. 15000, 50480, 80000)..."
              className="w-full bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>
          
          {/* Real Target Districts for Selected State */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="text-xs font-bold text-slate-800">
                Target Districts in {targetState} <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDistricts([...availableDistrictsForState])}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Select All ({availableDistrictsForState.length})
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedDistricts([])}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {availableDistrictsForState.map((districtName) => {
                  const isChecked = selectedDistricts.includes(districtName);

                  return (
                    <button
                      key={districtName}
                      type="button"
                      onClick={() => handleToggleDistrict(districtName)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${isChecked
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                        }`}
                    >
                      {isChecked && '✓ '}
                      {districtName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Districts Summary */}
            {selectedDistricts.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <MapPin size={12} className="text-blue-600" />
                <span className="text-[11px] text-slate-500 font-medium">Selected ({selectedDistricts.length}):</span>
                <span className="text-[11px] font-bold text-blue-700">{selectedDistricts.join(', ')}</span>
              </div>
            )}

            {districtError && (
              <span className="block mt-1 text-[11px] text-red-500 font-medium">{districtError}</span>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Broadcast Message Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (attemptedSubmit && e.target.value.trim()) setContentError('');
              }}
              placeholder="Enter full public emergency announcement text and instructions for citizens..."
              className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white resize-none transition-colors ${contentError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-600'
                }`}
            />
            {contentError && (
              <span className="block mt-1 text-[11px] text-red-500 font-medium">{contentError}</span>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Send size={13} />
              <span>Publish Broadcast</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

