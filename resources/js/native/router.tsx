import { useCallback, useEffect, useState } from 'react';

/**
 * A tiny hash router.
 *
 * The native app ships as one static bundle with no server routes, so the
 * URL is just the fragment (`#/diary/2026-10-20`). Hash routing also makes
 * the Android hardware back button behave naturally: popping the WebView's
 * history steps through visited screens, which we mirror for `navigate(-1)`.
 */

export type Route = {
    /** The matched path, e.g. `/diary/2026-10-20`. */
    path: string;
    /** The segments after the leading slash. */
    segments: string[];
    /** The raw query string, without `?`. */
    query: string;
};

function parseHash(hash: string): Route {
    const raw = hash.replace(/^#/, '') || '/';
    const [pathPart, queryPart] = raw.split('?', 2);
    const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
    const segments = path.split('/').filter((segment) => segment !== '');

    return { path, segments, query: queryPart ?? '' };
}

function currentRoute(): Route {
    return parseHash(typeof window === 'undefined' ? '' : window.location.hash);
}

const listeners = new Set<() => void>();

function emit(): void {
    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

export function navigate(to: string, replace = false): void {
    const target = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`;

    if (replace) {
        window.history.replaceState(null, '', target);
        emit();
        return;
    }

    if (window.location.hash === target) {
        return;
    }

    window.location.hash = target;
}

/** Step back through the screens visited in this session. */
export function goBack(fallback: string): void {
    if (window.history.length > 1) {
        window.history.back();
        return;
    }

    navigate(fallback, true);
}

if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', emit);
}

export function useRoute(): Route & {
    navigate: (to: string, replace?: boolean) => void;
    back: (fallback?: string) => void;
} {
    const [route, setRoute] = useState<Route>(currentRoute);

    useEffect(() => subscribe(() => setRoute(currentRoute())), []);

    const nav = useCallback(
        (to: string, replace?: boolean) => navigate(to, replace),
        [],
    );
    const back = useCallback(
        (fallback = '/diary') => goBack(fallback),
        [],
    );

    return { ...route, navigate: nav, back };
}

/** Current query parameter, or null. */
export function queryParam(route: Route, key: string): string | null {
    const value = new URLSearchParams(route.query).get(key);

    return value;
}
