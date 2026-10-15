import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/components/ConfirmDialog';
import DiaryNav from '@/components/DiaryNav';
import ScheduleGrid, {
    DAYS,
    DAY_LABELS,
    parseGrid,
    serializeGrid,
    singleDayColumnIndexes,
    todayDayIndex,
    visibleDayIndexes,
} from '@/components/ScheduleGrid';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
    destroy as scheduleDestroy,
    reorder as scheduleReorder,
    store as scheduleStore,
    update as scheduleUpdate,
} from '@/routes/diary/schedule';
import { cn } from '@/lib/utils';

type Schedule = {
    id: number;
    name: string;
    slots: string | null;
    only_weekdays: boolean;
    active: boolean;
    position: number;
};

type SchedulePageProps = {
    schedules: Schedule[];
};

const fieldClass =
    'rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition outline-none placeholder:text-zinc-600 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-zinc-400';

type ScheduleFormProps = {
    schedule: Schedule | null;
    onDone: () => void;
};

function ScheduleForm({
    schedule,
    onDone,
}: ScheduleFormProps): React.JSX.Element {
    const { t } = useTranslation();
    const isNarrow = useMediaQuery('(max-width: 639px)');
    const initialGrid = parseGrid(schedule?.slots ?? null);
    const [grid, setGrid] = useState<string[][]>(initialGrid);
    const [editDayIndex, setEditDayIndex] = useState<number>(() => {
        const today = todayDayIndex();

        // A weekdays-only schedule has no weekend column to open on.
        return schedule?.only_weekdays === true && today > 5 ? 5 : today;
    });
    const { data, setData, processing, errors } = useForm<{
        name: string;
        active: boolean;
        onlyWeekdays: boolean;
    }>({
        name: schedule?.name ?? '',
        active: schedule?.active ?? true,
        onlyWeekdays: schedule?.only_weekdays ?? false,
    });

    const editableDays = visibleDayIndexes(data.onlyWeekdays).filter(
        (index) => index !== 0,
    );
    const dayPosition = editableDays.indexOf(editDayIndex);
    const columnIndexes = isNarrow
        ? singleDayColumnIndexes(data.onlyWeekdays, editDayIndex)
        : visibleDayIndexes(data.onlyWeekdays);

    function moveDay(direction: -1 | 1): void {
        const next = dayPosition + direction;

        if (dayPosition === -1) {
            setEditDayIndex(
                direction === 1 ? editableDays[0] : (editableDays.at(-1) ?? 1),
            );
            return;
        }

        if (next < 0 || next >= editableDays.length) {
            return;
        }

        setEditDayIndex(editableDays[next]);
    }

    function updateCell(row: number, col: number, value: string): void {
        const copy = grid.map((r) => r.slice());
        copy[row][col] = value;
        setGrid(copy);
    }

    function addRow(): void {
        setGrid([...grid, Array.from({ length: DAYS.length }, () => '')]);
    }

    function removeRow(): void {
        if (grid.length > 1) {
            setGrid(grid.slice(0, -1));
        }
    }

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const payload = {
            name: data.name,
            slots: serializeGrid(grid),
            only_weekdays: data.onlyWeekdays,
            active: data.active,
        };

        if (schedule) {
            router.put(scheduleUpdate.url(schedule.id), payload, {
                preserveScroll: true,
                onSuccess: () => onDone(),
            });
            return;
        }

        router.post(scheduleStore.url(), payload, {
            preserveScroll: true,
            onSuccess: () => onDone(),
        });
    }

    return (
        <form
            onSubmit={submit}
            noValidate
            className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
            <div className="flex flex-col gap-1">
                <label
                    htmlFor="schedule-name"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                    {t('schedule.nameLabel')}
                </label>
                <input
                    id="schedule-name"
                    type="text"
                    value={data.name}
                    onChange={(event) => setData('name', event.target.value)}
                    placeholder={t('schedule.namePlaceholder')}
                    className={fieldClass}
                />
                {errors.name && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                        {errors.name}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2 overflow-x-auto">
                {isNarrow && (
                    <div className="flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => moveDay(-1)}
                            disabled={dayPosition <= 0}
                            aria-label={t('schedule.prevDay')}
                            className={cn(
                                'shrink-0 rounded-md px-2 py-1 text-sm transition',
                                dayPosition > 0
                                    ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                                    : 'cursor-not-allowed text-zinc-300 dark:text-zinc-700',
                            )}
                        >
                            ‹
                        </button>

                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {t(DAY_LABELS[DAYS[editDayIndex]])}
                        </span>

                        <button
                            type="button"
                            onClick={() => moveDay(1)}
                            disabled={
                                dayPosition === -1 ||
                                dayPosition >= editableDays.length - 1
                            }
                            aria-label={t('schedule.nextDay')}
                            className={cn(
                                'shrink-0 rounded-md px-2 py-1 text-sm transition',
                                dayPosition !== -1 &&
                                    dayPosition < editableDays.length - 1
                                    ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                                    : 'cursor-not-allowed text-zinc-300 dark:text-zinc-700',
                            )}
                        >
                            ›
                        </button>
                    </div>
                )}

                <table className="min-w-full bg-white text-sm dark:bg-zinc-900">
                    <thead>
                        <tr>
                            {columnIndexes.map((index) => (
                                <th
                                    key={DAYS[index]}
                                    className="border border-zinc-200 px-2 py-1 text-left font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
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
                                        className="border border-zinc-200 p-0 dark:border-zinc-700"
                                    >
                                        <input
                                            type="text"
                                            value={row[index]}
                                            onChange={(e) =>
                                                updateCell(
                                                    i,
                                                    index,
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full bg-transparent px-2 py-1 text-sm text-zinc-900 outline-none dark:text-zinc-100"
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={addRow}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    >
                        {t('schedule.addRow')}
                    </button>
                    <button
                        type="button"
                        onClick={removeRow}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    >
                        {t('schedule.removeRow')}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                    <input
                        type="checkbox"
                        checked={data.active}
                        onChange={(event) =>
                            setData('active', event.target.checked)
                        }
                    />
                    {t('schedule.active')}
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                    <input
                        type="checkbox"
                        checked={data.onlyWeekdays}
                        onChange={(event) => {
                            setData('onlyWeekdays', event.target.checked);

                            // A weekend column no longer exists, so move the
                            // phone day switcher back onto the weekdays.
                            if (event.target.checked && editDayIndex > 5) {
                                setEditDayIndex(5);
                            }
                        }}
                    />
                    {t('schedule.onlyWeekdays')}
                </label>
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                    {processing ? t('notes.saving') : t('notes.save')}
                </button>
                <button
                    type="button"
                    onClick={() => onDone()}
                    className="rounded-md px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                    {t('notes.cancel')}
                </button>
            </div>
        </form>
    );
}

export default function Schedule({
    schedules,
}: SchedulePageProps): React.JSX.Element {
    const { t } = useTranslation();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(
        null,
    );

    const editing = schedules.find((s) => s.id === editingId) ?? null;

    function confirmRemove(): void {
        if (!scheduleToDelete) {
            return;
        }

        router.delete(scheduleDestroy.url(scheduleToDelete.id), {
            preserveScroll: true,
            onFinish: () => setScheduleToDelete(null),
        });
    }

    function move(schedule: Schedule, direction: -1 | 1): void {
        const ids = schedules.map((s) => s.id);
        const index = ids.indexOf(schedule.id);
        const target = index + direction;

        if (index < 0 || target < 0 || target >= ids.length) {
            return;
        }

        [ids[index], ids[target]] = [ids[target], ids[index]];

        router.patch(scheduleReorder.url(), { ids }, { preserveScroll: true });
    }

    function renderScheduleCard(schedule: Schedule): React.JSX.Element {
        const index = schedules.findIndex((s) => s.id === schedule.id);

        return (
            <li
                key={schedule.id}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                            {schedule.name}
                        </p>
                        {schedule.active && (
                            <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                                {t('schedule.active')}
                            </span>
                        )}
                        {!schedule.active && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                {t('schedule.inactive')}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => move(schedule, -1)}
                            disabled={index === 0}
                            aria-label={t('schedule.moveUp')}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            ↑
                        </button>
                        <button
                            type="button"
                            onClick={() => move(schedule, 1)}
                            disabled={index === schedules.length - 1}
                            aria-label={t('schedule.moveDown')}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            ↓
                        </button>
                    </div>
                </div>
                <ScheduleGrid
                    slots={schedule.slots}
                    onlyWeekdays={schedule.only_weekdays}
                    size="sm"
                />
                <div className="mt-auto flex items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => setEditingId(schedule.id)}
                        className="text-xs text-zinc-600 underline-offset-2 transition hover:underline dark:text-zinc-300"
                    >
                        {t('notes.edit')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setScheduleToDelete(schedule)}
                        className="text-xs text-red-600 underline-offset-2 transition hover:underline dark:text-red-400"
                    >
                        {t('notes.delete')}
                    </button>
                </div>
            </li>
        );
    }

    return (
        <>
            <Head title={t('schedule.title')} />

            <div className="min-h-screen text-[#1b1b18] dark:text-[#EDEDEC]">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                {t('common.brand')}
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {t('schedule.title')}
                            </h1>
                            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                                {t('schedule.subtitle')}
                            </p>
                        </div>

                        <DiaryNav />
                    </header>

                    <div className="mb-8">
                        <ScheduleForm
                            key={editing?.id ?? 'new'}
                            schedule={editing}
                            onDone={() => setEditingId(null)}
                        />
                    </div>

                    {schedules.length > 0 && (
                        <ul className="grid gap-4 lg:grid-cols-2">
                            {schedules.map(renderScheduleCard)}
                        </ul>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={scheduleToDelete !== null}
                destructive
                title={t('notes.delete')}
                message={t('notes.confirmDelete')}
                confirmLabel={t('notes.delete')}
                cancelLabel={t('notes.cancel')}
                onConfirm={confirmRemove}
                onCancel={() => setScheduleToDelete(null)}
            />
        </>
    );
}
