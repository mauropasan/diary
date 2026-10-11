import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Appearance, useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

const OPTIONS: Appearance[] = ['light', 'dark', 'system'];

function SunIcon({ className }: { className?: string }): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M4.93 4.93l1.41 1.41" />
            <path d="M17.66 17.66l1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="M6.34 17.66l-1.41 1.41" />
            <path d="M19.07 4.93l-1.41 1.41" />
        </svg>
    );
}

function MoonIcon({ className }: { className?: string }): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
        </svg>
    );
}

function MonitorIcon({ className }: { className?: string }): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
    );
}

function AppearanceIcon({
    appearance,
    className,
}: {
    appearance: Appearance;
    className?: string;
}): React.JSX.Element {
    if (appearance === 'light') {
        return <SunIcon className={className} />;
    }

    if (appearance === 'dark') {
        return <MoonIcon className={className} />;
    }

    return <MonitorIcon className={className} />;
}

type ThemeSwitcherProps = {
    className?: string;
    layout?: 'compact' | 'list';
};

/**
 * Light/dark/system switcher. `compact` renders an icon button with a dropdown
 * (for the desktop nav); `list` renders a segmented control (for the mobile
 * menu, where a nested dropdown would fight the menu's overlay).
 */
export default function ThemeSwitcher({
    className,
    layout = 'compact',
}: ThemeSwitcherProps) {
    const { appearance, setAppearance } = useAppearance();
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        function onKeyDown(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        function onPointerDown(event: MouseEvent): void {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('mousedown', onPointerDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('mousedown', onPointerDown);
        };
    }, [open]);

    if (layout === 'list') {
        return (
            <div className="px-3 py-2">
                <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
                    {t('theme.label')}
                </p>
                <div className="flex gap-1">
                    {OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setAppearance(option)}
                            aria-pressed={appearance === option}
                            className={cn(
                                'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs transition',
                                appearance === option
                                    ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
                            )}
                        >
                            <AppearanceIcon
                                appearance={option}
                                className="h-3.5 w-3.5"
                            />
                            {t(`theme.${option}`)}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-label={t('theme.label')}
                title={t('theme.label')}
                className={className}
            >
                <AppearanceIcon appearance={appearance} className="h-4 w-4" />
            </button>

            {open && (
                <div className="absolute right-0 z-20 mt-2 w-40 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                    {OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => {
                                setAppearance(option);
                                setOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                        >
                            <AppearanceIcon
                                appearance={option}
                                className="h-4 w-4"
                            />
                            {t(`theme.${option}`)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
