import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import TagInput from '@/native/components/TagInput';
import { NativeMedia } from '@/native/editor/media';
import { addLocalAttachment, saveEntry } from '@/native/repo';
import type { EntryRecord } from '@/native/types';

const MOOD_VALUES = [1, 2, 3, 4, 5] as const;

const MOOD_EMOJIS: Record<number, string> = {
    1: '😞',
    2: '😕',
    3: '😐',
    4: '🙂',
    5: '😄',
};

type SaveState = 'idle' | 'pending' | 'saved' | 'error';

type DayEditorProps = {
    date: string;
    entry: EntryRecord | null;
};

function countWords(text: string): number {
    const trimmed = text.trim();

    return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

/**
 * The diary editor of one day, offline-first.
 *
 * Saves go to the encrypted local store (debounced while typing) and the
 * sync engine picks the change up on its own schedule — the network is never
 * on the save path. Attachments are stored on the device and flagged for
 * upload; the sync step swaps their local ids for the server's afterwards.
 */
export default function DayEditor({
    date,
    entry,
}: DayEditorProps): React.JSX.Element {
    const { t, i18n } = useTranslation();

    const [title, setTitle] = useState(entry?.title ?? '');
    const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
    const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [uploading, setUploading] = useState(false);
    const [wordCount, setWordCount] = useState(0);

    const titleRef = useRef(title);
    const moodRef = useRef(mood);
    const tagsRef = useRef(tags);
    const dirtyRef = useRef(false);
    const timerRef = useRef<number | null>(null);
    const saveInFlightRef = useRef<Promise<void> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: () => t('editor.placeholder'),
            }),
            NativeMedia,
        ],
        content: entry?.content ?? '',
        onUpdate: ({ editor: current }) => {
            setWordCount(countWords(current.getText()));
            scheduleSave();
        },
    });

    const saveNow = (): Promise<void> => {
        if (saveInFlightRef.current !== null) {
            return saveInFlightRef.current;
        }

        dirtyRef.current = false;
        setSaveState('pending');

        const request = (async () => {
            try {
                await saveEntry(date, {
                    title: titleRef.current.trim(),
                    content: editor?.getHTML() ?? '',
                    mood: moodRef.current,
                    tags: tagsRef.current,
                });
                setSaveState('saved');
            } catch {
                dirtyRef.current = true;
                setSaveState('error');
            } finally {
                saveInFlightRef.current = null;
            }

            if (dirtyRef.current) {
                scheduleSave();
            }
        })();

        saveInFlightRef.current = request;

        return request;
    };

    const scheduleSave = (): void => {
        dirtyRef.current = true;
        setSaveState('pending');

        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
        }

        timerRef.current = window.setTimeout(() => {
            timerRef.current = null;

            if (dirtyRef.current) {
                void saveNow();
            }
        }, 1200);
    };

    /**
     * When the day changes (this component is keyed by date) any still-
     * pending edit is flushed under the OLD date before the component goes
     * away — the closure still holds that day's values. A save already in
     * flight is awaited first so the last edit is not dropped.
     */
    useEffect(() => {
        return () => {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
            }

            const flush = async (): Promise<void> => {
                if (saveInFlightRef.current !== null) {
                    await saveInFlightRef.current.catch(() => undefined);
                }

                if (dirtyRef.current) {
                    await saveNow().catch(() => undefined);
                }
            };

            void flush();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const insertTime = (): void => {
        const time = new Intl.DateTimeFormat(i18n.language, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(new Date());

        editor?.chain().focus().insertContent(`<p>${time} — </p>`).run();
    };

    async function handleFileChange(
        event: ChangeEvent<HTMLInputElement>,
    ): Promise<void> {
        const files = Array.from(event.target.files ?? []);

        event.target.value = '';

        if (files.length === 0) {
            return;
        }

        setUploading(true);

        try {
            for (const file of files) {
                const localId = crypto.randomUUID();

                await addLocalAttachment(date, file, localId);

                editor
                    ?.chain()
                    .focus()
                    .insertContent({
                        type: 'media',
                        attrs: {
                            attachmentId: localId,
                            kind: file.type.startsWith('image/')
                                ? 'image'
                                : file.type.startsWith('audio/')
                                    ? 'audio'
                                    : file.type.startsWith('video/')
                                        ? 'video'
                                        : 'file',
                            originalName: file.name,
                            mime: file.type || 'application/octet-stream',
                            size: file.size,
                            src: '',
                        },
                    })
                    .run();
            }
        } finally {
            setUploading(false);
        }
    }

    const statusLabel =
        uploading
            ? t('media.uploading')
            : saveState === 'pending'
                ? t('editor.saving')
                : saveState === 'saved'
                    ? t('editor.saved')
                    : saveState === 'error'
                        ? t('editor.saveError')
                        : '';

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-col items-start justify-between gap-2">
                <input
                    type="text"
                    value={title}
                    onChange={(event) => {
                        titleRef.current = event.target.value;
                        setTitle(event.target.value);
                        scheduleSave();
                    }}
                    placeholder={t('editor.titlePlaceholder')}
                    className="w-full border-none bg-transparent px-0 text-2xl font-semibold text-zinc-900 outline-none placeholder:text-zinc-600 dark:text-zinc-50 dark:placeholder:text-zinc-400"
                />

                <div
                    role="group"
                    aria-label={t('editor.moodPlaceholder')}
                    className="flex shrink-0 items-center gap-0.5"
                >
                    {MOOD_VALUES.map((value) => {
                        const selected = mood === value;

                        return (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={selected}
                                aria-label={t(`editor.moods.${value}`)}
                                title={t(`editor.moods.${value}`)}
                                onClick={() => {
                                    const next = selected ? null : value;
                                    moodRef.current = next;
                                    setMood(next);
                                    scheduleSave();
                                }}
                                className={cn(
                                    'flex min-h-10 min-w-10 items-center justify-center rounded-md px-1.5 py-0.5 text-xl leading-none transition',
                                    selected
                                        ? 'bg-zinc-100 dark:bg-zinc-800'
                                        : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0',
                                )}
                            >
                                {MOOD_EMOJIS[value]}
                            </button>
                        );
                    })}
                </div>
            </div>

            <TagInput
                value={tags}
                onChange={(next) => {
                    tagsRef.current = next;
                    setTags(next);
                    scheduleSave();
                }}
            />

            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={insertTime}
                        title={t('editor.insertTimeTitle')}
                        className="rounded-md px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        {t('editor.insertTime')}
                    </button>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        title={t('media.attachTitle')}
                        className="rounded-md px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        {t('media.attach')}
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => void handleFileChange(event)}
                    />

                    <span
                        role="status"
                        className={cn(
                            'text-xs',
                            saveState === 'error'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-zinc-600 dark:text-zinc-400',
                        )}
                    >
                        {statusLabel}
                    </span>
                    <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400">
                        {t('editor.wordCount', { count: wordCount })}
                    </span>
                </div>

                <EditorContent
                    editor={editor}
                    className="tiptap diary-content min-h-64 px-3 py-3 text-zinc-800 outline-none dark:text-zinc-200"
                />
            </div>
        </section>
    );
}
