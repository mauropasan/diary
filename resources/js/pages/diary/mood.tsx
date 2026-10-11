import { Head, Link, router } from '@inertiajs/react';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    format,
    parseISO,
    startOfMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { home, logout } from '@/routes';
import {
    exportMethod as diaryExport,
    search as diarySearch,
} from '@/routes/diary';
import { cn } from '@/lib/utils';

const MOOD_LABELS: Record<number, string> = {
    1: 'Muy mal',
    2: 'Mal',
    3: 'Regular',
    4: 'Bien',
    5: 'Muy bien',
};

const MOOD_COLORS: Record<number, string> = {
    1: 'bg-red-500',
    2: 'bg-orange-400',
    3: 'bg-amber-400',
    4: 'bg-lime-500',
    5: 'bg-emerald-500',
};

type MoodPoint = {
    date: string;
    mood: number;
};

type MoodProps = {
    month: string;
    moods: MoodPoint[];
    canGoNext: boolean;
};

export default function Mood({ month, moods, canGoNext }: MoodProps) {
    const [loading, setLoading] = useState(false);

    const visibleMonth = parseISO(`${month}-01`);
    const days = eachDayOfInterval({
        start: startOfMonth(visibleMonth),
        end: endOfMonth(visibleMonth),
    });

    const byDate = new Map(moods.map((point) => [point.date, point.mood]));
    const average =
        moods.length > 0
            ? moods.reduce((total, point) => total + point.mood, 0) /
              moods.length
            : null;

    function loadMonth(target: Date): void {
        setLoading(true);

        router.reload({
            only: ['month', 'moods', 'canGoNext'],
            data: { mes: format(target, 'yyyy-MM') },
            onFinish: () => setLoading(false),
        });
    }

    return (
        <>
            <Head title="Ánimo" />

            <div className="min-h-screen bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <div className="mx-auto max-w-3xl px-6 py-8">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Diario
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                Ánimo
                            </h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <Link
                                href={diarySearch.url()}
                                className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                Buscar
                            </Link>
                            <Link
                                href={diaryExport.url()}
                                className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                Exportar
                            </Link>
                            <Link
                                href={home.url()}
                                className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                Ir a hoy
                            </Link>
                            <Link
                                as="button"
                                type="button"
                                method="post"
                                href={logout.url()}
                                className="rounded-md px-2 py-1 text-xs text-zinc-500 ring-1 ring-transparent transition hover:text-zinc-800 focus:outline-none focus-visible:ring-zinc-500 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                Cerrar sesión
                            </Link>
                        </div>
                    </header>

                    <div className="mb-6 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                loadMonth(addMonths(visibleMonth, -1))
                            }
                            aria-label="Mes anterior"
                            className="rounded-md px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        >
                            ‹
                        </button>

                        <div className="text-center">
                            <p className="text-sm font-medium text-zinc-700 capitalize dark:text-zinc-200">
                                {format(visibleMonth, 'LLLL yyyy', {
                                    locale: es,
                                })}
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                {average !== null
                                    ? `Media ${average.toFixed(1)} · ${moods.length} ${moods.length === 1 ? 'día' : 'días'}`
                                    : 'Sin datos este mes'}
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={!canGoNext}
                            onClick={() =>
                                loadMonth(addMonths(visibleMonth, 1))
                            }
                            aria-label="Mes siguiente"
                            className={cn(
                                'rounded-md px-2 py-1 text-sm transition',
                                canGoNext
                                    ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                                    : 'cursor-not-allowed text-zinc-300 dark:text-zinc-700',
                            )}
                        >
                            ›
                        </button>
                    </div>

                    <div
                        className={cn(
                            'rounded-lg border border-zinc-200 p-4 transition dark:border-zinc-800',
                            loading && 'opacity-50',
                        )}
                    >
                        <div className="flex items-end gap-1">
                            {days.map((day) => {
                                const iso = format(day, 'yyyy-MM-dd');
                                const mood = byDate.get(iso);
                                const label =
                                    mood !== undefined
                                        ? `${format(day, "d 'de' MMMM", { locale: es })} · ${MOOD_LABELS[mood]}`
                                        : format(day, "d 'de' MMMM", {
                                              locale: es,
                                          });

                                return (
                                    <div
                                        key={iso}
                                        title={label}
                                        className="flex flex-1 flex-col items-center gap-1"
                                    >
                                        <div className="flex h-40 w-full items-end">
                                            <div
                                                className={cn(
                                                    'w-full rounded-t',
                                                    mood !== undefined
                                                        ? (MOOD_COLORS[mood] ??
                                                              'bg-zinc-400')
                                                        : 'bg-zinc-100 dark:bg-zinc-800',
                                                )}
                                                style={{
                                                    height:
                                                        mood !== undefined
                                                            ? `${(mood / 5) * 100}%`
                                                            : '4px',
                                                }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
                                            {format(day, 'd')}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <ul className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        {[1, 2, 3, 4, 5].map((value) => (
                            <li
                                key={value}
                                className="flex items-center gap-1.5"
                            >
                                <span
                                    className={cn(
                                        'h-2.5 w-2.5 rounded-full',
                                        MOOD_COLORS[value],
                                    )}
                                />
                                {MOOD_LABELS[value]}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );
}
