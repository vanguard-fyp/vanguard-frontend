import React, { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import type { Publication } from '../../pages/public/publicContent';
import { Screen } from './PublicationFold';

gsap.registerPlugin(ScrollTrigger);

/* The reference book. It leaves the resource shelf as a closed volume, flies
   down onto the reading stand, opens its cover, then turns one page at a time
   as the reader scrolls. Each leaf is cut into vertical strips that bend
   against each other while it turns, so the page curls like paper instead of
   swinging like a door. Spreads: the publication's cover on the left, what it
   is and the link to the original on the right. */

const TONES = ['stock', 'ink', 'spot'] as const;
const STRIPS = 4;
const CURL = 13; // degrees of bend between neighbouring strips at mid-turn

const BookCover: React.FC = () => (
  <div className="lf-bookcover">
    <span className="lf-bookcover__org">Vanguard for NADMA Malaysia</span>
    <span className="lf-bookcover__title">The reference shelf</span>
    <span className="lf-bookcover__note">Six publications</span>
  </div>
);

const Contents: React.FC<{ items: Publication[] }> = ({ items }) => (
  <div className="lf-leaf__text">
    <p className="lf-h3" style={{ margin: 0 }}>In this volume</p>
    <ol className="lf-contents">
      {items.map((p) => <li key={p.title}>{p.title}</li>)}
    </ol>
    <p className="lf-small" style={{ marginTop: 'auto' }}>Keep scrolling to turn the pages.</p>
  </div>
);

const TitlePage: React.FC = () => (
  <div className="lf-leaf__title">
    <span className="lf-small">The documents officers work from</span>
    <span className="lf-display" style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)' }}>Frameworks that shape every response</span>
    <span className="lf-small">Each page opens the original.</span>
  </div>
);

const Cover: React.FC<{ p: Publication; i: number }> = ({ p, i }) => (
  <div className={`lf-leaf__cover lf-cover--${TONES[i % TONES.length]}`}>
    <Screen seed={i} tone={TONES[i % TONES.length]} />
    <span className="lf-cover__pub">{p.publisher}</span>
    <span className="lf-cover__mark" aria-hidden="true">{p.mark}</span>
    <span className="lf-cover__title">{p.title}</span>
  </div>
);

const Details: React.FC<{ p: Publication }> = ({ p }) => (
  <div className="lf-leaf__text">
    <h3 className="lf-h2" style={{ margin: '0 0 0.25rem', fontSize: 'clamp(1.4rem, 2vw, 1.9rem)' }}>{p.title}</h3>
    {p.gloss && <p className="lf-label" style={{ margin: 0 }}>{p.gloss}</p>}
    <p className="lf-small" style={{ margin: '0.25rem 0 0' }}>{p.publisher}{p.date ? `, ${p.date}` : ''}</p>
    <p className="lf-leaf__summary">{p.summary}</p>
    <a className="lf-btn lf-btn--line" href={p.href} target="_blank" rel="noreferrer" tabIndex={-1}>
      {p.href.toLowerCase().endsWith('.pdf') ? 'Open PDF' : 'Open page'} <ArrowUpRight size={16} aria-hidden="true" />
    </a>
  </div>
);

/** One leaf, cut into strips nested so each bends from the one before it. */
const Leaf: React.FC<{ front: React.ReactNode; back: React.ReactNode; kind?: string }> = ({ front, back, kind }) => {
  const strip = (i: number): React.ReactNode => (
    <div className="lf-strip">
      <div className="lf-strip__face lf-strip__face--front" aria-hidden="true">
        <div className="lf-strip__page" style={{ translate: `calc(var(--sw) * ${-i}) 0` }}>{front}</div>
      </div>
      <div className="lf-strip__face lf-strip__face--back" aria-hidden="true">
        <div className="lf-strip__page" style={{ translate: `calc(var(--sw) * ${i + 1 - STRIPS}) 0` }}>{back}</div>
      </div>
      {i + 1 < STRIPS && strip(i + 1)}
    </div>
  );
  return <div className="lf-leaf" data-kind={kind} data-flipped="false">{strip(0)}</div>;
};

interface Props { items: Publication[] }

export const FlipBook: React.FC<Props> = ({ items }) => {
  const root = useRef<HTMLDivElement>(null);
  const fly = useRef<HTMLDivElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const [spread, setSpread] = useState(-1);
  // Leaves: 0 = cover | contents; 1 = title page | cover of item 0;
  // k (2..n+1) = details of item k-2 | cover of item k-1 (blank after the last).
  const leafCount = items.length + 2;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const section = el.closest('section') as HTMLElement;
    const ctx = gsap.context(() => {
      const book = el.querySelector<HTMLElement>('.lf-flip__book')!;
      const leafEls = gsap.utils.toArray<HTMLElement>('.lf-leaf', el);
      leafEls.forEach((l, j) => { l.style.zIndex = String(leafCount - j); });
      const cover = leafEls[0];

      /* 1. Flight: the closed book leaves the shelf and lands on the stand. */
      const flyEl = fly.current!;
      const spine = () => document.querySelector<HTMLElement>('[data-flybook-source]');
      const place = (raw: number) => {
        const src = spine();
        const p = gsap.parseEase('power2.inOut')(raw);
        const landed = raw >= 0.999;
        const waiting = raw <= 0.001 || !src;
        cover.style.visibility = landed || !src ? '' : 'hidden';
        if (src) src.style.visibility = waiting ? '' : 'hidden';
        flyEl.style.visibility = waiting || landed ? 'hidden' : 'visible';
        if (waiting || landed || !src) return;
        const a = src.getBoundingClientRect();
        const b = cover.getBoundingClientRect();
        const mix = (x: number, y: number) => x + (y - x) * p;
        const arc = Math.sin(Math.PI * p);
        flyEl.style.left = `${mix(a.left, b.left)}px`;
        flyEl.style.top = `${mix(a.top, b.top) - arc * 60}px`;
        flyEl.style.width = `${mix(a.width, b.width)}px`;
        flyEl.style.height = `${mix(a.height, b.height)}px`;
        flyEl.style.transform = `perspective(1200px) rotateX(${p * 14}deg) rotateY(${arc * -24}deg) rotate(${arc * -6}deg)`;
        flyEl.style.setProperty('--morph', String(p));
      };
      ScrollTrigger.create({
        trigger: section,
        // Long runway so the book drifts down in slow motion.
        start: 'top 190%',
        end: 'top 64px',
        onUpdate: (self) => place(self.progress),
        onRefresh: (self) => place(self.progress),
        onLeave: () => place(1),
        onLeaveBack: () => place(0),
      });

      /* 2. Reading: grow, open the cover, turn the pages. */
      const turn = (leaf: HTMLElement, j: number) => ({
        rotateY: -180,
        duration: 1,
        onUpdate() {
          const rot = gsap.getProperty(leaf, 'rotateY') as number;
          const t = Math.min(1, Math.max(0, -rot / 180));
          leaf.style.setProperty('--curl', `${-Math.sin(Math.PI * t) * CURL}deg`);
          const flipped = t > 0.5;
          leaf.style.zIndex = String(flipped ? 10 + j : leafCount - j);
          leaf.dataset.flipped = String(flipped);
        },
      });
      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onUpdate: () => {
          let k = -1;
          for (let j = 0; j < items.length; j++) if (tl.labels[`s${j}`] - 0.5 <= tl.time()) k = j;
          setSpread(k);
        },
      });
      // Lands tilted back like a book on a table, then lifts toward the reader.
      tl.fromTo(book, { scale: 0.86, xPercent: -25, rotateX: 14 }, { scale: 1, xPercent: -25, rotateX: 0, duration: 0.6, ease: 'power2.out' });
      tl.addLabel('closed');
      // Opening the cover also slides the book so the spread is centred.
      tl.to(cover, turn(cover, 0));
      tl.to(book, { xPercent: 0, duration: 1 }, '<');
      tl.fromTo('.lf-flip__base--left', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, '<0.45');
      tl.addLabel('open').to({}, { duration: 0.5 });
      for (let j = 1; j < leafEls.length - 1; j++) {
        tl.to(leafEls[j], turn(leafEls[j], j));
        tl.addLabel(`s${j - 1}`).to({}, { duration: 0.6 });
      }

      st.current = ScrollTrigger.create({
        trigger: section,
        start: 'top 64px',
        end: () => `+=${window.innerHeight * 0.6 * (items.length + 2)}`,
        pin: true,
        scrub: 0.9,
        animation: tl,
        snap: { snapTo: 'labelsDirectional', duration: { min: 0.25, max: 0.7 }, delay: 0.1, ease: 'power1.inOut' },
        invalidateOnRefresh: true,
      });
    }, el);
    return () => ctx.revert();
  }, [items.length, leafCount]);

  const go = (k: number) => {
    const t = st.current;
    if (!t) return;
    const anim = t.animation as gsap.core.Timeline;
    const p = anim.labels[`s${k}`] / anim.duration();
    window.scrollTo({ top: t.start + (t.end - t.start) * p, behavior: 'smooth' });
  };

  return (
    <div className="lf-flip" ref={root}>
      <div className="lf-flip__book" style={{ ['--strips' as string]: STRIPS }}>
        <span className="lf-anchor lf-anchor--book" data-radar-anchor data-radar-size="52" aria-hidden="true" />
        <div className="lf-flip__base lf-flip__base--left" />
        <div className="lf-flip__base lf-flip__base--right" />
        <Leaf kind="cover" front={<BookCover />} back={<Contents items={items} />} />
        <Leaf front={<TitlePage />} back={<Cover p={items[0]} i={0} />} />
        {items.map((p, i) => (
          <Leaf
            key={p.title}
            front={<Details p={p} />}
            back={i + 1 < items.length ? <Cover p={items[i + 1]} i={i + 1} /> : <div className="lf-leaf__text" />}
          />
        ))}
      </div>

      <div className="lf-dots" role="group" aria-label="Turn to a publication">
        {items.map((p, i) => (
          <button
            key={p.title}
            type="button"
            className="lf-dots__dot"
            aria-label={`Turn to ${p.title}`}
            aria-current={spread === i ? 'true' : undefined}
            onClick={() => go(i)}
          />
        ))}
      </div>

      {/* Keyboard and screen-reader route to every document printed on the pages. */}
      <ul className="sr-only">
        {items.map((p) => <li key={p.title}><a href={p.href} target="_blank" rel="noreferrer">{p.title} (opens in a new tab)</a></li>)}
      </ul>

      <div ref={fly} className="lf-flybook" aria-hidden="true">
        <span className="lf-flybook__spine">Reference shelf</span>
        <BookCover />
      </div>
    </div>
  );
};
