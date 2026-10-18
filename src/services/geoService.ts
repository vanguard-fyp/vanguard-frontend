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
  lat: number;
  lng: number;
}

export const geoService = {
  /** Real places and addresses in Malaysia, via the backend (cached, rate-limited). */
  searchPlaces: (q: string, signal?: AbortSignal) =>
    apiClient.get<PlaceResult[]>('/geo/search', { q, limit: 6 }, undefined, signal),
  reverse: (lat: number, lng: number, signal?: AbortSignal) =>
    apiClient.get<GeoResolution>('/geo/reverse', { lat, lng }, undefined, signal),

  forward: (params: { state?: string; district?: string; postcode?: string }, signal?: AbortSignal) =>
    apiClient.get<GeoResolution>('/geo/forward', params, undefined, signal),

  listLayers: () => apiClient.get<{ key: string; label: string; coverage: string; notes: string }[]>('/geo/layers'),

  getLayer: (key: string) => apiClient.get<GisLayerResponse>(`/geo/layers/${key}`),
};
