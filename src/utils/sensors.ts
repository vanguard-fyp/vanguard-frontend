import type { SensorNode, SensorReading } from '../services/sensorService';

/** The firmware's thresholds, in cm of water. */
export const SENSOR_WARNING_CM = 2;
export const SENSOR_CRITICAL_CM = 4;

/** A node uploads every 30 s, so this much silence means its reading is out of date. */
export const SENSOR_OFFLINE_AFTER_MS = 90_000;

export type SensorState = 'Normal' | 'Warning' | 'Critical' | 'Fault' | 'Offline';

const BY_STATUS: Record<number, SensorState> = { 0: 'Normal', 1: 'Warning', 2: 'Critical', 3: 'Fault' };

/** A silent node is Offline whatever it last reported: its old reading must not look current. */
export function sensorState(node: SensorNode, now: number): SensorState {
  const seen = node.last_seen_at ? new Date(node.last_seen_at).getTime() : NaN;
  if (Number.isNaN(seen) || now - seen >= SENSOR_OFFLINE_AFTER_MS) return 'Offline';
  return BY_STATUS[node.last_status ?? -1] ?? 'Offline';
}

export const sensorName = (node: SensorNode) => node.name?.trim() || `Sensor ${node.node_id}`;

/** The level in cm, or null when there is no current reading to show. */
export function sensorLevelCm(node: SensorNode, now: number): number | null {
  const state = sensorState(node, now);
  if (state === 'Offline' || state === 'Fault' || node.last_level_mm == null) return null;
  return node.last_level_mm / 10;
}

export const criticalSensors = (nodes: SensorNode[], now: number) =>
  nodes.filter((node) => sensorState(node, now) === 'Critical');

export interface SensorChartPoint {
  time: number;
  /** null during a sensor fault, leaving a gap: a fault reports 0, not dry ground. */
  level: number | null;
}

/** Readings inside the window, oldest first. */
export function sensorChartPoints(readings: SensorReading[], since: number): SensorChartPoint[] {
  return readings
    .map((r) => ({ time: new Date(r.recorded_at).getTime(), level: r.status === 3 ? null : r.level_mm / 10 }))
    .filter((p) => p.time >= since)
    .sort((a, b) => a.time - b.time);
}
