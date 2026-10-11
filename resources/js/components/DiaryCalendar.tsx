import { router } from '@inertiajs/react';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    format,
    getDay,
    isSameDay,
    isSameMonth,
    parseISO,
    startOfMonth,
} from 'date-fns';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { show as diaryShow } from '@/routes/diary';
import { cn } from '@/lib/utils';
import { formatDay, formatMonthYear, weekdayLabels } from '@/lib/dates';

type DiaryCalendarProps = {
    date: string;
    month: string;
    entryDates: string[];
    onNavigate?: (date: string) => void;
};

export default function DiaryCalendar({
    date,
    month,
    entryDates,
    onNavigate,
}: DiaryCalendarProps) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;

    const [visibleMonth, setVisibleMonth] = useState(() =>
        parseISO(`${month}-01`),
    );
    const [dates, setDates] = useState<string[]>(entryDates);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setVisibleMonth(parseISO(`${month}-01`));
        setDates(entryDates);
    }, [date, month]);

    const selected = parseISO(date);
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const leadingBlanks = (getDay(monthStart) + 6) % 7;

    const today = new Date();
    const entries = new Set(dates);
    const canGoNextMonth =
        startOfMonth(addMonths(visibleMonth, 1)).getTime() <=
        startOfMonth(today).getTime();

    function loadMonth(target: Date): void {
        setVisibleMonth(target);
        setLoading(true);

        router.reload({
            only: ['calendar', 'calendarMonth'],
            data: { mes: format(target, 'yyyy-MM') },
            onSuccess: (page) => {
                setDates((page.props.calendar as string[]) ?? []);
            },
            onFinish: () => setLoading(false),
        });
    }

    function goTo(day: Date): void {
        const iso = format(day, 'yyyy-MM-dd');

        if (onNavigate) {
            onNavigate(iso);

            return;
        }

        router.visit(diaryShow.url(iso));
    }

    return (
        <aside className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={() => loadMonth(addMonths(visibleMonth, -1))}
                    aria-label={t('calendar.previousMonth')}
                    className="rounded-md px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                    ‹
                </button>

                <button
                    type="button"
                    onClick={() => loadMonth(startOfMonth(today))}
                    className="text-sm font-medium text-zinc-600 capitalize transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                >
                    {formatMonthYear(visibleMonth, locale)}
                </button>

                <button
                    type="button"
                    disabled={!canGoNextMonth}
                    onClick={() => loadMonth(addMonths(visibleMonth, 1))}
                    aria-label={t('calendar.nextMonth')}
                    className="rounded-md px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                    ›
                </button>
            </div>

            <div
                className={cn(
                    'grid grid-cols-7 gap-1 text-center text-xs transition',
                    loading && 'opacity-50',
                )}
            >
                {weekdayLabels(locale).map((weekday, index) => (
                    <div
                        key={index}
                        className="py-1 text-zinc-400 dark:text-zinc-500"
                    >
                        {weekday}
                    </div>
                ))}

                {Array.from({ length: leadingBlanks }, (_, index) => (
                    <div key={`blank-${index}`} />
                ))}

                {days.map((day) => {
                    const iso = format(day, 'yyyy-MM-dd');
                    const isSelected =
                        isSameMonth(day, selected) && iso === date;
                    const hasEntry = entries.has(iso);
                    const isToday = isSameDay(day, today);
                    const isFuture = day.getTime() > today.getTime();

                    return (
                        <button
                            key={iso}
                            type="button"
                            disabled={isFuture}
                            onClick={() => goTo(day)}
                            className={cn(
                                'relative flex h-8 items-center justify-center rounded-md text-sm transition',
                                isSelected
                                    ? 'bg-zinc-900 font-semibold text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
                                isFuture &&
                                    'cursor-not-allowed text-zinc-300 dark:text-zinc-600',
                            )}
                        >
                            {formatDay(day, locale)}
                            {hasEntry && (
                                <span
                                    className={cn(
                                        'absolute bottom-1 h-1 w-1 rounded-full',
                                        isSelected
                                            ? 'bg-zinc-50 dark:bg-zinc-900'
                                            : 'bg-emerald-500',
                                    )}
                                />
                            )}
                            {isToday && !isSelected && (
                                <span className="absolute bottom-0.5 text-[8px] text-emerald-600 dark:text-emerald-400">
                                    •
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
