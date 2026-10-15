import { Head, router } from '@inertiajs/react';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    max,
    min,
    parseISO,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subDays,
} from 'date-fns';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DiaryNav from '@/components/DiaryNav';
import { useMediaQuery } from '@/hooks/use-media-query';
import { formatDay, formatDayMonth, formatMonthYear } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { show as diaryShow } from '@/routes/diary';

const MOOD_COLORS: Record<number, string> = {
    1: 'bg-red-500',
    2: 'bg-orange-400',
    3: 'bg-amber-400',
    4: 'bg-lime-500',
    5: 'bg-emerald-500',
};

const RANGES = [3, 7] as const;

const RANGE_LABELS: Record<(typeof RANGES)[number], string> = {
    3: 'mood.rangeThree',
    7: 'mood.rangeWeek',
};

type Range = (typeof RANGES)[number];

type MoodPoint = {
    date: string;
    mood: number;
};

type MoodProps = {
    month: string;
    moods: MoodPoint[];
    canGoNext: boolean;
    days: number;
    streak: number;
};

export default function Mood({
    month,
    moods,
    canGoNext,
    days: loggedDays,
    streak,
}: MoodProps) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const [loading, setLoading] = useState(false);
    const [range, setRange] = useState<Range>(7);
    const [offset, setOffset] = useState(0);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const isNarrow = useMediaQuery('(max-width: 639px)');

    const visibleMonth = parseISO(`${month}-01`);
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    /**
     * On mobile the month is too wide for a readable bar per day, so we render
     * a sliding window of `range` days ending at the most recent day (today for
     * the current month, the last day for past months). The arrows move it
     * towards the start of the month.
     */
    const homeEnd = min([monthEnd, startOfDay(new Date())]);
    let windowEnd = subDays(homeEnd, offset * range);
    let windowStart = max([subDays(windowEnd, range - 1), monthStart]);

    if (range === 7) {
        const targetEnd = subDays(homeEnd, offset * range);
        windowStart = startOfWeek(targetEnd, { weekStartsOn: 1 });
        windowEnd = endOfWeek(targetEnd, { weekStartsOn: 1 });
        if (windowEnd > homeEnd) {
            windowEnd = homeEnd;
        }
        if (windowStart < monthStart) {
            windowStart = monthStart;
        }
        if (windowStart > windowEnd) {
            windowEnd = windowStart;
        }
    }

    const windowDays = eachDayOfInterval({
        start: windowStart,
        end: windowEnd,
    });

    useEffect(() => {
        setOffset(0);
    }, [month, range]);

    const byDate = new Map(moods.map((point) => [point.date, point.mood]));

    const visibleDays = isNarrow ? windowDays : days;
    const visibleMoods = visibleDays
        .map((day) => byDate.get(format(day, 'yyyy-MM-dd')))
        .filter((mood): mood is number => mood !== undefined);
    const average =
        visibleMoods.length > 0
            ? visibleMoods.reduce((total, mood) => total + mood, 0) /
              visibleMoods.length
            : null;

    const canGoEarlier = isNarrow && windowStart > monthStart;
    const canGoLater = isNarrow && offset > 0;

    const frequency = new Map<number, number>();
    for (const m of visibleMoods) {
        frequency.set(m, (frequency.get(m) ?? 0) + 1);
    }
    let mostFrequent: number | null = null;
    let maxFreq = 0;
    for (const [m, f] of frequency.entries()) {
        if (f > maxFreq || (f === maxFreq && mostFrequent === null)) {
            maxFreq = f;
            mostFrequent = m;
        }
    }

    function loadMonth(target: Date): void {
        setLoading(true);

        router.reload({
            only: ['month', 'moods', 'canGoNext'],
            data: { mes: format(target, 'yyyy-MM') },
            onFinish: () => setLoading(false),
        });
    }

    return (
        <>
            <Head title={t('mood.title')} />

            <div className="min-h-screen text-[#1b1b18] dark:text-[#EDEDEC]">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                {t('common.brand')}
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {t('mood.title')}
                            </h1>
                        </div>

                        <DiaryNav />
                    </header>

                    <div className="mb-6 flex w-full items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                loadMonth(addMonths(visibleMonth, -1))
                            }
                            aria-label={t('calendar.previousMonth')}
                            className="rounded-md px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        >
                            ‹
                        </button>

                        <div className="text-center">
                            <p className="text-sm font-medium text-zinc-700 capitalize dark:text-zinc-200">
                                {formatMonthYear(visibleMonth, locale)}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                {average !== null
                                    ? t('mood.average', {
                                          count: visibleMoods.length,
                                          average: average.toFixed(1),
                                      })
                                    : isNarrow
                                      ? t('mood.noDataRange')
                                      : t('mood.noData')}
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={!canGoNext}
                            onClick={() =>
                                loadMonth(addMonths(visibleMonth, 1))
                            }
                            aria-label={t('calendar.nextMonth')}
                            className={cn(
                                'rounded-md px-2 py-1 text-sm transition',
                                canGoNext
                                    ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                                    : 'cursor-not-allowed text-zinc-300 dark:text-zinc-700',
                            )}
                        >
                            ›
                        </button>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-lg border border-zinc-200 bg-white p-2 text-center dark:border-zinc-800 dark:bg-zinc-900">
                            <p className="text-xs text-zinc-700 dark:text-zinc-300">
                                {t('mood.summary.days')}
                            </p>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {loggedDays}
                            </p>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-white p-2 text-center dark:border-zinc-800 dark:bg-zinc-900">
                            <p className="text-xs text-zinc-700 dark:text-zinc-300">
                                {t('mood.summary.average')}
                            </p>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {average !== null ? average.toFixed(1) : '—'}
                            </p>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-white p-2 text-center dark:border-zinc-800 dark:bg-zinc-900">
                            <p className="text-xs text-zinc-700 dark:text-zinc-300">
                                {t('mood.summary.mostFrequent')}
                            </p>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {mostFrequent !== null
                                    ? t(`editor.moods.${mostFrequent}`)
                                    : '—'}
                            </p>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-white p-2 text-center dark:border-zinc-800 dark:bg-zinc-900">
                            <p className="text-xs text-zinc-700 dark:text-zinc-300">
                                {t('mood.summary.streak')}
                            </p>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {streak}
                            </p>
                        </div>
                    </div>

                    <div className="mb-4 flex items-center justify-center gap-2">
                        <div
                            role="group"
                            aria-label={t('mood.rangeLabel')}
                            className="flex overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <button
                                type="button"
                                onClick={() => setView('chart')}
                                aria-pressed={view === 'chart'}
                                className={cn(
                                    'px-2.5 py-1 text-xs whitespace-nowrap transition',
                                    view === 'chart'
                                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                        : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
                                )}
                            >
                                {t('mood.viewChart')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('table')}
                                aria-pressed={view === 'table'}
                                className={cn(
                                    'px-2.5 py-1 text-xs whitespace-nowrap transition',
                                    view === 'table'
                                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                        : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
                                )}
                            >
                                {t('mood.viewTable')}
                            </button>
                        </div>
                    </div>

                    {isNarrow && (
                        <div className="mb-4 flex w-full items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setOffset((value) => value + 1)}
                                disabled={!canGoEarlier}
                                aria-label={t('mood.rangePrev')}
                                className={cn(
                                    'shrink-0 rounded-md px-2 py-1 text-sm transition',
                                    canGoEarlier
                                        ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                                        : 'cursor-not-allowed text-zinc-300 dark:text-zinc-700',
                                )}
                            >
                                ‹
                            </button>

                            <div
                                role="group"
                                aria-label={t('mood.rangeLabel')}
                                className="flex overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                {RANGES.map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setRange(value)}
                                        aria-pressed={range === value}
                                        className={cn(
                                            'px-2.5 py-1 text-xs whitespace-nowrap transition',
                                            range === value
                                                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                                : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
                                        )}
                                    >
                                        {t(RANGE_LABELS[value])}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setOffset((value) => Math.max(0, value - 1))
                                }
                                disabled={!canGoLater}
                                aria-label={t('mood.rangeNext')}
                                className={cn(
                                    'shrink-0 rounded-md px-2 py-1 text-sm transition',
                                    canGoLater
                                        ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                                        : 'cursor-not-allowed text-zinc-300 dark:text-zinc-700',
                                )}
                            >
                                ›
                            </button>
                        </div>
                    )}

                    <div
                        className={cn(
                            'w-full rounded-lg border border-zinc-200 bg-white p-4 transition dark:border-zinc-800 dark:bg-zinc-900',
                            loading && 'opacity-50',
                        )}
                    >
                        {view === 'chart' ? (
                            <div
                                className={cn(
                                    'flex items-end gap-1',
                                    isNarrow && 'justify-center',
                                )}
                            >
                                {visibleDays.map((day) => {
                                    const iso = format(day, 'yyyy-MM-dd');
                                    const mood = byDate.get(iso);
                                    const label =
                                        mood !== undefined
                                            ? t('mood.dayWithMood', {
                                                  date: formatDayMonth(
                                                      day,
                                                      locale,
                                                  ),
                                                  mood: t(
                                                      `editor.moods.${mood}`,
                                                  ),
                                              })
                                            : formatDayMonth(day, locale);

                                    return (
                                        <div
                                            key={iso}
                                            title={label}
                                            className="flex flex-1 flex-col items-center gap-1"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.visit(
                                                        diaryShow.url(iso),
                                                    )
                                                }
                                                className="flex h-40 w-full items-end"
                                                aria-label={label}
                                            >
                                                <div
                                                    className={cn(
                                                        'w-full rounded-t',
                                                        mood !== undefined
                                                            ? (MOOD_COLORS[
                                                                  mood
                                                              ] ??
                                                                  'bg-zinc-400')
                                                            : 'bg-zinc-100 dark:bg-zinc-800',
                                                    )}
                                                    style={{
                                                        height:
                                                            mood !== undefined
                                                                ? `${(mood / 5) * 100}%`
                                                                : '4px',
                                                    }}
                                                />
                                            </button>
                                            <span className="text-[10px] text-zinc-600 tabular-nums dark:text-zinc-400">
                                                {formatDay(day, locale)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-zinc-700 dark:text-zinc-300">
                                            <th className="pb-2 font-normal">
                                                {t('mood.table.date')}
                                            </th>
                                            <th className="pb-2 font-normal">
                                                {t('mood.table.day')}
                                            </th>
                                            <th className="pb-2 font-normal">
                                                {t('mood.table.mood')}
                                            </th>
                                            <th className="pb-2 font-normal">
                                                {t('mood.table.entry')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleDays.map((day) => {
                                            const iso = format(
                                                day,
                                                'yyyy-MM-dd',
                                            );
                                            const mood = byDate.get(iso);
                                            return (
                                                <tr
                                                    key={iso}
                                                    className="border-t border-zinc-200 dark:border-zinc-800"
                                                >
                                                    <td className="py-1.5 text-zinc-700 dark:text-zinc-300">
                                                        {formatDayMonth(
                                                            day,
                                                            locale,
                                                        )}
                                                    </td>
                                                    <td className="py-1.5 text-zinc-700 dark:text-zinc-300">
                                                        {new Intl.DateTimeFormat(
                                                            locale,
                                                            { weekday: 'long' },
                                                        ).format(day)}
                                                    </td>
                                                    <td className="py-1.5 text-zinc-700 dark:text-zinc-300">
                                                        {mood !== undefined
                                                            ? t(
                                                                  `editor.moods.${mood}`,
                                                              )
                                                            : '—'}
                                                    </td>
                                                    <td className="py-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                router.visit(
                                                                    diaryShow.url(
                                                                        iso,
                                                                    ),
                                                                )
                                                            }
                                                            className="text-xs text-zinc-600 underline-offset-2 transition hover:underline dark:text-zinc-300"
                                                        >
                                                            {t(
                                                                'mood.entryLink',
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <ul className="mt-4 flex w-full flex-wrap gap-3 text-xs text-zinc-700 dark:text-zinc-300">
                        {[1, 2, 3, 4, 5].map((value) => (
                            <li
                                key={value}
                                className="flex items-center gap-1.5"
                            >
                                <span
                                    className={cn(
                                        'h-2.5 w-2.5 rounded-full',
                                        MOOD_COLORS[value],
                                    )}
                                />
                                {t(`editor.moods.${value}`)}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );
}
