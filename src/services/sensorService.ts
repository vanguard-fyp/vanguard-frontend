import { apiClient } from './apiClient';

/** 0 normal, 1 warning, 2 critical, 3 sensor fault. */
export type SensorStatusCode = 0 | 1 | 2 | 3;

export interface SensorNode {
  node_id: number;
  name: string | null;
  last_seen_at: string | null;
  last_level_mm: number | null;
  last_status: SensorStatusCode | null;
}

export interface SensorReading {
  seq: number;
  level_mm: number;
  status: SensorStatusCode;
  recorded_at: string;
}

export const sensorService = {
  getNodes: () => apiClient.get<SensorNode[]>('/iot/nodes'),

  getReadings: (nodeId: number, limit: number) =>
    apiClient.get<SensorReading[]>(`/iot/nodes/${nodeId}/readings`, { limit }),
};
