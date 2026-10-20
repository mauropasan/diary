import { useTranslation } from 'react-i18next';
import { navigate, useRoute } from '@/native/router';
import { useSyncState } from '@/native/hooks';
import { syncNow } from '@/native/sync';
import {
    ArrowBackIcon,
    CloudDoneIcon,
    CloudOffIcon,
    SyncIcon,
} from '@/native/components/icons';

/**
 * The status chip in the top bar: one glance tells whether the diary is in
 * sync, syncing, or offline (which is a normal state, not an error). Tapping
 * it runs a sync by hand.
 */
export function SyncChip(): React.JSX.Element | null {
    const { t } = useTranslation();
    const { running, offline, lastSyncAt } = useSyncState();

    let icon = <CloudDoneIcon className="h-4 w-4" />;
    let label = lastSyncAt === null ? t('sync.never') : t('sync.synced');

    if (running) {
        icon = <SyncIcon className="h-4 w-4 animate-spin" />;
        label = t('sync.running');
    } else if (offline) {
        icon = <CloudOffIcon className="h-4 w-4" />;
        label = t('sync.offline');
    }

    return (
        <button
            type="button"
            onClick={() => void syncNow('manual')}
            aria-label={t('sync.action')}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/80 px-2.5 py-1 text-xs text-zinc-600 transition active:scale-95 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300"
        >
            {icon}
            <span className="max-w-24 truncate">{label}</span>
        </button>
    );
}

type TopBarProps = {
    title: string;
    showBack?: boolean;
    onBack?: () => void;
    /** Extra element on the right (defaults to the sync chip). */
    right?: React.JSX.Element;
};

/**
 * The native top app bar: optional back arrow, centered-or-start title and
 * the sync chip. Screens below a tab root get the back arrow automatically
 * from `Shell`.
 */
export function TopBar({
    title,
    showBack = false,
    onBack,
    right,
}: TopBarProps): React.JSX.Element {
    const { t } = useTranslation();

    return (
        <header className="sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b border-zinc-200/70 bg-white/90 px-2 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
            {showBack ? (
                <button
                    type="button"
                    onClick={onBack ?? (() => navigate('/diary'))}
                    aria-label={t('common.back')}
                    className="rounded-full p-2 transition hover:bg-zinc-100 active:scale-95 dark:hover:bg-zinc-800"
                >
                    <ArrowBackIcon className="h-5 w-5" />
                </button>
            ) : null}
            <h1 className="min-w-0 flex-1 truncate px-1 text-lg font-semibold tracking-tight">
                {title}
            </h1>
            {right ?? <SyncChip />}
        </header>
    );
}
