import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/components/ConfirmDialog';
import DiaryNav from '@/components/DiaryNav';
import { cn } from '@/lib/utils';
import {
    destroy as scheduleDestroy,
    store as scheduleStore,
    update as scheduleUpdate,
} from '@/routes/diary/schedule';

type Schedule = {
    id: number;
    name: string;
    slots: string | null;
    active: boolean;
};

type SchedulePageProps = {
    schedules: Schedule[];
};

const fieldClass =
    'rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400';

const DAYS = ['time', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS = {
    time: 'schedule.time',
    mon: 'schedule.mon',
    tue: 'schedule.tue',
    wed: 'schedule.wed',
    thu: 'schedule.thu',
    fri: 'schedule.fri',
    sat: 'schedule.sat',
    sun: 'schedule.sun',
} as const;

function parseGrid(slots: string | null): string[][] {
    if (!slots) {
        const empty = Array.from({ length: 1 }, () =>
            Array.from({ length: 8 }, () => ''),
        );
        return empty;
    }
    try {
        const parsed = JSON.parse(slots);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        // ignore
    }
    return Array.from({ length: 1 }, () => Array.from({ length: 8 }, () => ''));
}

function serializeGrid(grid: string[][]): string {
    return JSON.stringify(grid);
}

type ScheduleFormProps = {
    schedule: Schedule | null;
    onDone: () => void;
};

function ScheduleForm({
    schedule,
    onDone,
}: ScheduleFormProps): React.JSX.Element {
    const { t } = useTranslation();
    const initialGrid = parseGrid(schedule?.slots ?? null);
    const [grid, setGrid] = useState<string[][]>(initialGrid);
    const { data, setData, post, put, processing, errors } = useForm<{
        name: string;
        active: boolean;
    }>({
        name: schedule?.name ?? '',
        active: schedule?.active ?? true,
    });

    function updateCell(row: number, col: number, value: string): void {
        const copy = grid.map((r) => r.slice());
        copy[row][col] = value;
        setGrid(copy);
    }

    function addRow(): void {
        setGrid([...grid, Array.from({ length: 8 }, () => '')]);
    }

    function removeRow(): void {
        if (grid.length > 1) {
            setGrid(grid.slice(0, -1));
        }
    }

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        if (schedule) {
            router.put(scheduleUpdate.url(schedule.id), {
                name: data.name,
                slots: serializeGrid(grid),
                active: data.active,
            }, {
                preserveScroll: true,
                onSuccess: () => onDone(),
            });
            return;
        }

        router.post(scheduleStore.url(), {
            name: data.name,
            slots: serializeGrid(grid),
            active: data.active,
        }, {
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
                <table className="min-w-full text-sm">
                    <thead>
                        <tr>
                            {DAYS.map((d) => (
                                <th
                                    key={d}
                                    className="border border-zinc-200 px-2 py-1 text-left font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                                >
                                    {t(DAY_LABELS[d])}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {grid.map((row, i) => (
                            <tr key={i}>
                                {row.map((cell, j) => (
                                    <td
                                        key={j}
                                        className="border border-zinc-200 p-0 dark:border-zinc-700"
                                    >
                                        <input
                                            type="text"
                                            value={cell}
                                            onChange={(e) =>
                                                updateCell(i, j, e.target.value)
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
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                        {t('schedule.addRow')}
                    </button>
                    <button
                        type="button"
                        onClick={removeRow}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                        {t('schedule.removeRow')}
                    </button>
                </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                <input
                    type="checkbox"
                    checked={data.active}
                    onChange={(event) => setData('active', event.target.checked)}
                />
                {t('schedule.active')}
            </label>

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
    const activeSchedule = schedules.find((s) => s.active);
    const otherSchedules = schedules.filter((s) => !s.active);

    function confirmRemove(): void {
        if (!scheduleToDelete) {
            return;
        }

        router.delete(scheduleDestroy.url(scheduleToDelete.id), {
            preserveScroll: true,
            onFinish: () => setScheduleToDelete(null),
        });
    }

    function renderScheduleCard(schedule: Schedule): React.JSX.Element {
        const grid = parseGrid(schedule.slots);
        return (
            <li
                key={schedule.id}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
                <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {schedule.name}
                    </p>
                    {!schedule.active && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {t('schedule.inactive')}
                        </span>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr>
                                {DAYS.map((d) => (
                                    <th
                                        key={d}
                                        className="border border-zinc-200 px-1 py-0.5 text-left font-normal text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                                    >
                                        {t(DAY_LABELS[d])}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {grid.map((row, i) => (
                                <tr key={i}>
                                    {row.map(
                                        (cell, j) => (
                                            <td
                                                key={j}
                                                className="border border-zinc-200 px-1 py-0.5 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                                            >
                                                {cell}
                                            </td>
                                        ),
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-auto flex items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() =>
                            setEditingId(schedule.id)
                        }
                        className="text-xs text-zinc-600 underline-offset-2 transition hover:underline dark:text-zinc-300"
                    >
                        {t('notes.edit')}
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            setScheduleToDelete(schedule)
                        }
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

            <div className="min-h-screen bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {t('common.brand')}
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {t('schedule.title')}
                            </h1>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                {t('schedule.subtitle')}
                            </p>
                        </div>

                        <DiaryNav />
                    </header>

                    {activeSchedule && (
                        <div className="mb-8">
                            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                                <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                                    {t('schedule.active')}
                                </span>
                                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                    {activeSchedule.name}
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr>
                                            {DAYS.map((d) => (
                                                <th
                                                    key={d}
                                                    className="border border-zinc-200 px-2 py-1 text-left font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                                                >
                                                    {t(DAY_LABELS[d])}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parseGrid(activeSchedule.slots).map((row, i) => (
                                            <tr key={i}>
                                                {row.map((cell, j) => (
                                                    <td
                                                        key={j}
                                                        className="border border-zinc-200 px-2 py-1 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                                                    >
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingId(activeSchedule.id)}
                                    className="text-xs text-zinc-600 underline-offset-2 transition hover:underline dark:text-zinc-300"
                                >
                                    {t('notes.edit')}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mb-8">
                        <ScheduleForm
                            key={editing?.id ?? 'new'}
                            schedule={editing}
                            onDone={() => setEditingId(null)}
                        />
                    </div>

                    {otherSchedules.length > 0 && (
                        <ul className="grid gap-4 lg:grid-cols-2">
                            {otherSchedules.map(renderScheduleCard)}
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
