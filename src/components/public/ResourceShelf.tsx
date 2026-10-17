import React, { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import gsap from 'gsap';
import { ArrowUpRight } from 'lucide-react';
import type { ResourceGroup } from '../../pages/public/publicContent';

/* Resources as books on a shelf. Spines are grouped by kind; choosing one
   lifts it off the shelf and the book comes out beside the shelf with its
   details and the link to the original. */

const TONES = ['ink', 'spot', 'stock'] as const;
// Deterministic spine heights so the shelf looks hand-stacked, not generated.
const HEIGHTS = [100, 92, 96, 88, 100, 94, 90, 98, 86];

interface Props { groups: ResourceGroup[]; reduced: boolean }

export const ResourceShelf: React.FC<Props> = ({ groups, reduced }) => {
  const books = groups.flatMap((g, gi) => g.items.map((item) => ({ item, group: g, tone: TONES[gi % TONES.length] })));
  const [sel, setSel] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const spines = useRef<(HTMLButtonElement | null)[]>([]);
  const first = useRef(true);
  const busy = useRef(false);

  // The new book flips open toward the reader and zooms up to size.
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduced || !card.current) return;
    gsap.fromTo(
      card.current,
      { rotateY: 92, scale: 0.78, x: -40, transformOrigin: 'left center' },
      { rotateY: 0, scale: 1, x: 0, duration: 0.7, ease: 'back.out(1.25)', onComplete: () => { busy.current = false; } },
    );
  }, [sel, reduced]);

  // The open book closes back toward the shelf, then the chosen one comes out.
  const choose = (i: number) => {
    const next = (i + books.length) % books.length;
    if (next === sel || busy.current) return;
    if (reduced || !card.current) { setSel(next); return; }
    busy.current = true;
    gsap.to(card.current, {
      rotateY: -92, scale: 0.85, x: -30, duration: 0.28, ease: 'power2.in', transformOrigin: 'left center',
      onComplete: () => setSel(next),
    });
  };

  const pick = (i: number) => {
    choose(i);
    spines.current[(i + books.length) % books.length]?.focus();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); pick(sel + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); pick(sel - 1); }
  };

  const { item, group, tone } = books[sel];
  let n = -1;

  return (
    <div className="lf-shelf">
      <div className="lf-shelf__rack">
        <div className="lf-shelf__groups" role="tablist" aria-label="Resources" onKeyDown={onKey}>
          {groups.map((g, gi) => (
            <div key={g.heading} className="lf-shelf__group">
              <div className="lf-shelf__books">
                {g.items.map((r) => {
                  n += 1;
                  const i = n;
                  return (
                    <button
                      key={r.title}
                      ref={(el) => { spines.current[i] = el; }}
                      type="button"
                      role="tab"
                      aria-selected={i === sel}
                      aria-controls="lf-shelf-book"
                      tabIndex={i === sel ? 0 : -1}
                      className={`lf-spine lf-spine--${TONES[gi % TONES.length]}`}
                      style={{ height: `${HEIGHTS[i % HEIGHTS.length]}%` }}
                      onClick={() => choose(i)}
                    >
                      {i === sel && <span className="lf-anchor lf-anchor--spine" data-radar-anchor data-radar-size="40" aria-hidden="true" />}
                      <span>{r.short}</span>
                    </button>
                  );
                })}
              </div>
              <span className="lf-shelf__tag">{g.heading}</span>
            </div>
          ))}
          <div className="lf-shelf__group">
            <a href="#publications" className="lf-volume" data-flybook-source aria-label="The reference shelf: six publications, opened further down the page">
              <span>Reference shelf</span>
            </a>
          </div>
        </div>
        <div className="lf-shelf__plank" aria-hidden="true" />
      </div>

      <div className="lf-shelf__out" style={{ perspective: '1400px' }}>
        <div ref={card} id="lf-shelf-book" role="tabpanel" className="lf-book" aria-live="polite">
          <div className={`lf-book__cover lf-book__cover--${tone}`}>
            <span className="lf-book__kind">{group.heading}</span>
            <span className="lf-book__short">{item.short}</span>
            <span className="lf-book__pub">{item.publisher}</span>
          </div>
          <div className="lf-book__body">
            <h3 className="lf-h3" style={{ margin: 0 }}>{item.title}</h3>
            {item.gloss && <p className="lf-small" style={{ margin: 0 }}>{item.gloss}</p>}
            <p className="lf-small" style={{ margin: 0 }}>
              {item.publisher}{item.date ? ` · ${item.date}` : ''}
            </p>
            <a className="lf-btn lf-btn--line" href={item.href} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>
              {item.format === 'PDF' ? 'Open PDF' : 'Open page'} <ArrowUpRight size={16} aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
