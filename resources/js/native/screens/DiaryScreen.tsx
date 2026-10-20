import { addDays, format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatLongDay, formatLongDate, formatMonthYear } from '@/lib/dates';
import { noteSurface } from '@/lib/noteColors';
import { cn } from '@/lib/utils';
import Calendar from '@/native/components/Calendar';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
} from '@/native/components/icons';
import DayEditor from '@/native/editor/DayEditor';
import { useSession, useSyncState } from '@/native/hooks';
import { navigate, useRoute } from '@/native/router';
import {
    loadDiaryIndex,
    loadEntry,
    loadNotes,
    loadSchedules,
} from '@/native/repo';
import type {
    EntryRecord,
    NoteRecord,
    ScheduleRecord,
} from '@/native/types';
import ScheduleGrid from '@/components/ScheduleGrid';

/** Today as `yyyy-MM-dd`, in the device's own timezone. */
export function todayIso(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

type DayData = {
    entry: EntryRecord | null;
    notes: NoteRecord[];
    upcoming: NoteRecord[];
    schedules: ScheduleRecord[];
    days: { date: string; mood: number | null }[];
    streak: number;
};

const EMPTY_DAY: DayData = {
    entry: null,
    notes: [],
    upcoming: [],
    schedules: [],
    days: [],
    streak: 0,
};

/**
 * The diary day: the editor at the center, the calendar and context around
 * it. Every read comes from the local store, so the screen paints instantly
 * whether or not the server is reachable.
 */
export default function DiaryScreen(): React.JSX.Element {
    const { t, i18n } = useTranslation();
    const route = useRoute();
    const { phase } = useSession();
    const { lastSyncAt, offline } = useSyncState();

    const date = route.segments[1] ?? todayIso();
    const [data, setData] = useState<DayData>(EMPTY_DAY);

    const load = useCallback(async (target: string) => {
        const [entry, notes, index, schedules] = await Promise.all([
            loadEntry(target),
            loadNotes(),
            loadDiaryIndex(),
            loadSchedules(),
        ]);

        const today = todayIso();

        setData({
            entry,
            notes: notes.filter((note) => note.date === target),
            upcoming: notes
                .filter((note) => note.date !== null && note.date > today)
                .slice(0, 10),
            schedules: schedules.filter((schedule) => schedule.active),
            days: index.days,
            streak: index.streak,
        });
    }, []);

    useEffect(() => {
        if (phase !== 'unlocked') {
            return;
        }

        void load(date);
    }, [phase, date, load, lastSyncAt]);

    const goTo = useCallback(
        (target: string) => {
            if (target > todayIso()) {
                return;
            }

            navigate(`/diary/${target}`);
        },
        [],
    );

    const previous = format(addDays(new Date(`${date}T12:00:00`), -1), 'yyyy-MM-dd');
    const next = format(addDays(new Date(`${date}T12:00:00`), 1), 'yyyy-MM-dd');
    const day = new Date(`${date}T12:00:00`);

    return (
        <div className="flex flex-col gap-4">
            <header className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {formatMonthYear(day, i18n.language)}
                    </p>
                    <h2 className="truncate text-xl font-semibold tracking-tight">
                        {formatLongDay(day, i18n.language)}
                    </h2>
                    {data.streak > 0 && (
                        <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                            {t('show.streakDays', { count: data.streak })}
                        </p>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={() => goTo(previous)}
                        aria-label={t('show.previous')}
                        className="rounded-full p-2 text-zinc-700 transition hover:bg-zinc-100 active:scale-95 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => goTo(next)}
                        disabled={next > todayIso()}
                        aria-label={t('show.next')}
                        className="rounded-full p-2 text-zinc-700 transition hover:bg-zinc-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        <ChevronRightIcon className="h-5 w-5" />
                    </button>
                    {date !== todayIso() && (
                        <button
                            type="button"
                            onClick={() => navigate('/diary')}
                            className="rounded-full px-3 py-1.5 text-sm text-zinc-700 underline-offset-2 transition hover:underline dark:text-zinc-300"
                        >
                            {t('nav.today')}
                        </button>
                    )}
                </div>
            </header>

            {offline && (
                <p className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                    {t('sync.offline')} · {t('session.offlineHint')}
                </p>
            )}

            <Calendar
                date={date}
                entryDates={data.days.map((item) => item.date)}
                onNavigate={goTo}
            />

            {data.schedules.map((schedule) => (
                <section
                    key={schedule.localId}
                    className="rounded-lg border border-zinc-200 bg-green-50 p-3 dark:border-zinc-800 dark:bg-green-950"
                >
                    <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                            {t('schedule.active')}
                        </span>
                        <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                            {schedule.name}
                        </h3>
                    </div>
                    <ScheduleGrid
                        slots={schedule.slots}
                        onlyWeekdays={schedule.onlyWeekdays}
                        size="sm"
                    />
                </section>
            ))}

            <DayEditor key={date} date={date} entry={data.entry} />

            {data.notes.length > 0 && (
                <section className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {t('show.notesTitle')}
                    </h3>
                    <ul className="flex flex-col gap-2">
                        {data.notes.map((note) => (
                            <NoteListItem key={note.localId} note={note} />
                        ))}
                    </ul>
                </section>
            )}

            {data.upcoming.length > 0 && (
                <section className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {t('show.upcomingTitle')}
                    </h3>
                    <ul className="flex flex-col gap-2">
                        {data.upcoming.map((note) => (
                            <NoteListItem
                                key={note.localId}
                                note={note}
                                showDate
                            />
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}

/** One note as shown under the editor (day notes and upcoming ones). */
function NoteListItem({
    note,
    showDate = false,
}: {
    note: NoteRecord;
    showDate?: boolean;
}): React.JSX.Element {
    const { t, i18n } = useTranslation();
    const surface = noteSurface(note);

    return (
        <li
            className={cn(
                'rounded-lg border p-3',
                surface.className,
            )}
            style={surface.style}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {note.title || t('notes.untitled')}
                </p>
                {showDate && note.date !== null && (
                    <span className="shrink-0 text-xs text-zinc-700 dark:text-zinc-300">
                        {formatLongDate(note.date, i18n.language)}
                    </span>
                )}
            </div>
            {note.body && (
                <p className="mt-1 line-clamp-3 text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
                    {note.body}
                </p>
            )}
            <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                {t(`notes.kinds.${note.kind}`)}
            </p>
        </li>
    );
}
