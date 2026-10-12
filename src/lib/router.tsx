'use client';
// ═══════════════════════════════════════════════════════════════
//  router.tsx — lightweight client-side router that mimics the
//  react-router-dom API used by the original Vite app.
//
//  Provides: RouterProvider, useNavigate, useParams, useSearchParams,
//  Link, NavLink, Navigate, useLocation.
//
//  Strategy: a single React state holds the current "virtual" path
//  (e.g. "/forum/topic/123"). All routes are matched client-side; the
//  real Next.js URL stays at "/" (we use location.hash for back/forward).
//  The `layout` render-prop wraps every matched element so the chrome
//  (nav, footer, background) is not remounted on navigation.
// ═══════════════════════════════════════════════════════════════
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, useRef,
} from 'react';

type Route = { path: string; element: React.ReactNode };

type Ctx = {
  path: string;
  params: Record<string, string>;
  search: URLSearchParams;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
};

const RouterContext = createContext<Ctx | null>(null);
const RouteElementContext = createContext<React.ReactNode>(null);

const HASH_PREFIX = '#!';

function readHashPath(): string {
  if (typeof window === 'undefined') return '/home';
  const h = window.location.hash || '';
  if (h.startsWith('#build=')) return '/armory?build=' + encodeURIComponent(h.slice(7));
  if (h.startsWith(HASH_PREFIX)) {
    const p = h.slice(HASH_PREFIX.length);
    return p || '/home';
  }
  // If no hash yet, default to /home and mirror it.
  return '/home';
}

function writeHashPath(path: string, replace: boolean) {
  if (typeof window === 'undefined') return;
  const url = `${window.location.pathname}${window.location.search}${HASH_PREFIX}${path}`;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  window.dispatchEvent(new Event('nefesh:navigate'));
}

function subscribeHash(listener: () => void) {
  const events = ['popstate', 'hashchange', 'nefesh:navigate'];
  events.forEach(event => window.addEventListener(event, listener));
  return () => events.forEach(event => window.removeEventListener(event, listener));
}

/**
 * RouterProvider keeps the matched route's `params` up to date and
 * renders the matched element inside the `layout` render-prop so the
 * outer chrome is never remounted on navigation.
 */
export function RouterProvider({
  routes,
  layout,
  fallback,
}: {
  routes: Route[];
  layout?: (children: React.ReactNode) => React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const path = useSyncExternalStore(subscribeHash, readHashPath, () => '/home');

  useEffect(() => {
    // Sync hash on first mount if missing.
    if (typeof window !== 'undefined' && !window.location.hash) {
      writeHashPath('/home', true);
    }
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const target = to || '/home';
    writeHashPath(target, !!opts?.replace);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const match = useMemo(() => matchRoute(routes, path), [routes, path]);

  const search = useMemo(() => {
    const qIndex = path.indexOf('?');
    return new URLSearchParams(qIndex >= 0 ? path.slice(qIndex + 1) : '');
  }, [path]);

  const ctxValue = useMemo<Ctx>(() => ({
    path,
    params: match?.params || {},
    search,
    navigate,
  }), [path, match, search, navigate]);

  const element = match ? match.element : (fallback || null);
  const animatedElement = <div key={path} className="neo-route-enter">{element}</div>;

  const wrapped = layout ? layout(animatedElement) : animatedElement;

  return (
    <RouterContext.Provider value={ctxValue}>
      <RouteElementContext.Provider value={element}>
        {wrapped}
      </RouteElementContext.Provider>
    </RouterContext.Provider>
  );
}

function matchRoute(
  routes: Route[],
  fullPath: string,
): { element: React.ReactNode; params: Record<string, string> } | null {
  // Strip query string for matching
  const qIndex = fullPath.indexOf('?');
  const pathOnly = qIndex >= 0 ? fullPath.slice(0, qIndex) : fullPath;

  // Try exact match first, then patterns, then wildcard.
  for (const r of routes) {
    if (r.path === pathOnly) {
      return { element: r.element, params: {} };
    }
  }
  for (const r of routes) {
    if (r.path === '*') continue;
    const params = matchPattern(r.path, pathOnly);
    if (params) {
      return { element: r.element, params };
    }
  }
  const wild = routes.find((r) => r.path === '*');
  if (wild) return { element: wild.element, params: {} };
  return null;
}

function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const pSeg = pattern.split('/').filter(Boolean);
  const aSeg = path.split('/').filter(Boolean);
  if (pSeg.length !== aSeg.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pSeg.length; i++) {
    const p = pSeg[i];
    const a = aSeg[i];
    if (p.startsWith(':')) {
      try { params[p.slice(1)] = decodeURIComponent(a); }
      catch { return null; }
    } else if (p !== a) {
      return null;
    }
  }
  return params;
}

export function useNavigate() {
  const ctx = useContext(RouterContext);
  return useCallback((to: string, opts?: { replace?: boolean }) => {
    ctx?.navigate(to, opts);
  }, [ctx]);
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  const ctx = useContext(RouterContext);
  return (ctx?.params || {}) as T;
}

export function useSearchParams(): [URLSearchParams, (next: URLSearchParams, opts?: { replace?: boolean }) => void] {
  const ctx = useContext(RouterContext);
  const sp = ctx?.search || new URLSearchParams();
  const setSp = useCallback((next: URLSearchParams, opts?: { replace?: boolean }) => {
    if (!ctx) return;
    const qIndex = ctx.path.indexOf('?');
    const base = qIndex >= 0 ? ctx.path.slice(0, qIndex) : ctx.path;
    const qs = next.toString();
    const newPath = qs ? `${base}?${qs}` : base;
    ctx.navigate(newPath, opts);
  }, [ctx]);
  return [sp, setSp];
}

export function useLocation() {
  const ctx = useContext(RouterContext);
  return { pathname: ctx?.path || '/home', search: '', hash: '' };
}

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
  replace?: boolean;
  children?: React.ReactNode;
};

export function Link({ to, replace, children, onClick, ...rest }: LinkProps) {
  const navigate = useNavigate();
  const href = `${HASH_PREFIX}${to}`;
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || rest.target === '_blank' || rest.download != null) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to, { replace });
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

type NavLinkProps = Omit<LinkProps, 'className' | 'children'> & {
  className?: string | ((args: { isActive: boolean }) => string);
  activeClassName?: string;
  children?: React.ReactNode | ((args: { isActive: boolean }) => React.ReactNode);
};

export function NavLink({ to, className, activeClassName, children, ...rest }: NavLinkProps) {
  const ctx = useContext(RouterContext);
  const currentPath = ctx?.path || '';
  const qIndex = currentPath.indexOf('?');
  const pathOnly = qIndex >= 0 ? currentPath.slice(0, qIndex) : currentPath;
  const isActive = pathOnly === to || pathOnly.startsWith(to + '/');

  let cls = '';
  if (typeof className === 'function') {
    cls = className({ isActive });
  } else {
    cls = [className || '', isActive ? activeClassName || '' : ''].filter(Boolean).join(' ');
  }

  const childContent = typeof children === 'function' ? children({ isActive }) : children;

  return (
    <Link to={to} className={cls || undefined} aria-current={isActive ? 'page' : undefined} {...rest}>
      {childContent}
    </Link>
  );
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const navigate = useNavigate();
  const didRef = useRef(false);
  useEffect(() => {
    if (didRef.current) return;
    didRef.current = true;
    navigate(to, { replace });
  }, [to, replace, navigate]);
  return null;
}

/**
 * Convenience hook used by the original app's Layout to programmatically
 * navigate by view id (e.g. onNavigate('forum')).
 */
export function useViewNavigator() {
  const navigate = useNavigate();
  return useCallback((viewId: string) => {
    navigate('/' + viewId);
  }, [navigate]);
}
