import { useQueries } from '@tanstack/react-query';
import { geoService } from '../services/geoService';
import type { GisLayerResponse } from '../types';

export const GEO_KEYS = {
  layer: (key: string) => ['geo', 'layer', key] as const,
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
