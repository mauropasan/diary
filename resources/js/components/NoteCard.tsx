import { useTranslation } from 'react-i18next';
import { formatShortDayMonth } from '@/lib/dates';
import { noteSurface } from '@/lib/noteColors';
import { cn } from '@/lib/utils';

export type NoteCardData = {
    id: number;
    title: string | null;
    body: string | null;
    color: string;
    kind: string;
    date: string | null;
    background_image?: string | null;
};

type NoteCardProps = {
    note: NoteCardData;
    showDate?: boolean;
};

export default function NoteCard({ note, showDate = false }: NoteCardProps) {
    const { t, i18n } = useTranslation();
    const surface = noteSurface(note);

    return (
        <li
            className={cn('rounded-lg border p-3', surface.className)}
            style={surface.style}
        >
            {showDate && note.date ? (
                <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {t(`notes.kinds.${note.kind}`)}
                    </span>
                    <span className="text-[10px] text-zinc-700 dark:text-zinc-300">
                        {formatShortDayMonth(note.date, i18n.language)}
                    </span>
                </div>
            ) : (
                <span className="mb-1 inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {t(`notes.kinds.${note.kind}`)}
                </span>
            )}
            {note.title && (
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {note.title}
                </p>
            )}
            {note.body && (
                <p className="mt-1 text-xs whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
                    {note.body}
                </p>
            )}
        </li>
    );
}
