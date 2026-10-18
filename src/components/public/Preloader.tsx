import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MonitoringPlate } from './MonitoringPlate';

/* The way in. The monitoring radar is the loading indicator: its sweep makes
   exactly one turn while the page gets ready (fonts are genuinely awaited).
   When the turn closes, the page underneath is already parked on `landOn`,
   and the camera zooms through the radar's centre onto it.
   Plays when the page is loaded or reloaded, not when the app routes back
   here (signing out, "Back to public site"). */

/** Path the browser actually loaded (not where the app has routed since). */
const loadedPath = (() => {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return new URL(nav?.name ?? window.location.href).pathname;
  } catch {
    return window.location.pathname;
  }
})();

/**
 * Module state lives for one page load; a reload resets it. The radar only
 * plays when that load started on the landing page itself: arriving at "/"
 * later by routing (signing out, "Back to public site") skips it.
 */
let playedThisLoad = loadedPath !== '/';

const C = 300;
const OUTER = 270;
const RIM = OUTER + 12;
const CIRC = 2 * Math.PI * RIM;
const TRAIL = [0.22, 0.14, 0.09, 0.055, 0.03];

const wedge = (from: number, to: number) => {
  const pt = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(C + OUTER * Math.sin(rad)).toFixed(2)} ${(C - OUTER * Math.cos(rad)).toFixed(2)}`;
  };
  return `M${C} ${C} L${pt(from)} A${OUTER} ${OUTER} 0 0 1 ${pt(to)} Z`;
};

interface Props {
  reduced: boolean;
  /** Section id the page is moved to before the zoom reveals it. */
  landOn?: string;
  onEnter: (played: boolean) => void;
}

export const Preloader: React.FC<Props> = ({ reduced, landOn, onEnter }) => {
  const [gone, setGone] = useState(() => playedThisLoad);
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const sweep = useRef<SVGGElement>(null);
  const arc = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (gone) { onEnter(false); return; }
    document.documentElement.style.overflow = 'hidden';
    let alive = true;
    const state = { p: 0 };
    const render = () => {
      sweep.current?.setAttribute('transform', `rotate(${state.p * 360} ${C} ${C})`);
      arc.current?.setAttribute('stroke-dashoffset', String(CIRC * (1 - state.p)));
    };
    const finish = () => {
      if (!alive) return;
      playedThisLoad = true;
      // Park the page on the destination while the loader still covers it.
      const target = landOn ? document.getElementById(landOn) : null;
      if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 64, behavior: 'instant' as ScrollBehavior });
      const done = () => {
        document.documentElement.style.overflow = '';
        setGone(true);
        onEnter(true);
      };
      if (reduced || !root.current) { done(); return; }
      root.current.dataset.leaving = 'true';
      const clear = getComputedStyle(root.current).backgroundColor.replace(/^rgba?\(([^,]+),([^,]+),([^,)]+).*$/, 'rgba($1,$2,$3,0)');
      const tl = gsap.timeline({ onComplete: done })
        .to('.lf-loader__brand, .lf-loader__status', { opacity: 0, duration: 0.3 }, 0);
      // The radar travels to its place in the first section and settles there
      // while the page fades in around it.
      const dest = document.querySelector<HTMLElement>('[data-radar-source]');
      const from = scope.current?.getBoundingClientRect();
      const to = dest?.getBoundingClientRect();
      if (from && to && to.width > 0) {
        tl.to(scope.current, {
          x: to.left + to.width / 2 - (from.left + from.width / 2),
          y: to.top + to.height / 2 - (from.top + from.height / 2),
          scale: to.width / from.width,
          duration: 1.25,
          ease: 'power3.inOut',
        }, 0.1)
          .to(root.current, { backgroundColor: clear, duration: 0.7, ease: 'power2.inOut' }, 0.75)
          .to(scope.current, { opacity: 0, duration: 0.3, ease: 'power1.inOut' }, 1.3);
      } else {
        tl.to(scope.current, { scale: 9, duration: 1.15, ease: 'power3.in' }, 0)
          .to(scope.current, { opacity: 0, duration: 0.45, ease: 'power1.in' }, 0.55)
          .to(root.current, { backgroundColor: clear, duration: 0.6, ease: 'power2.inOut' }, 0.6);
      }
    };
    // One full turn, but never close it before the fonts are in.
    const turn = gsap.to(state, { p: 0.94, duration: reduced ? 0.2 : 2.2, ease: 'power1.inOut', onUpdate: render });
    Promise.all([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, reduced ? 200 : 2200))]).then(() => {
      if (!alive) return;
      turn.kill();
      gsap.to(state, { p: 1, duration: reduced ? 0 : 0.35, ease: 'power1.out', onUpdate: render, onComplete: finish });
    });
    return () => { alive = false; gsap.killTweensOf(state); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;

  return (
    <div ref={root} className="lf-loader" role="status" aria-label="Loading Vanguard" aria-busy="true">
      <div ref={scope} className="lf-loader__scope">
        <MonitoringPlate scene={0} still />
        <svg className="lf-loader__over" viewBox="-24 -24 648 648" aria-hidden="true">
          <circle
            ref={arc}
            cx={C} cy={C} r={RIM} fill="none" stroke="var(--lf-spot)" strokeWidth="3"
            strokeDasharray={CIRC} strokeDashoffset={CIRC}
            transform={`rotate(-90 ${C} ${C})`}
          />
          <g ref={sweep}>
            {TRAIL.map((o, k) => <path key={k} d={wedge(-7 * (k + 1), -7 * k)} fill="var(--lf-spot)" fillOpacity={o} />)}
            <line x1={C} y1={C} x2={C} y2={C - OUTER} stroke="var(--lf-spot)" strokeWidth="1.5" />
          </g>
        </svg>
      </div>
      <p className="lf-loader__status">Preparing the monitoring view</p>
      {/* <span className="lf-loader__brand">Vanguard</span> */}
    </div>
  );
};
