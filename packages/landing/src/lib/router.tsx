import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Tiny dependency-free router with History API + hash fallback.
 * The landing page must also work when opened from a file system or embedded
 * in a sandboxed iframe preview, so we fall back to hash routing there.
 */
interface RouterValue {
  path: string;
  navigate: (to: string, opts?: { replace?: boolean; keepScroll?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

const useHashRouting = () =>
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' || window.location.pathname.includes('/_preview'));

/**
 * Site base as a path prefix: "/wAI/" on a GitHub Pages project page, "/"
 * everywhere else. The deployed 404.html carries `<base href="/wAI/">`, so this
 * is also how a deep link such as /wAI/a/#WAIX1.… knows where the site root is.
 */
export function siteBase(): string {
  if (typeof document === 'undefined') return '/';
  const raw = document.querySelector('base')?.getAttribute('href') ?? '/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

/** Prefixes a router path with the site base, for real hrefs and pushState. */
export function withBase(to: string): string {
  const base = siteBase().replace(/\/$/, '');
  if (!base) return to;
  return `${base}${to.startsWith('/') ? to : `/${to}`}`;
}

function currentPath(): string {
  if (typeof window === 'undefined') return '/';
  if (useHashRouting() && window.location.hash) {
    return window.location.hash.replace(/^#/, '') || '/';
  }
  const base = document.querySelector('base')?.getAttribute('href') ?? '/';
  let path = window.location.pathname;
  if (base && base !== '/' && path.startsWith(base.replace(/\/$/, ''))) {
    path = path.slice(base.replace(/\/$/, '').length) || '/';
  }
  return path.replace(/\/index\.html$/, '/') || '/';
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  const navigate = useCallback<RouterValue['navigate']>((to, opts = {}) => {
    // In-page anchors scroll, they do not route.
    if (to.startsWith('#')) {
      const el = document.querySelector(to);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const [pathname, hash] = to.split('#');
    if (useHashRouting()) {
      window.location.hash = pathname;
    } else {
      window.history[opts.replace ? 'replaceState' : 'pushState']({}, '', withBase(to));
    }
    setPath(pathname || '/');
    if (hash) {
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      });
    } else if (!opts.keepScroll) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside <RouterProvider>');
  return ctx;
}

/** Anchor that keeps SPA behaviour (works with cmd/ctrl-click for new tabs). */
export function Link({
  to,
  children,
  className,
  onClick,
  ...rest
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>) {
  const { navigate } = useRouter();
  return (
    <a
      href={withBase(to)}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        onClick?.();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
