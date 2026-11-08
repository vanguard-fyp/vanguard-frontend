import { apiClient } from './apiClient';
import type { GeoResolution, GisLayerResponse } from '../types';

/** Location resolution and GIS layers, always via the backend (canonical admin areas). */
export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  display_name: string;
  type?: string | null;
  /** "District", "Town", "Road"… */
  kind_label?: string;
  /** "Google" when Google Places found it; absent for local areas and OpenStreetMap. */
  source?: string;
  lat: number;
  lng: number;
}

/** A real-world service near a point (Google Places first, same source as the mobile app). */
export interface NearbyFacility {
  id: string;
  name: string;
  category: string;
  phone_number: string;
  place: string;
  lat: number;
  lng: number;
  distance_km: number | null;
  source: string | null;
}

export const geoService = {
  /** Real places and addresses in Malaysia, via the backend (cached, rate-limited). */
  searchPlaces: (q: string, signal?: AbortSignal, google = false) =>
    apiClient.get<PlaceResult[]>('/geo/search', google ? { q, limit: 8, google } : { q, limit: 6 }, undefined, signal),
  reverse: (lat: number, lng: number, signal?: AbortSignal) =>
    apiClient.get<GeoResolution>('/geo/reverse', { lat, lng }, undefined, signal),

  forward: (params: { state?: string; district?: string; postcode?: string }, signal?: AbortSignal) =>
    apiClient.get<GeoResolution>('/geo/forward', params, undefined, signal),

  nearbyFacilities: (lat: number, lng: number, radiusKm: number) =>
    apiClient.get<NearbyFacility[]>('/emergency-contacts/nearby', { lat, lng, radius_km: radiusKm, limit: 60 }),

  listLayers: () => apiClient.get<{ key: string; label: string; coverage: string; notes: string }[]>('/geo/layers'),

  getLayer: (key: string) => apiClient.get<GisLayerResponse>(`/geo/layers/${key}`),
};
