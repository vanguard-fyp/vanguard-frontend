import { useEffect } from 'react';

let locks = 0;

/**
 * Stops the page scrolling while an overlay is open. Without this the page's
 * scrollbars stay visible and the dimmed backdrop stops short of them.
 * Counted, so closing a dialog opened from a drawer keeps the drawer's lock.
 */
export function useLockPageScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locks += 1;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      locks -= 1;
      if (locks === 0) document.documentElement.style.overflow = '';
    };
  }, [active]);
}
