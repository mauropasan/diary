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
};

export default function Mood({ month, moods, canGoNext }: MoodProps) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const [loading, setLoading] = useState(false);
    const [range, setRange] = useState<Range>(7);
    const [offset, setOffset] = useState(0);
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

            <div className="min-h-screen bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <div className="w-full px-6 py-8">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
                            className="rounded-md px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        >
                            ‹
                        </button>

                        <div className="text-center">
                            <p className="text-sm font-medium text-zinc-700 capitalize dark:text-zinc-200">
                                {formatMonthYear(visibleMonth, locale)}
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">
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
                                    ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                                    : 'cursor-not-allowed text-zinc-300 dark:text-zinc-700',
                            )}
                        >
                            ›
                        </button>
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
                                        ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                                        : 'cursor-not-allowed text-zinc-300 dark:text-zinc-700',
                                )}
                            >
                                ‹
                            </button>

                            <div
                                role="group"
                                aria-label={t('mood.rangeLabel')}
                                className="flex overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800"
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
                                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
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
                                        ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                                        : 'cursor-not-allowed text-zinc-300 dark:text-zinc-700',
                                )}
                            >
                                ›
                            </button>
                        </div>
                    )}

                    <div
                        className={cn(
                            'w-full rounded-lg border border-zinc-200 p-4 transition dark:border-zinc-800',
                            loading && 'opacity-50',
                        )}
                    >
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
                                              date: formatDayMonth(day, locale),
                                              mood: t(`editor.moods.${mood}`),
                                          })
                                        : formatDayMonth(day, locale);

                                return (
                                    <div
                                        key={iso}
                                        title={label}
                                        className={cn(
                                            'flex flex-col items-center gap-1',
                                            isNarrow && range === 3
                                                ? 'flex-1'
                                                : 'flex-1',
                                        )}
                                    >
                                        <div className="flex h-40 w-full items-end">
                                            <div
                                                className={cn(
                                                    'w-full rounded-t',
                                                    mood !== undefined
                                                        ? (MOOD_COLORS[mood] ??
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
                                        </div>
                                        <span className="text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
                                            {formatDay(day, locale)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <ul className="mt-4 flex w-full flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
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
