import { useEffect } from 'react';

/**
 * Progressive scroll reveal. Uses IntersectionObserver, respects reduced motion,
 * and degrades to "always visible" when the API is missing.
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'));
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.revealDelay ?? 0);
          window.setTimeout(() => el.classList.add('is-visible'), delay);
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, deps);
}

/** Reveal helper for staggered grids: returns inline style with a delay. */
export const revealDelay = (index: number, step = 70): React.CSSProperties => ({
  transitionDelay: `${index * step}ms`,
});
