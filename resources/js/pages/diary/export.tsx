import { Head } from '@inertiajs/react';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import DiaryNav from '@/components/DiaryNav';
import { formatLongDate } from '@/lib/dates';
import { markdown as diaryMarkdown } from '@/routes/diary/export';

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
    const { t, i18n } = useTranslation();
    const locale = i18n.language;

    return (
        <>
            <Head title={t('export.title')} />

            <div className="min-h-screen text-[#1b1b18] dark:text-[#EDEDEC] print:bg-white print:text-black">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    <div className="mb-8 flex items-center justify-between gap-3 print:hidden">
                        <div className="flex items-center gap-2">
                            <a
                                href={diaryMarkdown.url()}
                                className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                            >
                                {t('export.download')}
                            </a>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                            >
                                {t('export.print')}
                            </button>
                        </div>

                        <DiaryNav />
                    </div>

                    <h1 className="mb-8 text-2xl font-semibold tracking-tight">
                        {t('common.brand')}
                    </h1>

                    {(() => {
                        const moodedEntries = entries.filter(
                            (e) => e.mood !== null,
                        );
                        const total = moodedEntries.length;
                        const avg =
                            total > 0
                                ? moodedEntries.reduce(
                                      (s, e) => s + (e.mood || 0),
                                      0,
                                  ) / total
                                : null;
                        const dist = [1, 2, 3, 4, 5].map(
                            (m) =>
                                moodedEntries.filter((e) => e.mood === m)
                                    .length,
                        );
                        return total > 0 ? (
                            <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900 print:border-zinc-300 print:bg-white">
                                <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    {t('export.moodSummary')}
                                </h2>
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    <div>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                            {t('export.moodedDays')}
                                        </p>
                                        <p className="text-zinc-800 dark:text-zinc-200">
                                            {total}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                            {t('export.averageMood')}
                                        </p>
                                        <p className="text-zinc-800 dark:text-zinc-200">
                                            {avg !== null
                                                ? avg.toFixed(1)
                                                : '—'}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                            {t('export.distribution')}
                                        </p>
                                        <p className="text-zinc-800 dark:text-zinc-200">
                                            {[1, 2, 3, 4, 5]
                                                .map(
                                                    (m) =>
                                                        `${m}:${dist[m - 1]}`,
                                                )
                                                .join(' · ')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null;
                    })()}

                    {entries.length === 0 && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {t('export.empty')}
                        </p>
                    )}

                    <div className="m-auto flex max-w-3xl flex-col gap-10">
                        {entries.map((entry) => (
                            <article
                                key={entry.date}
                                className="break-inside-avoid print:break-after-page print:pt-8 last:print:break-after-auto"
                            >
                                <header className="mb-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                                    <p className="text-xs text-zinc-600 capitalize dark:text-zinc-400">
                                        {formatLongDate(entry.date, locale)}
                                    </p>
                                    {entry.title && (
                                        <h2 className="mt-1 text-xl font-semibold">
                                            {entry.title}
                                        </h2>
                                    )}
                                    {(entry.mood !== null ||
                                        entry.tags.length > 0) && (
                                        <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">
                                            {entry.mood !== null &&
                                                t('export.moodMeta', {
                                                    mood: t(
                                                        `editor.moods.${entry.mood}`,
                                                    ),
                                                })}
                                            {entry.mood !== null &&
                                                entry.tags.length > 0 &&
                                                ' · '}
                                            {entry.tags.length > 0 &&
                                                t('export.tagsMeta', {
                                                    tags: entry.tags.join(', '),
                                                })}
                                        </p>
                                    )}
                                </header>

                                {entry.content && (
                                    <div
                                        className="diary-content text-zinc-800 dark:text-zinc-200"
                                        dangerouslySetInnerHTML={{
                                            __html: DOMPurify.sanitize(
                                                entry.content,
                                            ),
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
