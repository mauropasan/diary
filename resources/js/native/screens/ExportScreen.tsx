import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { allEntriesForExport } from '@/native/repo';
import type { EntryRecord } from '@/native/types';
import { DownloadIcon, ShareIcon, InfoIcon } from '@/native/components/icons';

/**
 * Markdown export — the client-side twin of the server's `ExportController`.
 *
 * The whole diary is rendered as one Markdown document in the same shape the
 * server produces (title heading, a `## ` section per day, mood/tags in the
 * italic meta line, attachments as a bullet list), written to the cache
 * directory and handed to Android's share sheet. Nothing leaves the device
 * except through whatever app the user picks to share into.
 */

/** `Mood: Good`, mirroring `messages.export.mood` on the server. */
function moodMeta(mood: number, moodLabel: (value: number) => string): string {
    return `Mood: ${moodLabel(mood)}`;
}

/** `Tags: home, work`, mirroring `messages.export.tags` on the server. */
function tagsMeta(tags: string[]): string {
    return `Tags: ${tags.join(', ')}`;
}

function toMarkdown(
    entries: EntryRecord[],
    options: { title: string; moodLabel: (value: number) => string },
): string {
    const sections = entries.map((entry) => {
        const heading = entry.title !== null && entry.title !== '' ? entry.title : entry.date;
        const meta: string[] = [entry.date];

        if (entry.mood !== null) {
            meta.push(moodMeta(entry.mood, options.moodLabel));
        }

        if (entry.tags.length > 0) {
            meta.push(tagsMeta(entry.tags));
        }

        // The stored content is HTML (the editor's rich text); the server's
        // converter strips tags, so the plain text is the faithful result.
        let body = (entry.content ?? '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (entry.attachments.length > 0) {
            const media = entry.attachments
                .map((attachment) => `- [${attachment.originalName}](${attachment.id})`)
                .join('\n');

            body = body !== '' ? `${body}\n\n${media}` : media;
        }

        return `## ${heading}\n\n_${meta.join(' · ')}_` + (body !== '' ? `\n\n${body}` : '');
    });

    return `# ${options.title}\n\n${sections.join('\n\n---\n\n')}\n`;
}

/** Where the generated file lands and how it is handed to Android. */
const EXPORT_PATH = 'diary-export.md';

function fallbackCopy(markdown: string): void {
    void navigator.clipboard?.writeText(markdown).catch(() => undefined);
}

export default function ExportScreen(): React.JSX.Element {
    const { t } = useTranslation();
    const [entries, setEntries] = useState<EntryRecord[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        void allEntriesForExport().then(setEntries);
    }, []);

    const moodLabel = (value: number): string => t(`editor.moods.${value}`);

    const markdown = (): string =>
        toMarkdown(entries ?? [], {
            title: t('export.title'),
            moodLabel,
        });

    const share = async (): Promise<void> => {
        setBusy(true);
        setMessage(null);

        const document = markdown();

        try {
            if (Capacitor.isNativePlatform()) {
                await Filesystem.writeFile({
                    path: EXPORT_PATH,
                    data: document,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8,
                });

                const { uri } = await Filesystem.getUri({
                    path: EXPORT_PATH,
                    directory: Directory.Cache,
                });

                await Share.share({
                    files: [uri],
                    dialogTitle: t('native.export.title'),
                });
            } else {
                // The share sheet is a native-only surface; in the browser
                // fall back to the clipboard so the flow still does something.
                fallbackCopy(document);
                setMessage(t('native.export.copied'));
            }
        } catch {
            // A cancelled share or a missing handler is not an error worth
            // alarming about — keep the document available via copy.
            fallbackCopy(document);
            setMessage(t('native.export.copied'));
        } finally {
            setBusy(false);
        }
    };

    const copy = async (): Promise<void> => {
        fallbackCopy(markdown());
        setMessage(t('native.export.copied'));
    };

    const empty = entries !== null && entries.length === 0;

    return (
        <div>
            <div className="mb-6 flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:ring-zinc-800">
                <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {empty
                        ? t('export.empty')
                        : t('native.export.hint', { count: entries?.length ?? 0 })}
                </p>
            </div>

            {message !== null && (
                <p className="mb-4 text-center text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
            )}

            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={() => void share()}
                    disabled={busy || empty === true}
                    className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition active:scale-[0.99] disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                    <ShareIcon className="h-5 w-5" />
                    {busy ? t('native.export.exporting') : t('native.export.share')}
                </button>

                <button
                    type="button"
                    onClick={() => void copy()}
                    disabled={empty === true}
                    className="flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition active:scale-[0.99] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                    <DownloadIcon className="h-5 w-5" />
                    {t('native.export.copy')}
                </button>
            </div>
        </div>
    );
}
