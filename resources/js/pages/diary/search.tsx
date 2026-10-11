import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DiaryNav from '@/components/DiaryNav';
import { formatLongDate } from '@/lib/dates';
import { noteColorClass } from '@/lib/noteColors';
import { cn } from '@/lib/utils';
import { search as diarySearch, show as diaryShow } from '@/routes/diary';

type SearchResult = {
    date: string;
    title: string | null;
    excerpt: string | null;
    kind?: string;
    color?: string;
    url?: string;
};

type SearchProps = {
    query: string;
    results: SearchResult[];
};

export default function Search({ query, results }: SearchProps) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
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
            <Head title={t('search.title')} />

            <div className="min-h-screen bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <div className="w-full px-6 py-8">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {t('common.brand')}
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {t('search.title')}
                            </h1>
                        </div>

                        <DiaryNav />
                    </header>

                    <input
                        type="search"
                        autoFocus
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder={t('search.placeholder')}
                        className="mb-8 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 transition outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600"
                    />

                    {!hasQuery && (
                        <p className="text-sm text-zinc-400 dark:text-zinc-500">
                            {t('search.empty')}
                        </p>
                    )}

                    {hasQuery && results.length === 0 && (
                        <p className="text-sm text-zinc-400 dark:text-zinc-500">
                            {t('search.noResults', { query })}
                        </p>
                    )}

                    {results.length > 0 && (
                        <ul className="flex flex-col gap-4">
                            {results.map((result) => (
                                <li
                                    key={`${result.kind ?? 'entry'}-${result.date}-${result.title}`}
                                >
                                    {result.kind === 'entry' && result.url ? (
                                        <Link
                                            href={result.url}
                                            className="block rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                                        >
                                            <p className="text-xs text-zinc-400 capitalize dark:text-zinc-500">
                                                {formatLongDate(
                                                    result.date,
                                                    locale,
                                                )}
                                            </p>
                                            <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">
                                                {result.title ||
                                                    t('search.untitled')}
                                            </p>
                                            {result.excerpt && (
                                                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                    {result.excerpt}
                                                </p>
                                            )}
                                        </Link>
                                    ) : (
                                        <div
                                            className={cn(
                                                'block rounded-lg border p-4',
                                                result.color
                                                    ? noteColorClass(
                                                          result.color,
                                                      )
                                                    : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900',
                                            )}
                                        >
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {formatLongDate(
                                                    result.date,
                                                    locale,
                                                )}
                                            </p>
                                            {result.kind &&
                                                result.kind !== 'entry' && (
                                                    <span className="mt-1 inline-block rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-black/30 dark:text-zinc-300">
                                                        {t(
                                                            `notes.kinds.${result.kind}`,
                                                        )}
                                                    </span>
                                                )}
                                            <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">
                                                {result.title ||
                                                    t('search.untitled')}
                                            </p>
                                            {result.excerpt && (
                                                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                                                    {result.excerpt}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}
