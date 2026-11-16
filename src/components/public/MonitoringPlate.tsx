import React, { useEffect, useMemo, useRef, useState } from 'react';

/* The radar from the original landing page, redrawn as a printed plate.
   Everything here is illustrative: scenes are hazard types and no blip
   represents a real incident. With `map`, a simplified outline of Malaysia
   sits under the sweep and the blips stand over regions where that hazard is
   typical; they are still examples, not live data. */

export const SWEEP_SECONDS = 9;
const SWEEPS_PER_SCENE = 2;

/** Dot diameter carries severity on a fixed ramp; colour never does. */
export const SEVERITY_RAMP = [
  { label: 'Alert', r: 3.5 },
  { label: 'Warning', r: 6 },
  { label: 'Danger', r: 9.5 },
] as const;

interface Blip { a: number; d: number; s: 0 | 1 | 2 }
interface Scene { name: string; blips: Blip[] }

export const SCENES: Scene[] = [
  {
    name: 'Flood watch',
    blips: [
      { a: 34, d: 0.46, s: 2 }, { a: 52, d: 0.7, s: 1 }, { a: 76, d: 0.33, s: 1 },
      { a: 128, d: 0.58, s: 0 }, { a: 196, d: 0.82, s: 0 }, { a: 288, d: 0.4, s: 1 }, { a: 331, d: 0.66, s: 0 },
    ],
  },
  {
    name: 'Landslide watch',
    blips: [
      { a: 12, d: 0.52, s: 1 }, { a: 98, d: 0.74, s: 2 }, { a: 161, d: 0.38, s: 0 },
      { a: 244, d: 0.6, s: 1 }, { a: 302, d: 0.84, s: 0 },
    ],
  },
  {
    name: 'Haze watch',
    blips: [
      { a: 58, d: 0.28, s: 0 }, { a: 141, d: 0.5, s: 0 }, { a: 182, d: 0.68, s: 1 },
      { a: 214, d: 0.44, s: 1 }, { a: 236, d: 0.78, s: 0 }, { a: 268, d: 0.56, s: 0 },
    ],
  },
  {
    name: 'Coastal and tsunami watch',
    blips: [
      { a: 22, d: 0.86, s: 0 }, { a: 84, d: 0.9, s: 1 }, { a: 156, d: 0.88, s: 0 }, { a: 318, d: 0.8, s: 0 },
    ],
  },
];

/** Advances the scene once every two sweeps. Frozen when `still`. */
export function useSceneCycle(still: boolean) {
  const [scene, setScene] = useState(0);
  useEffect(() => {
    if (still) return;
    const id = window.setInterval(
      () => setScene((s) => (s + 1) % SCENES.length),
      SWEEP_SECONDS * SWEEPS_PER_SCENE * 1000,
    );
    return () => window.clearInterval(id);
  }, [still]);
  return scene;
}

const C = 300;
const OUTER = 270;
const RINGS = [70, 140, 210];

const polar = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)] as const;
};

const wedge = (from: number, to: number, r: number) => {
  const [x1, y1] = polar(from, r);
  const [x2, y2] = polar(to, r);
  return `M${C} ${C} L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
};

const TRAIL = [0.2, 0.13, 0.085, 0.055, 0.032, 0.016];

/* Malaysia, hand-simplified (longitude, latitude), drawn flat: this close to
   the equator a degree is nearly the same length both ways. */
const DEG = 26; // plate units per degree
const MID = [109.5, 3.95] as const;
const place = (lng: number, lat: number) => [C + (lng - MID[0]) * DEG, C - (lat - MID[1]) * DEG] as const;
const outline = (pts: number[][]) => `${pts.map(([lng, lat], i) => `${i ? 'L' : 'M'}${place(lng, lat).map((v) => v.toFixed(1)).join(' ')}`).join('')}Z`;

const PENINSULA = outline([
  [100.13, 6.42], [100.2, 6.7], [100.42, 6.52], [100.85, 6.25], [101.1, 5.65], [101.6, 5.9], [101.8, 5.75], [101.97, 6.02],
  [102.1, 6.24], [102.3, 6.2], [102.57, 5.83], [103.14, 5.33], [103.43, 4.77], [103.45, 4.23], [103.36, 3.8], [103.45, 3.5],
  [103.5, 2.8], [103.85, 2.43], [104.27, 1.37], [104.1, 1.35], [103.76, 1.46], [103.51, 1.27], [103.38, 1.48], [102.9, 1.8],
  [102.56, 2.05], [102.25, 2.19], [101.79, 2.52], [101.3, 3.0], [101.24, 3.34], [100.98, 3.77], [100.85, 3.98], [100.6, 4.23],
  [100.55, 4.85], [100.37, 5.4], [100.35, 5.65], [100.3, 6.1],
]);
const BORNEO = outline([
  [109.65, 2.08], [109.78, 1.8], [110.35, 1.7], [111.0, 1.5], [111.2, 1.75], [111.32, 2.78], [112.1, 2.9], [113.03, 3.17],
  [113.7, 3.9], [113.98, 4.4], [114.08, 4.59], [114.6, 4.0], [115.3, 4.3], [115.15, 4.9], [115.55, 5.05], [115.57, 5.55],
  [116.05, 5.97], [116.33, 6.4], [116.74, 7.03], [116.85, 6.55], [117.25, 6.9], [117.6, 6.5], [118.1, 5.85], [118.6, 5.5],
  [119.27, 5.2], [118.9, 5.0], [118.33, 5.03], [118.2, 4.75], [118.62, 4.48], [117.9, 4.25], [117.6, 4.17], [116.5, 4.35],
  [115.9, 4.35], [115.65, 4.2], [115.65, 3.4], [115.5, 3.0], [115.1, 2.6], [114.8, 2.25], [114.75, 1.45], [113.9, 1.3],
  [113.0, 1.4], [112.2, 1.45], [111.8, 1.0], [111.2, 1.05], [110.6, 0.87], [110.2, 1.2], [109.6, 1.45], [109.55, 1.9],
]);

/** Example regions per hazard scene, in the same order as SCENES: [longitude, latitude, severity]. */
const MAP_BLIPS: [number, number, 0 | 1 | 2][][] = [
  [[102.25, 6.1, 2], [103.1, 5.3, 1], [103.3, 3.8, 1], [102.8, 2.5, 0], [110.35, 1.55, 0], [111.83, 2.3, 1], [115.75, 5.35, 0]],
  [[101.38, 4.47, 1], [101.8, 3.3, 2], [116.57, 5.98, 1], [112.93, 2.02, 0], [100.27, 5.42, 0]],
  [[101.6, 3.1, 1], [103.7, 1.5, 0], [102.25, 2.2, 0], [111.46, 1.24, 1], [114.0, 4.4, 0], [110.35, 1.55, 0]],
  [[100.3, 5.4, 0], [99.8, 6.35, 1], [116.84, 6.88, 0], [118.6, 4.48, 0]],
];

interface PlateProps {
  scene: number;
  still?: boolean;
  className?: string;
  /** Hide bearing labels at small sizes. */
  compact?: boolean;
  /** Draw Malaysia under the sweep and stand the blips over it. */
  map?: boolean;
}

export const MonitoringPlate: React.FC<PlateProps> = ({ scene, still = false, className, compact = false, map = false }) => {
  const t0 = useRef<number>(performance.now());
  const ticks = useMemo(() => Array.from({ length: 72 }, (_, i) => i * 5), []);
  const current = SCENES[scene % SCENES.length];
  const blips = map
    ? MAP_BLIPS[scene % SCENES.length].map(([lng, lat, s]) => {
        const [x, y] = place(lng, lat);
        return { x, y, s, a: (Math.atan2(x - C, C - y) * 180) / Math.PI };
      })
    : current.blips.map((b) => {
        const [x, y] = polar(b.a, b.d * OUTER);
        return { x, y, s: b.s, a: b.a };
      });

  // Phase each ping so it fires as the sweep crosses the blip.
  const elapsedDeg = (((performance.now() - t0.current) / 1000) / SWEEP_SECONDS) * 360;

  return (
    <svg
      viewBox="-24 -24 648 648"
      className={`lf-plate ${className ?? ''}`}
      data-still={still}
      role="img"
      // aria-label={`Illustrative monitoring view: ${current.name}. Not live data.`}
      style={{ ['--lf-sweep-dur' as string]: `${SWEEP_SECONDS}s` }}
    >
      {/* paper disc so the halftone field never shows through */}
      <circle cx={C} cy={C} r={OUTER + 12} fill="var(--lf-stock)" />
      <circle cx={C} cy={C} r={OUTER + 12} fill="none" stroke="var(--lf-ink)" strokeWidth="1.25" />
      <circle cx={C} cy={C} r={OUTER} fill="none" stroke="var(--lf-ink)" strokeWidth="0.75" />

      {map && (
        <g opacity="0.9">
          {[PENINSULA, BORNEO].map((d) => (
            <path key={d.slice(0, 24)} d={d} fill="var(--lf-spot)" fillOpacity="0.1" stroke="var(--lf-ink)" strokeOpacity="0.45" strokeWidth="0.9" strokeLinejoin="round" />
          ))}
        </g>
      )}

      {RINGS.map((r) => (
        <circle key={r} cx={C} cy={C} r={r} fill="none" stroke="var(--lf-rule-strong)" strokeWidth="0.75" />
      ))}
      <line x1={C - OUTER} y1={C} x2={C + OUTER} y2={C} stroke="var(--lf-rule)" strokeWidth="0.75" strokeDasharray="2 5" />
      <line x1={C} y1={C - OUTER} x2={C} y2={C + OUTER} stroke="var(--lf-rule)" strokeWidth="0.75" strokeDasharray="2 5" />

      {ticks.map((deg) => {
        const long = deg % 30 === 0;
        const [x1, y1] = polar(deg, OUTER);
        const [x2, y2] = polar(deg, OUTER + (long ? 12 : 6));
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--lf-ink)" strokeWidth={long ? 1.1 : 0.6} />;
      })}
      {!compact &&
        ticks.filter((d) => d % 30 === 0).map((deg) => {
          const [x, y] = polar(deg, OUTER + 26);
          return (
            <text key={deg} x={x} y={y} fontSize="11" fontWeight="600" fill="var(--lf-ink-soft)" textAnchor="middle" dominantBaseline="central">
              {String(deg).padStart(3, '0')}
            </text>
          );
        })}

      {/* sweep: stepped tints, the way a two-ink press would print a fade */}
      {!still && (
        <g className="lf-sweep">
          {TRAIL.map((o, k) => (
            <path key={k} d={wedge(-6 * (k + 1), -6 * k, OUTER)} fill="var(--lf-spot)" fillOpacity={o} />
          ))}
          <line x1={C} y1={C} x2={C} y2={C - OUTER} stroke="var(--lf-spot)" strokeWidth="1.25" />
        </g>
      )}

      <g key={scene} className="lf-scene">
        {blips.map((b, i) => {
          const { x, y } = b;
          const r = SEVERITY_RAMP[b.s].r;
          const phase = (((elapsedDeg - b.a) % 360) + 360) % 360;
          return (
            <g key={i}>
              {!still && (
                <circle
                  className="lf-ping"
                  cx={x}
                  cy={y}
                  r={r}
                  fill="none"
                  stroke="var(--lf-spot)"
                  strokeWidth="1"
                  style={{ animationDelay: `${(-phase / 360) * SWEEP_SECONDS}s` }}
                />
              )}
              <circle className="lf-blip" cx={x} cy={y} r={r} fill="var(--lf-spot)" />
            </g>
          );
        })}
      </g>

      <circle cx={C} cy={C} r="3" fill="var(--lf-ink)" />
    </svg>
  );
};

interface LegendProps { scene: number; still?: boolean }

export const MonitoringLegend: React.FC<LegendProps> = ({ scene, still }) => (
  <div className="lf-legend">
    <div className="lf-legend__scene" aria-live="polite">{SCENES[scene].name}</div>
    {!still && (
      <div className="lf-legend__steps" aria-hidden="true">
        {SCENES.map((s, i) => <i key={s.name} data-on={i === scene} />)}
      </div>
    )}
    <div className="lf-legend__ramp">
      {SEVERITY_RAMP.map((s) => (
        <span key={s.label}>
          <i className="lf-legend__dot" style={{ width: s.r * 1.6, height: s.r * 1.6 }} aria-hidden="true" />
          {s.label}
        </span>
      ))}
    </div>
    <p className="lf-legend__note">
      Illustrative view, not live data. For live river levels, see{' '}
      <a className="lf-link" href="https://publicinfobanjir.water.gov.my" target="_blank" rel="noreferrer">Public InfoBanjir</a>.
    </p>
  </div>
);
