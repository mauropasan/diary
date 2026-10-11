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
    type Ref,
} from 'react';
import { update as diaryUpdate } from '@/routes/diary';
import { cn } from '@/lib/utils';
import TagInput from '@/components/TagInput';

export type DiaryEditorHandle = {
    flushSave(onFinished?: () => void): void;
};

const MOODS = [
    { value: 1, label: 'Muy mal' },
    { value: 2, label: 'Mal' },
    { value: 3, label: 'Regular' },
    { value: 4, label: 'Bien' },
    { value: 5, label: 'Muy bien' },
] as const;

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

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
    const timezone = usePage().props.diary.timezone;

    const [title, setTitle] = useState(initialTitle ?? '');
    const [mood, setMood] = useState<number | null>(initialMood ?? null);
    const [tags, setTags] = useState<string[]>(initialTags ?? []);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [hasUnsaved, setHasUnsaved] = useState(false);

    const titleRef = useRef(title);
    const moodRef = useRef(mood);
    const tagsRef = useRef(tags);
    const dateRef = useRef(date);
    const dirtyRef = useRef(false);
    const timerRef = useRef<number | null>(null);

    function formatCurrentTime(): string {
        return new Intl.DateTimeFormat('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: timezone,
        }).format(new Date());
    }

    function timeInsertion(): string {
        return `<p>${formatCurrentTime()} — </p>`;
    }

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: 'Escribe aquí tu día…' }),
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
        setHasUnsaved(false);
        editor?.commands.setContent(initialContent ?? '');
    }, [date]);

    const insertTime = (): void => {
        editor?.chain().focus().insertContent(timeInsertion()).run();
    };

    const statusLabel =
        saveState === 'pending' || saveState === 'saving'
            ? 'Guardando…'
            : saveState === 'saved'
              ? 'Guardado'
              : saveState === 'error'
                ? 'No se pudo guardar'
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
                    placeholder="Título (opcional)"
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
                    <option value="">Ánimo</option>
                    {MOODS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
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
                        title="Insertar la hora actual (Ctrl+Mayús+H)"
                        className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        Hora actual
                    </button>

                    <span
                        className={cn(
                            'text-xs',
                            saveState === 'error'
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
