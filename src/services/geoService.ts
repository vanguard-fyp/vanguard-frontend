import { apiClient } from './apiClient';
import type { GeoResolution, GisLayerResponse } from '../types';

/** Location resolution and GIS layers, always via the backend (canonical admin areas). */
export const geoService = {
  reverse: (lat: number, lng: number, signal?: AbortSignal) =>
    apiClient.get<GeoResolution>('/geo/reverse', { lat, lng }, undefined, signal),

  forward: (params: { state?: string; district?: string; postcode?: string }, signal?: AbortSignal) =>
    apiClient.get<GeoResolution>('/geo/forward', params, undefined, signal),

  listLayers: () => apiClient.get<{ key: string; label: string; coverage: string; notes: string }[]>('/geo/layers'),

  getLayer: (key: string) => apiClient.get<GisLayerResponse>(`/geo/layers/${key}`),
};
