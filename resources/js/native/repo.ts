import {
    db,
    decodeEntry,
    decodeNote,
    decodeSchedule,
    entrySummaries,
    getBlob,
    getEntry,
    listNotes,
    listSchedules,
    putBlob,
    putEntry,
    putNote,
    putSchedule,
} from '@/native/db';
import { sodiumReady, toArrayBufferView } from '@/native/crypto';
import { currentApi, currentDek } from '@/native/session';
import { ensureAttachmentCached, notifyLocalChange } from '@/native/sync';
import type {
    AttachmentMeta,
    EntryRecord,
    NoteRecord,
    ScheduleRecord,
} from '@/native/types';

/**
 * The repository screens read and write through.
 *
 * Every mutation stamps `updatedAt` with the device clock (the LWW value
 * the sync engine compares), flags the row `dirty` and pokes the syncer —
 * so no screen can accidentally produce an unrecorded local change.
 * Reads return plaintext records and assume the diary is unlocked.
 */

function dek(): string {
    const key = currentDek();

    if (key === null) {
        throw new Error('The diary is locked.');
    }

    return key;
}

/** True when a title/content pair counts as an empty day (mirror of the server). */
export function entryIsEmpty(
    entry: Pick<EntryRecord, 'title' | 'content' | 'mood' | 'attachments'>,
): boolean {
    const text = (entry.content ?? '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/ /g, ' ')
        .trim();

    return (
        (entry.title ?? '').trim() === '' &&
        text === '' &&
        entry.mood === null &&
        entry.attachments.length === 0
    );
}

/* ------------------------------ entries ------------------------------ */

export async function loadEntry(date: string): Promise<EntryRecord | null> {
    const entry = await getEntry(dek(), date);

    if (entry === undefined || entry.deleted) {
        return null;
    }

    return entry;
}

export type EntryDraft = {
    title: string | null;
    content: string | null;
    mood: number | null;
    tags: string[];
};

/**
 * Create or replace a day. An empty draft removes the day (soft delete,
 * exactly like the web), so navigating away from a blank day leaves no row.
 */
export async function saveEntry(
    date: string,
    draft: EntryDraft,
): Promise<EntryRecord | null> {
    const key = dek();
    const existing = (await getEntry(key, date)) ?? null;
    const merged: EntryRecord = {
        date,
        title: draft.title,
        content: draft.content,
        mood: draft.mood,
        tags: draft.tags,
        attachments: existing?.attachments ?? [],
        updatedAt: Date.now(),
        deleted: false,
        dirty: true,
        serverId: existing?.serverId ?? null,
    };

    if (entryIsEmpty(merged)) {
        if (existing !== null && !existing.deleted) {
            await putEntry(key, { ...existing, deleted: true, dirty: true, updatedAt: merged.updatedAt });
            notifyLocalChange();

            return null;
        }

        if (existing === null) {
            return null;
        }

        await putEntry(key, { ...existing, updatedAt: merged.updatedAt, dirty: true });

        notifyLocalChange();

        return merged;
    }

    await putEntry(key, merged);
    notifyLocalChange();

    return merged;
}

/* ---------------------------- attachments ---------------------------- */

/**
 * Store a picked file on the device and register it on the day: the bytes
 * go into the encrypted blob store under a local id the editor embeds in
 * the content, and the entry is flagged for the next sync (the upload step
 * swaps the local id for the server's afterwards).
 */
export async function addLocalAttachment(
    date: string,
    file: File,
    localId: string,
): Promise<AttachmentMeta> {
    const key = dek();
    const entry = (await getEntry(key, date)) ?? {
        date,
        title: null,
        content: null,
        mood: null,
        tags: [],
        attachments: [],
        updatedAt: Date.now(),
        deleted: false,
        dirty: true,
        serverId: null,
    };

    const blobKey = `loc-${localId}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    await sodiumReady();
    await putBlob(key, blobKey, bytes, file.type || 'application/octet-stream');

    const attachment: AttachmentMeta = {
        id: localId,
        serverId: null,
        kind: file.type.startsWith('image/') ? 'image' : 'file',
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        originalName: file.name,
        pendingUpload: true,
        blobKey,
        createdAt: Date.now(),
    };

    await putEntry(key, {
        ...entry,
        attachments: [...entry.attachments, attachment],
        updatedAt: Date.now(),
        dirty: true,
        deleted: false,
    });
    notifyLocalChange();

    return attachment;
}

/** Forget an attachment the user removed (blob and metadata go together). */
export async function removeLocalAttachment(
    date: string,
    localId: string,
): Promise<void> {
    const key = dek();
    const entry = await getEntry(key, date);

    if (entry === undefined) {
        return;
    }

    const target = entry.attachments.find((item) => item.id === localId);

    if (target?.blobKey != null) {
        await db.blobs.delete(target.blobKey);
    }

    await putEntry(key, {
        ...entry,
        attachments: entry.attachments.filter((item) => item.id !== localId),
        updatedAt: Date.now(),
        dirty: true,
    });
    notifyLocalChange();
}

/**
 * A local blob rendered as an object URL for the editor/reader, downloading
 * from the server (and caching) when the file only exists there.
 */
export async function attachmentObjectUrl(
    attachment: AttachmentMeta,
): Promise<string | null> {
    const key = dek();
    const api = currentApi();

    if (attachment.serverId !== null && api !== null) {
        try {
            const blob = await ensureAttachmentCached(key, api, attachment);

            if (blob !== null) {
                return URL.createObjectURL(blob);
            }
        } catch {
            return null; // server unreachable and not cached: show a placeholder
        }
    }

    if (attachment.blobKey === null) {
        return null;
    }

    const bytes = await getBlob(key, attachment.blobKey);

    if (bytes === null) {
        return null;
    }

    return URL.createObjectURL(
        new Blob([toArrayBufferView(bytes)], { type: attachment.mimeType }),
    );
}

/* ------------------------------- notes ------------------------------- */

export async function loadNotes(): Promise<NoteRecord[]> {
    return listNotes(dek());
}

export type NoteDraft = {
    title: string | null;
    body: string | null;
    color: string;
    kind: string;
    date: string | null;
};

export async function createNote(draft: NoteDraft): Promise<NoteRecord> {
    const now = Date.now();
    const note: NoteRecord = {
        localId: crypto.randomUUID(),
        serverId: null,
        ...draft,
        createdAt: now,
        updatedAt: now,
        deleted: false,
        dirty: true,
    };

    await putNote(dek(), note);
    notifyLocalChange();

    return note;
}

export async function updateNote(
    localId: string,
    draft: NoteDraft,
): Promise<void> {
    const key = dek();
    const row = await db.notes.get(localId);

    if (row === undefined) {
        return;
    }

    await putNote(key, {
        ...decodeNote(key, row),
        ...draft,
        updatedAt: Date.now(),
        dirty: true,
        deleted: false,
    });
    notifyLocalChange();
}

export async function deleteNote(localId: string): Promise<void> {
    const key = dek();
    const row = await db.notes.get(localId);

    if (row === undefined) {
        return;
    }

    await putNote(key, {
        ...decodeNote(key, row),
        deleted: true,
        dirty: true,
        updatedAt: Date.now(),
    });
    notifyLocalChange();
}

/* ----------------------------- schedules ----------------------------- */

export async function loadSchedules(): Promise<ScheduleRecord[]> {
    return listSchedules(dek());
}

export async function createSchedule(input: {
    name: string;
    slots: string | null;
    onlyWeekdays: boolean;
}): Promise<ScheduleRecord> {
    const key = dek();
    const existing = await listSchedules(key);
    const schedule: ScheduleRecord = {
        localId: crypto.randomUUID(),
        serverId: null,
        name: input.name,
        slots: input.slots,
        onlyWeekdays: input.onlyWeekdays,
        active: true,
        position:
            existing.reduce((max, item) => Math.max(max, item.position), -1) + 1,
        updatedAt: Date.now(),
        deleted: false,
        dirty: true,
    };

    await putSchedule(key, schedule);
    notifyLocalChange();

    return schedule;
}

export async function updateSchedule(
    localId: string,
    patch: Partial<ScheduleRecord>,
): Promise<void> {
    const key = dek();
    const row = await db.schedules.get(localId);

    if (row === undefined) {
        return;
    }

    await putSchedule(key, {
        ...decodeSchedule(key, row),
        ...patch,
        localId,
        updatedAt: Date.now(),
        dirty: true,
        deleted: false,
    });
    notifyLocalChange();
}

export async function deleteSchedule(localId: string): Promise<void> {
    const key = dek();
    const row = await db.schedules.get(localId);

    if (row === undefined) {
        return;
    }

    await putSchedule(key, {
        ...decodeSchedule(key, row),
        deleted: true,
        dirty: true,
        updatedAt: Date.now(),
    });
    notifyLocalChange();
}

/**
 * Find an attachment across every day by the id the editor embeds in the
 * content (a server id, or the `local_…` uuid of a file still uploading).
 */
export async function attachmentByRef(
    id: string,
): Promise<AttachmentMeta | null> {
    const key = dek();
    const rows = await db.entries.toArray();

    for (const row of rows) {
        const match = decodeEntry(key, row).attachments.find(
            (attachment) => attachment.id === id,
        );

        if (match !== undefined) {
            return match;
        }
    }

    return null;
}

/* ------------------------------ derived ------------------------------ */

/**
 * Every day with content, oldest first — the input of the client-side
 * Markdown export (which, like the server's, decrypts everything on the
 * user's explicit request).
 */
export async function allEntriesForExport(): Promise<EntryRecord[]> {
    const key = dek();
    const rows = await db.entries.toArray();

    return rows
        .map((row) => decodeEntry(key, row))
        .filter((entry) => !entry.deleted && !entryIsEmpty(entry))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** The calendar/mood projection: dates, moods and today's streak. */
export async function loadDiaryIndex(): Promise<{
    days: { date: string; mood: number | null }[];
    streak: number;
}> {
    const summaries = (await entrySummaries()).filter((day) => !day.deleted);
    const days = summaries
        .map((day) => ({ date: day.date, mood: day.mood }))
        .sort((a, b) => (a.date < b.date ? 1 : -1));

    return { days, streak: computeStreak(days.map((day) => day.date)) };
}

/** Consecutive days with content ending today (or yesterday, if today is empty). */
export function computeStreak(dates: string[]): number {
    const set = new Set(dates);
    const today = new Date();
    const iso = (date: Date): string =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    if (!set.has(iso(today))) {
        today.setDate(today.getDate() - 1);

        if (!set.has(iso(today))) {
            return 0;
        }
    }

    let streak = 0;
    const cursor = new Date(today);

    while (set.has(iso(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}
