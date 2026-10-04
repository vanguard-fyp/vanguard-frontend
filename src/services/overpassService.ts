/**
 * Real-world nearby emergency services and infrastructure using OpenStreetMap's Overpass API.
 *
 * Queries are proxied through the Vanguard backend (/api/v1/overpass/query) so the browser
 * never has to reach the Overpass API servers directly — this bypasses CORS restrictions and
 * network-level firewall / geo-block issues.
 *
 * Features:
 * - Scoped, high-speed targeted querying (8 km radius around focal incidents/locations)
 * - Progressive loading and accumulation as users pan/zoom/select incidents
 * - In-memory cache with 15-minute TTL to avoid redundant backend calls
 */

import type { MapPOI } from '../types';

const BACKEND_OVERPASS_URL = '/api/v1/overpass/query';

const AMENITY_CATEGORIES: Record<string, MapPOI['category']> = {
  shelter: 'Shelter',
  community_centre: 'Shelter',
  public_hall: 'Shelter',
  townhall: 'Shelter',
  school: 'School',
  hospital: 'Hospital',
  clinic: 'Clinic',
  doctors: 'Clinic',
  health_post: 'Clinic',
  dentist: 'Clinic',
  police: 'Police Station',
  fire_station: 'Fire Station',
  pharmacy: 'Pharmacy',
};

const HEALTHCARE_CATEGORIES: Record<string, MapPOI['category']> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  health_post: 'Clinic',
  pharmacy: 'Pharmacy',
};

const EMERGENCY_CATEGORIES: Record<string, MapPOI['category']> = {
  evacuation_centre: 'Shelter',
  shelter: 'Shelter',
  disaster_shelter: 'Shelter',
  fire_station: 'Fire Station',
};

const SOCIAL_FACILITY_CATEGORIES: Record<string, MapPOI['category']> = {
  shelter: 'Shelter',
};

// Global in-memory cache to prevent redundant queries
const queryCache = new Map<string, { data: MapPOI[]; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Track fetched center coordinates to avoid querying the same area multiple times
const fetchedCenters: { lat: number; lng: number }[] = [];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371.0;
  const toRad = (d: number) => (d * Math.PI) / 180.0;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return r * 2 * Math.asin(Math.sqrt(a));
}

export const overpassService = {
  /**
   * Checks if an area around (lat, lng) has already been fetched recently
   */
  hasFetchedNear: (lat: number, lng: number, thresholdKm = 6): boolean => {
    return fetchedCenters.some((c) => haversineKm(c.lat, c.lng, lat, lng) < thresholdKm);
  },

  /**
   * Fetch real facilities around a targeted focal coordinate via the backend proxy.
   * The backend routes the query to the Overpass API servers, bypassing browser firewall / CORS blocks.
   * @param lat Latitude
   * @param lng Longitude
   * @param radiusMeters Search radius in meters (default: 8,000m / 8km)
   * @param limit Max results to return (default: 60)
   */
  fetchNearbyFacilities: async (
    lat: number,
    lng: number,
    radiusMeters = 8000,
    limit = 60
  ): Promise<MapPOI[]> => {
    const bucketLat = lat.toFixed(2);
    const bucketLng = lng.toFixed(2);
    const cacheKey = `${bucketLat}_${bucketLng}_${radiusMeters}`;

    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    let rawData: any = null;

    try {
      const url = new URL(BACKEND_OVERPASS_URL, window.location.origin);
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lng', String(lng));
      url.searchParams.set('radius', String(radiusMeters));
      url.searchParams.set('limit', String(limit));

      // 120 s timeout — backend makes up to 9 sequential Nominatim calls (1 req/s each)
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120_000);

      try {
        const res = await fetch(url.toString(), {
          method: 'POST',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.elements)) {
            rawData = json;
          }
        } else {
          console.warn(`Facility proxy returned HTTP ${res.status}`);
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      console.warn('Facility proxy request failed:', err);
    }

    if (!rawData || !Array.isArray(rawData.elements)) {
      return [];
    }

    // Register fetched center
    fetchedCenters.push({ lat, lng });

    const seen = new Set<string>();
    const pois: MapPOI[] = [];

    for (const el of rawData.elements) {
      if (!el || !el.tags) continue;
      const tags = el.tags;

      const emergency = tags.emergency || '';
      const socialFacility = tags.social_facility || '';
      const amenity = tags.amenity || '';
      const healthcare = tags.healthcare || '';

      const category: MapPOI['category'] =
        EMERGENCY_CATEGORIES[emergency] ||
        SOCIAL_FACILITY_CATEGORIES[socialFacility] ||
        AMENITY_CATEGORIES[amenity] ||
        HEALTHCARE_CATEGORIES[healthcare] ||
        'Other';

      if (
        category === 'Other' &&
        !amenity &&
        !healthcare &&
        !emergency &&
        !socialFacility
      ) {
        continue;
      }

      const name = (tags.name || tags['name:en'] || tags.operator || category).toString().trim();
      if (!name) continue;

      const dedupeKey = `${name.toLowerCase()}|${category}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      let elLat: number | null = typeof el.lat === 'number' ? el.lat : null;
      let elLng: number | null = typeof el.lon === 'number' ? el.lon : null;

      if ((elLat === null || elLng === null) && el.center) {
        elLat = typeof el.center.lat === 'number' ? el.center.lat : null;
        elLng = typeof el.center.lon === 'number' ? el.center.lon : null;
      }

      if (elLat === null || elLng === null || isNaN(elLat) || isNaN(elLng)) continue;

      const phone =
        tags.phone ||
        tags['contact:phone'] ||
        tags['emergency:phone'] ||
        tags['phone:my'] ||
        undefined;

      const placeParts = [
        tags['addr:suburb'] || tags['addr:neighbourhood'],
        tags['addr:city'] || tags['addr:town'],
        tags['addr:state'],
      ].filter(Boolean);

      const placeStr = placeParts.length > 0 ? placeParts.join(', ') : 'Malaysia';
      const distance = haversineKm(lat, lng, elLat, elLng);

      const openingHours = tags.opening_hours || tags['opening_hours:covid19'] || undefined;
      const website = tags.website || tags['contact:website'] || tags.url || undefined;

      pois.push({
        id: `osm-${el.type}-${el.id}`,
        name,
        category,
        coordinates: [elLat, elLng],
        details: `${placeStr}${phone ? ` · Tel: ${phone}` : ''}`,
        contact: phone,
        distanceKm: Math.round(distance * 10) / 10,
        place: placeStr,
        website,
        openingHours,
      });
    }

    pois.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

    queryCache.set(cacheKey, { data: pois, timestamp: Date.now() });
    return pois;
  },
};
