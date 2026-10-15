import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export const DAYS = [
    'time',
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
    'sun',
] as const;

export type DayKey = (typeof DAYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
    time: 'schedule.time',
    mon: 'schedule.mon',
    tue: 'schedule.tue',
    wed: 'schedule.wed',
    thu: 'schedule.thu',
    fri: 'schedule.fri',
    sat: 'schedule.sat',
    sun: 'schedule.sun',
};

export function parseGrid(slots: string | null): string[][] {
    if (!slots) {
        return Array.from({ length: 1 }, () =>
            Array.from({ length: DAYS.length }, () => ''),
        );
    }
    try {
        const parsed = JSON.parse(slots);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        // ignore
    }
    return Array.from({ length: 1 }, () =>
        Array.from({ length: DAYS.length }, () => ''),
    );
}

export function serializeGrid(grid: string[][]): string {
    return JSON.stringify(grid);
}

export function visibleDayIndexes(onlyWeekdays: boolean): number[] {
    return DAYS.reduce<number[]>((indexes, day, index) => {
        if (onlyWeekdays && (day === 'sat' || day === 'sun')) {
            return indexes;
        }
        indexes.push(index);

        return indexes;
    }, []);
}

type ScheduleGridProps = {
    slots: string | null;
    onlyWeekdays: boolean;
    size?: 'sm' | 'md';
};

export default function ScheduleGrid({
    slots,
    onlyWeekdays,
    size = 'md',
}: ScheduleGridProps): React.JSX.Element {
    const { t } = useTranslation();
    const columnIndexes = visibleDayIndexes(onlyWeekdays);
    const grid = parseGrid(slots);

    return (
        <div className="overflow-x-auto">
            <table
                className={cn(
                    'min-w-full bg-white dark:bg-zinc-900',
                    size === 'sm' ? 'text-xs' : 'text-sm',
                )}
            >
                <thead>
                    <tr>
                        {columnIndexes.map((index) => (
                            <th
                                key={DAYS[index]}
                                className={cn(
                                    'border border-zinc-200 text-left dark:border-zinc-700',
                                    size === 'sm'
                                        ? 'px-1 py-0.5 font-normal text-zinc-600 dark:text-zinc-300'
                                        : 'px-2 py-1 font-medium text-zinc-600 dark:text-zinc-300',
                                )}
                            >
                                {t(DAY_LABELS[DAYS[index]])}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {grid.map((row, i) => (
                        <tr key={i}>
                            {columnIndexes.map((index) => (
                                <td
                                    key={index}
                                    className={cn(
                                        'border border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300',
                                        size === 'sm'
                                            ? 'px-1 py-0.5'
                                            : 'px-2 py-1',
                                    )}
                                >
                                    {row[index]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
