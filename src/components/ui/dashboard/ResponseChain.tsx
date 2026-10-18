import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Incident, Mission, RescueTeam } from '../../../types';
import { DASH, sevTone } from '../../../constants/dashboard';

/* ============================================================
   Response chain: incidents → missions → teams.
   Answers "who is covering what?" and flags the gaps: incidents
   with no mission, missions with no team, idle teams, and teams on
   more than one mission. Rows show a name; details on hover.
   ============================================================ */

interface ResponseChainProps {
  incidents: Incident[];
  missions: Mission[];
  teams: RescueTeam[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: Incident) => void;
}

type Gap = 'uncovered' | 'unstaffed' | 'overloaded' | 'idle';
type Link = { from: string; to: string };

const GAPS: { key: Gap; label: string; tag: string }[] = [
  { key: 'uncovered', label: 'No mission', tag: 'No mission' },
  { key: 'unstaffed', label: 'No team', tag: 'No team' },
  { key: 'overloaded', label: 'Stretched', tag: '2+ missions' },
  { key: 'idle', label: 'Idle', tag: 'Idle' },
];

/** Every team id a mission is linked to, whichever field the API filled. */
const missionTeamIds = (m: Mission): string[] => {
  const ids = new Set<string>(m.team_ids ?? []);
  (m.teams ?? []).forEach((t) => t.id && ids.add(t.id));
  if (m.assigned_team_id) ids.add(m.assigned_team_id);
  return [...ids];
};

export const ResponseChain: React.FC<ResponseChainProps> = ({
  incidents, missions, teams, selectedIncidentId, onSelectIncident,
}) => {
  const [focus, setFocus] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [gapFilter, setGapFilter] = useState<Gap | null>(null);

  // ── Graph ────────────────────────────────────────────────────────
  const graph = useMemo(() => {
    const incOrder = [...incidents].sort(
      (a, b) => (b.ai_priority_score ?? -1) - (a.ai_priority_score ?? -1)
        || (b.affected_population ?? 0) - (a.affected_population ?? 0),
    );
    const incIds = new Set(incOrder.map((i) => i.id));
    const teamIds = new Set(teams.map((t) => t.id));
    const rank = new Map(incOrder.map((i, idx) => [i.id, idx]));

    // Missions follow the order of the incident they answer.
    const misOrder = [...missions].sort(
      (a, b) => (rank.get(a.incident_id) ?? 1e9) - (rank.get(b.incident_id) ?? 1e9),
    );
    const links: Link[] = [];
    const missionsByIncident = new Map<string, string[]>();
    const teamsByMission = new Map<string, string[]>();
    const missionsByTeam = new Map<string, string[]>();

    misOrder.forEach((m) => {
      if (incIds.has(m.incident_id)) {
        links.push({ from: m.incident_id, to: m.id });
        missionsByIncident.set(m.incident_id, [...(missionsByIncident.get(m.incident_id) ?? []), m.id]);
      }
      const tIds = missionTeamIds(m).filter((id) => teamIds.has(id));
      teamsByMission.set(m.id, tIds);
      tIds.forEach((tid) => {
        links.push({ from: m.id, to: tid });
        missionsByTeam.set(tid, [...(missionsByTeam.get(tid) ?? []), m.id]);
      });
    });

    // Teams follow the first mission they serve; idle teams go last.
    const misRank = new Map(misOrder.map((m, idx) => [m.id, idx]));
    const firstMission = (t: RescueTeam) =>
      Math.min(...(missionsByTeam.get(t.id) ?? []).map((id) => misRank.get(id) ?? 1e9), 1e9);
    const teamOrder = [...teams].sort((a, b) => firstMission(a) - firstMission(b));

    const gaps: Record<Gap, Set<string>> = {
      uncovered: new Set(incOrder.filter((i) => !missionsByIncident.has(i.id)).map((i) => i.id)),
      unstaffed: new Set(misOrder.filter((m) => (teamsByMission.get(m.id) ?? []).length === 0).map((m) => m.id)),
      overloaded: new Set(teamOrder.filter((t) => (missionsByTeam.get(t.id) ?? []).length > 1).map((t) => t.id)),
      idle: new Set(teamOrder.filter((t) => !missionsByTeam.has(t.id)).map((t) => t.id)),
    };
    return { incOrder, misOrder, teamOrder, links, missionsByIncident, teamsByMission, missionsByTeam, gaps };
  }, [incidents, missions, teams]);

  const gapOf = useCallback((id: string) => GAPS.find((g) => graph.gaps[g.key].has(id)) ?? null, [graph]);

  // ── Highlight: the whole chain through the focused node ────────────
  const lit = useMemo(() => {
    if (gapFilter) return graph.gaps[gapFilter];
    const anchor = focus ?? pinned ?? selectedIncidentId ?? null;
    if (!anchor) return null;
    const set = new Set<string>([anchor]);
    const addMission = (mid: string) => {
      set.add(mid);
      (graph.teamsByMission.get(mid) ?? []).forEach((t) => set.add(t));
      const m = missions.find((x) => x.id === mid);
      if (m) set.add(m.incident_id);
    };
    (graph.missionsByIncident.get(anchor) ?? []).forEach(addMission);
    if (graph.teamsByMission.has(anchor)) addMission(anchor);
    (graph.missionsByTeam.get(anchor) ?? []).forEach(addMission);
    return set;
  }, [focus, pinned, selectedIncidentId, gapFilter, graph, missions]);

  // ── Link geometry, measured from the rendered rows ─────────────────
  const boardRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<{ key: string; d: string; from: string; to: string }[]>([]);
  const [boardH, setBoardH] = useState(0);

  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const next = graph.links.flatMap((l) => {
      const a = nodeRefs.current.get(l.from)?.getBoundingClientRect();
      const z = nodeRefs.current.get(l.to)?.getBoundingClientRect();
      if (!a || !z) return [];
      // Anchor on the row's first line so links stay put when details expand.
      const x1 = a.right - b.left, y1 = a.top + 19 - b.top;
      const x2 = z.left - b.left, y2 = z.top + 19 - b.top;
      const dx = (x2 - x1) / 2;
      return [{ key: `${l.from}-${l.to}`, from: l.from, to: l.to, d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}` }];
    });
    setPaths(next);
    setBoardH(board.scrollHeight);
  }, [graph]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (boardRef.current) ro.observe(boardRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const ref = (id: string) => (el: HTMLElement | null) => {
    if (el) nodeRefs.current.set(id, el); else nodeRefs.current.delete(id);
  };

  // ── Rows (plain render helpers so DOM nodes persist between renders) ──
  const renderRow = ({ id, dot, title, detail, side, selected, onClick }: {
    id: string; dot: string; title: string; detail: string; side?: React.ReactNode;
    selected?: boolean; onClick?: () => void;
  }) => {
    const gap = gapOf(id);
    const dimmed = lit && !lit.has(id);
    return (
      <button key={id} type="button" ref={ref(id)}
        aria-current={selected ? 'true' : undefined}
        onMouseEnter={() => setFocus(id)} onMouseLeave={() => setFocus(null)}
        onFocus={() => setFocus(id)} onBlur={() => setFocus(null)}
        onClick={onClick}
        className={`group relative w-full text-left rounded-xl px-3 py-2.5 transition-[opacity,background-color,box-shadow] duration-200 cursor-pointer
          focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600
          ${selected ? 'bg-blue-50 shadow-[inset_0_0_0_1px_rgba(37,99,235,.35)]' : 'bg-slate-50 hover:bg-slate-100'}
          ${dimmed ? 'opacity-35' : 'opacity-100'}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full shrink-0"
            style={gap ? { boxShadow: `inset 0 0 0 1.5px ${DASH.inkFaint}` } : { background: dot }} />
          <span className="text-xs font-semibold text-slate-900 truncate flex-1">{title}</span>
          {gap ? <span className="text-[11px] text-slate-500 shrink-0">{gap.tag}</span> : side}
        </div>
        <p className="dash-reveal text-xs text-slate-500 truncate pl-[18px]"><span className="block pt-1">{detail}</span></p>
      </button>
    );
  };

  const renderColumn = (label: string, count: number, children: React.ReactNode) => (
    <div className="min-w-0 flex flex-col gap-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1 pb-1">{label} <span className="text-slate-400">{count}</span></p>
      {count === 0 ? <p className="text-xs text-slate-400 px-1 py-2">None active</p> : children}
    </div>
  );

  const total = graph.incOrder.length + graph.misOrder.length + graph.teamOrder.length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Gap filters: the questions this view answers */}
      <div className="px-6 pb-3 flex flex-wrap items-center gap-1.5">
        {GAPS.map(({ key, label }) => {
          const n = graph.gaps[key].size;
          const on = gapFilter === key;
          return (
            <button key={key} type="button" disabled={n === 0} aria-pressed={on}
              onClick={() => setGapFilter(on ? null : key)}
              className={`text-xs font-semibold rounded-lg px-2.5 py-1 transition-colors cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-blue-600
                ${on ? 'bg-blue-600 text-white' : n === 0 ? 'text-slate-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {label} <span className={`tabular-nums ${on ? 'text-blue-100' : 'text-slate-400'}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Nothing active right now.</div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto border-t border-slate-100">
          <div ref={boardRef} className="relative grid grid-cols-3 gap-8 sm:gap-12 px-6 py-4 min-w-[620px]">
            <svg className="absolute inset-0 w-full pointer-events-none" style={{ height: boardH }} aria-hidden="true">
              {paths.map((p) => {
                const on = !!lit && lit.has(p.from) && lit.has(p.to);
                return (
                  <path key={p.key} d={p.d} fill="none"
                    stroke={on ? DASH.blue : '#d5dde7'}
                    strokeWidth={on ? 1.75 : 1.25}
                    strokeOpacity={lit && !on ? 0.4 : 1}
                    style={{ transition: 'stroke .2s, stroke-opacity .2s' }}
                  />
                );
              })}
            </svg>

            {renderColumn('Incidents', graph.incOrder.length, graph.incOrder.map((i) => renderRow({
              id: i.id,
              dot: sevTone(i.severity),
              title: i.title,
              detail: `${i.severity} · ${i.district}`,
              selected: selectedIncidentId === i.id,
              onClick: () => { setPinned(null); onSelectIncident?.(i); },
              side: <span className="text-xs font-bold text-slate-600 tabular-nums shrink-0" title="AI priority">{i.ai_priority_score ?? ''}</span>,
            })))}

            {renderColumn('Missions', graph.misOrder.length, graph.misOrder.map((m) => renderRow({
              id: m.id,
              dot: DASH.blue,
              title: m.title,
              detail: `${m.display_id || 'Mission'} · ${m.status}`,
              selected: pinned === m.id,
              onClick: () => {
                setPinned(m.id);
                const inc = incidents.find((x) => x.id === m.incident_id);
                if (inc) onSelectIncident?.(inc);
              },
            })))}

            {renderColumn('Teams', graph.teamOrder.length, graph.teamOrder.map((t) => renderRow({
              id: t.id,
              dot: DASH.blue,
              title: t.name,
              detail: `${t.agency} · ${t.committed_personnel ?? 0} of ${t.total_personnel ?? t.personnel_count} committed`,
              selected: pinned === t.id,
              onClick: () => setPinned(pinned === t.id ? null : t.id),
            })))}
          </div>
        </div>
      )}
    </div>
  );
};
