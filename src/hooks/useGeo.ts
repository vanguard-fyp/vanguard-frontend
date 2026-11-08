import { useQueries, useQuery } from '@tanstack/react-query';
import { geoService } from '../services/geoService';
import type { GisLayerResponse } from '../types';

export const GEO_KEYS = {
  layer: (key: string) => ['geo', 'layer', key] as const,
  nearby: (lat: number, lng: number) => ['geo', 'nearby', lat.toFixed(3), lng.toFixed(3)] as const,
};

/**
 * Backend-proxied GIS layers (GET /geo/layers/{key}). The backend validates
 * features and caches upstream responses for 10 min; a layer is only fetched
 * while its toggle is on.
 */
export function useGisLayers(keys: { key: string; enabled: boolean }[]) {
  return useQueries({
    queries: keys.map(({ key, enabled }) => ({
      queryKey: GEO_KEYS.layer(key),
      queryFn: (): Promise<GisLayerResponse> => geoService.getLayer(key),
      enabled,
      staleTime: 10 * 60_000,
      retry: 1,
    })),
  });
}

export const NEARBY_RADIUS_KM = 10;

/**
 * Real-world services around a point, from the same provider chain as the mobile
 * app (Google Places first). Billed per point, so only fetched for a place or
 * incident the officer picked, never while panning.
 */
export function useNearbyFacilities(point: { lat: number; lng: number } | null) {
  return useQuery({
    queryKey: GEO_KEYS.nearby(point?.lat ?? 0, point?.lng ?? 0),
    queryFn: () => geoService.nearbyFacilities(point!.lat, point!.lng, NEARBY_RADIUS_KM),
    enabled: !!point,
    staleTime: 10 * 60_000,
    retry: 1,
  });
}
