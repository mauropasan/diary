/**
 * Locale-aware date formatting helpers built on `Intl.DateTimeFormat`.
 *
 * Using the platform formatter instead of hard-coded patterns keeps the
 * output correct for every supported language (no literal "de" that only
 * works in Spanish).
 */

export function formatLongDate(date: Date | string, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(toDate(date));
}

export function formatLongDay(date: Date | string, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
    }).format(toDate(date));
}

export function formatMonthYear(date: Date | string, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
    }).format(toDate(date));
}

export function formatDayMonth(date: Date | string, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
    }).format(toDate(date));
}

export function formatShortDayMonth(
    date: Date | string,
    locale: string,
): string {
    return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
    }).format(toDate(date));
}

export function formatDay(date: Date | string, locale: string): string {
    return new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(
        toDate(date),
    );
}

/**
 * Short weekday labels (Monday first) for the calendar header.
 */
export function weekdayLabels(locale: string): string[] {
    const monday = new Date(2026, 0, 5);
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });

    return Array.from({ length: 7 }, (_, index) => {
        const day = new Date(monday);

        day.setDate(monday.getDate() + index);

        return formatter.format(day);
    });
}

function toDate(date: Date | string): Date {
    return date instanceof Date ? date : new Date(`${date}T12:00:00`);
}
