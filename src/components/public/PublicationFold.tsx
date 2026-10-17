import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Publication } from '../../pages/public/publicContent';
import { useStrip } from './useStrip';

/* The publications strip opens like a concertina leaflet the first time it
   enters view, then browses sideways: drag, swipe, arrow keys, the buttons,
   or the panel rail. Before it opens, every link is still in the DOM. */

const COVERS = ['stock', 'ink', 'spot'] as const;

/** A halftone screen: dot size grows toward one corner, offset per cover.
    Rendered once as an SVG image, so the copies inside a curling page cost nothing. */
const screenCache = new Map<string, string>();
const screenUrl = (seed: number, tone: (typeof COVERS)[number]) => {
  const key = `${seed % 3}-${tone}`;
  const hit = screenCache.get(key);
  if (hit) return hit;
  const cols = 14;
  const rows = 18;
  const fill = tone === 'stock' ? '#0b5cad' : tone === 'ink' ? '#3d79bf' : '#ffffff';
  const opacity = tone === 'spot' ? 0.28 : tone === 'ink' ? 0.55 : 0.85;
  let dots = '';
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const u = i / (cols - 1);
      const v = j / (rows - 1);
      // Dense in the top-right corner, clearing toward the title at bottom-left.
      const t = u * (0.5 + (seed % 3) * 0.08) + (1 - v) * 0.7;
      const r = Math.min(0.36, Math.max(0, (t - 0.62) * 0.9));
      if (r > 0.04) dots += `<circle cx="${(i + (j % 2) * 0.5).toFixed(2)}" cy="${j}" r="${r.toFixed(3)}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.5 -0.5 ${cols} ${rows}" preserveAspectRatio="xMidYMid slice"><g fill="${fill}" fill-opacity="${opacity}">${dots}</g></svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  screenCache.set(key, url);
  return url;
};

export const Screen: React.FC<{ seed: number; tone: (typeof COVERS)[number] }> = ({ seed, tone }) => (
  <span className="lf-cover__screen" aria-hidden="true" style={{ backgroundImage: screenUrl(seed, tone), backgroundSize: 'cover', backgroundPosition: 'center' }} />
);

interface Props { items: (Publication | null)[]; reduced: boolean }

export const PublicationFold: React.FC<Props> = ({ items, reduced }) => {
  const { ref, index, atStart, atEnd, goTo, onKeyDown } = useStrip<HTMLOListElement>(items.length);
  const host = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(reduced);

  useEffect(() => {
    if (reduced) { setOpen(true); return; }
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setOpen(true); io.disconnect(); } },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const total = items.length;

  return (
    <div
      className="lf-fold"
      ref={host}
      data-state={open ? 'open' : 'folded'}
      // Any direct interaction opens it too, so content never stays stacked.
      onFocusCapture={() => setOpen(true)}
      onPointerDownCapture={() => setOpen(true)}
    >
      <ol
        ref={ref}
        className="lf-fold__track"
        tabIndex={0}
        aria-label="Selected publications. Use the left and right arrow keys to browse."
        onKeyDown={onKeyDown}
        style={{ listStyle: 'none', margin: 0 }}
      >
        {items.map((p, i) => {
          const tone = COVERS[i % COVERS.length];
          const style = { ['--i' as string]: i, ['--dir' as string]: i % 2 ? -1 : 1 } as React.CSSProperties;
          if (!p) {
            return (
              <li key="blank" className="lf-panel lf-panel--blank" style={style}>
                <div className="lf-cover">
                  <span className="lf-cover__pub">Unprinted panel</span>
                  <span className="lf-cover__mark" aria-hidden="true">—</span>
                  <span className="lf-cover__title">Reserved for an agency manual</span>
                </div>
                <div className="lf-panel__body">
                  <p className="lf-panel__summary">Left blank until a verified NADMA document is added to the site.</p>
                </div>
              </li>
            );
          }
          const isPdf = p.href.toLowerCase().endsWith('.pdf');
          return (
            <li key={p.title} className="lf-panel" style={style} aria-current={i === index ? 'true' : undefined}>
              <div className={`lf-cover lf-cover--${tone}`}>
                <Screen seed={i} tone={tone} />
                <span className="lf-cover__pub">{p.publisher}</span>
                <span className="lf-cover__mark" aria-hidden="true">{p.mark}</span>
                <span className="lf-cover__title">{p.title}</span>
              </div>
              <div className="lf-panel__body">
                {p.gloss && <span className="lf-label">{p.gloss}</span>}
                <span className="lf-panel__count tnum">{p.publisher}{p.date ? ` · ${p.date}` : ''}</span>
                <p className="lf-panel__summary">{p.summary}</p>
                <a className="lf-link" href={p.href} target="_blank" rel="noreferrer">
                  {isPdf ? 'Open PDF' : 'Open page'}
                  <ArrowUpRight size={15} aria-hidden="true" />
                  <span className="sr-only"> — {p.title} (opens in a new tab)</span>
                </a>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="lf-wrap lf-fold__controls">
        <div className="lf-progress">
          <span className="tnum" aria-live="polite">{index + 1} / {total}</span>
          <div className="lf-progress__rail">
            {items.map((p, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to panel ${i + 1}${p ? `: ${p.title}` : ''}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </div>
        <div className="lf-fold__btns">
          <button type="button" className="lf-iconbtn" onClick={() => goTo(index - 1)} disabled={atStart} aria-label="Previous publication">
            <ArrowLeft size={18} />
          </button>
          <button type="button" className="lf-iconbtn" onClick={() => goTo(index + 1)} disabled={atEnd} aria-label="Next publication">
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
