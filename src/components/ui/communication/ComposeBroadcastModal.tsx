import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Megaphone, MapPin, Search, AlertTriangle, Loader2, Sparkles, Undo2 } from 'lucide-react';
import type { PublicAnnouncement, SeverityLevel } from '../../../types';
import { useAdministrativeAreas } from '../../../hooks';
import { geoService } from '../../../services/geoService';
import { announcementService, type BroadcastDraft } from '../../../services/announcementService';
import { broadcastHints } from '../../../utils/broadcastHints';

interface ComposeBroadcastModalProps {
  onClose: () => void;
  /** Resolves when the backend accepted the broadcast; rejects with the API error. */
  onPublish: (announcement: Partial<PublicAnnouncement>) => Promise<void>;
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
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PublicAnnouncement['category']>('Emergency Alert');
  const [severity, setSeverity] = useState<SeverityLevel>('High');
  // Target areas come ONLY from the canonical administrative_areas table; the
  // backend rejects anything else (422), so there is no hard-coded fallback.
  const [targetState, setTargetState] = useState('');
  const [postcodeBusy, setPostcodeBusy] = useState(false);
  const postcodeSeq = useRef(0);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [postcodeScopeInput, setPostcodeScopeInput] = useState('');
  const [postcodeMatchMsg, setPostcodeMatchMsg] = useState('');
  const [content, setContent] = useState('');
  // AI drafting is only on click; the hints below are instant and free.
  const [drafting, setDrafting] = useState(false);
  const [draftInfo, setDraftInfo] = useState<BroadcastDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [previousContent, setPreviousContent] = useState<string | null>(null);
  const hints = useMemo(() => broadcastHints(title), [title]);
  const hintDiffers = !!hints && ((hints.category && hints.category !== category) || (hints.severity && hints.severity !== severity));

  const handleDraft = async () => {
    if (title.trim().length < 3) {
      setTitleError('Type a title first so the AI knows what to write');
      return;
    }
    setDrafting(true);
    setDraftError(null);
    try {
      const draft = await announcementService.draftContent({
        title: title.trim(),
        category,
        severity,
        target_state: targetState || undefined,
        target_districts: selectedDistricts,
      });
      setPreviousContent(content);
      setContent(draft.content);
      setDraftInfo(draft);
      setContentError('');
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Could not draft the message.');
    } finally {
      setDrafting(false);
    }
  };

  // Validation
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');
  const [districtError, setDistrictError] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // Resolve a postcode through the backend (GET /geo/forward), which maps it
  // to a canonical state/district. Out-of-order responses are ignored.
  const handlePostcodeScope = (code: string) => {
    const clean = code.replace(/\D/g, '').slice(0, 5);
    setPostcodeScopeInput(clean);
    if (clean.length !== 5) {
      setPostcodeMatchMsg('');
      return;
    }
    const seq = ++postcodeSeq.current;
    setPostcodeBusy(true);
    geoService
      .forward({ postcode: clean })
      .then((res) => {
        if (seq !== postcodeSeq.current) return;
        if ((res.status === 'resolved' || res.status === 'partial') && res.state && res.district) {
          setTargetState(res.state);
          setSelectedDistricts([res.district]);
          setPostcodeMatchMsg(`Found: ${res.district}, ${res.state}`);
          if (attemptedSubmit) setDistrictError('');
        } else if (res.status === 'ambiguous') {
          setPostcodeMatchMsg('Postcode spans several districts — select them below');
          if (res.state) setTargetState(res.state);
          setSelectedDistricts([]);
        } else if (res.status === 'unavailable') {
          setPostcodeMatchMsg('Postcode lookup unavailable — select districts below');
        } else {
          setPostcodeMatchMsg(res.message || 'Postcode not found in the administrative area data');
          setSelectedDistricts([]);
        }
      })
      .catch(() => {
        if (seq === postcodeSeq.current) setPostcodeMatchMsg('Postcode lookup unavailable — select districts below');
      })
      .finally(() => {
        if (seq === postcodeSeq.current) setPostcodeBusy(false);
      });
  };

  const handleToggleDistrict = (d: string) => {
    if (selectedDistricts.includes(d)) {
      setSelectedDistricts(selectedDistricts.filter((item) => item !== d));
    } else {
      setSelectedDistricts([...selectedDistricts, d]);
    }
    if (attemptedSubmit) setDistrictError('');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
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

    if (areasUnavailable) {
      setDistrictError('District list unavailable — the broadcast cannot be targeted. Retry when it loads.');
      hasError = true;
    } else if (!targetState) {
      setDistrictError('Select a target state');
      hasError = true;
    } else if (selectedDistricts.length === 0) {
      setDistrictError('Select at least one target district');
      hasError = true;
    } else {
      setDistrictError('');
    }

    if (hasError) return;

    // The issuer is taken from the signed-in user's token by the backend.
    // The modal stays open (and keeps the text) until the backend accepts it.
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onPublish({
        title: title.trim(),
        category,
        severity,
        target_state: targetState,
        target_districts: selectedDistricts,
        content: content.trim(),
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'The broadcast could not be published. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const {
    data: adminAreas = [],
    isLoading: areasLoading,
    isError: areasError,
    refetch: refetchAreas,
  } = useAdministrativeAreas();
  const areasUnavailable = !areasLoading && (areasError || adminAreas.length === 0);

  const dynamicStates = useMemo(
    () => Array.from(new Set(adminAreas.map((a) => a.state).filter(Boolean))).sort(),
    [adminAreas]
  );

  const availableDistrictsForState = useMemo(
    () =>
      Array.from(
        new Set(
          adminAreas
            .filter((a) => a.state.toLowerCase() === targetState.toLowerCase())
            .map((a) => a.district)
            .filter(Boolean)
        )
      ).sort(),
    [adminAreas, targetState]
  );

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
            {hints && (hints.hazardLabel || hintDiffers) && (
              <div className="mt-1.5 flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500">
                {hints.hazardLabel && <span>Looks like a <span className="font-semibold text-slate-700">{hints.hazardLabel.toLowerCase()}</span> notice.</span>}
                {hintDiffers && (
                  <button
                    type="button"
                    onClick={() => {
                      if (hints.category) setCategory(hints.category);
                      if (hints.severity) setSeverity(hints.severity);
                    }}
                    className="font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    Use {[hints.category, hints.severity].filter(Boolean).join(' · ')}
                  </button>
                )}
              </div>
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
            {areasLoading ? (
              <p className="text-xs text-slate-400 italic flex items-center gap-1.5 py-2">
                <Loader2 size={12} className="animate-spin" /> Loading administrative areas…
              </p>
            ) : areasUnavailable ? (
              <div className="flex items-center justify-between gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={13} /> District list unavailable. Broadcasts can only target canonical districts, so publishing is blocked.
                </span>
                <button type="button" onClick={() => refetchAreas()} className="font-bold underline cursor-pointer shrink-0">
                  Retry
                </button>
              </div>
            ) : (
              <select
                value={targetState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="" disabled>
                  Select a state…
                </option>
                {dynamicStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quick Scope by Postcode */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Search size={13} className="text-blue-600" />
                <span>Auto-Scope by Malaysian Postcode</span>
              </label>

              {postcodeBusy ? (
                <Loader2 size={12} className="animate-spin text-blue-600" />
              ) : (
                postcodeMatchMsg && (
                  <span className="text-[11px] font-semibold text-blue-700">{postcodeMatchMsg}</span>
                )
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
                Target Districts{targetState ? ` in ${targetState}` : ''} <span className="text-rose-500">*</span>
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
              {!targetState && !areasUnavailable && (
                <p className="text-[11px] text-slate-400 italic">Select a state (or enter a postcode) to list its districts.</p>
              )}
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
            <div className="flex items-center justify-between mb-1 gap-2">
              <label className="text-xs font-bold text-slate-800">
                Broadcast Message Content <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                {previousContent !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setContent(previousContent);
                      setPreviousContent(null);
                      setDraftInfo(null);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    <Undo2 size={12} /> Undo
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDraft}
                  disabled={drafting || title.trim().length < 3}
                  title={title.trim().length < 3 ? 'Type a title first' : 'Write the message from the title, category and target districts'}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {drafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {drafting ? 'Drafting…' : content.trim() ? 'Redraft with AI' : 'Draft with AI'}
                </button>
              </div>
            </div>
            {!content.trim() && hints && (
              <p className="text-[11px] text-slate-500 mb-1.5">
                Include: {hints.include.join(' · ')}
              </p>
            )}
            <textarea
              rows={6}
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
            {draftError && <span className="block mt-1 text-[11px] text-red-500 font-medium">{draftError}</span>}
            {draftInfo && (
              <p className="mt-1 text-[11px] text-slate-500">
                {draftInfo.source === 'llm'
                  ? 'AI draft from your title, targets and the incidents and shelters on record. Check it before publishing.'
                  : `${draftInfo.reason ?? 'AI unavailable.'} Fill in local details before publishing.`}
                {(draftInfo.unsupported_numbers ?? []).length > 0 && (
                  <span className="text-amber-700"> Check these figures, they are not in our data: {draftInfo.unsupported_numbers!.join(', ')}.</span>
                )}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          {submitError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {submitError}
            </p>
          )}

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
              disabled={areasLoading || areasUnavailable || submitting}
              title={areasUnavailable ? 'District list unavailable' : undefined}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              <span>{submitting ? 'Publishing…' : 'Publish Broadcast'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

