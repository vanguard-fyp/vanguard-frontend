import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MonitoringPlate } from './MonitoringPlate';

/* One small radar that travels the page. Each section can offer a perch
   (`data-radar-anchor`, sized by `data-radar-size`): the chosen book spine,
   the top of the open reference book, the rider on the timeline axis.
   It flies to the perch of the section in view and returns to its home slot
   in the dock otherwise. On a perch marked `data-radar-roll` it turns like a
   wheel in proportion to the distance it travels.
   Between the first section and the shelf it is scroll-linked: it lifts off
   the big radar (`data-radar-source`) and shrinks onto the shelf as the reader
   scrolls, so the two radars read as one object. */

const ease = (t: number) => t * t * (3 - 2 * t);

const box = (el: HTMLElement) => (el.closest('.pin-spacer') as HTMLElement | null) ?? el;

interface Props { scene: number; still: boolean }

export const RadarRoamer: React.FC<Props> = ({ scene, still }) => {
  const ref = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const [big, setBig] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cur = { x: -100, y: -100, s: 56, o: 0, rot: 0 };
    let placed = false;

    // A dotted wake behind the radar while it travels, like a plotted track.
    const canvas = trailRef.current;
    const ctx = canvas?.getContext('2d') ?? null;
    const spot = getComputedStyle(el).getPropertyValue('--lf-spot').trim() || '#0b5cad';
    const wake: { x: number; y: number; life: number }[] = [];
    const size = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);
    let lastDrop = { x: -999, y: -999 };
    let wasBig = false;

    /** Hand-off between the big radar and the shelf perch, or null outside it. */
    const handoff = () => {
      const source = document.querySelector<HTMLElement>('[data-radar-source]');
      const shelf = document.getElementById('resources');
      const dest = shelf?.querySelector<HTMLElement>('[data-radar-anchor]');
      if (!source || !shelf || !dest || !source.offsetParent) return null;
      // Scroll distance from the first section's resting place to the shelf
      // settling in the upper third of the screen.
      const vh = window.innerHeight;
      const home = (source.closest('section') as HTMLElement | null)?.getBoundingClientRect().top ?? 0;
      const startY = Math.max(0, window.scrollY + home - 64);
      const endY = window.scrollY + shelf.getBoundingClientRect().top - vh * 0.3;
      const t = endY > startY ? Math.min(1, Math.max(0, (window.scrollY - startY) / (endY - startY))) : 1;
      return { source, dest, t };
    };

    const pickTarget = () => {
      const vh = window.innerHeight;
      let best: { el: HTMLElement; score: number } | null = null;
      document.querySelectorAll<HTMLElement>('[data-radar-anchor]').forEach((a) => {
        const section = a.closest('section') as HTMLElement | null;
        if (!section) return;
        const r = box(section).getBoundingClientRect();
        const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / Math.min(vh, r.height);
        const ar = a.getBoundingClientRect();
        const onScreen = ar.top > 40 && ar.bottom < vh - 10;
        if (visible > 0.55 && onScreen && (!best || visible > best.score)) best = { el: a, score: visible };
      });
      if (best) return (best as { el: HTMLElement }).el;
      const home = document.querySelector<HTMLElement>('[data-radar-home]');
      const dock = home?.closest('.lf-dock') as HTMLElement | null;
      return home && dock?.dataset.show === 'true' && home.offsetParent ? home : null;
    };

    const tick = () => {
      const h = handoff();
      if (h) h.source.style.visibility = h.t > 0 && h.t < 1 ? 'hidden' : '';
      if (h && h.t < 1) {
        const a = h.source.getBoundingClientRect();
        const b = h.dest.getBoundingClientRect();
        const bs = Number(h.dest.dataset.radarSize) || b.width;
        const p = ease(h.t);
        cur.x = a.left + a.width / 2 + (b.left + b.width / 2 - (a.left + a.width / 2)) * p;
        cur.y = a.top + a.height / 2 + (b.top + b.height / 2 - (a.top + a.height / 2)) * p;
        cur.s = a.width + (bs - a.width) * p;
        cur.o = h.t > 0 ? 1 : 0;
        cur.rot += (Math.round(cur.rot / 360) * 360 - cur.rot) * 0.2;
        placed = true;
        const isBig = cur.s > 160;
        if (isBig !== wasBig) { wasBig = isBig; setBig(isBig); }
        el.style.transform = `translate3d(${cur.x - cur.s / 2}px, ${cur.y - cur.s / 2}px, 0) rotate(${cur.rot}deg)`;
        el.style.width = el.style.height = `${cur.s}px`;
        el.style.opacity = String(cur.o);
        el.dataset.big = String(isBig);
        ctx?.clearRect(0, 0, window.innerWidth, window.innerHeight);
        return;
      }
      if (wasBig) { wasBig = false; setBig(false); el.dataset.big = 'false'; }
      const target = pickTarget();
      let tx = cur.x, ty = cur.y, ts = cur.s, to = 0;
      let roll = false;
      if (target) {
        const r = target.getBoundingClientRect();
        ts = Number(target.dataset.radarSize) || r.width || 56;
        tx = r.left + r.width / 2;
        ty = r.top + r.height / 2;
        to = 1;
        roll = target.hasAttribute('data-radar-roll');
      }
      const k = still || !placed ? 1 : 0.16;
      if (target && !placed) placed = true;
      const dx = (tx - cur.x) * k;
      cur.x += dx;
      cur.y += (ty - cur.y) * k;
      cur.s += (ts - cur.s) * k;
      cur.o += (to - cur.o) * (still ? 1 : 0.2);
      // Rolling: arc length / radius, in degrees.
      if (roll && !still) cur.rot += (dx / (cur.s / 2)) * (180 / Math.PI);
      el.style.transform = `translate3d(${cur.x - cur.s / 2}px, ${cur.y - cur.s / 2}px, 0) rotate(${cur.rot}deg)`;
      el.style.width = el.style.height = `${cur.s}px`;
      el.style.opacity = String(cur.o);

      if (!ctx || still) return;
      // Only flights leave a wake; page scrolling moves the perch, not the radar.
      const flying = !roll && Math.hypot(tx - cur.x, ty - cur.y) > 18;
      if (flying && Math.hypot(cur.x - lastDrop.x, cur.y - lastDrop.y) > 14) {
        wake.push({ x: cur.x, y: cur.y, life: 1 });
        lastDrop = { x: cur.x, y: cur.y };
      }
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.fillStyle = spot;
      for (let i = wake.length - 1; i >= 0; i--) {
        const d = wake[i];
        d.life -= 0.022;
        if (d.life <= 0) { wake.splice(i, 1); continue; }
        ctx.globalAlpha = d.life * 0.55;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.2 + d.life * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', size);
      const source = document.querySelector<HTMLElement>('[data-radar-source]');
      if (source) source.style.visibility = '';
    };
  }, [still]);

  return (
    <>
      <canvas ref={trailRef} className="lf-wake" aria-hidden="true" />
      <div ref={ref} className="lf-roamer" aria-hidden="true">
        <MonitoringPlate scene={scene} still={still} compact={!big} map={big} />
      </div>
    </>
  );
};
