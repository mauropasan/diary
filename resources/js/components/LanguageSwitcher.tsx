import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { persistLocale } from '@/i18n';
import {
    isSupportedLocale,
    LOCALE_NAMES,
    SUPPORTED_LOCALES,
} from '@/i18n/locales';

type LanguageSwitcherProps = {
    className?: string;
    compact?: boolean;
};

function GlobeIcon(): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
        </svg>
    );
}

/**
 * Language selector. Renders a native `select` by default, or a compact globe
 * button with a dropdown when `compact` is set. The choice is saved in a cookie
 * so the server picks it up on the next request.
 */
export default function LanguageSwitcher({
    className,
    compact = false,
}: LanguageSwitcherProps) {
    const { i18n: instance, t } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const current = isSupportedLocale(instance.language)
        ? instance.language
        : 'en';

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

    function choose(code: string): void {
        if (isSupportedLocale(code)) {
            persistLocale(code);
            void i18n.changeLanguage(code);
        }

        setOpen(false);
    }

    if (!compact) {
        return (
            <select
                aria-label={t('common.language')}
                value={current}
                onChange={(event) => choose(event.target.value)}
                className={className}
            >
                {SUPPORTED_LOCALES.map((code) => (
                    <option key={code} value={code}>
                        {LOCALE_NAMES[code]}
                    </option>
                ))}
            </select>
        );
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-label={t('common.language')}
                title={t('common.language')}
                className={className}
            >
                <GlobeIcon />
                <span className="text-[10px] font-semibold uppercase">
                    {current}
                </span>
            </button>

            {open && (
                <div className="absolute right-0 z-20 mt-2 w-40 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                    {SUPPORTED_LOCALES.map((code) => (
                        <button
                            key={code}
                            type="button"
                            onClick={() => choose(code)}
                            className="block w-full px-3 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                        >
                            {LOCALE_NAMES[code]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
