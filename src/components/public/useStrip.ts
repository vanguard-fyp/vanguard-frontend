import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

/* Shared behaviour for the two horizontal strips (publications, timeline):
   mouse drag-to-scroll, step-by-item navigation, arrow keys, and the index
   of the item at the leading edge. Vertical scrolling is never captured. */

export function useStrip<T extends HTMLElement>(count: number) {
  const ref = useRef<T>(null);
  const [index, setIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const moved = useRef(false);

  const itemWidth = useCallback(() => {
    const el = ref.current;
    const first = el?.firstElementChild as HTMLElement | null;
    return first ? first.getBoundingClientRect().width : 1;
  }, []);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / itemWidth());
    setIndex(Math.max(0, Math.min(count - 1, i)));
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, [count, itemWidth]);

  const goTo = useCallback((i: number) => {
    const el = ref.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(count - 1, i));
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: clamped * itemWidth(), behavior: smooth ? 'smooth' : 'auto' });
  }, [count, itemWidth]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);

    let startX = 0;
    let startLeft = 0;
    let dragging = false;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      moved.current = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5 && !moved.current) {
        moved.current = true;
        el.dataset.dragging = 'true';
      }
      if (moved.current) el.scrollLeft = startLeft - dx;
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      if (moved.current) {
        delete el.dataset.dragging;
        goTo(Math.round(el.scrollLeft / itemWidth()));
      }
    };
    // Swallow the click that ends a drag so links inside don't fire.
    const click = (e: MouseEvent) => {
      if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false; }
    };

    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('click', click, true);
    return () => {
      el.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('click', click, true);
    };
  }, [sync, goTo, itemWidth]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
    if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    if (e.key === 'End') { e.preventDefault(); goTo(count - 1); }
  };

  return { ref, index, atStart, atEnd, goTo, onKeyDown };
}
