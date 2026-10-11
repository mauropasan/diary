import { Head, Link } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { home } from '@/routes';
import { markdown as diaryMarkdown } from '@/routes/diary/export';

const MOOD_LABELS: Record<number, string> = {
    1: 'Muy mal',
    2: 'Mal',
    3: 'Regular',
    4: 'Bien',
    5: 'Muy bien',
};

type ExportEntry = {
    date: string;
    title: string | null;
    content: string | null;
    mood: number | null;
    tags: string[];
};

type ExportProps = {
    entries: ExportEntry[];
};

export default function Export({ entries }: ExportProps) {
    return (
        <>
            <Head title="Exportar" />

            <div className="min-h-screen bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC] print:bg-white print:text-black">
                <div className="mx-auto max-w-3xl px-6 py-8">
                    <div className="mb-8 flex items-center justify-between gap-3 print:hidden">
                        <Link
                            href={home.url()}
                            className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                            ← Ir a hoy
                        </Link>

                        <div className="flex items-center gap-2">
                            <a
                                href={diaryMarkdown.url()}
                                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                            >
                                Descargar Markdown
                            </a>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                            >
                                Imprimir / Guardar como PDF
                            </button>
                        </div>
                    </div>

                    <h1 className="mb-8 text-2xl font-semibold tracking-tight">
                        Diario
                    </h1>

                    {entries.length === 0 && (
                        <p className="text-sm text-zinc-400 dark:text-zinc-500">
                            Todavía no hay entradas.
                        </p>
                    )}

                    <div className="flex flex-col gap-10">
                        {entries.map((entry) => (
                            <article
                                key={entry.date}
                                className="break-inside-avoid"
                            >
                                <header className="mb-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                                    <p className="text-xs text-zinc-400 capitalize dark:text-zinc-500">
                                        {format(
                                            parseISO(entry.date),
                                            "EEEE, d 'de' MMMM 'de' yyyy",
                                            { locale: es },
                                        )}
                                    </p>
                                    {entry.title && (
                                        <h2 className="mt-1 text-xl font-semibold">
                                            {entry.title}
                                        </h2>
                                    )}
                                    {(entry.mood !== null ||
                                        entry.tags.length > 0) && (
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            {entry.mood !== null &&
                                                `Ánimo: ${MOOD_LABELS[entry.mood] ?? entry.mood}`}
                                            {entry.mood !== null &&
                                                entry.tags.length > 0 &&
                                                ' · '}
                                            {entry.tags.length > 0 &&
                                                `Etiquetas: ${entry.tags.join(', ')}`}
                                        </p>
                                    )}
                                </header>

                                {entry.content && (
                                    <div
                                        className="diary-content text-zinc-800 dark:text-zinc-200"
                                        dangerouslySetInnerHTML={{
                                            __html: entry.content,
                                        }}
                                    />
                                )}
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
