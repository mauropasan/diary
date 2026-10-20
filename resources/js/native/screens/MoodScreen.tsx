import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    format,
    isAfter,
    startOfMonth,
    subMonths,
} from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDayMonth, formatMonthYear } from '@/lib/dates';
import { cn } from '@/lib/utils';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
} from '@/native/components/icons';
import { useSession } from '@/native/hooks';
import { navigate } from '@/native/router';
import { loadDiaryIndex } from '@/native/repo';
import { todayIso } from '@/native/screens/DiaryScreen';

const MOOD_COLORS: Record<number, string> = {
    1: 'bg-red-500',
    2: 'bg-orange-400',
    3: 'bg-amber-400',
    4: 'bg-lime-500',
    5: 'bg-emerald-500',
};

/**
 * The mood chart: a bar per day of the month, colored by mood. The whole
 * projection (dates + moods) is a local index column, so the chart needs no
 * decryption and no server — the same data the web mood page gets from the
 * controller, computed on the device.
 */
export default function MoodScreen(): React.JSX.Element {
    const { t, i18n } = useTranslation();
    const { phase } = useSession();

    const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
    const [days, setDays] = useState<{ date: string; mood: number | null }[]>([]);
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        if (phase !== 'unlocked') {
            return;
        }

        void loadDiaryIndex().then((index) => {
            setDays(index.days);
            setStreak(index.streak);
        });
    }, [phase]);

    const monthStart = startOfMonth(new Date(`${month}-01T12:00:00`));
    const monthEnd = endOfMonth(monthStart);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const byDate = useMemo(
        () => new Map(days.map((item) => [item.date, item.mood])),
        [days],
    );

    const monthPoints = monthDays
        .map((day) => byDate.get(format(day, 'yyyy-MM-dd')))
        .filter((mood): mood is number => typeof mood === 'number');

    const average =
        monthPoints.length > 0
            ? monthPoints.reduce((total, mood) => total + mood, 0) /
              monthPoints.length
            : null;

    const frequency = new Map<number, number>();

    for (const mood of monthPoints) {
        frequency.set(mood, (frequency.get(mood) ?? 0) + 1);
    }

    let mostFrequent: number | null = null;
    let maxCount = 0;

    for (const [mood, count] of frequency.entries()) {
        if (count > maxCount || (count === maxCount && mostFrequent === null)) {
            maxCount = count;
            mostFrequent = mood;
        }
    }

    const canGoNext = !isAfter(startOfMonth(addMonths(monthStart, 1)), startOfMonth(new Date()));

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2">
                <button
                    type="button"
                    onClick={() => setMonth(format(subMonths(monthStart, 1), 'yyyy-MM'))}
                    aria-label={t('calendar.previousMonth')}
                    className="rounded-full p-2 text-zinc-700 transition hover:bg-zinc-100 active:scale-95 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                    <ChevronLeftIcon className="h-5 w-5" />
                </button>

                <div className="text-center">
                    <p className="text-sm font-medium capitalize text-zinc-700 dark:text-zinc-200">
                        {formatMonthYear(monthStart, i18n.language)}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {average !== null
                            ? t('mood.average', {
                                  count: monthPoints.length,
                                  average: average.toFixed(1),
                              })
                            : t('mood.noData')}
                    </p>
                </div>

                <button
                    type="button"
                    disabled={canGoNext}
                    onClick={() => setMonth(format(addMonths(monthStart, 1), 'yyyy-MM'))}
                    aria-label={t('calendar.nextMonth')}
                    className={cn(
                        'rounded-full p-2 transition active:scale-95',
                        canGoNext
                            ? 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                            : 'cursor-not-allowed text-zinc-300 dark:text-zinc-700',
                    )}
                >
                    <ChevronRightIcon className="h-5 w-5" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-zinc-200 bg-white p-2 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">
                        {t('mood.summary.days')}
                    </p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {monthPoints.length}
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

            <div className="w-full rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-end gap-0.5">
                    {monthDays.map((day) => {
                        const iso = format(day, 'yyyy-MM-dd');
                        const mood = byDate.get(iso);
                        const label =
                            mood !== undefined
                                ? t('mood.dayWithMood', {
                                      date: formatDayMonth(day, i18n.language),
                                      mood: t(`editor.moods.${mood}`),
                                  })
                                : formatDayMonth(day, i18n.language);

                        return (
                            <div
                                key={iso}
                                title={label}
                                className="flex min-w-0 flex-1 flex-col items-center gap-1"
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (iso <= todayIso()) {
                                            navigate(`/diary/${iso}`);
                                        }
                                    }}
                                    aria-label={label}
                                    className="flex h-40 w-full items-end"
                                >
                                    <div
                                        className={cn(
                                            'w-full rounded-t',
                                            mood !== undefined && mood !== null
                                                ? (MOOD_COLORS[mood] ?? 'bg-zinc-400')
                                                : 'bg-zinc-100 dark:bg-zinc-800',
                                        )}
                                        style={{
                                            height:
                                                mood !== undefined && mood !== null
                                                    ? `${(mood / 5) * 100}%`
                                                    : '4px',
                                        }}
                                    />
                                </button>
                                <span className="text-[9px] text-zinc-600 tabular-nums dark:text-zinc-400">
                                    {format(day, 'd')}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ul className="flex w-full flex-wrap gap-3 text-xs text-zinc-700 dark:text-zinc-300">
                {[1, 2, 3, 4, 5].map((value) => (
                    <li key={value} className="flex items-center gap-1.5">
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
    );
}
