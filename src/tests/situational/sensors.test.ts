import { describe, expect, it } from 'vitest';
import type { SensorNode, SensorReading } from '../../services/sensorService';
import {
  SENSOR_OFFLINE_AFTER_MS,
  criticalSensors,
  sensorChartPoints,
  sensorLevelCm,
  sensorName,
  sensorState,
} from '../../utils/sensors';

const NOW = new Date('2026-11-05T12:00:00+08:00').getTime();

const node = (over: Partial<SensorNode> = {}): SensorNode => ({
  node_id: 1,
  name: null,
  last_seen_at: new Date(NOW - 10_000).toISOString(),
  last_level_mm: 45,
  last_status: 2,
  ...over,
});

describe('sensorState', () => {
  it('follows the status a recent node reports', () => {
    expect(sensorState(node({ last_status: 0 }), NOW)).toBe('Normal');
    expect(sensorState(node({ last_status: 1 }), NOW)).toBe('Warning');
    expect(sensorState(node({ last_status: 2 }), NOW)).toBe('Critical');
    expect(sensorState(node({ last_status: 3 }), NOW)).toBe('Fault');
  });

  it('calls a silent node offline, even if it last said critical', () => {
    const silent = node({ last_seen_at: new Date(NOW - SENSOR_OFFLINE_AFTER_MS).toISOString() });
    expect(sensorState(silent, NOW)).toBe('Offline');
    expect(sensorState(node({ last_seen_at: null }), NOW)).toBe('Offline');
  });
});

describe('sensorLevelCm', () => {
  it('converts a current reading to cm', () => {
    expect(sensorLevelCm(node(), NOW)).toBe(4.5);
  });

  it('shows no level for a fault or an offline node', () => {
    expect(sensorLevelCm(node({ last_status: 3 }), NOW)).toBeNull();
    expect(sensorLevelCm(node({ last_seen_at: null }), NOW)).toBeNull();
  });
});

describe('sensorName', () => {
  it('uses the name, or falls back to the node number', () => {
    expect(sensorName(node({ name: 'Sungai Kelantan' }))).toBe('Sungai Kelantan');
    expect(sensorName(node({ name: '  ' }))).toBe('Sensor 1');
  });
});

describe('criticalSensors', () => {
  it('leaves out normal and offline nodes', () => {
    const live = node({ node_id: 1 });
    const stale = node({ node_id: 2, last_seen_at: null });
    const calm = node({ node_id: 3, last_status: 0 });
    expect(criticalSensors([live, stale, calm], NOW)).toEqual([live]);
  });
});

describe('sensorChartPoints', () => {
  const reading = (seq: number, minutesAgo: number, over: Partial<SensorReading> = {}): SensorReading => ({
    seq,
    level_mm: 20,
    status: 1,
    recorded_at: new Date(NOW - minutesAgo * 60_000).toISOString(),
    ...over,
  });

  it('keeps the window, oldest first, in cm', () => {
    const points = sensorChartPoints([reading(3, 1), reading(2, 5), reading(1, 30)], NOW - 15 * 60_000);
    expect(points.map((p) => p.time)).toEqual([NOW - 5 * 60_000, NOW - 60_000]);
    expect(points[0].level).toBe(2);
  });

  it('leaves a gap for a fault instead of plotting dry ground', () => {
    const [point] = sensorChartPoints([reading(1, 1, { level_mm: 0, status: 3 })], NOW - 60 * 60_000);
    expect(point.level).toBeNull();
  });
});
