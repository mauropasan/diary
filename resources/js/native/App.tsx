import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomNav } from '@/native/components/BottomNav';
import { TopBar } from '@/native/components/TopBar';
import { useSession } from '@/native/hooks';
import { noteActivity } from '@/native/session';
import { useRoute } from '@/native/router';
import SetupWizard from '@/native/screens/SetupWizard';
import LockScreen from '@/native/screens/LockScreen';
import DiaryScreen from '@/native/screens/DiaryScreen';
import NotesScreen from '@/native/screens/NotesScreen';
import ScheduleScreen from '@/native/screens/ScheduleScreen';
import MoodScreen from '@/native/screens/MoodScreen';
import SettingsScreen from '@/native/screens/SettingsScreen';
import ExportScreen from '@/native/screens/ExportScreen';

/** Any interaction restarts the inactivity countdown of the diary lock. */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

function BootSplash(): React.JSX.Element {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-zinc-50 text-zinc-400 dark:bg-black dark:text-zinc-600">
            <span className="animate-pulse text-sm tracking-wide">
                Diario
            </span>
        </div>
    );
}

function screenFor(path: string): React.JSX.Element {
    if (path === '/' || path === '' || path === '/diary') {
        return <DiaryScreen />;
    }

    if (path.startsWith('/diary/')) {
        return <DiaryScreen />;
    }

    if (path.startsWith('/notes')) {
        return <NotesScreen />;
    }

    if (path.startsWith('/schedule')) {
        return <ScheduleScreen />;
    }

    if (path.startsWith('/mood')) {
        return <MoodScreen />;
    }

    if (path.startsWith('/settings/export')) {
        return <ExportScreen />;
    }

    if (path.startsWith('/settings')) {
        return <SettingsScreen />;
    }

    return <DiaryScreen />;
}

function titleFor(path: string, t: (key: string) => string): string {
    if (path.startsWith('/notes')) return t('notes.title');
    if (path.startsWith('/schedule')) return t('schedule.title');
    if (path.startsWith('/mood')) return t('mood.title');
    if (path.startsWith('/settings/export')) return t('export.title');
    if (path.startsWith('/settings')) return t('settings.title');

    return t('nav.today');
}

/**
 * The unlocked application: top bar + current screen + bottom navigation.
 * A screen below its tab root (`/notes/…`, `/settings/…`) gets a back arrow.
 */
function Shell(): React.JSX.Element {
    const route = useRoute();
    const { t } = useTranslation();

    useEffect(() => {
        const onActivity = (): void => noteActivity();

        for (const event of ACTIVITY_EVENTS) {
            document.addEventListener(event, onActivity, { passive: true });
        }

        return () => {
            for (const event of ACTIVITY_EVENTS) {
                document.removeEventListener(event, onActivity);
            }
        };
    }, []);

    const showBack = route.segments.length > 1;

    return (
        <div className="flex min-h-dvh flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
            <TopBar
                title={titleFor(route.path, t)}
                showBack={showBack}
                onBack={() => route.back('/diary')}
            />
            <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-24 pt-3 sm:px-4">
                {screenFor(route.path)}
            </main>
            <BottomNav />
        </div>
    );
}

/**
 * Top-level switch between the four things the app can be: booting, first
 * run (setup), locked, and the diary itself.
 */
export default function NativeApp(): React.JSX.Element {
    const { phase, error } = useSession();

    useEffect(() => {
        // A session that could not open its key material lands back in setup
        // with an explanation instead of a silent blank slate.
        if (phase === 'setup' && error !== null) {
            console.warn(error);
        }
    }, [phase, error]);

    if (phase === 'boot') {
        return <BootSplash />;
    }

    if (phase === 'setup') {
        return <SetupWizard />;
    }

    if (phase === 'locked') {
        return <LockScreen />;
    }

    if (phase === 'broken') {
        return <BootSplash />;
    }

    return <Shell />;
}

export { BootSplash };
