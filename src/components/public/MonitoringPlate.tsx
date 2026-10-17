import React, { useEffect, useMemo, useRef, useState } from 'react';

/* The radar from the original landing page, redrawn as a printed plate.
   Everything here is illustrative: scenes are hazard types, not places,
   and no blip represents a real incident. */

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

interface PlateProps {
  scene: number;
  still?: boolean;
  className?: string;
  /** Hide bearing labels at small sizes. */
  compact?: boolean;
}

export const MonitoringPlate: React.FC<PlateProps> = ({ scene, still = false, className, compact = false }) => {
  const t0 = useRef<number>(performance.now());
  const ticks = useMemo(() => Array.from({ length: 72 }, (_, i) => i * 5), []);
  const current = SCENES[scene % SCENES.length];

  // Phase each ping so it fires as the sweep crosses the blip.
  const elapsedDeg = (((performance.now() - t0.current) / 1000) / SWEEP_SECONDS) * 360;

  return (
    <svg
      viewBox="-24 -24 648 648"
      className={`lf-plate ${className ?? ''}`}
      data-still={still}
      role="img"
      aria-label={`Illustrative monitoring view: ${current.name}. Not live data.`}
      style={{ ['--lf-sweep-dur' as string]: `${SWEEP_SECONDS}s` }}
    >
      {/* paper disc so the halftone field never shows through */}
      <circle cx={C} cy={C} r={OUTER + 12} fill="var(--lf-stock)" />
      <circle cx={C} cy={C} r={OUTER + 12} fill="none" stroke="var(--lf-ink)" strokeWidth="1.25" />
      <circle cx={C} cy={C} r={OUTER} fill="none" stroke="var(--lf-ink)" strokeWidth="0.75" />

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
        {current.blips.map((b, i) => {
          const [x, y] = polar(b.a, b.d * OUTER);
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
