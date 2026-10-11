import { Head, Link, router } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useRef, useState } from 'react';
import { home, logout } from '@/routes';
import {
    exportMethod as diaryExport,
    mood as diaryMood,
    search as diarySearch,
    show as diaryShow,
} from '@/routes/diary';

type SearchResult = {
    date: string;
    title: string | null;
    excerpt: string | null;
};

type SearchProps = {
    query: string;
    results: SearchResult[];
};

export default function Search({ query, results }: SearchProps) {
    const [value, setValue] = useState(query);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        const handle = window.setTimeout(() => {
            const trimmed = value.trim();

            router.get(
                diarySearch.url(),
                trimmed === '' ? {} : { q: trimmed },
                {
                    only: ['query', 'results'],
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 300);

        return () => window.clearTimeout(handle);
    }, [value]);

    const hasQuery = query.trim() !== '';

    return (
        <>
            <Head title="Buscar" />

            <div className="min-h-screen bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <div className="mx-auto max-w-3xl px-6 py-8">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Diario
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                Buscar
                            </h1>
                        </div>

                        <div className="flex items-center gap-2">
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

                    <input
                        type="search"
                        autoFocus
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder="Busca en tu diario…"
                        className="mb-8 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 transition outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600"
                    />

                    {!hasQuery && (
                        <p className="text-sm text-zinc-400 dark:text-zinc-500">
                            Escribe algo para buscar en el título, el contenido
                            o las etiquetas.
                        </p>
                    )}

                    {hasQuery && results.length === 0 && (
                        <p className="text-sm text-zinc-400 dark:text-zinc-500">
                            No se han encontrado entradas para «{query}».
                        </p>
                    )}

                    {results.length > 0 && (
                        <ul className="flex flex-col gap-4">
                            {results.map((result) => (
                                <li key={result.date}>
                                    <Link
                                        href={diaryShow.url(result.date)}
                                        className="block rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                                    >
                                        <p className="text-xs text-zinc-400 capitalize dark:text-zinc-500">
                                            {format(
                                                parseISO(result.date),
                                                "EEEE, d 'de' MMMM 'de' yyyy",
                                                { locale: es },
                                            )}
                                        </p>
                                        <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">
                                            {result.title || 'Sin título'}
                                        </p>
                                        {result.excerpt && (
                                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                {result.excerpt}
                                            </p>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}
