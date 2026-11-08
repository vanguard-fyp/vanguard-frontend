/**
 * useSensors — TanStack Query hooks for flood sensor nodes
 */
import { useQuery } from '@tanstack/react-query';
import { sensorService } from '../services/sensorService';

const LIVE_REFRESH_MS = 5_000;

export const SENSOR_KEYS = {
  nodes: ['sensors', 'nodes'] as const,
  readings: (nodeId: number, limit: number) => ['sensors', 'readings', nodeId, limit] as const,
};

export function useSensorNodes() {
  return useQuery({
    queryKey: SENSOR_KEYS.nodes,
    queryFn: sensorService.getNodes,
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useSensorReadings(nodeId: number | null, limit: number) {
  return useQuery({
    queryKey: SENSOR_KEYS.readings(nodeId ?? -1, limit),
    queryFn: () => sensorService.getReadings(nodeId as number, limit),
    enabled: nodeId !== null,
    refetchInterval: LIVE_REFRESH_MS,
  });
}
