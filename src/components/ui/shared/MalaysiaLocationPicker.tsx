import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Navigation, AlertCircle, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAdministrativeAreas } from '../../../hooks';
import { geoService } from '../../../services/geoService';
import {
  canonicalState,
  districtsForState,
  initialLocation,
  isSubmittable,
  locationReducer,
  pendingLookup,
  stateCentroid,
  statesOf,
  type LocationState,
} from '../../../utils/locationSync';

export interface LocationResolution {
  state: string;
  /** precise place name (e.g. Mentakab) */
  district: string;
  /** canonical administrative district the pin lies in (e.g. Temerloh) */
  adminDistrict: string;
  postcode: string;
  zone: string | null;
  administrativeAreaId: string | null;
  lat: number | null;
  lng: number | null;
  status: LocationState['status'];
  submittable: boolean;
}

interface MalaysiaLocationPickerProps {
  state: string;
  onStateChange: (state: string) => void;
  district: string;
  onDistrictChange: (district: string) => void;
  location: string;
  onLocationChange: (location: string) => void;
  lat: string;
  onLatChange: (lat: string) => void;
  lng: string;
  onLngChange: (lng: string) => void;
  postcode?: string;
  onPostcodeChange?: (postcode: string) => void;
  /** Full canonical resolution (zone, admin-area id, status) for the parent form. */
  onResolutionChange?: (r: LocationResolution) => void;
}

const STATUS_UI: Record<string, { text: string; cls: string; icon: 'ok' | 'warn' | 'spin' }> = {
  resolved: { text: 'Location resolved', cls: 'text-emerald-700', icon: 'ok' },
  partial: { text: 'Partially resolved', cls: 'text-amber-700', icon: 'warn' },
  ambiguous: { text: 'Ambiguous — choose the correct district', cls: 'text-amber-700', icon: 'warn' },
  unresolved: { text: 'Unresolved location', cls: 'text-red-700', icon: 'warn' },
  unavailable: { text: 'Location service unavailable', cls: 'text-red-700', icon: 'warn' },
  pending: { text: 'Resolving the pin…', cls: 'text-slate-500', icon: 'spin' },
  idle: { text: 'Search an address or click the map to place the pin', cls: 'text-slate-500', icon: 'warn' },
};

const MALAYSIA_VIEW: [number, number] = [4.2105, 108.9758];

const num = (v: string): number | null => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const inputCls =
  'w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white disabled:opacity-60';

/**
 * Incident location picker. The map pin is the source of truth: searching an
 * address, clicking/dragging the map or entering a postcode moves the pin, and
 * the backend's reverse lookup of the pin fills the canonical state/district,
 * postcode and town. The address text follows the pin unless the officer
 * picked it from the search list. Unresolved input is kept and flagged — never
 * replaced with a default location.
 */
export const MalaysiaLocationPicker: React.FC<MalaysiaLocationPickerProps> = ({
  state,
  onStateChange,
  district,
  onDistrictChange,
  location,
  onLocationChange,
  lat,
  onLatChange,
  lng,
  onLngChange,
  postcode,
  onPostcodeChange,
  onResolutionChange,
}) => {
  const { data: areas = [], isLoading: areasLoading, isError: areasError, refetch: refetchAreas } = useAdministrativeAreas();
  const [s, dispatch] = useReducer(locationReducer, undefined, () =>
    initialLocation({ state, district, postcode: postcode ?? '', lat: num(lat), lng: num(lng) })
  );
  const [suggestions, setSuggestions] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // 'search' = the address text was chosen from the search list and is kept as is;
  // 'map' = the address follows the pin's reverse lookup.
  const addressMode = useRef<'search' | 'map'>('map');

  const states = useMemo(() => statesOf(areas), [areas]);
  const districts = useMemo(() => (s.state ? districtsForState(areas, s.state) : []), [areas, s.state]);
  const selectedState = canonicalState(s.state, states);

  // ── Lookups: run the one the latest user action requires ─────────────────
  useEffect(() => {
    const kind = pendingLookup(s);
    if (!kind) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const seq = s.seq;
    const timer = setTimeout(async () => {
      try {
        const result =
          kind === 'reverse'
            ? await geoService.reverse(s.lat as number, s.lng as number, ctrl.signal)
            : await geoService.forward({ state: s.state || undefined, district: s.district || undefined, postcode: s.postcode }, ctrl.signal);
        dispatch({ type: 'RESOLVED', seq, result });
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        dispatch({ type: 'FAILED', seq, message: 'Location service is unavailable. Your selection was kept; adjust the pin manually.' });
      }
    }, kind === 'reverse' ? 300 : 500);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // Only the sequence number decides when a lookup is needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.seq, s.status]);

  // The address follows the pin after a map click/drag (not after a search pick).
  useEffect(() => {
    if (s.origin !== 'pin' || !s.displayName) return;
    if (addressMode.current === 'map') onLocationChange(s.displayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.displayName, s.seq]);

  // ── Propagate resolved values to the parent form ─────────────────────────
  useEffect(() => {
    if (s.state !== state) onStateChange(s.state);
    if (s.district !== district) onDistrictChange(s.district);
    if (onPostcodeChange && s.postcode !== (postcode ?? '')) onPostcodeChange(s.postcode);
    if (s.lat != null && s.lat.toFixed(6) !== lat) onLatChange(s.lat.toFixed(6));
    if (s.lng != null && s.lng.toFixed(6) !== lng) onLngChange(s.lng.toFixed(6));
    if (s.lat == null && lat !== '') onLatChange('');
    if (s.lng == null && lng !== '') onLngChange('');
    onResolutionChange?.({
      state: s.state,
      district: s.district,
      adminDistrict: s.adminDistrict,
      postcode: s.postcode,
      zone: s.zone,
      administrativeAreaId: s.administrativeAreaId,
      lat: s.lat,
      lng: s.lng,
      status: s.status,
      submittable: isSubmittable(s),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  // ── Map ──────────────────────────────────────────────────────────────────
  const movePin = useCallback((latV: number, lngV: number, mode: 'search' | 'map') => {
    addressMode.current = mode;
    dispatch({ type: 'PIN_MOVED', lat: latV, lng: lngV });
  }, []);

  useEffect(() => {
    if (!mapEl.current) return;
    const start: [number, number] = s.lat != null && s.lng != null ? [s.lat, s.lng] : MALAYSIA_VIEW;
    const map = L.map(mapEl.current, { center: start, zoom: s.lat != null ? 13 : 5, zoomControl: false });
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => movePin(e.latlng.lat, e.latlng.lng, 'map'));
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker on the pin, whatever moved it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (s.lat == null || s.lng == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const ll = L.latLng(s.lat, s.lng);
    if (!markerRef.current) {
      const icon = L.divIcon({
        className: 'custom-pin-marker',
        html: '<div style="width:26px;height:26px;background:#2563eb;border:2.5px solid #fff;border-radius:50%;box-shadow:0 4px 6px -1px rgba(0,0,0,.3)"></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      markerRef.current = L.marker(ll, { icon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', (e) => {
        const p = (e.target as L.Marker).getLatLng();
        movePin(p.lat, p.lng, 'map');
      });
    } else {
      markerRef.current.setLatLng(ll);
    }
    // Clicks on the visible map do not re-centre; search / district / postcode jumps do.
    if (s.origin !== 'pin' || !map.getBounds().pad(-0.1).contains(ll)) {
      map.flyTo(ll, Math.max(map.getZoom(), 13), { duration: 0.6 });
    }
  }, [s.lat, s.lng, s.origin, movePin]);

  // ── Address / place search (OpenStreetMap Nominatim) ─────────────────────
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchPlaces = (q: string) => {
    clearTimeout(searchTimer.current);
    if (q.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=my&limit=6`,
          { headers: { 'Accept-Language': 'en' } }
        );
        setSuggestions(res.ok ? await res.json() : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 600);
  };

  const ui = STATUS_UI[s.status] ?? STATUS_UI.idle;
  const areasUnavailable = areasError || (!areasLoading && areas.length === 0);

  return (
    <div className="space-y-3">
      {/* 3. Derived fields — filled from the pin, editable */}
      {areasUnavailable && !areasLoading && (
        <p className="text-[11px] text-red-700 flex items-center gap-1.5">
          <AlertTriangle size={12} /> Administrative districts could not be loaded, so the district cannot be validated.
          <button type="button" onClick={() => refetchAreas()} className="underline font-semibold flex items-center gap-1 cursor-pointer">
            <RefreshCw size={11} /> Retry
          </button>
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Postcode <span className="text-[10px] text-slate-500 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={s.postcode}
              onChange={(e) => dispatch({ type: 'POSTCODE_ENTERED', postcode: e.target.value })}
              placeholder="e.g. 15000"
              title="Entering a postcode moves the pin"
              className={`${inputCls} font-mono pl-8`}
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1 truncate">State / Territory <span className="text-red-500">*</span></label>
          <select
            value={selectedState}
            disabled={areasUnavailable}
            onChange={(e) => {
              const st = e.target.value;
              dispatch({ type: 'STATE_SELECTED', state: st, areas });
              const c = stateCentroid(areas, st);
              if (c && mapRef.current) mapRef.current.flyTo([c.lat, c.lng], 8, { duration: 0.6 });
            }}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="">{areasLoading ? 'Loading…' : 'Select state'}</option>
            {selectedState && !states.includes(selectedState) && <option value={selectedState}>{selectedState}</option>}
            {states.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            District / Zone <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            list="vanguard-admin-districts"
            value={s.district}
            maxLength={50}
            disabled={!s.state && s.lat == null}
            onChange={(e) => {
              const v = e.target.value;
              const canonical = districts.find((d) => d.district.toLowerCase() === v.trim().toLowerCase());
              dispatch(canonical ? { type: 'DISTRICT_SELECTED', district: canonical.district, areas } : { type: 'DISTRICT_TYPED', district: v });
            }}
            placeholder={s.state ? 'e.g. Mentakab or Temerloh' : 'Place the pin or choose a state'}
            className={inputCls}
          />
          <datalist id="vanguard-admin-districts">
            {districts.map((d) => (
              <option key={d.id} value={d.district} />
            ))}
          </datalist>
          <p className={`text-[10px] mt-0.5 ${s.administrativeAreaId ? 'text-emerald-700' : 'text-amber-700'}`}>
            {s.administrativeAreaId
              ? `Admin district: ${s.adminDistrict}`
              : 'Not linked yet — place the pin'}
          </p>
        </div>

      </div>

      {/* 1. Address search → moves the pin */}
      <div className="relative">
        <label className="block text-xs font-bold text-slate-800 mb-1">
          Specific location / address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={location}
            onChange={(e) => {
              onLocationChange(e.target.value);
              searchPlaces(e.target.value);
            }}
            required
            placeholder="Search a place or address, e.g. Kampung Sireh, Kota Bharu"
            className={`${inputCls} pl-8 pr-8`}
          />
          {searching && <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5">Pick a result to move the pin, or click the map — the fields below follow the pin.</p>
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-[500] mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
            {suggestions.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSuggestions([]);
                  const la = parseFloat(p.lat);
                  const lo = parseFloat(p.lon);
                  onLocationChange(p.display_name);
                  if (Number.isFinite(la) && Number.isFinite(lo)) movePin(la, lo, 'search');
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-100 last:border-0 flex items-start gap-2 cursor-pointer"
              >
                <MapPin size={13} className="text-blue-600 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{p.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Map — the source of truth */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <MapPin size={13} className="text-blue-600" /> Incident pin <span className="text-red-500">*</span>
          </label>
          <span className="text-[10px] text-slate-500">Click or drag to adjust</span>
        </div>
        <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-xs h-56">
          <div ref={mapEl} className="w-full h-full" />
          <div className="absolute bottom-2 left-2 z-[400] bg-slate-900/85 text-white px-2.5 py-1 rounded-md text-[10px] font-mono flex items-center gap-2">
            <Navigation size={10} className="text-blue-400" />
            {s.lat != null && s.lng != null ? `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}` : 'No pin placed'}
          </div>
        </div>
      </div>



      {s.status === 'ambiguous' && s.candidates.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 space-y-1">
          <p className="text-[11px] font-semibold text-amber-900">This postcode spans several districts — choose one:</p>
          {s.candidates.map((c, i) => (
            <button key={i} type="button" onClick={() => dispatch({ type: 'CANDIDATE_CHOSEN', candidate: c })} className="block text-left text-xs text-amber-900 hover:underline cursor-pointer">
              {c.district}, {c.state}
            </button>
          ))}
        </div>
      )}

      <div className={`text-[11px] font-medium flex items-start gap-1.5 ${ui.cls}`}>
        {ui.icon === 'spin' ? <Loader2 size={12} className="animate-spin mt-0.5" /> : ui.icon === 'ok' ? <CheckCircle2 size={12} className="mt-0.5" /> : <AlertCircle size={12} className="mt-0.5" />}
        <span>
          {ui.text}
          {(s.status === 'resolved' || s.status === 'partial') && (s.district || s.state)
            ? ` — ${[s.district, s.adminDistrict && s.adminDistrict !== s.district ? `${s.adminDistrict} district` : null, s.state].filter(Boolean).join(', ')}`
            : ''}
          {s.message ? ` · ${s.message}` : ''}
        </span>
      </div>
    </div>
  );
};
