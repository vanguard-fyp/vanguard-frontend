import React, { useEffect, useRef } from 'react';

/* A halftone screen printed behind the monitoring plate. The dot pattern is a
   slow contour field; dots swell under the pointer like ink spreading on the
   press. Draws once when `still`, and only animates while the pointer moves. */

const STEP = 13;
const MAX_R = 2.6;
const REACH = 120;

interface Props { still?: boolean; className?: string }

export const HalftoneField: React.FC<Props> = ({ still = false, className }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let base: Float32Array = new Float32Array(0);
    let cols = 0;
    let rows = 0;
    const pointer = { x: -9999, y: -9999, energy: 0, target: 0 };
    let raf = 0;
    let visible = true;

    const ink = getComputedStyle(canvas).getPropertyValue('--lf-ink').trim() || '#13202f';

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / STEP) + 1;
      rows = Math.ceil(h / STEP) + 1;
      base = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * STEP;
          const y = j * STEP;
          const f = 0.5 + 0.5 * Math.sin(x * 0.0055 + y * 0.0032) * Math.cos(y * 0.0068 - x * 0.0021);
          const g = 0.5 + 0.5 * Math.sin((x + y) * 0.0019 + 1.3);
          base[j * cols + i] = 0.25 + MAX_R * Math.pow(f * 0.75 + g * 0.25, 2.2);
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.17;
      const e = pointer.energy;
      const reach2 = 2 * REACH * REACH;
      ctx.beginPath();
      for (let j = 0; j < rows; j++) {
        const y = j * STEP;
        const off = j % 2 ? STEP / 2 : 0;
        for (let i = 0; i < cols; i++) {
          const x = i * STEP + off;
          let r = base[j * cols + i];
          if (e > 0.01) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            r += 2.4 * e * Math.exp(-(dx * dx + dy * dy) / reach2);
          }
          if (r < 0.35) continue;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    };

    const loop = () => {
      pointer.energy += (pointer.target - pointer.energy) * 0.12;
      pointer.target *= 0.96;
      if (visible) draw();
      if (pointer.energy > 0.01 || pointer.target > 0.01) raf = requestAnimationFrame(loop);
      else raf = 0;
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerType !== 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = ev.clientX - rect.left;
      pointer.y = ev.clientY - rect.top;
      pointer.target = 1;
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };

    build();
    draw();

    const ro = new ResizeObserver(() => { build(); draw(); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(canvas);
    if (!still) window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [still]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
};
