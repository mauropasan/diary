import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query and re-render when it changes. Client-side
 * only: `window.matchMedia` is guarded so SSR builds do not break.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() =>
        typeof window === 'undefined'
            ? false
            : window.matchMedia(query).matches,
    );

    useEffect(() => {
        const media = window.matchMedia(query);
        const onchange = (event: MediaQueryListEvent): void =>
            setMatches(event.matches);

        setMatches(media.matches);
        media.addEventListener('change', onchange);

        return () => media.removeEventListener('change', onchange);
    }, [query]);

    return matches;
}
