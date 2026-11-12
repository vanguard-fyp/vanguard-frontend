import React, { useState } from 'react';
import { Activity, ChevronDown, Loader2, Thermometer } from 'lucide-react';
import { useMetHazards } from '../../../hooks/useIntelligence';
import { formatDateTime } from '../../../utils/dateFormatter';
import type { MetHazardWatch as Watch } from '../../../types/intelligence';
import { IconTile, Tag, TONE, type Tone } from '../shared/Tag';

const HEAT_TONE: Record<number, Tone> = { 1: 'amber', 2: 'orange', 3: 'red' };

/** One collapsible line: icon, headline, optional tag, and a detail list when opened. */
const Row: React.FC<{
  icon: React.ReactNode;
  color: string;
  title: string;
  summary: string;
  tag?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ icon, color, title, summary, tag, children }) => {
  const [open, setOpen] = useState(false);
  const canOpen = !!children;
  return (
    <div>
      <button type="button" disabled={!canOpen} onClick={() => setOpen((v) => !v)} aria-expanded={canOpen ? open : undefined}
        className="w-full flex items-center gap-3 px-5 py-2.5 text-left enabled:hover:bg-slate-50 enabled:cursor-pointer">
        <IconTile color={color} size={28}>{icon}</IconTile>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-semibold text-slate-800">{title}</span>
          <span className="block text-[11px] text-slate-500 truncate">{summary}</span>
        </span>
        {tag}
        {canOpen && <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && children && <div className="px-5 pb-3 pl-[60px]">{children}</div>}
    </div>
  );
};

const heatRow = (h: Watch['heatwave']) => {
  if (!h.available) return { summary: 'Temperature forecast unavailable right now', tag: undefined, list: null };
  if (h.districts.length === 0) {
    const top = h.hottest;
    return {
      summary: `No district at MET heat levels${top?.peak_c != null ? ` · hottest ${top.peak_c} °C (${top.district})` : ''}`,
      tag: undefined,
      list: null,
    };
  }
  const worst = h.districts[0];
  return {
    summary: `${h.districts.length} district${h.districts.length === 1 ? '' : 's'} · worst ${worst.district} (${worst.peak_c} °C)`,
    tag: <Tag tone={HEAT_TONE[worst.level] ?? 'amber'}>Level {worst.level}</Tag>,
    list: (
      <ul className="space-y-1">
        {h.districts.map((d) => (
          <li key={`${d.state}-${d.district}`} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-700 truncate">{d.district}, {d.state}</span>
            <span className="shrink-0 font-semibold" style={{ color: TONE[HEAT_TONE[d.level] ?? 'amber'] }}>
              {d.level_name} · {d.peak_c} °C
            </span>
          </li>
        ))}
        <li className="text-[10px] text-slate-400 pt-1">Computed from forecast temperatures with MET's criteria (3 days in a row). Not MET's official status.</li>
      </ul>
    ),
  };
};

const quakeRow = (q: Watch['earthquakes']) => {
  if (!q.available) return { summary: 'MET earthquake feed unavailable right now', tag: undefined, list: null };
  const near = q.events.filter((e) => e.near_malaysia || e.threat);
  const summary = q.events.length === 0
    ? `None recorded in the last ${q.days} days`
    : `${q.events.length} in ${q.days} days · ${near.length ? `${near.length} within ${q.near_km ?? 500} km of Malaysia` : 'none near Malaysia'}`;
  const tag = q.threat_count ? <Tag tone="red">Threat flagged</Tag> : near.length ? <Tag tone="orange">Near</Tag> : undefined;
  const list = q.events.length ? (
    <ul className="space-y-1">
      {q.events.slice(0, 8).map((e) => (
        <li key={`${e.time}-${e.location}`} className="text-[11px] flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className={`font-semibold ${e.near_malaysia || e.threat ? 'text-orange-700' : 'text-slate-700'}`}>M{e.magnitude ?? '?'}</span>{' '}
            <span className="text-slate-700">{e.location ?? 'Unknown location'}</span>
            <span className="block text-slate-400">
              {e.distance_km != null ? `${Math.round(e.distance_km).toLocaleString()} km ${e.nearest_malaysian_town ?? ''}` : ''}
              {e.threat ? ` · MET status ${e.status}` : ''}
            </span>
          </span>
          <span className="shrink-0 text-slate-400">{formatDateTime(e.time)}</span>
        </li>
      ))}
    </ul>
  ) : null;
  return { summary, tag, list };
};

/**
 * National MET watch at the top of the Early warnings drawer: heatwave status by
 * district and recent earthquakes. Context only: it never creates a warning or incident.
 */
export const MetHazardWatch: React.FC = () => {
  const { data, isLoading, isError } = useMetHazards();
  if (isError) return null;
  if (isLoading || !data) {
    return (
      <div className="px-5 py-2.5 flex items-center gap-2 text-[11px] text-slate-400 border-b border-slate-100">
        <Loader2 size={12} className="animate-spin" /> Checking MET heat and earthquake status…
      </div>
    );
  }
  const heat = heatRow(data.heatwave);
  const quake = quakeRow(data.earthquakes);
  return (
    <section aria-label="MET hazard watch" className="border-b border-slate-100 py-1">
      <Row icon={<Thermometer size={14} />} color={TONE.orange} title="Heatwave" summary={heat.summary} tag={heat.tag}>
        {heat.list}
      </Row>
      <Row icon={<Activity size={14} />} color={TONE.red} title="Earthquakes (MET)" summary={quake.summary} tag={quake.tag}>
        {quake.list}
      </Row>
    </section>
  );
};
