import { router, usePage } from '@inertiajs/react';
import { Extension } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
    type ChangeEvent,
    type Ref,
} from 'react';
import { useTranslation } from 'react-i18next';
import { MediaNode, type MediaData } from '@/extensions/MediaNode';
import { update as diaryUpdate } from '@/routes/diary';
import diaryAttachments from '@/routes/diary/attachments';
import { cn } from '@/lib/utils';
import TagInput from '@/components/TagInput';

export type DiaryEditorHandle = {
    flushSave(onFinished?: () => void): void;
};

const MOOD_VALUES = [1, 2, 3, 4, 5] as const;

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

type UploadState = 'idle' | 'uploading' | 'error';

/**
 * Read the Laravel XSRF token from its cookie so media can be uploaded with a
 * plain `fetch` instead of going through Inertia (we need the response to stay
 * in the editor without a page reload).
 */
function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

type DiaryEditorProps = {
    date: string;
    initialTitle?: string | null;
    initialContent?: string | null;
    initialMood?: number | null;
    initialTags?: string[];
    handleRef?: Ref<DiaryEditorHandle>;
};

export default function DiaryEditor({
    date,
    initialTitle,
    initialContent,
    initialMood,
    initialTags,
    handleRef,
}: DiaryEditorProps) {
    const { t, i18n } = useTranslation();
    const timezone = usePage().props.diary.timezone;

    const [title, setTitle] = useState(initialTitle ?? '');
    const [mood, setMood] = useState<number | null>(initialMood ?? null);
    const [tags, setTags] = useState<string[]>(initialTags ?? []);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [hasUnsaved, setHasUnsaved] = useState(false);

    const titleRef = useRef(title);
    const moodRef = useRef(mood);
    const tagsRef = useRef(tags);
    const dateRef = useRef(date);
    const dirtyRef = useRef(false);
    const timerRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function formatCurrentTime(): string {
        return new Intl.DateTimeFormat(i18n.language, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: timezone,
        }).format(new Date());
    }

    function timeInsertion(): string {
        return `<p>${formatCurrentTime()} — </p>`;
    }

    async function uploadMedia(file: File): Promise<void> {
        setUploadState('uploading');

        const form = new FormData();
        form.append('attachment', file);

        try {
            const response = await fetch(
                diaryAttachments.store.url(dateRef.current),
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': xsrfToken(),
                    },
                    body: form,
                },
            );

            if (!response.ok) {
                throw new Error('upload failed');
            }

            const payload = (await response.json()) as {
                attachment: {
                    id: number;
                    kind: MediaData['kind'];
                    original_name: string;
                    mime: string;
                    size: number;
                    src: string;
                };
            };
            const attachment = payload.attachment;

            editor
                ?.chain()
                .focus()
                .insertContent({
                    type: 'media',
                    attrs: {
                        attachmentId: attachment.id,
                        kind: attachment.kind,
                        originalName: attachment.original_name,
                        mime: attachment.mime,
                        size: attachment.size,
                        src: attachment.src,
                    },
                })
                .run();

            setUploadState('idle');
        } catch {
            setUploadState('error');
        }
    }

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: () => t('editor.placeholder'),
            }),
            MediaNode,
            Extension.create({
                name: 'insertCurrentTime',
                addKeyboardShortcuts() {
                    return {
                        'Mod-Shift-h': ({ editor: currentEditor }) => {
                            currentEditor
                                .chain()
                                .focus()
                                .insertContent(timeInsertion())
                                .run();

                            return true;
                        },
                    };
                },
            }),
        ],
        content: initialContent ?? '',
        editorProps: {
            handleDrop(_view, event, _slice, moved) {
                if (moved) {
                    return false;
                }

                const files = Array.from(event.dataTransfer?.files ?? []);

                if (files.length === 0) {
                    return false;
                }

                files.forEach((file) => void uploadMedia(file));

                return true;
            },
            handlePaste(_view, event) {
                const files = Array.from(event.clipboardData?.files ?? []);

                if (files.length === 0) {
                    return false;
                }

                files.forEach((file) => void uploadMedia(file));

                return true;
            },
        },
        onUpdate: () => scheduleSave(),
    });

    const saveNow = (onFinished?: () => void): void => {
        dirtyRef.current = false;

        setSaveState('saving');
        router.put(
            diaryUpdate.url(dateRef.current),
            {
                title: titleRef.current.trim(),
                content: editor?.getHTML() ?? '',
                mood: moodRef.current,
                tags: tagsRef.current,
            },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    setSaveState('saved');
                    setHasUnsaved(dirtyRef.current);

                    onFinished?.();

                    if (dirtyRef.current) {
                        scheduleSave();
                    }
                },
                onError: () => {
                    dirtyRef.current = true;
                    setSaveState('error');
                    setHasUnsaved(true);
                },
            },
        );
    };

    const scheduleSave = (): void => {
        dirtyRef.current = true;
        setSaveState('pending');
        setHasUnsaved(true);

        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
        }

        timerRef.current = window.setTimeout(() => {
            timerRef.current = null;

            if (dirtyRef.current) {
                saveNow();
            }
        }, 2000);
    };

    useImperativeHandle(handleRef, () => ({
        flushSave(onFinished?: () => void): void {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            if (!dirtyRef.current) {
                onFinished?.();

                return;
            }

            saveNow(onFinished);
        },
    }));

    useEffect(() => {
        return () => {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!hasUnsaved) {
            return;
        }

        const handler = (event: BeforeUnloadEvent): void => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handler);

        return () => window.removeEventListener('beforeunload', handler);
    }, [hasUnsaved]);

    useEffect(() => {
        dateRef.current = date;
        titleRef.current = initialTitle ?? '';
        moodRef.current = initialMood ?? null;
        tagsRef.current = initialTags ?? [];
        dirtyRef.current = false;
        setTitle(titleRef.current);
        setMood(moodRef.current);
        setTags(tagsRef.current);
        setSaveState('idle');
        setUploadState('idle');
        setHasUnsaved(false);
        editor?.commands.setContent(initialContent ?? '');
    }, [date]);

    const insertTime = (): void => {
        editor?.chain().focus().insertContent(timeInsertion()).run();
    };

    function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (file) {
            void uploadMedia(file);
        }
    }

    const statusLabel =
        uploadState === 'uploading'
            ? t('media.uploading')
            : uploadState === 'error'
              ? t('media.error')
              : saveState === 'pending' || saveState === 'saving'
                ? t('editor.saving')
                : saveState === 'saved'
                  ? t('editor.saved')
                  : saveState === 'error'
                    ? t('editor.saveError')
                    : '';

    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
                <input
                    type="text"
                    value={title}
                    onChange={(event) => {
                        titleRef.current = event.target.value;
                        setTitle(event.target.value);
                        scheduleSave();
                    }}
                    placeholder={t('editor.titlePlaceholder')}
                    className="w-full border-none bg-transparent px-0 text-2xl font-semibold text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-600"
                />

                <select
                    value={mood ?? ''}
                    onChange={(event) => {
                        const next =
                            event.target.value === ''
                                ? null
                                : Number(event.target.value);
                        moodRef.current = next;
                        setMood(next);
                        scheduleSave();
                    }}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-700 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                    <option value="">{t('editor.moodPlaceholder')}</option>
                    {MOOD_VALUES.map((value) => (
                        <option key={value} value={value}>
                            {t(`editor.moods.${value}`)}
                        </option>
                    ))}
                </select>
            </div>

            <TagInput
                value={tags}
                onChange={(next) => {
                    tagsRef.current = next;
                    setTags(next);
                    scheduleSave();
                }}
            />

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={insertTime}
                        title={t('editor.insertTimeTitle')}
                        className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        {t('editor.insertTime')}
                    </button>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadState === 'uploading'}
                        title={t('media.attachTitle')}
                        className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        {t('media.attach')}
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <span
                        className={cn(
                            'text-xs',
                            uploadState === 'error' || saveState === 'error'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-zinc-400 dark:text-zinc-500',
                        )}
                    >
                        {statusLabel}
                    </span>
                </div>

                <EditorContent
                    editor={editor}
                    className="tiptap min-h-[24rem] px-3 py-3 text-zinc-800 outline-none dark:text-zinc-200"
                />
            </div>
        </section>
    );
}
