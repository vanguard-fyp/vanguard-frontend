import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Milestone } from '../../pages/public/publicContent';

gsap.registerPlugin(ScrollTrigger);

/* Scrolling down carries the timeline from left to right. The section pins
   while the track travels, with a scrub delay so it keeps a little momentum.
   With reduced motion it falls back to a plain sideways-scrolling strip. */

const KEY_EVENTS = new Set(['NADMA begins operations', 'Arahan NADMA No. 1']);

interface Props { items: Milestone[]; reduced?: boolean }

export const MilestoneTimeline: React.FC<Props> = ({ items, reduced = false }) => {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const rider = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (reduced || !root.current || !track.current) return;
    const section = root.current.closest('section') as HTMLElement;
    const t = track.current;
    const distance = () => Math.max(0, t.scrollWidth - window.innerWidth);
    // The rider runs along the axis line from left to right as the reader scrolls;
    // the roaming radar rolls along with it like a wheel.
    const placeRider = (p: number) => {
      const r = rider.current;
      const axis = t.querySelector<HTMLElement>('.lf-mile__axis');
      if (!r || !axis || !root.current) return;
      const edge = Math.max(24, (window.innerWidth - 1320) / 2 + 24);
      r.style.top = `${axis.offsetTop + axis.offsetHeight / 2}px`;
      r.style.left = `${edge + p * (window.innerWidth - edge * 2)}px`;
    };
    placeRider(0);
    const ctx = gsap.context(() => {
      gsap.to(t, {
        x: () => -distance(),
        ease: 'none',
        onUpdate() {
          const p = this.progress();
          if (bar.current) bar.current.style.transform = `scaleX(${p})`;
          placeRider(p);
        },
        scrollTrigger: {
          trigger: section,
          start: 'top 64px',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1.2,
          invalidateOnRefresh: true,
          
        },
      });
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <div className="lf-time" ref={root} data-pinned={!reduced}>
      {!reduced && <span ref={rider} className="lf-anchor lf-anchor--rider" data-radar-anchor data-radar-size="40" data-radar-roll aria-hidden="true" />}
      <ol ref={track} className="lf-time__track" aria-label="Agency milestones, oldest first" tabIndex={reduced ? 0 : undefined} style={{ listStyle: 'none', margin: 0 }}>
        {items.map((m, i) => (
          <li key={m.title} className="lf-mile" data-key={KEY_EVENTS.has(m.title)}>
            <div className="lf-mile__year tnum" data-repeat={i > 0 && items[i - 1].year === m.year} aria-hidden="true">{m.year}</div>
            <div className="lf-mile__axis" aria-hidden="true" />
            <div className="lf-mile__body">
              <time className="lf-mile__date">{m.date}</time>
              <h3 className="lf-h3 lf-mile__title">{m.title}</h3>
              <p className="lf-mile__text">{m.text}</p>
              <div className="lf-mile__src">
                Source <em>{m.source}</em>
                {m.verify && <span>· pending verification</span>}
              </div>
            </div>
          </li>
        ))}
      </ol>
      {!reduced && (
        <div className="lf-wrap lf-time__progress" aria-hidden="true">
          <span className="lf-time__rail"><span ref={bar} className="lf-time__bar" /></span>
        </div>
      )}
    </div>
  );
};
