import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'tip';

type StatusFlyoutProps = {
    message: string | null;
    variant?: StatusVariant;
};

const AUTO_HIDE_MS = 5000;

const AUTO_HIDE_VARIANTS: StatusVariant[] = ['success', 'tip'];

const VARIANTS: Record<StatusVariant, string> = {
    success:
        'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    warning:
        'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
    danger: 'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
    tip: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100',
};

const CLOSE_VARIANTS: Record<StatusVariant, string> = {
    success:
        'text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-100',
    warning:
        'text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100',
    danger: 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-100',
    tip: 'text-sky-600 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-100',
};

/**
 * Transient status messages, shown as a flyout floating over the top of the
 * viewport rather than occupying space at the top of the page.
 */
export default function StatusFlyout({
    message,
    variant = 'success',
}: StatusFlyoutProps) {
    const { t } = useTranslation();
    const [dismissed, setDismissed] = useState(false);

    // A fresh visit may carry the same message again (e.g. saving twice), so
    // reset the dismissed state whenever a visit succeeds.
    useEffect(() => {
        return router.on('success', () => setDismissed(false));
    }, []);

    useEffect(() => {
        if (!message || !AUTO_HIDE_VARIANTS.includes(variant)) {
            return;
        }

        const timer = window.setTimeout(() => setDismissed(true), AUTO_HIDE_MS);

        return () => window.clearTimeout(timer);
    }, [message, variant]);

    if (!message || dismissed) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
            <div
                role={
                    variant === 'danger' || variant === 'warning'
                        ? 'alert'
                        : 'status'
                }
                className={cn(
                    'pointer-events-auto flex w-full max-w-md items-start justify-between gap-4 rounded-md border px-3 py-2 text-sm shadow-lg',
                    VARIANTS[variant],
                )}
            >
                <span>{message}</span>
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    aria-label={t('common.close')}
                    className={cn(
                        'shrink-0 leading-none transition',
                        CLOSE_VARIANTS[variant],
                    )}
                >
                    ×
                </button>
            </div>
        </div>
    );
}
