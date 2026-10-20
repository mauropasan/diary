import { useTranslation } from 'react-i18next';
import { navigate, useRoute } from '@/native/router';
import { cn } from '@/lib/utils';
import {
    DiaryIcon,
    EventIcon,
    MoodIcon,
    NotesIcon,
    SettingsIcon,
} from '@/native/components/icons';

const TABS = [
    { match: '/diary', path: '/diary', key: 'nav.today', Icon: DiaryIcon },
    { match: '/notes', path: '/notes', key: 'nav.notes', Icon: NotesIcon },
    { match: '/schedule', path: '/schedule', key: 'nav.schedule', Icon: EventIcon },
    { match: '/mood', path: '/mood', key: 'nav.mood', Icon: MoodIcon },
    { match: '/settings', path: '/settings', key: 'nav.settings', Icon: SettingsIcon },
] as const;

/**
 * The Android bottom navigation: five destinations, active tab highlighted,
 * one tap back to the tab root.
 */
export function BottomNav(): React.JSX.Element {
    const { t } = useTranslation();
    const route = useRoute();

    return (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
            <ul className="mx-auto flex max-w-lg">
                {TABS.map(({ match, path, key, Icon }) => {
                    const active =
                        route.path === match ||
                        route.path.startsWith(`${match}/`);

                    return (
                        <li key={match} className="flex-1">
                            <button
                                type="button"
                                onClick={() => navigate(path)}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'flex w-full flex-col items-center gap-0.5 px-1 py-2 text-[11px] transition',
                                    active
                                        ? 'text-zinc-900 dark:text-zinc-100'
                                        : 'text-zinc-500 dark:text-zinc-400',
                                )}
                            >
                                <span
                                    className={cn(
                                        'rounded-full px-4 py-1 transition',
                                        active &&
                                            'bg-zinc-900/10 dark:bg-zinc-100/15',
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                </span>
                                {t(key)}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
