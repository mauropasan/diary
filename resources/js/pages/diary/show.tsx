import { Head, Link, router, usePage } from '@inertiajs/react';
import { addDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRef, useState } from 'react';
import DiaryCalendar from '@/components/DiaryCalendar';
import DiaryEditor, { type DiaryEditorHandle } from '@/components/DiaryEditor';
import LockScreen from '@/components/LockScreen';
import { lockDiary } from '@/lib/lockDiary';
import { useInactivityLock } from '@/lib/useInactivityLock';
import { home, logout } from '@/routes';
import {
    exportMethod as diaryExport,
    lock as diaryLock,
    mood as diaryMood,
    password as diaryPassword,
    search as diarySearch,
    show as diaryShow,
} from '@/routes/diary';

type Memory = {
    date: string;
    title: string | null;
};

type EntryProps = {
    date: string;
    entry: {
        title: string | null;
        content: string | null;
        mood: number | null;
    };
    canGoNext: boolean;
    calendar: string[];
    calendarMonth: string;
    tags: string[];
    memories: Memory[];
    prompt: string;
    streak: {
        current: number;
        longest: number;
    };
};

export default function Show({
    date,
    entry,
    canGoNext,
    calendar,
    calendarMonth,
    tags,
    memories,
    prompt,
    streak,
}: EntryProps) {
    const editorRef = useRef<DiaryEditorHandle>(null);
    const [locked, setLocked] = useState(false);
    const [flashDismissed, setFlashDismissed] = useState(false);
    const [recoveryKeyDismissed, setRecoveryKeyDismissed] = useState(false);
    const { diary, flash } = usePage().props;

    const remaining = useInactivityLock({
        lockAfterMinutes: diary.lockAfterMinutes,
        onWarning: () => editorRef.current?.flushSave(),
        onLock: () =>
            editorRef.current?.flushSave(() => {
                lockDiary(diaryLock.url());
                setLocked(true);
            }),
    });

    const day = new Date(`${date}T12:00:00`);
    const previous = format(addDays(day, -1), 'yyyy-MM-dd');
    const next = format(addDays(day, 1), 'yyyy-MM-dd');

    function navigateTo(target: string): void {
        editorRef.current?.flushSave(() => router.visit(diaryShow.url(target)));
    }

    function logoutNow(): void {
        editorRef.current?.flushSave(() => router.post(logout.url()));
    }

    function formatCountdown(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const rest = seconds % 60;

        return `${minutes}:${rest.toString().padStart(2, '0')}`;
    }

    return (
        <>
            <Head title={format(day, 'EEEE, d', { locale: es })} />

            <div className="min-h-screen bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <div className="mx-auto max-w-3xl px-6 py-8">
                    {flash.recoveryKey && !recoveryKeyDismissed && (
                        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                            <div className="mb-2 flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-medium">
                                        Guarda tu clave de recuperación
                                    </p>
                                    <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                                        Es la única copia y no se volverá a
                                        mostrar. Con ella puedes recuperar el
                                        diario si olvidas la contraseña.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRecoveryKeyDismissed(true)
                                    }
                                    aria-label="Cerrar"
                                    className="shrink-0 leading-none text-amber-600 transition hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-100"
                                >
                                    ×
                                </button>
                            </div>
                            <code className="block rounded bg-amber-100 px-3 py-2 font-mono text-xs break-all dark:bg-amber-900/50">
                                {flash.recoveryKey}
                            </code>
                        </div>
                    )}

                    {flash.status && !flashDismissed && (
                        <div className="mb-6 flex items-start justify-between gap-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                            <span>{flash.status}</span>
                            <button
                                type="button"
                                onClick={() => setFlashDismissed(true)}
                                aria-label="Cerrar"
                                className="shrink-0 leading-none text-emerald-600 transition hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-100"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {format(day, 'LLLL yyyy', { locale: es })}
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {format(day, 'EEEE, d', { locale: es })}
                            </h1>
                            {streak.current > 0 && (
                                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                                    {streak.current}{' '}
                                    {streak.current === 1
                                        ? 'día seguido'
                                        : 'días seguidos'}
                                    {streak.longest > streak.current &&
                                        ` · récord: ${streak.longest}`}
                                </p>
                            )}
                            {remaining > 0 && remaining <= 120 && (
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                    Bloqueo por inactividad en{' '}
                                    {formatCountdown(remaining)}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Link
                                href={diarySearch.url()}
                                className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                Buscar
                            </Link>
                            <Link
                                href={diaryMood.url()}
                                className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                Ánimo
                            </Link>
                            <Link
                                href={diaryExport.url()}
                                className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                Exportar
                            </Link>
                            <Link
                                href={diaryPassword.url()}
                                className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                Contraseña
                            </Link>
                            <button
                                type="button"
                                onClick={logoutNow}
                                className="rounded-md px-2 py-1 text-xs text-zinc-500 ring-1 ring-transparent transition hover:text-zinc-800 focus:outline-none focus-visible:ring-zinc-500 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </header>

                    <div className="mb-8 flex items-center justify-between gap-3 sm:justify-start">
                        <button
                            type="button"
                            onClick={() => navigateTo(previous)}
                            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                        >
                            ← Anterior
                        </button>

                        {canGoNext && (
                            <button
                                type="button"
                                onClick={() => navigateTo(next)}
                                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                            >
                                Siguiente →
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() =>
                                editorRef.current?.flushSave(() =>
                                    router.visit(home.url()),
                                )
                            }
                            className="rounded-md px-3 py-1.5 text-sm text-zinc-500 underline-offset-2 transition hover:underline dark:text-zinc-400"
                        >
                            Ir a hoy
                        </button>
                    </div>

                    <main className="flex flex-col gap-8 lg:flex-row">
                        <div className="flex-1">
                            {!entry.content && prompt && (
                                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                                    <span className="font-medium text-zinc-600 dark:text-zinc-300">
                                        Sugerencia:
                                    </span>{' '}
                                    {prompt}
                                </p>
                            )}

                            <DiaryEditor
                                date={date}
                                initialTitle={entry.title}
                                initialContent={entry.content}
                                initialMood={entry.mood}
                                initialTags={tags}
                                handleRef={editorRef}
                            />
                        </div>

                        <DiaryCalendar
                            date={date}
                            month={calendarMonth}
                            entryDates={calendar}
                            onNavigate={navigateTo}
                        />
                    </main>

                    {memories.length > 0 && (
                        <section className="mt-8">
                            <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                Tal día como hoy
                            </h2>

                            <ul className="flex flex-col gap-2">
                                {memories.map((memory) => (
                                    <li key={memory.date}>
                                        <Link
                                            href={diaryShow.url(memory.date)}
                                            className="group flex items-baseline gap-3 rounded-md border border-zinc-200 px-3 py-2 text-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                                        >
                                            <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
                                                {format(
                                                    parseISO(memory.date),
                                                    "d 'de' LLLL 'de' yyyy",
                                                    { locale: es },
                                                )}
                                            </span>
                                            {memory.title && (
                                                <span className="truncate font-medium text-zinc-800 group-hover:underline dark:text-zinc-100">
                                                    {memory.title}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            </div>

            {locked && <LockScreen onUnlocked={() => setLocked(false)} />}
        </>
    );
}
