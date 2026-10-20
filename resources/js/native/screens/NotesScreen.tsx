import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/components/ConfirmDialog';
import { formatLongDate } from '@/lib/dates';
import { noteSurface, noteSwatchClasses } from '@/lib/noteColors';
import { cn } from '@/lib/utils';
import { AddIcon, CloseIcon } from '@/native/components/icons';
import { useSession } from '@/native/hooks';
import {
    createNote,
    deleteNote,
    loadNotes,
    updateNote,
} from '@/native/repo';
import type { NoteRecord } from '@/native/types';

const COLORS = ['yellow', 'pink', 'blue', 'green', 'purple', 'gray'] as const;

const KINDS = ['note', 'reminder', 'event'] as const;

const fieldClass =
    'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

type Draft = {
    title: string;
    body: string;
    color: string;
    kind: string;
    date: string;
};

function draftOf(note: NoteRecord | null): Draft {
    return {
        title: note?.title ?? '',
        body: note?.body ?? '',
        color: note?.color ?? 'yellow',
        kind: note?.kind ?? 'note',
        date: note?.date ?? '',
    };
}

/**
 * Notes, reminders and events — fully local. The list and its filters are
 * client-side over the decrypted rows; every mutation flags the row dirty
 * and lets the sync engine take it from there.
 */
export default function NotesScreen(): React.JSX.Element {
    const { t, i18n } = useTranslation();
    const { phase } = useSession();

    const [notes, setNotes] = useState<NoteRecord[]>([]);
    const [editing, setEditing] = useState<NoteRecord | 'new' | null>(null);
    const [draft, setDraft] = useState<Draft>(() => draftOf(null));
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState<NoteRecord | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [query, setQuery] = useState('');

    const reload = useCallback(async () => {
        setNotes(await loadNotes());
    }, []);

    useEffect(() => {
        if (phase !== 'unlocked') {
            return;
        }

        void reload();
    }, [phase, reload]);

    function startCreate(): void {
        setDraft(draftOf(null));
        setEditing('new');
    }

    function startEdit(note: NoteRecord): void {
        setDraft(draftOf(note));
        setEditing(note);
    }

    async function submit(): Promise<void> {
        setSaving(true);

        try {
            const payload = {
                title: draft.title.trim() === '' ? null : draft.title.trim(),
                body: draft.body.trim() === '' ? null : draft.body,
                color: draft.color,
                kind: draft.kind,
                date: draft.date === '' ? null : draft.date,
            };

            if (editing === 'new') {
                await createNote(payload);
            } else if (editing !== null) {
                await updateNote(editing.localId, payload);
            }

            setEditing(null);
            await reload();
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete(): Promise<void> {
        if (toDelete === null) {
            return;
        }

        await deleteNote(toDelete.localId);
        setToDelete(null);

        if (editing !== null && editing !== 'new' && editing.localId === toDelete.localId) {
            setEditing(null);
        }

        await reload();
    }

    const filtered = notes.filter((note) => {
        if (filter !== 'all' && note.kind !== filter) {
            return false;
        }

        if (query.trim() !== '') {
            const needle = query.toLowerCase();
            const title = (note.title ?? '').toLowerCase();
            const body = (note.body ?? '').toLowerCase();

            if (!title.includes(needle) && !body.includes(needle)) {
                return false;
            }
        }

        return true;
    });

    return (
        <div className="flex flex-col gap-4">
            {editing !== null && (
                <form
                    className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void submit();
                    }}
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {editing === 'new'
                                ? t('notes.new')
                                : t('notes.edit')}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            aria-label={t('common.cancel')}
                            className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <CloseIcon className="h-4 w-4" />
                        </button>
                    </div>

                    <input
                        type="text"
                        value={draft.title}
                        onChange={(event) =>
                            setDraft({ ...draft, title: event.target.value })
                        }
                        placeholder={t('notes.titlePlaceholder')}
                        className={fieldClass}
                    />

                    <textarea
                        rows={4}
                        value={draft.body}
                        onChange={(event) =>
                            setDraft({ ...draft, body: event.target.value })
                        }
                        placeholder={t('notes.bodyPlaceholder')}
                        className={cn(fieldClass, 'resize-y')}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                        {COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() =>
                                    setDraft({ ...draft, color })
                                }
                                aria-label={t(`notes.colors.${color}`)}
                                aria-pressed={draft.color === color}
                                title={t(`notes.colors.${color}`)}
                                className={cn(
                                    'h-7 w-7 rounded-full border transition',
                                    noteSwatchClasses[color] ?? 'bg-zinc-300',
                                    draft.color === color
                                        ? 'ring-2 ring-zinc-500 ring-offset-2 dark:ring-offset-zinc-900'
                                        : 'border-transparent',
                                )}
                            />
                        ))}
                        <input
                            type="color"
                            value={
                                draft.color.startsWith('#')
                                    ? draft.color
                                    : '#fef3c7'
                            }
                            onChange={(event) =>
                                setDraft({ ...draft, color: event.target.value })
                            }
                            aria-label={t('notes.customColor')}
                            className="h-8 w-10 cursor-pointer rounded border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                        />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {t('notes.kindLabel')}
                            <select
                                value={draft.kind}
                                onChange={(event) =>
                                    setDraft({ ...draft, kind: event.target.value })
                                }
                                className={fieldClass}
                            >
                                {KINDS.map((kind) => (
                                    <option key={kind} value={kind}>
                                        {t(`notes.kinds.${kind}`)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {t('notes.dateLabel')}
                            <input
                                type="date"
                                value={draft.date}
                                onChange={(event) =>
                                    setDraft({ ...draft, date: event.target.value })
                                }
                                className={fieldClass}
                            />
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
                            onClick={() => setEditing(null)}
                            className="rounded-xl px-4 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            {t('notes.cancel')}
                        </button>
                    </div>
                </form>
            )}

            {notes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('notes.searchPlaceholder')}
                        className="min-w-[10rem] flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 outline-none placeholder:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400"
                    />
                    <div className="flex flex-wrap gap-1.5">
                        {['all', ...KINDS].map((kind) => (
                            <button
                                key={kind}
                                type="button"
                                onClick={() => setFilter(kind)}
                                className={cn(
                                    'rounded-full px-3 py-1 text-xs transition',
                                    filter === kind
                                        ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
                                )}
                            >
                                {kind === 'all'
                                    ? t('notes.filters.all')
                                    : t(`notes.kinds.${kind}`)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {filtered.length === 0 && notes.length > 0 && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {t('notes.noResults')}
                </p>
            )}

            {filtered.length === 0 && notes.length === 0 && editing === null && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {t('notes.subtitle')}
                </p>
            )}

            <ul className="flex flex-col gap-3">
                {filtered.map((note) => {
                    const surface = noteSurface(note);

                    return (
                        <li
                            key={note.localId}
                            className={cn(
                                'flex flex-col gap-2 rounded-xl border p-4',
                                surface.className,
                            )}
                            style={surface.style}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                    {t(`notes.kinds.${note.kind}`)}
                                </span>
                                {note.date !== null && (
                                    <span className="text-xs text-zinc-700 dark:text-zinc-300">
                                        {formatLongDate(note.date, i18n.language)}
                                    </span>
                                )}
                            </div>

                            <p className="font-medium text-zinc-900 dark:text-zinc-50">
                                {note.title || t('notes.untitled')}
                            </p>

                            {note.body && (
                                <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
                                    {note.body}
                                </p>
                            )}

                            <div className="mt-auto flex items-center gap-4 pt-2">
                                <button
                                    type="button"
                                    onClick={() => startEdit(note)}
                                    className="text-xs text-zinc-600 underline-offset-2 transition hover:underline dark:text-zinc-300"
                                >
                                    {t('notes.edit')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setToDelete(note)}
                                    className="text-xs text-red-600 underline-offset-2 transition hover:underline dark:text-red-400"
                                >
                                    {t('notes.delete')}
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {editing === null && (
                <button
                    type="button"
                    onClick={startCreate}
                    aria-label={t('notes.new')}
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

            {filtered.length === 0 && notes.length === 0 && editing === null && (
                <button
                    type="button"
                    onClick={startCreate}
                    className="rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                >
                    {t('notes.new')}
                </button>
            )}
        </div>
    );
}
