import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ArrowUp } from 'lucide-react';

gsap.registerPlugin(ScrollToPlugin);

/* The page key. It appears once the reader leaves the opening radar, with one
   bar per section. Bars fill top to bottom as the reader moves down the page,
   and the travelling radar rides down them as the "you are here" marker
   whenever no section offers it a perch. Jumps glide instead of cutting. */

interface Props {
  sections: { id: string; label: string }[];
}

/** Pinned sections live inside a GSAP pin-spacer; measure that box instead. */
const box = (el: HTMLElement) => (el.closest('.pin-spacer') as HTMLElement | null) ?? el;

const glide = (id: string) => (e: React.MouseEvent) => {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const y = box(el).getBoundingClientRect().top + window.scrollY - 64;
  gsap.to(window, { scrollTo: { y, autoKill: true }, duration: reduced ? 0 : 1.3, ease: 'power3.inOut', overwrite: true });
};

export const RadarDock: React.FC<Props> = ({ sections }) => {
  const [show, setShow] = useState(false);
  const [active, setActive] = useState(0);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const marker = useRef<HTMLLIElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = window.innerHeight * 0.5;
      let current = 0;
      let markerY = 0;
      sections.forEach((s, i) => {
        const el = document.getElementById(s.id);
        const fill = fills.current[i];
        if (!el || !fill) return;
        const r = box(el).getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
        fill.style.transform = `scaleY(${p})`;
        if (r.top <= mid || i === 0) {
          current = i;
          const track = fill.parentElement as HTMLElement;
          markerY = track.offsetTop + (track.closest('li') as HTMLElement).offsetTop + p * track.offsetHeight;
        }
      });
      // Hidden over the opening radar; shown from the first listed section on.
      const first = document.getElementById(sections[0].id);
      setShow(!!first && box(first).getBoundingClientRect().top < window.innerHeight * 0.6);
      setActive(current);
      if (marker.current) marker.current.style.transform = `translateY(${markerY}px)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sections]);

  return (
    <nav className="lf-dock" data-show={show} aria-label="Sections on this page">
      <a href="#about" className="lf-dock__up" aria-label="Back to top" onClick={glide('about')}>
        <ArrowUp size={24} aria-hidden="true" />
        <span className="lf-dock__label">Back to top</span>
      </a>
      <ol className="lf-dock__bars">
        <li ref={marker} className="lf-dock__marker" aria-hidden="true" data-radar-home data-radar-size="34" />
        {sections.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} aria-current={i === active ? 'true' : undefined} onClick={glide(s.id)}>
              <span className="lf-dock__track" aria-hidden="true">
                <span className="lf-dock__fill" ref={(el) => { fills.current[i] = el; }} />
              </span>
              <span className="lf-dock__label">{s.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};
