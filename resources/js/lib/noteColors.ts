/**
 * Appearance helpers for notes.
 *
 * The stored `color` and `kind` values are plaintext keys; the actual Tailwind
 * classes the user sees live here so the notes page and the diary calendar can
 * render the same notes consistently.
 */

import type { CSSProperties } from 'react';

const noteColorClasses: Record<string, string> = {
    yellow: 'border-amber-200 bg-amber-100 dark:border-amber-900 dark:bg-amber-950',
    pink: 'border-rose-200 bg-rose-100 dark:border-rose-900 dark:bg-rose-950',
    blue: 'border-sky-200 bg-sky-100 dark:border-sky-900 dark:bg-sky-950',
    green: 'border-emerald-200 bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950',
    purple: 'border-violet-200 bg-violet-100 dark:border-violet-900 dark:bg-violet-950',
    gray: 'border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800',
};

export const noteSwatchClasses: Record<string, string> = {
    yellow: 'bg-amber-300',
    pink: 'bg-rose-300',
    blue: 'bg-sky-300',
    green: 'bg-emerald-300',
    purple: 'bg-violet-300',
    gray: 'bg-zinc-300',
};

function noteColorClass(color: string): string {
    return noteColorClasses[color] ?? noteColorClasses.gray;
}

export type NoteSurfaceInput = {
    color: string;
    background_image?: string | null;
};

/**
 * Resolve the card surface (border/background classes + inline style) for a
 * note. A custom background image wins over hex colors, which win over the
 * named palette keys.
 */
export function noteSurface(note: NoteSurfaceInput): {
    className: string;
    style?: CSSProperties;
} {
    if (note.background_image) {
        return {
            className:
                'border-zinc-200 bg-cover bg-center bg-no-repeat dark:border-zinc-800',
            style: { backgroundImage: `url(${note.background_image})` },
        };
    }

    if (note.color.startsWith('#')) {
        return {
            className: 'border-zinc-200',
            style: { backgroundColor: note.color },
        };
    }

    return { className: noteColorClass(note.color) };
}
