import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'appearance';

function getStoredAppearance(): Appearance | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
    }

    return null;
}

function systemPrefersDark(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function isDark(appearance: Appearance): boolean {
    return appearance === 'system'
        ? systemPrefersDark()
        : appearance === 'dark';
}

/**
 * Toggle the `dark` class and the CSS `color-scheme` on the root element so
 * both our own utilities and native controls follow the chosen appearance.
 */
function applyAppearance(appearance: Appearance): void {
    const dark = isDark(appearance);

    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

/**
 * Light/dark/system appearance, persisted in `localStorage` and kept in sync
 * with the operating system while `system` is selected. The matching no-flash
 * script lives in `resources/views/app.blade.php`.
 */
export function useAppearance(): {
    appearance: Appearance;
    setAppearance: (appearance: Appearance) => void;
} {
    const [appearance, setAppearanceState] = useState<Appearance>(
        () => getStoredAppearance() ?? 'system',
    );

    useEffect(() => {
        applyAppearance(appearance);
    }, [appearance]);

    useEffect(() => {
        if (appearance !== 'system') {
            return;
        }

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (): void => applyAppearance('system');

        media.addEventListener('change', onChange);

        return () => media.removeEventListener('change', onChange);
    }, [appearance]);

    function setAppearance(next: Appearance): void {
        setAppearanceState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
    }

    return { appearance, setAppearance };
}
