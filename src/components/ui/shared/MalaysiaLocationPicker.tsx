import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Navigation, AlertCircle, Loader2 } from 'lucide-react';
import { findPostcode } from 'malaysia-postcodes';

export const MALAYSIA_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'WP Kuala Lumpur',
  'WP Putrajaya',
  'WP Labuan',
  'Regional / Transboundary',
] as const;

// The `malaysia-postcodes` package returns states in title-case (e.g. "Wp Kuala Lumpur").
// Map those to the app's canonical state names so the State dropdown + coordinate lookup stay in sync.
const PACKAGE_STATE_TO_APP_STATE: Record<string, string> = {
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
  'penang': 'Pulau Pinang',
  sabah: 'Sabah',
  sarawak: 'Sarawak',
  selangor: 'Selangor',
  terengganu: 'Terengganu',
};

function normalizePackageState(pkgState?: string): string | null {
  if (!pkgState) return null;
  return PACKAGE_STATE_TO_APP_STATE[pkgState.trim().toLowerCase()] ?? null;
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
}

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
  postcode: propPostcode,
  onPostcodeChange,
}) => {
  const [internalPostcode, setInternalPostcode] = useState(propPostcode || '');
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState<string | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const locationDebounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const parsedLat = parseFloat(lat) || 4.2105;
  const parsedLng = parseFloat(lng) || 101.9758;

  // Sync prop postcode when passed
  useEffect(() => {
    if (propPostcode !== undefined && propPostcode !== internalPostcode) {
      setInternalPostcode(propPostcode);
    }
  }, [propPostcode]);

  // Dynamic Reverse Geocoding when pin moves / map is clicked
  const reverseGeocodeCoordinates = useCallback(async (targetLat: number, targetLng: number) => {
    setIsSearchingGeocode(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || addr.street || addr.neighbourhood || addr.suburb || addr.quarter || addr.amenity || '';
        const city = addr.city || addr.town || addr.municipality || addr.district || addr.county || '';
        const rawState = addr.state || '';
        const stateName = normalizePackageState(rawState) || (MALAYSIA_STATES.includes(rawState as any) ? rawState : null);
        const postCodeFound = (addr.postcode || '').replace(/\D/g, '').slice(0, 5);

        if (road || city) {
          const conciseLoc = [road, city].filter(Boolean).join(', ');
          onLocationChange(conciseLoc || data.display_name.split(',').slice(0, 3).join(',').trim());
        }
        if (city) {
          onDistrictChange(city);
        }
        if (stateName && MALAYSIA_STATES.includes(stateName as any)) {
          onStateChange(stateName);
        }
        if (postCodeFound && postCodeFound.length === 5) {
          setInternalPostcode(postCodeFound);
          onPostcodeChange?.(postCodeFound);
        }
        const summary = [road, city, stateName].filter(Boolean).join(', ');
        setLookupFeedback(`Pin location updated: ${summary || 'Selected point'}`);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsSearchingGeocode(false);
    }
  }, [onLocationChange, onDistrictChange, onStateChange, onPostcodeChange]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [parsedLat, parsedLng],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    leafletMapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Custom pulse marker icon
    const customIcon = L.divIcon({
      className: 'custom-pin-marker',
      html: `
        <div style="position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:24px; height:24px; border-radius:50%; background:#2563eb; opacity:0.3; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative; width:26px; height:26px; background:#2563eb; border:2.5px solid #ffffff; border-radius:50%; box-shadow:0 4px 6px -1px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([parsedLat, parsedLng], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;

    // Handle marker drag
    marker.on('dragend', (event) => {
      const position = event.target.getLatLng();
      const newLatStr = position.lat.toFixed(6);
      const newLngStr = position.lng.toFixed(6);
      onLatChange(newLatStr);
      onLngChange(newLngStr);

      clearTimeout(reverseGeocodeTimer.current);
      reverseGeocodeTimer.current = setTimeout(() => {
        reverseGeocodeCoordinates(position.lat, position.lng);
      }, 300);
    });

    // Handle map click
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      const newLatStr = e.latlng.lat.toFixed(6);
      const newLngStr = e.latlng.lng.toFixed(6);
      onLatChange(newLatStr);
      onLngChange(newLngStr);

      clearTimeout(reverseGeocodeTimer.current);
      reverseGeocodeTimer.current = setTimeout(() => {
        reverseGeocodeCoordinates(e.latlng.lat, e.latlng.lng);
      }, 300);
    });

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Sync marker and map center when lat/lng change externally
  useEffect(() => {
    if (leafletMapRef.current && markerRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - parsedLat) > 0.0001 || Math.abs(currentPos.lng - parsedLng) > 0.0001) {
        markerRef.current.setLatLng([parsedLat, parsedLng]);
        leafletMapRef.current.flyTo([parsedLat, parsedLng], Math.max(leafletMapRef.current.getZoom(), 12), {
          duration: 0.8,
        });
      }
    }
  }, [parsedLat, parsedLng]);

  // Handle Postcode Lookup — backed by the `malaysia-postcodes` dataset and dynamic geocoding
  const handlePostcodeLookup = async (inputCode: string) => {
    const clean = inputCode.replace(/\D/g, '').slice(0, 5);
    setInternalPostcode(clean);
    onPostcodeChange?.(clean);
    setLookupFeedback(null);

    if (clean.length < 5) return;

    const result = findPostcode(clean);
    if (result.found && result.city) {
      const appState = normalizePackageState(result.state) ?? state;
      onStateChange(appState);
      onDistrictChange(result.city);
      setLookupFeedback(`Postcode resolved: ${result.city}, ${appState}. Pinning coordinates...`);

      // Dynamically geocode exact postcode + district for high accuracy
      try {
        const query = `${clean} ${result.city} ${appState} Malaysia`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=my&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (data && data.length > 0) {
          const foundLat = parseFloat(data[0].lat);
          const foundLng = parseFloat(data[0].lon);
          onLatChange(foundLat.toFixed(6));
          onLngChange(foundLng.toFixed(6));
          setLookupFeedback(`Found & Pinned: ${result.city}, ${appState} (${clean})`);
          return;
        }
      } catch {
        // Fallback
      }
      setLookupFeedback(`Found: ${result.city}, ${appState}. You can adjust the pin on the map.`);
    } else {
      setLookupFeedback('Postcode not recognised. Select the state manually or click on the map.');
    }
  };

  // Handle State Change
  const handleStateSelect = async (selectedState: string) => {
    onStateChange(selectedState);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(selectedState + ', Malaysia')}&countrycodes=my&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        onLatChange(parseFloat(data[0].lat).toFixed(6));
        onLngChange(parseFloat(data[0].lon).toFixed(6));
        return;
      }
    } catch {
      // Fallback
    }
  };

  // Search online places based on query scoped to Malaysia, Postcode, District & State
  const fetchLocationSuggestions = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSearchingGeocode(true);
    try {
      const clean = searchQuery.trim();
      const scopeParts = [clean];
      if (district && !clean.toLowerCase().includes(district.toLowerCase())) {
        scopeParts.push(district);
      }
      if (state && state !== 'Regional / Transboundary' && !clean.toLowerCase().includes(state.toLowerCase())) {
        scopeParts.push(state);
      }
      scopeParts.push('Malaysia');
      const query = scopeParts.join(', ');

      let response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=my&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      let data = await response.json();

      // Fallback to simpler query if scoped search returned 0 items
      if (!Array.isArray(data) || data.length === 0) {
        response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean + ', Malaysia')}&countrycodes=my&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        data = await response.json();
      }

      if (Array.isArray(data) && data.length > 0) {
        setLocationSuggestions(data);
        setShowSuggestions(true);
      } else {
        setLocationSuggestions([]);
      }
    } catch {
      setLocationSuggestions([]);
    } finally {
      setIsSearchingGeocode(false);
    }
  };

  const handleLocationInputChange = (val: string) => {
    onLocationChange(val);
    clearTimeout(locationDebounceTimer.current);
    if (val.trim().length >= 2) {
      locationDebounceTimer.current = setTimeout(() => {
        fetchLocationSuggestions(val);
      }, 350);
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (item: { display_name: string; lat: string; lon: string }) => {
    const parts = item.display_name.split(',');
    const conciseName = parts.slice(0, 3).join(',').trim();
    onLocationChange(conciseName || item.display_name);
    const newLat = parseFloat(item.lat);
    const newLng = parseFloat(item.lon);
    onLatChange(newLat.toFixed(6));
    onLngChange(newLng.toFixed(6));
    setShowSuggestions(false);
    setLocationSuggestions([]);
    setLookupFeedback(`Pinned location: ${conciseName}`);
  };

  // Manual pin geocoding search
  const handleSearchOnlineLocation = async () => {
    if (!location.trim() && !district.trim()) return;
    await fetchLocationSuggestions(location || district);
  };

  return (
    <div className="space-y-3">
      {/* ── State & Postcode Fast Selection ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Postcode Search */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Postcode <span className="text-red-500">*</span> <span className="text-[10px] text-slate-500 font-normal">(Auto-fills district)</span>
          </label>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={internalPostcode}
              onChange={(e) => handlePostcodeLookup(e.target.value)}
              placeholder="e.g. 50480 / 15000"
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>
        </div>

        {/* State Dropdown */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">State / Territory <span className="text-red-500">*</span></label>
          <select
            value={state}
            onChange={(e) => handleStateSelect(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            {MALAYSIA_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">District / Zone <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={district}
            onChange={(e) => onDistrictChange(e.target.value)}
            required
            placeholder="e.g. Kota Bharu, Petaling"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* ── Specific Location / Landmark ── */}
      <div className="relative">
        <label className="block text-xs font-bold text-slate-800 mb-1">
          Specific Location / Address <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={location}
            onChange={(e) => handleLocationInputChange(e.target.value)}
            onFocus={() => {
              if (locationSuggestions.length > 0) setShowSuggestions(true);
            }}
            required
            placeholder="e.g. Kampung Sireh, Seksyen 4 / Jambatan Sultan Yahya Petra"
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
          />
          <button
            type="button"
            onClick={handleSearchOnlineLocation}
            disabled={isSearchingGeocode || (!location && !district)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Search and pin location on map"
          >
            {isSearchingGeocode ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            <span className="hidden sm:inline">Find</span>
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && locationSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-[500] mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Matching Places in Malaysia</span>
              <button
                type="button"
                onClick={() => setShowSuggestions(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
            {locationSuggestions.map((place, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(place)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-100 last:border-0 flex items-start gap-2 text-slate-800 transition-colors cursor-pointer"
              >
                <MapPin size={13} className="text-blue-600 shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-relaxed">{place.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {lookupFeedback && (
          <p className="text-[11px] text-blue-600 font-medium mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> {lookupFeedback}
          </p>
        )}
      </div>

      {/* ── Interactive Leaflet Map with Marker ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <MapPin size={13} className="text-blue-600" />
            <span>Interactive Map & Pinpoint</span>
          </label>
          <span className="text-[10px] text-slate-500 font-medium">Click or drag pin to auto-fill address</span>
        </div>

        <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-xs h-44">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Coordinates HUD Tag */}
          <div className="absolute bottom-2 left-2 z-[400] bg-slate-900/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-[10px] font-mono flex items-center gap-2 border border-slate-700/50">
            <Navigation size={10} className="text-blue-400 animate-pulse" />
            <span>
              Lat: {parsedLat.toFixed(4)}, Lng: {parsedLng.toFixed(4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
