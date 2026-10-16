import type { PendingVisit } from '@inertiajs/core';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { addDays, format } from 'date-fns';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DiaryCalendar from '@/components/DiaryCalendar';
import DiaryEditor, { type DiaryEditorHandle } from '@/components/DiaryEditor';
import DiaryNav from '@/components/DiaryNav';
import FlashBanner from '@/components/FlashBanner';
import LockScreen from '@/components/LockScreen';
import NoteCard from '@/components/NoteCard';
import RecoveryKeyBanner from '@/components/RecoveryKeyBanner';
import ScheduleGrid from '@/components/ScheduleGrid';
import { formatLongDate, formatLongDay, formatMonthYear } from '@/lib/dates';
import { lockDiary } from '@/lib/lockDiary';
import { useInactivityLock } from '@/lib/useInactivityLock';
import { home, logout } from '@/routes';
import { lock as diaryLock, show as diaryShow } from '@/routes/diary';

type Memory = {
    date: string;
    title: string | null;
};

type DayNote = {
    id: number;
    title: string | null;
    body: string | null;
    color: string;
    kind: string;
    date: string | null;
    background_image: string | null;
};

type Schedule = {
    id: number;
    name: string;
    slots: string | null;
    only_weekdays: boolean;
};

type EntryProps = {
    date: string;
    entry: {
        title: string | null;
        content: string | null;
        mood: number | null;
    };
    canGoNext: boolean;
    calendar: string[];
    calendarMonth: string;
    tags: string[];
    memories: Memory[];
    prompt: string;
    streak: {
        current: number;
        longest: number;
    };
    notes: DayNote[];
    upcomingNotes: DayNote[];
    schedules: Schedule[];
};

export default function Show({
    date,
    entry,
    canGoNext,
    calendar,
    calendarMonth,
    tags,
    memories,
    prompt,
    streak,
    notes,
    upcomingNotes,
    schedules,
}: EntryProps) {
    const editorRef = useRef<DiaryEditorHandle>(null);
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const [locked, setLocked] = useState(false);
    const [flashDismissed, setFlashDismissed] = useState(false);
    const [recoveryKeyDismissed, setRecoveryKeyDismissed] = useState(false);
    const { diary, flash } = usePage().props;

    const remaining = useInactivityLock({
        lockAfterMinutes: diary.lockAfterMinutes,
        onWarning: () => {
            void editorRef.current?.flushSave().catch(() => {
                /* lock anyway; unsaved edits stay in the editor */
            });
        },
        onLock: () => {
            void editorRef.current
                ?.flushSave()
                .catch(() => {
                    /* lock anyway; the session key must not outlive the idle window */
                })
                .then(() => {
                    lockDiary(diaryLock.url());
                    setLocked(true);
                });
        },
    });

    const day = new Date(`${date}T12:00:00`);
    const previous = format(addDays(day, -1), 'yyyy-MM-dd');
    const next = format(addDays(day, 1), 'yyyy-MM-dd');

    function navigateTo(target: string): void {
        void editorRef.current
            ?.flushSave()
            .then(() => router.visit(diaryShow.url(target)))
            .catch(() => {
                /* save failed: stay on the page so the error is visible */
            });
    }

    function logoutNow(): void {
        void editorRef.current
            ?.flushSave()
            .then(() => router.post(logout.url()))
            .catch(() => {
                /* save failed: do not log out */
            });
    }

    function lockNow(): void {
        void editorRef.current
            ?.flushSave()
            .then(() => router.post(diaryLock.url()))
            .catch(() => {
                /* save failed: do not lock */
            });
    }

    function flushBeforeVisit(visit: PendingVisit): boolean | void {
        const handle = editorRef.current;

        if (!handle) {
            return;
        }

        void handle
            .flushSave()
            .then(() => router.visit(visit.url.href))
            .catch(() => {
                /* save failed: cancel navigation and keep the editor state */
            });

        return false;
    }

    function formatCountdown(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const rest = seconds % 60;

        return `${minutes}:${rest.toString().padStart(2, '0')}`;
    }

    const upcomingLimit = 3;
    const [upcomingPage, setUpcomingPage] = useState(0);
    const hasMoreUpcoming = upcomingNotes.length > upcomingLimit;
    const visibleUpcoming = hasMoreUpcoming
        ? upcomingNotes.slice(
              upcomingPage * upcomingLimit,
              (upcomingPage + 1) * upcomingLimit,
          )
        : upcomingNotes;
    const totalUpcomingPages = hasMoreUpcoming
        ? Math.ceil(upcomingNotes.length / upcomingLimit)
        : 1;
    const canPrevUpcoming = upcomingPage > 0;
    const canNextUpcoming = upcomingPage < totalUpcomingPages - 1;

    return (
        <>
            <Head title={formatLongDay(day, locale)} />

            <div className="min-h-screen text-[#1b1b18] dark:text-[#EDEDEC]">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    {flash.recoveryKey && !recoveryKeyDismissed && (
                        <RecoveryKeyBanner
                            title={t('show.recoveryTitle')}
                            intro={t('show.recoveryIntro')}
                            code={flash.recoveryKey}
                            onClose={() => setRecoveryKeyDismissed(true)}
                        />
                    )}

                    {flash.status && !flashDismissed && (
                        <FlashBanner
                            message={flash.status}
                            onClose={() => setFlashDismissed(true)}
                        />
                    )}

                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                {formatMonthYear(day, locale)}
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {formatLongDay(day, locale)}
                            </h1>
                            {streak.current > 0 && (
                                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                                    {t('show.streakDays', {
                                        count: streak.current,
                                    })}
                                    {streak.longest > streak.current &&
                                        t('show.streakRecord', {
                                            count: streak.longest,
                                        })}
                                </p>
                            )}
                            {remaining > 0 && remaining <= 120 && (
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                    {t('show.lockCountdown', {
                                        time: formatCountdown(remaining),
                                    })}
                                </p>
                            )}
                        </div>

                        <DiaryNav
                            onBeforeNavigate={flushBeforeVisit}
                            onLogout={logoutNow}
                            onLock={lockNow}
                        />
                    </header>

                    <div className="mb-8 flex items-center justify-between gap-3 sm:justify-start">
                        <button
                            type="button"
                            onClick={() => navigateTo(previous)}
                            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                            {t('show.previous')}
                        </button>

                        {canGoNext && (
                            <button
                                type="button"
                                onClick={() => navigateTo(next)}
                                className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                            >
                                {t('show.next')}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                void editorRef.current
                                    ?.flushSave()
                                    .then(() => router.visit(home.url()))
                                    .catch(() => {
                                        /* save failed: stay on the page */
                                    });
                            }}
                            className="rounded-md px-3 py-1.5 text-sm text-zinc-700 underline-offset-2 transition hover:underline dark:text-zinc-300"
                        >
                            {t('nav.today')}
                        </button>
                    </div>

                    <main className="flex flex-col gap-8 lg:flex-row">
                        <div className="flex flex-1 flex-col gap-8">
                            {schedules.map((schedule) => (
                                <section
                                    key={schedule.id}
                                    className="rounded-lg border border-zinc-200 bg-green-50 p-4 dark:border-zinc-800 dark:bg-green-950"
                                >
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                                            {t('schedule.active')}
                                        </span>
                                        <h2 className="text-sm font-medium text-green-800 dark:text-green-200">
                                            {schedule.name}
                                        </h2>
                                    </div>
                                    <ScheduleGrid
                                        slots={schedule.slots}
                                        onlyWeekdays={schedule.only_weekdays}
                                    />
                                </section>
                            ))}

                            {!entry.content && prompt && (
                                <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
                                    <span className="font-medium text-zinc-600 dark:text-zinc-300">
                                        {t('show.suggestion')}
                                    </span>{' '}
                                    {prompt}
                                </p>
                            )}

                            <DiaryEditor
                                date={date}
                                initialTitle={entry.title}
                                initialContent={entry.content}
                                initialMood={entry.mood}
                                initialTags={tags}
                                handleRef={editorRef}
                            />
                        </div>

                        <div className="flex shrink-0 flex-col gap-4 lg:w-72">
                            <DiaryCalendar
                                date={date}
                                month={calendarMonth}
                                entryDates={calendar}
                                onNavigate={navigateTo}
                            />

                            {notes.length > 0 && (
                                <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                                    <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        {t('show.notesTitle')}
                                    </h2>

                                    <ul className="flex flex-col gap-3">
                                        {notes.map((note) => (
                                            <NoteCard
                                                key={note.id}
                                                note={note}
                                            />
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {upcomingNotes.length > 0 && (
                                <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                                    <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        {t('show.upcomingTitle')}
                                    </h2>

                                    <ul className="flex flex-col gap-3">
                                        {visibleUpcoming.map((note) => (
                                            <NoteCard
                                                key={note.id}
                                                note={note}
                                                showDate
                                            />
                                        ))}
                                    </ul>

                                    {hasMoreUpcoming && (
                                        <div className="mt-3 flex items-center justify-between">
                                            <button
                                                type="button"
                                                disabled={!canPrevUpcoming}
                                                onClick={() =>
                                                    setUpcomingPage(
                                                        (page) => page - 1,
                                                    )
                                                }
                                                className="rounded-md px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                            >
                                                {t('show.previous')}
                                            </button>
                                            <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                                {upcomingPage + 1} /{' '}
                                                {totalUpcomingPages}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={!canNextUpcoming}
                                                onClick={() =>
                                                    setUpcomingPage(
                                                        (page) => page + 1,
                                                    )
                                                }
                                                className="rounded-md px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                            >
                                                {t('show.next')}
                                            </button>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    </main>

                    {memories.length > 0 && (
                        <section className="mt-8">
                            <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                {t('show.onThisDay')}
                            </h2>

                            <ul className="flex flex-col gap-2">
                                {memories.map((memory) => (
                                    <li key={memory.date}>
                                        <Link
                                            href={diaryShow.url(memory.date)}
                                            onBefore={flushBeforeVisit}
                                            className="group flex items-baseline gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                                        >
                                            <span className="shrink-0 text-zinc-700 dark:text-zinc-300">
                                                {formatLongDate(
                                                    memory.date,
                                                    locale,
                                                )}
                                            </span>
                                            {memory.title && (
                                                <span className="truncate font-medium text-zinc-800 group-hover:underline dark:text-zinc-100">
                                                    {memory.title}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            </div>

            {locked && <LockScreen onUnlocked={() => setLocked(false)} />}
        </>
    );
}
