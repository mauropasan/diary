import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/components/ConfirmDialog';
import DiaryNav from '@/components/DiaryNav';
import { formatLongDate } from '@/lib/dates';
import { noteColorClass, noteSwatchClasses } from '@/lib/noteColors';
import { cn } from '@/lib/utils';
import {
    destroy as noteDestroy,
    store as noteStore,
    update as noteUpdate,
} from '@/routes/diary/notes';

type Note = {
    id: number;
    title: string | null;
    body: string | null;
    color: string;
    kind: string;
    date: string | null;
};

type NotesPageProps = {
    notes: Note[];
    colors: string[];
    kinds: string[];
};

const fieldClass =
    'rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400';

type NoteFormProps = {
    note: Note | null;
    colors: string[];
    kinds: string[];
    onDone: () => void;
};

function NoteForm({
    note,
    colors,
    kinds,
    onDone,
}: NoteFormProps): React.JSX.Element {
    const { t } = useTranslation();
    const { data, setData, post, put, processing, errors, reset } = useForm<{
        title: string;
        body: string;
        color: string;
        kind: string;
        date: string;
        background_image: string | null;
    }>({
        title: note?.title ?? '',
        body: note?.body ?? '',
        color: note?.color ?? colors[0] ?? 'yellow',
        kind: note?.kind ?? kinds[0] ?? 'note',
        date: note?.date ?? '',
        background_image: (note as any)?.background_image ?? null,
    });

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        if (note) {
            put(noteUpdate.url(note.id), {
                preserveScroll: true,
                onSuccess: () => onDone(),
            });

            return;
        }

        post(noteStore.url(), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onDone();
            },
        });
    }

    function handleImageChange(
        event: React.ChangeEvent<HTMLInputElement>,
    ): void {
        const file = event.target.files?.[0];
        if (!file) {
            setData('background_image', null);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setData('background_image', reader.result as string);
        };
        reader.readAsDataURL(file);
    }

    const hasImage = !!data.background_image;

    return (
        <form
            onSubmit={submit}
            noValidate
            className={cn(
                'flex flex-col gap-4 rounded-lg border p-4',
                hasImage
                    ? 'min-h-[150px] border-zinc-200 bg-cover bg-center bg-no-repeat dark:border-zinc-800' // Added min-h to prevent container collapse
                    : data.color && data.color.startsWith('#')
                      ? 'border-zinc-200'
                      : noteColorClass(data.color),
            )}
            style={
                hasImage
                    ? { backgroundImage: `url(${data.background_image})` } // Keep the inline style for definitive background application
                    : data.color && data.color.startsWith('#')
                      ? { backgroundColor: data.color }
                      : undefined
            }
        >
            <div className="flex flex-col gap-1">
                <label
                    htmlFor="note-title"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                    {t('notes.titleLabel')}
                </label>
                <input
                    id="note-title"
                    type="text"
                    value={data.title}
                    onChange={(event) => setData('title', event.target.value)}
                    placeholder={t('notes.titlePlaceholder')}
                    className={fieldClass}
                />
                {errors.title && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                        {errors.title}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <label
                    htmlFor="note-body"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                    {t('notes.bodyLabel')}
                </label>
                <textarea
                    id="note-body"
                    rows={4}
                    value={data.body}
                    onChange={(event) => setData('body', event.target.value)}
                    placeholder={t('notes.bodyPlaceholder')}
                    className={cn(fieldClass, 'resize-y')}
                />
                {errors.body && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                        {errors.body}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {t('notes.color')}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                    {colors.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => {
                                setData('color', color);
                                setData('background_image', null);
                            }}
                            aria-label={t(`notes.colors.${color}`)}
                            aria-pressed={data.color === color && !hasImage}
                            title={t(`notes.colors.${color}`)}
                            className={cn(
                                'h-7 w-7 rounded-full border transition',
                                noteSwatchClasses[color] ?? 'bg-zinc-300',
                                data.color === color && !hasImage
                                    ? 'ring-2 ring-zinc-500 ring-offset-2 dark:ring-offset-zinc-900'
                                    : 'border-transparent',
                            )}
                        />
                    ))}
                    <input
                        type="color"
                        value={
                            data.color.startsWith('#') ? data.color : '#fef3c7'
                        }
                        onChange={(event) => {
                            setData('color', event.target.value);
                            setData('background_image', null);
                        }}
                        className="h-8 w-12 cursor-pointer rounded border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                        aria-label={t('notes.customColor')}
                    />
                    <label className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                        {t('notes.backgroundImage')}
                    </label>
                    {hasImage && (
                        <button
                            type="button"
                            onClick={() => setData('background_image', null)}
                            className="rounded-md px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            {t('notes.removeBackground')}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex flex-1 flex-col gap-1">
                    <label
                        htmlFor="note-kind"
                        className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                    >
                        {t('notes.kindLabel')}
                    </label>
                    <select
                        id="note-kind"
                        value={data.kind}
                        onChange={(event) =>
                            setData('kind', event.target.value)
                        }
                        className={fieldClass}
                    >
                        {kinds.map((kind) => (
                            <option key={kind} value={kind}>
                                {t(`notes.kinds.${kind}`)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-1 flex-col gap-1">
                    <label
                        htmlFor="note-date"
                        className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                    >
                        {t('notes.dateLabel')}
                    </label>
                    <input
                        id="note-date"
                        type="date"
                        value={data.date}
                        onChange={(event) =>
                            setData('date', event.target.value)
                        }
                        className={fieldClass}
                    />
                    {errors.date && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                            {errors.date}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                    {processing ? t('notes.saving') : t('notes.save')}
                </button>
                {note ? (
                    <button
                        type="button"
                        onClick={onDone}
                        className="rounded-md px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        {t('notes.cancel')}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="rounded-md px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        {t('notes.reset')}
                    </button>
                )}
            </div>
        </form>
    );
}

export default function Notes({
    notes,
    colors,
    kinds,
}: NotesPageProps): React.JSX.Element {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const [editingId, setEditingId] = useState<number | null>(null);
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [query, setQuery] = useState<string>('');

    const editing = notes.find((note) => note.id === editingId) ?? null;

    const filteredNotes = notes.filter((note) => {
        if (filter !== 'all' && note.kind !== filter) {
            return false;
        }
        if (query.trim()) {
            const q = query.toLowerCase();
            const title = (note.title ?? '').toLowerCase();
            const body = (note.body ?? '').toLowerCase();
            if (!title.includes(q) && !body.includes(q)) {
                return false;
            }
        }
        return true;
    });

    function confirmRemove(): void {
        if (!noteToDelete) {
            return;
        }

        router.delete(noteDestroy.url(noteToDelete.id), {
            preserveScroll: true,
            onFinish: () => setNoteToDelete(null),
        });
    }

    return (
        <>
            <Head title={t('notes.title')} />

            <div className="min-h-screen text-[#1b1b18] dark:text-[#EDEDEC]">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                {t('common.brand')}
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {t('notes.title')}
                            </h1>
                            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                                {t('notes.subtitle')}
                            </p>
                        </div>

                        <DiaryNav />
                    </header>

                    <div className="m-auto mb-8 max-w-3xl">
                        <NoteForm
                            key={editing?.id ?? 'new'}
                            note={editing}
                            colors={colors}
                            kinds={kinds}
                            onDone={() => setEditingId(null)}
                        />
                    </div>

                    {notes.length > 0 && (
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t('notes.searchPlaceholder')}
                                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                            />
                            <button
                                type="button"
                                onClick={() => setFilter('all')}
                                className={cn(
                                    'rounded-full px-3 py-1 text-xs transition',
                                    filter === 'all'
                                        ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
                                )}
                            >
                                {t('notes.filters.all')}
                            </button>
                            {kinds.map((kind) => (
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
                                    {t(`notes.kinds.${kind}`)}
                                </button>
                            ))}
                        </div>
                    )}

                    {filteredNotes.length === 0 && notes.length > 0 && (
                        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {t('notes.noResults')}
                        </p>
                    )}

                    {filteredNotes.length > 0 && (
                        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredNotes.map((note) => (
                                <li
                                    key={note.id}
                                    className={cn(
                                        'flex flex-col gap-2 rounded-lg border p-4',
                                        (note as any).background_image
                                            ? 'border-zinc-200 bg-cover bg-center bg-no-repeat dark:border-zinc-800'
                                            : note.color &&
                                                note.color.startsWith('#')
                                              ? 'border-zinc-200'
                                              : noteColorClass(note.color),
                                    )}
                                    style={
                                        (note as any).background_image
                                            ? {
                                                  backgroundImage: `url(${(note as any).background_image})`,
                                              }
                                            : note.color &&
                                                note.color.startsWith('#')
                                              ? {
                                                    backgroundColor: note.color,
                                                }
                                              : undefined
                                    }
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                            {t(`notes.kinds.${note.kind}`)}
                                        </span>
                                        {note.date && (
                                            <span className="text-xs text-zinc-700 dark:text-zinc-300">
                                                {formatLongDate(
                                                    note.date,
                                                    locale,
                                                )}
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

                                    <div className="mt-auto flex items-center gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEditingId(note.id)
                                            }
                                            className="text-xs text-zinc-600 underline-offset-2 transition hover:underline dark:text-zinc-300"
                                        >
                                            {t('notes.edit')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setNoteToDelete(note)
                                            }
                                            className="text-xs text-red-600 underline-offset-2 transition hover:underline dark:text-red-400"
                                        >
                                            {t('notes.delete')}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={noteToDelete !== null}
                destructive
                title={t('notes.delete')}
                message={t('notes.confirmDelete')}
                confirmLabel={t('notes.delete')}
                cancelLabel={t('notes.cancel')}
                onConfirm={confirmRemove}
                onCancel={() => setNoteToDelete(null)}
            />
        </>
    );
}
