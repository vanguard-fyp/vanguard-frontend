import type { GISLayerState, Incident, MapPOI } from '../types';
import type { NearbyFacility } from '../services/geoService';

/** Whether the hazard filters in the layer panel keep this incident on the map. */
export function incidentMatchesLayers(inc: Incident, layers: GISLayerState): boolean {
  if (layers.disasterHotspots) return true;
  const t = (inc.type || (inc as { disaster_type?: string }).disaster_type || '').toLowerCase();
  if (layers.floodAreas && (t.includes('flood') || t.includes('inundation'))) return true;
  if (layers.landslideAreas && (t.includes('landslide') || t.includes('slope'))) return true;
  if (layers.fireZones && (t.includes('fire') || t.includes('wildfire'))) return true;
  if (layers.severeStorms && (t.includes('storm') || t.includes('cyclone') || t.includes('haze') || t.includes('wind'))) return true;
  if (layers.earthquakeDrought && (t.includes('earthquake') || t.includes('seismic') || t.includes('drought'))) return true;
  return false;
}

const NEARBY_CATEGORY: Record<string, MapPOI['category']> = {
  Hospital: 'Hospital',
  Clinic: 'Clinic',
  Pharmacy: 'Pharmacy',
  Police: 'Police Station',
  'Fire & Rescue': 'Fire Station',
  Shelter: 'Shelter',
};

/** A nearby place as a map point, so the existing layer filters apply to it. */
export function facilityToPoi(f: NearbyFacility): MapPOI {
  return {
    id: f.id,
    name: f.name,
    category: NEARBY_CATEGORY[f.category] ?? 'Other',
    coordinates: [f.lat, f.lng],
    details: [f.distance_km != null ? `${f.distance_km.toFixed(1)} km away` : '', f.place].filter(Boolean).join(' · '),
    contact: f.phone_number || undefined,
    distanceKm: f.distance_km ?? undefined,
  };
}

/** Whether two points are within `km` of each other (haversine). */
export function withinKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }, km: number): boolean {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h)) < km;
}
