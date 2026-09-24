import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Navigation, AlertCircle } from 'lucide-react';
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

export const STATE_COORDINATES: Record<string, [number, number]> = {
  'Johor': [1.4927, 103.7414],
  'Kedah': [6.1184, 100.3685],
  'Kelantan': [6.1254, 102.2381],
  'Melaka': [2.1896, 102.2501],
  'Negeri Sembilan': [2.7258, 101.9424],
  'Pahang': [3.8126, 103.3256],
  'Perak': [4.5921, 101.0901],
  'Perlis': [6.4449, 100.2048],
  'Pulau Pinang': [5.4141, 100.3288],
  'Sabah': [5.9804, 116.0735],
  'Sarawak': [1.5533, 110.3592],
  'Selangor': [3.0738, 101.5183],
  'Terengganu': [5.3117, 103.1324],
  'WP Kuala Lumpur': [3.1390, 101.6869],
  'WP Putrajaya': [2.9264, 101.6964],
  'WP Labuan': [5.2831, 115.2308],
  'Regional / Transboundary': [4.2105, 101.9758],
};

// // The `malaysia-postcodes` package returns states in title-case (e.g. "Wp Kuala Lumpur").
// // Map those to the app's canonical state names so the State dropdown + coordinate lookup stay in sync.
const PACKAGE_STATE_TO_APP_STATE: Record<string, string> = {
  'wp kuala lumpur': 'WP Kuala Lumpur',
  'wp putrajaya': 'WP Putrajaya',
  'wp labuan': 'WP Labuan',
  johor: 'Johor',
  kedah: 'Kedah',
  kelantan: 'Kelantan',
  melaka: 'Melaka',
  'negeri sembilan': 'Negeri Sembilan',
  pahang: 'Pahang',
  perak: 'Perak',
  perlis: 'Perlis',
  'pulau pinang': 'Pulau Pinang',
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
}) => {
  const [postcode, setPostcode] = useState('');
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const parsedLat = parseFloat(lat) || 4.2105;
  const parsedLng = parseFloat(lng) || 101.9758;

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
      onLatChange(position.lat.toFixed(6));
      onLngChange(position.lng.toFixed(6));
    });

    // Handle map click
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onLatChange(e.latlng.lat.toFixed(6));
      onLngChange(e.latlng.lng.toFixed(6));
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

  // Handle Postcode Lookup — backed by the `malaysia-postcodes` dataset for accurate district resolution.
  const handlePostcodeLookup = (inputCode: string) => {
    const clean = inputCode.replace(/\D/g, '').slice(0, 5);
    setPostcode(clean);
    setLookupFeedback(null);

    if (clean.length < 5) return;

    const result = findPostcode(clean);
    if (result.found && result.city) {
      const appState = normalizePackageState(result.state) ?? state;
      onStateChange(appState);
      onDistrictChange(result.city);
      // Center the map on the resolved state so the user only needs to refine the exact spot.
      const coords = STATE_COORDINATES[appState];
      if (coords) {
        onLatChange(coords[0].toFixed(6));
        onLngChange(coords[1].toFixed(6));
      }
      setLookupFeedback(`Found: ${result.city}, ${appState}. Enter the specific location below.`);
    } else {
      setLookupFeedback('Postcode not recognised. Select the state manually or pin on the map.');
    }
  };

  // Handle State Change
  const handleStateSelect = (selectedState: string) => {
    onStateChange(selectedState);
    const coords = STATE_COORDINATES[selectedState];
    if (coords) {
      onLatChange(coords[0].toFixed(6));
      onLngChange(coords[1].toFixed(6));
    }
  };

  // Geocode specific location via OpenStreetMap Nominatim
  const handleSearchOnlineLocation = async () => {
    if (!location.trim() && !district.trim()) return;
    setIsSearchingGeocode(true);
    setLookupFeedback(null);
    try {
      const query = `${location} ${district} ${state} Malaysia`.trim();
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const foundLat = parseFloat(data[0].lat);
        const foundLng = parseFloat(data[0].lon);
        onLatChange(foundLat.toFixed(6));
        onLngChange(foundLng.toFixed(6));
        setLookupFeedback(`Located on map: ${data[0].display_name.split(',').slice(0, 2).join(',')}`);
      } else {
        setLookupFeedback('Could not pin exact street. You can click on the map directly.');
      }
    } catch {
      setLookupFeedback('Geocoding service unavailable. You can click/drag marker on map.');
    } finally {
      setIsSearchingGeocode(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* ── State & Postcode Fast Selection ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Postcode Search */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Postcode <span className="text-[10px] text-slate-500 font-normal">(Auto-fills district)</span>
          </label>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={postcode}
              onChange={(e) => handlePostcodeLookup(e.target.value)}
              placeholder="e.g. 50480 / 15000"
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>
        </div>

        {/* State Dropdown */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">State / Territory *</label>
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
          <label className="block text-xs font-bold text-slate-800 mb-1">District / Zone *</label>
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
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1">
          Specific Location / Address *
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            required
            placeholder="e.g. Kampung Sireh, Seksyen 4 / Jambatan Sultan Yahya Petra"
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
          />
          <button
            type="button"
            onClick={handleSearchOnlineLocation}
            disabled={isSearchingGeocode || (!location && !district)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Pin location on map"
          >
            <Search size={13} className={isSearchingGeocode ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Pin</span>
          </button>
        </div>
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
          <span className="text-[10px] text-slate-500 font-medium">Click or drag pin to adjust coordinates</span>
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
