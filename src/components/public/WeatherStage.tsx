import React, { useEffect, useRef } from 'react';

/* The landing page's atmosphere: one fixed layer behind the content. Each section
   has a sky and a hazard that comes up with it: flood water rises, a landslide
   slope pushes in, storm clouds roll down, then it clears. The introduction is
   the same light sky as the next section, so the flood is the only thing that changes.
   Everything is driven by one rAF loop that stops when nothing is changing. */

interface Scene {
  id: string; sky: string;
  rain: number; cloud: number; sun: number; storm: number;
  flood: number; slide: number;
}

const SCENES: Scene[] = [
  { id: 'about', sky: 'calm', rain: 0, cloud: 0.25, sun: 0, storm: 0, flood: 0, slide: 0 },
  { id: 'resources', sky: 'flood', rain: 0.45, cloud: 0.7, sun: 0, storm: 0, flood: 1, slide: 0 },
  { id: 'publications', sky: 'slide', rain: 0, cloud: 0.2, sun: 1, storm: 0, flood: 0, slide: 1 },
  { id: 'history', sky: 'storm', rain: 1, cloud: 0.7, sun: 0, storm: 1, flood: 0.5, slide: 0 },
  { id: 'help', sky: 'clear', rain: 0, cloud: 0.4, sun: 0.6, storm: 0, flood: 0, slide: 0 },
];

/* Two wave periods across the width, so sliding by half loops without a seam. */
const WAVE = 'M0 40 Q150 4 300 40 T600 40 T900 40 T1200 40 V400 H0 Z';

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface Drop { x: number; y: number; len: number; speed: number; near: boolean }

export const WeatherStage: React.FC<{ still?: boolean; wide: boolean }> = ({ still = false, wide }) => {
  const skies = useRef<(HTMLDivElement | null)[]>([]);
  const clouds = useRef<HTMLDivElement>(null);
  const sun = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const bolt = useRef<SVGSVGElement>(null);
  const flood = useRef<HTMLDivElement>(null);
  const slide = useRef<HTMLDivElement>(null);
  const bank = useRef<HTMLDivElement>(null);
  const rainCanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const rc = rainCanvas.current;
    const rctx = rc?.getContext('2d');
    if (!rc || !rctx) return;

    const DROPS = wide ? 150 : 60;

    let w = 0, h = 0;
    let drops: Drop[] = [];
    let raf = 0, last = 0, flashAt = 0, frame = 0;
    let lastY = -1, rainDrawn = false;
    let mix = { rain: 0, storm: 0 };
    // What comes up is eased, so it rises and recedes even after a long jump.
    const want = { flood: 0, slide: 0, bank: 0 };
    const eased = { flood: 0, slide: 0, bank: 0 };

    const makeDrop = (anywhere: boolean): Drop => {
      const near = Math.random() < 0.35;
      return {
        x: Math.random() * (w + 80),
        y: anywhere ? Math.random() * h : -40,
        len: near ? 20 + Math.random() * 12 : 10 + Math.random() * 8,
        speed: near ? 1250 + Math.random() * 350 : 800 + Math.random() * 250,
        near,
      };
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      rc.width = w;
      rc.height = h;
      drops = Array.from({ length: DROPS }, () => makeDrop(true));
    };

    const drawRain = (amount: number, dt: number) => {
      rctx.clearRect(0, 0, w, h);
      const count = Math.round(drops.length * amount);
      const paths: [boolean, string][] = [[false, 'rgba(48,74,110,.2)'], [true, 'rgba(48,74,110,.26)']];
      for (const [near, color] of paths) {
        rctx.strokeStyle = color;
        rctx.lineWidth = near ? 1.3 : 0.9;
        rctx.beginPath();
        for (let i = 0; i < count; i++) {
          const d = drops[i];
          if (d.near !== near) continue;
          d.y += d.speed * dt;
          d.x -= d.speed * dt * 0.1;
          if (d.y > h + 40 || d.x < -40) Object.assign(d, makeDrop(false));
          rctx.moveTo(d.x, d.y);
          rctx.lineTo(d.x - d.len * 0.1, d.y + d.len);
        }
        rctx.stroke();
      }
    };

    /** Applies the sky for the current scroll position. Section tops are read live: GSAP pins resize the page. */
    const applyScene = () => {
      const c = h * 0.55;
      const band = h * 0.4;
      const tops = SCENES.map((s) => {
        const el = document.getElementById(s.id);
        return (el?.closest('.pin-spacer') ?? el)?.getBoundingClientRect().top ?? Infinity;
      });
      let a = 0;
      while (a < SCENES.length - 2 && c >= tops[a + 1]) a++;
      const b = Math.min(a + 1, SCENES.length - 1);
      const t = c >= tops[b] ? 1 : smooth(clamp01((c - (tops[b] - band)) / band));

      skies.current.forEach((el, i) => {
        if (el) el.style.opacity = i === a ? '1' : i === b ? String(t) : '0';
      });
      const blend = (k: 'rain' | 'cloud' | 'sun' | 'storm' | 'flood' | 'slide') => SCENES[a][k] + (SCENES[b][k] - SCENES[a][k]) * t;
      mix = { rain: blend('rain'), storm: blend('storm') };
      if (clouds.current) clouds.current.style.opacity = String(blend('cloud') * 0.9);
      if (sun.current) sun.current.style.opacity = String(blend('sun'));
      want.flood = blend('flood');
      // The water starts rising with the first scroll, not at the section edge.
      if (a === 0) want.flood = smooth(clamp01((h - tops[1]) / (h * 0.45)));
      want.slide = blend('slide');
      want.bank = blend('storm');
    };

    /** Eases the rising layers toward their targets; returns whether any is still moving. */
    const easeHazards = (elapsed: number) => {
      let busy = false;
      // Time-based, so the water rises at the same pace on a slow phone.
      const step = 1 - Math.exp(-elapsed * 4);
      for (const k of ['flood', 'slide', 'bank'] as const) {
        const gap = want[k] - eased[k];
        if (still || Math.abs(gap) < 0.002) eased[k] = want[k];
        else { eased[k] += gap * step; busy = true; }
      }
      const place = (el: HTMLElement | null, v: number, dir: 1 | -1) => {
        if (!el) return;
        el.style.transform = `translate3d(0, ${dir * (1 - v) * 100}%, 0)`;
        el.dataset.on = String(v > 0.005);
      };
      place(flood.current, eased.flood, 1);
      place(slide.current, eased.slide, 1);
      place(bank.current, eased.bank, -1);
      return busy;
    };

    const tick = (now: number) => {
      raf = 0;
      const elapsed = (now - last) / 1000 || 0.016;
      const dt = Math.min(0.05, elapsed);
      last = now;
      frame++;

      const moving = window.scrollY !== lastY;
      lastY = window.scrollY;
      if (moving) applyScene();
      const rising = easeHazards(elapsed);

      if (!still) {
        const raining = mix.rain > 0.02;
        if (raining && (wide || frame % 2 === 0)) {
          drawRain(mix.rain, wide ? dt : dt * 2);
          rainDrawn = true;
        } else if (!raining && rainDrawn) {
          rctx.clearRect(0, 0, w, h);
          rainDrawn = false;
        }
        // One soft pulse every several seconds while the storm is overhead.
        if (mix.storm > 0.6 && flash.current) {
          if (!flashAt) flashAt = now + 5000 + Math.random() * 6000;
          if (now > flashAt) {
            flashAt = 0;
            const pulse = { duration: 900, easing: 'ease-out' };
            flash.current.animate([{ opacity: 0 }, { opacity: 0.3, offset: 0.12 }, { opacity: 0 }], pulse);
            if (bolt.current) {
              bolt.current.style.left = `${12 + Math.random() * 70}%`;
              bolt.current.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.1 }, { opacity: 0 }], pulse);
            }
          }
        }
      }

      if (document.hidden) return;
      if (!still && (mix.rain > 0.02 || mix.storm > 0.6 || moving || rising)) raf = requestAnimationFrame(tick);
    };

    const wake = () => { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const onResize = () => { resize(); lastY = -1; wake(); };
    resize();
    wake();
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', wake);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [still, wide]);

  return (
    <div className="lf-wx" aria-hidden="true" data-still={still}>
      {SCENES.map((s, i) => (
        <div key={s.id} ref={(el) => { skies.current[i] = el; }} className={`lf-wx__sky lf-wx__sky--${s.sky}`} style={{ opacity: i === 0 ? 1 : 0 }} />
      ))}
      <div ref={sun} className="lf-wx__sun" style={{ opacity: 0 }} />
      <div ref={clouds} className="lf-wx__clouds">
        <span /><span /><span />
      </div>

      <div ref={slide} className="lf-wx__rise lf-wx__rise--slide" data-on="false">
        <svg viewBox="0 0 1200 300" preserveAspectRatio="none">
          <path className="lf-wx__hill-far" d="M0 300 V190 L120 150 L260 176 L420 96 L560 138 L720 54 L860 104 L1010 24 L1200 70 V300 Z" />
          <path className="lf-wx__hill-near" d="M0 300 V262 L150 240 L300 256 L470 204 L590 226 L760 150 L880 184 L1040 92 L1200 128 V300 Z" />
          <g className="lf-wx__rocks">
            <circle cx="640" cy="196" r="13" /><circle cx="560" cy="226" r="9" /><circle cx="432" cy="238" r="16" />
            <circle cx="350" cy="256" r="8" /><circle cx="236" cy="262" r="12" /><circle cx="820" cy="176" r="10" />
          </g>
        </svg>
      </div>

      <div ref={flood} className="lf-wx__rise lf-wx__rise--flood" data-on="false">
        <svg className="lf-wx__town" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMax slice">
          <path d="M40 200 V120 L100 76 L160 120 V200 Z M190 200 V96 H290 V200 Z M320 200 V130 L372 92 L424 130 V200 Z M470 200 V70 H560 V200 Z M600 200 V126 L664 80 L728 126 V200 Z M770 200 V104 H850 V200 Z M890 200 V132 L944 94 L998 132 V200 Z M1040 200 V84 H1140 V200 Z" />
        </svg>
        {[1, 2, 3].map((n) => (
          <div key={n} className={`lf-wx__wave lf-wx__wave--${n}`}>
            <svg viewBox="0 0 1200 400" preserveAspectRatio="none"><path d={WAVE} /></svg>
          </div>
        ))}
      </div>

      <div ref={bank} className="lf-wx__rise lf-wx__rise--bank" data-on="false" />
      <canvas ref={rainCanvas} className="lf-wx__canvas lf-wx__canvas--rain" />
      <div ref={flash} className="lf-wx__flash" />
      <svg ref={bolt} className="lf-wx__bolt" viewBox="0 0 80 300"><path d="M46 0 L14 132 H40 L18 300 L70 112 H42 L66 0 Z" /></svg>
    </div>
  );
};
