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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMonthYear, weekdayLabels } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon } from '@/native/components/icons';

type CalendarProps = {
    /** Selected day (`yyyy-MM-dd`). */
    date: string;
    /** Every known day with an entry — the whole index lives on the device. */
    entryDates: string[];
    onNavigate: (date: string) => void;
};

/**
 * The month calendar of the diary. Everything it renders is already on the
 * device, so flipping months is instant — no server round-trip like the web
 * calendar's reload.
 */
export default function Calendar({
    date,
    entryDates,
    onNavigate,
}: CalendarProps): React.JSX.Element {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;

    const [visibleMonth, setVisibleMonth] = useState(() =>
        parseISO(`${date.slice(0, 7)}-01`),
    );

    const selected = parseISO(date);
    const monthStart = startOfMonth(visibleMonth);
    const days = eachDayOfInterval({
        start: monthStart,
        end: endOfMonth(visibleMonth),
    });
    const leadingBlanks = (getDay(monthStart) + 6) % 7;

    const today = new Date();
    const entries = new Set(entryDates);
    const canGoNextMonth =
        startOfMonth(addMonths(visibleMonth, 1)).getTime() <=
        startOfMonth(today).getTime();

    return (
        <aside className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
                    aria-label={t('calendar.previousMonth')}
                    className="rounded-full p-1.5 text-zinc-700 transition hover:bg-zinc-100 active:scale-95 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                    <ChevronLeftIcon className="h-5 w-5" />
                </button>

                <button
                    type="button"
                    onClick={() => setVisibleMonth(startOfMonth(today))}
                    className="text-sm font-medium text-zinc-600 capitalize transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                >
                    {formatMonthYear(visibleMonth, locale)}
                </button>

                <button
                    type="button"
                    disabled={!canGoNextMonth}
                    onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
                    aria-label={t('calendar.nextMonth')}
                    className="rounded-full p-1.5 text-zinc-700 transition hover:bg-zinc-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                    <ChevronRightIcon className="h-5 w-5" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {weekdayLabels(locale).map((weekday, index) => (
                    <div
                        key={index}
                        className="py-1 text-zinc-600 dark:text-zinc-400"
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
                            aria-current={isToday ? 'date' : undefined}
                            onClick={() => onNavigate(iso)}
                            className={cn(
                                'relative flex h-10 items-center justify-center rounded-md text-sm transition',
                                isSelected
                                    ? 'bg-zinc-900 font-semibold text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
                                isFuture &&
                                    'cursor-not-allowed text-zinc-300 dark:text-zinc-600',
                            )}
                        >
                            {format(day, 'd')}
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
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
