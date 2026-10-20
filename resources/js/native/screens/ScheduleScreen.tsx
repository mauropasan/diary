import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/components/ConfirmDialog';
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
import { cn } from '@/lib/utils';
import { AddIcon, CloseIcon } from '@/native/components/icons';
import { useSession } from '@/native/hooks';
import {
    createSchedule,
    deleteSchedule,
    loadSchedules,
    updateSchedule,
} from '@/native/repo';
import type { ScheduleRecord } from '@/native/types';

const fieldClass =
    'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

/**
 * Weekly schedules, edited one day at a time on a phone (the web page does
 * the same on narrow screens) and reordered with the arrow buttons. The grid
 * travels through sync as the same JSON string the server stores.
 */
export default function ScheduleScreen(): React.JSX.Element {
    const { t } = useTranslation();
    const { phase } = useSession();

    const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
    const [editing, setEditing] = useState<ScheduleRecord | 'new' | null>(null);
    const [toDelete, setToDelete] = useState<ScheduleRecord | null>(null);

    const reload = useCallback(async () => {
        setSchedules(await loadSchedules());
    }, []);

    useEffect(() => {
        if (phase !== 'unlocked') {
            return;
        }

        void reload();
    }, [phase, reload]);

    async function move(schedule: ScheduleRecord, direction: -1 | 1): Promise<void> {
        const index = schedules.findIndex((item) => item.localId === schedule.localId);
        const target = index + direction;

        if (index < 0 || target < 0 || target >= schedules.length) {
            return;
        }

        const other = schedules[target];

        await Promise.all([
            updateSchedule(schedule.localId, { position: other.position }),
            updateSchedule(other.localId, { position: schedule.position }),
        ]);
        await reload();
    }

    async function confirmDelete(): Promise<void> {
        if (toDelete === null) {
            return;
        }

        await deleteSchedule(toDelete.localId);

        if (
            editing !== null &&
            editing !== 'new' &&
            editing.localId === toDelete.localId
        ) {
            setEditing(null);
        }

        setToDelete(null);
        await reload();
    }

    return (
        <div className="flex flex-col gap-4">
            {editing !== null && (
                <ScheduleForm
                    key={editing === 'new' ? 'new' : editing.localId}
                    schedule={editing === 'new' ? null : editing}
                    onSaved={async () => {
                        setEditing(null);
                        await reload();
                    }}
                    onCancel={() => setEditing(null)}
                />
            )}

            <ul className="flex flex-col gap-3">
                {schedules.map((schedule, index) => (
                    <li
                        key={schedule.localId}
                        className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                                    {schedule.name}
                                </p>
                                {schedule.active ? (
                                    <span className="shrink-0 rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                                        {t('schedule.active')}
                                    </span>
                                ) : (
                                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                        {t('schedule.inactive')}
                                    </span>
                                )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => void move(schedule, -1)}
                                    disabled={index === 0}
                                    aria-label={t('schedule.moveUp')}
                                    className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void move(schedule, 1)}
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
                            onlyWeekdays={schedule.onlyWeekdays}
                            size="sm"
                        />

                        <div className="flex items-center gap-4 pt-1">
                            <button
                                type="button"
                                onClick={() => setEditing(schedule)}
                                className="text-xs text-zinc-600 underline-offset-2 transition hover:underline dark:text-zinc-300"
                            >
                                {t('notes.edit')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setToDelete(schedule)}
                                className="text-xs text-red-600 underline-offset-2 transition hover:underline dark:text-red-400"
                            >
                                {t('notes.delete')}
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {editing === null && (
                <button
                    type="button"
                    onClick={() => setEditing('new')}
                    aria-label={t('schedule.new')}
                    className="fixed right-4 bottom-24 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg transition active:scale-95 dark:bg-zinc-100 dark:text-zinc-900"
                >
                    <AddIcon className="h-6 w-6" />
                </button>
            )}

            <ConfirmDialog
                open={toDelete !== null}
                destructive
                title={t('notes.delete')}
                message={t('notes.confirmDelete')}
                confirmLabel={t('notes.delete')}
                cancelLabel={t('notes.cancel')}
                onConfirm={() => void confirmDelete()}
                onCancel={() => setToDelete(null)}
            />
        </div>
    );
}

function ScheduleForm({
    schedule,
    onSaved,
    onCancel,
}: {
    schedule: ScheduleRecord | null;
    onSaved: () => Promise<void>;
    onCancel: () => void;
}): React.JSX.Element {
    const { t } = useTranslation();
    const isNarrow = useMediaQuery('(max-width: 639px)');

    const [name, setName] = useState(schedule?.name ?? '');
    const [active, setActive] = useState(schedule?.active ?? true);
    const [onlyWeekdays, setOnlyWeekdays] = useState(
        schedule?.onlyWeekdays ?? false,
    );
    const [grid, setGrid] = useState<string[][]>(() =>
        parseGrid(schedule?.slots ?? null),
    );
    const [editDayIndex, setEditDayIndex] = useState<number>(() => {
        const today = todayDayIndex();

        return schedule?.onlyWeekdays === true && today > 5 ? 5 : today;
    });
    const [saving, setSaving] = useState(false);

    const editableDays = visibleDayIndexes(onlyWeekdays).filter(
        (index) => index !== 0,
    );
    const dayPosition = editableDays.indexOf(editDayIndex);
    const columnIndexes = isNarrow
        ? singleDayColumnIndexes(onlyWeekdays, editDayIndex)
        : visibleDayIndexes(onlyWeekdays);

    function moveDay(direction: -1 | 1): void {
        const next = dayPosition + direction;

        if (dayPosition === -1) {
            setEditDayIndex(
                direction === 1
                    ? (editableDays[0] ?? 1)
                    : (editableDays.at(-1) ?? 1),
            );

            return;
        }

        if (next < 0 || next >= editableDays.length) {
            return;
        }

        setEditDayIndex(editableDays[next] as number);
    }

    function updateCell(row: number, col: number, value: string): void {
        const copy = grid.map((r) => r.slice());
        const target = copy[row];

        if (target !== undefined) {
            target[col] = value;
            setGrid(copy);
        }
    }

    async function submit(): Promise<void> {
        setSaving(true);

        try {
            const payload = {
                name: name.trim() === '' ? t('schedule.title') : name.trim(),
                slots: serializeGrid(grid),
                onlyWeekdays,
                active,
            };

            if (schedule === null) {
                await createSchedule(payload);
            } else {
                await updateSchedule(schedule.localId, payload);
            }

            await onSaved();
        } finally {
            setSaving(false);
        }
    }

    return (
        <form
            className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            onSubmit={(event) => {
                event.preventDefault();
                void submit();
            }}
        >
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {schedule === null ? t('schedule.new') : t('notes.edit')}
                </h2>
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label={t('common.cancel')}
                    className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    <CloseIcon className="h-4 w-4" />
                </button>
            </div>

            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {t('schedule.nameLabel')}
                <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t('schedule.namePlaceholder')}
                    className={fieldClass}
                />
            </label>

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
                                    ? 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                    : 'cursor-not-allowed text-zinc-300 dark:text-zinc-700',
                            )}
                        >
                            ‹
                        </button>

                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {t(DAY_LABELS[DAYS[editDayIndex] ?? 'time'])}
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
                                    ? 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
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
                                    {t(DAY_LABELS[DAYS[index] ?? 'time'])}
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
                                            value={row[index] ?? ''}
                                            onChange={(event) =>
                                                updateCell(
                                                    i,
                                                    index,
                                                    event.target.value,
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
                        onClick={() =>
                            setGrid([
                                ...grid,
                                Array.from({ length: DAYS.length }, () => ''),
                            ])
                        }
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        {t('schedule.addRow')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (grid.length > 1) {
                                setGrid(grid.slice(0, -1));
                            }
                        }}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        {t('schedule.removeRow')}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                    <input
                        type="checkbox"
                        checked={active}
                        onChange={(event) => setActive(event.target.checked)}
                    />
                    {t('schedule.active')}
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                    <input
                        type="checkbox"
                        checked={onlyWeekdays}
                        onChange={(event) => {
                            setOnlyWeekdays(event.target.checked);

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
                    disabled={saving}
                    className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.99] disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                    {saving ? t('notes.saving') : t('notes.save')}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-xl px-4 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                    {t('notes.cancel')}
                </button>
            </div>
        </form>
    );
}
