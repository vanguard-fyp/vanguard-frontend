import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

import { DataRegion } from '../../../components/common/DataRegion';
import { Bone, Panel, Segmented, TrendPill } from '../../../components/ui/dashboard/Panel';
import type { Pill } from '../../../components/ui/dashboard/Panel';
import { CHART_TOOLTIP, DASH } from '../../../constants/dashboard';
import { DASHBOARD_ANIMATIONS } from '../../../constants/theme';
import { useSensorNodes, useSensorReadings } from '../../../hooks/useSensors';
import type { SensorNode } from '../../../services/sensorService';
import { formatDateTime, formatTimeOnly } from '../../../utils/dateFormatter';
import {
  SENSOR_CRITICAL_CM,
  SENSOR_WARNING_CM,
  sensorChartPoints,
  sensorLevelCm,
  sensorName,
  sensorState,
} from '../../../utils/sensors';
import type { SensorState } from '../../../utils/sensors';

const RANGES = [
  { key: '15m', label: '15m' },
  { key: '1h', label: '1h' },
  { key: '6h', label: '6h' },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];

/** A node logs every 30 s and on each status change, so these cover each window. */
const RANGE: Record<RangeKey, { ms: number; limit: number }> = {
  '15m': { ms: 15 * 60_000, limit: 100 },
  '1h': { ms: 60 * 60_000, limit: 300 },
  '6h': { ms: 6 * 60 * 60_000, limit: 1000 },
};

const WARNING_LINE = '#f59e0b';
const CLOCK_TICK_MS = 5_000;
const axisTick = { fill: DASH.inkFaint, fontSize: 10 };

const STATE_PILL: Record<SensorState, Pill> = {
  Normal: { text: 'Normal', tone: 'good' },
  Warning: { text: 'Warning', tone: 'neutral' },
  Critical: { text: 'Critical', tone: 'bad' },
  Fault: { text: 'Fault', tone: 'bad' },
  Offline: { text: 'Offline', tone: 'neutral' },
};

const SensorCard: React.FC<{
  node: SensorNode;
  now: number;
  selected: boolean;
  onSelect: () => void;
}> = ({ node, now, selected, onSelect }) => {
  const state = sensorState(node, now);
  const level = sensorLevelCm(node, now);
  const edge = state === 'Critical' ? DASH.critical : selected ? DASH.blue : undefined;
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected}
      className="min-w-0 text-left bg-white rounded-2xl border border-slate-200/80 px-5 py-4 cursor-pointer transition-colors hover:border-slate-300"
      style={edge ? { borderColor: edge } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 truncate">{sensorName(node)}</p>
        <TrendPill pill={STATE_PILL[state]} />
      </div>
      <p className="mt-2.5 text-[28px] leading-9 font-bold text-slate-900 tabular-nums">
        {level === null ? '--' : `${level.toFixed(1)} cm`}
      </p>
      <p className="mt-1 text-xs text-slate-500 tabular-nums">{formatDateTime(node.last_seen_at, 'Never')}</p>
    </button>
  );
};

const LevelChart: React.FC<{ nodeId: number; now: number; range: RangeKey }> = ({ nodeId, now, range }) => {
  const readingsQuery = useSensorReadings(nodeId, RANGE[range].limit);
  const since = now - RANGE[range].ms;
  const points = sensorChartPoints(readingsQuery.data ?? [], since);
  const peak = Math.max(SENSOR_CRITICAL_CM + 1, ...points.map((p) => p.level ?? 0));

  if (readingsQuery.isPending) return <Bone className="block h-72 w-full rounded-xl" />;
  return (
    <DataRegion queries={[readingsQuery]} label="Water level">
      {points.length === 0 ? (
        <p className="h-72 flex items-center justify-center text-sm text-slate-500">No readings</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="sensorLevelFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={DASH.blue} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={DASH.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={DASH.track} vertical={false} />
              <XAxis dataKey="time" type="number" scale="time" domain={[since, now]}
                tickFormatter={(t: number) => formatTimeOnly(t)} tick={axisTick} tickLine={false} axisLine={false} minTickGap={48}
              />
              <YAxis domain={[0, Math.ceil(peak)]} unit=" cm" tick={axisTick} tickLine={false} axisLine={false} width={56} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP} cursor={{ stroke: DASH.rule }}
                labelFormatter={(t) => formatDateTime(Number(t))}
                formatter={(value) => [value == null ? 'Fault' : `${Number(value).toFixed(1)} cm`, 'Level']}
              />
              <ReferenceLine y={SENSOR_WARNING_CM} stroke={WARNING_LINE} strokeDasharray="4 4"
                label={{ value: 'Warning', position: 'insideTopRight', fill: WARNING_LINE, fontSize: 10 }}
              />
              <ReferenceLine y={SENSOR_CRITICAL_CM} stroke={DASH.critical} strokeDasharray="4 4"
                label={{ value: 'Critical', position: 'insideTopRight', fill: DASH.critical, fontSize: 10 }}
              />
              <Area dataKey="level" type="linear" stroke={DASH.blue} strokeWidth={2} fill="url(#sensorLevelFill)"
                isAnimationActive={false} dot={points.length === 1} activeDot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </DataRegion>
  );
};

const FloodSensors: React.FC = () => {
  const nodesQuery = useSensorNodes();
  const nodes = nodesQuery.data ?? [];
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [range, setRange] = useState<RangeKey>('15m');

  // Keeps Offline and the chart's window moving even if no new data arrives.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const selected = nodes.find((n) => n.node_id === pickedId) ?? nodes[0] ?? null;

  return (
    <motion.div variants={DASHBOARD_ANIMATIONS.container} initial="hidden" animate="show"
      className="space-y-5 sm:space-y-6 max-w-[1400px] mx-auto overflow-x-hidden"
    >
      <motion.h1 variants={DASHBOARD_ANIMATIONS.item} className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
        Flood Sensors
      </motion.h1>

      <motion.div variants={DASHBOARD_ANIMATIONS.item}>
        <DataRegion queries={[nodesQuery]} label="Flood sensors">
          {nodesQuery.isPending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
              <Bone className="block h-32 rounded-2xl" />
            </div>
          ) : nodes.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">No sensors</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
              {nodes.map((node) => (
                <SensorCard key={node.node_id} node={node} now={now}
                  selected={node.node_id === selected?.node_id}
                  onSelect={() => setPickedId(node.node_id)}
                />
              ))}
            </div>
          )}
        </DataRegion>
      </motion.div>

      {selected && (
        <motion.div variants={DASHBOARD_ANIMATIONS.item}>
          <Panel title={`Water level · ${sensorName(selected)}`} bodyClassName="px-6 pb-5"
            action={<Segmented value={range} options={RANGES} onChange={setRange} label="Time range" />}
          >
            <LevelChart nodeId={selected.node_id} now={now} range={range} />
          </Panel>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FloodSensors;
