import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ApiError, NetworkError, type DiarioApi } from '@/native/api';
import {
    db,
    decodeEntry,
    decodeNote,
    decodeSchedule,
    dirtyEntries,
    dirtyNotes,
    dirtySchedules,
    getBlob,
    getEntry,
    KV,
    kvGet,
    kvSet,
    putBlob,
    putEntry,
    putNote,
    putSchedule,
} from '@/native/db';
import { currentApi, currentDek, markPairingBroken, noteActivity } from '@/native/session';
import { sodiumReady, toArrayBufferView } from '@/native/crypto';
import type {
    AttachmentMeta,
    EntryRecord,
    NoteRecord,
    ScheduleRecord,
    WireAttachment,
    WireEntry,
    WireNote,
    WireSchedule,
} from '@/native/types';

/**
 * The synchroniser.
 *
 * Local writes are applied immediately (the diary is local-first: the UI
 * never waits for the network) and flagged `dirty`. Sync runs when the app
 * returns to the foreground, a few seconds after an edit, or on a manual
 * pull-to-refresh; each run uploads pending attachments, pushes dirty
 * records, then pulls everything changed on the server since the cursor.
 *
 * Conflicts resolve per record by last write wins: the larger `updatedAt`
 * (epoch ms) wins on both sides, ties go to the server.
 */

export type SyncState = {
    running: boolean;
    /** True when the last attempt could not reach the server. */
    offline: boolean;
    /** A real (reachable but failed) error worth showing. */
    message: string | null;
    lastSyncAt: number | null;
};

let syncState: SyncState = {
    running: false,
    offline: false,
    message: null,
    lastSyncAt: null,
};

const listeners = new Set<() => void>();

function setSync(patch: Partial<SyncState>): void {
    syncState = { ...syncState, ...patch };

    for (const listener of listeners) {
        listener();
    }
}

export function subscribeSync(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

export function getSyncState(): SyncState {
    return syncState;
}

export async function initSync(): Promise<void> {
    const lastSyncAt = await kvGet<number>(KV.lastSyncAt);

    if (typeof lastSyncAt === 'number') {
        setSync({ lastSyncAt });
    }
}

/* ------------------------------ triggering --------------------------- */

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Called after every local write: queues a sync a few seconds later so
 * typing in the editor does not turn into one request per keystroke.
 */
export function notifyLocalChange(): void {
    if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void syncNow('change');
    }, 4_000);
}

/** Resume/visibility/online triggers. Registered once from the app root. */
export async function registerSyncTriggers(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
        await App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                noteActivity();
                void syncNow('resume');
            }
        });

        return;
    }

    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                void syncNow('resume');
            }
        });

        window.addEventListener('online', () => void syncNow('online'));
    }
}

/* ------------------------------ the run ------------------------------ */

let running = false;

let queued = false;

export async function syncNow(reason = 'manual'): Promise<void> {
    const api = currentApi();
    const dek = currentDek();

    if (api === null || dek === null) {
        return; // local-only mode, or locked
    }

    if (running) {
        queued = true;

        return;
    }

    running = true;
    setSync({ running: true, message: null });

    try {
        await uploadPendingAttachments(api, dek);
        await pushDirty(api, dek);
        await pullChanges(api, dek);

        const lastSyncAt = Date.now();

        await kvSet(KV.lastSyncAt, lastSyncAt);
        setSync({ running: false, offline: false, message: null, lastSyncAt });
    } catch (error) {
        if (error instanceof NetworkError) {
            setSync({ running: false, offline: true, message: null });
        } else if (
            error instanceof ApiError &&
            (error.status === 401 || error.status === 403)
        ) {
            setSync({
                running: false,
                offline: false,
                message: 'sync.reauth',
            });
            await markPairingBroken('sync.reauth');
        } else {
            setSync({
                running: false,
                offline: false,
                message:
                    error instanceof ApiError
                        ? error.message
                        : 'Something went wrong while syncing.',
            });
        }
    } finally {
        running = false;

        if (queued) {
            queued = false;
            void syncNow(reason);
        }
    }
}

/* ------------------------------- push -------------------------------- */

async function pushDirty(api: DiarioApi, dek: string): Promise<void> {
    const entries = await dirtyEntries(dek);
    const notes = await dirtyNotes(dek);
    const schedules = await dirtySchedules(dek);

    if (entries.length + notes.length + schedules.length === 0) {
        return;
    }

    const { results } = await api.push({
        entries: entries.map((entry) => ({
            date: entry.date,
            title: entry.title,
            content: entry.content,
            mood: entry.mood,
            tags: entry.tags,
            updated_ms: entry.updatedAt,
            deleted: entry.deleted,
        })),
        notes: notes.map((note) => ({
            local_id: note.localId,
            server_id: note.serverId,
            title: note.title,
            body: note.body,
            color: note.color,
            kind: note.kind,
            date: note.date,
            updated_ms: note.updatedAt,
            deleted: note.deleted,
        })),
        schedules: schedules.map((schedule) => ({
            local_id: schedule.localId,
            server_id: schedule.serverId,
            name: schedule.name,
            slots: schedule.slots,
            only_weekdays: schedule.onlyWeekdays,
            active: schedule.active,
            position: schedule.position,
            updated_ms: schedule.updatedAt,
            deleted: schedule.deleted,
        })),
    });

    for (const result of results.entries) {
        await applyServerEntry(dek, result.date, result.record);
    }

    for (const result of results.notes) {
        await applyServerNote(dek, result.local_id, result.record);
    }

    for (const result of results.schedules) {
        await applyServerSchedule(dek, result.local_id, result.record);
    }
}

/**
 * Write the server's post-push state into the local row: `dirty` is
 * resolved either way (the server now holds what this device meant), and
 * attachments the server has never seen (still uploading) are kept.
 */
async function applyServerEntry(
    dek: string,
    date: string,
    record: WireEntry,
): Promise<void> {
    const local = await getEntry(dek, date);

    if (local === undefined) {
        return; // deleted locally in the meantime; the tombstone already went out
    }

    if (record.deleted === true) {
        await putEntry(dek, { ...local, deleted: true, dirty: false });

        return;
    }

    const pending = local.attachments.filter(
        (attachment) => attachment.pendingUpload && attachment.serverId === null,
    );

    await putEntry(dek, {
        date,
        title: record.title ?? null,
        content: record.content ?? null,
        mood: record.mood ?? null,
        tags: record.tags ?? [],
        attachments: mergeAttachments(pending, record.attachments ?? []),
        updatedAt: record.updated_ms,
        deleted: false,
        dirty: false,
        serverId: local.serverId,
    });
}

async function applyServerNote(
    dek: string,
    localId: string,
    record: WireNote,
): Promise<void> {
    const row = await db.notes.get(localId);

    if (row === undefined) {
        return;
    }

    const local = decodeNote(dek, row);

    if (record.deleted === true) {
        await putNote(dek, { ...local, deleted: true, dirty: false });

        return;
    }

    await putNote(dek, {
        ...local,
        serverId: record.server_id,
        title: record.title ?? null,
        body: record.body ?? null,
        color: record.color ?? local.color,
        kind: record.kind ?? local.kind,
        date: record.date ?? null,
        updatedAt: record.updated_ms,
        deleted: false,
        dirty: false,
    });
}

async function applyServerSchedule(
    dek: string,
    localId: string,
    record: WireSchedule,
): Promise<void> {
    const row = await db.schedules.get(localId);

    if (row === undefined) {
        return;
    }

    const local = decodeSchedule(dek, row);

    if (record.deleted === true) {
        await putSchedule(dek, { ...local, deleted: true, dirty: false });

        return;
    }

    await putSchedule(dek, {
        ...local,
        serverId: record.server_id,
        name: record.name ?? local.name,
        slots: record.slots ?? null,
        onlyWeekdays: record.only_weekdays ?? local.onlyWeekdays,
        active: record.active ?? local.active,
        position: record.position ?? local.position,
        updatedAt: record.updated_ms,
        deleted: false,
        dirty: false,
    });
}

/* ------------------------------- pull -------------------------------- */

async function pullChanges(api: DiarioApi, dek: string): Promise<void> {
    let cursor = (await kvGet<number>(KV.cursor)) ?? 0;
    let pages = 0;

    for (;;) {
        const page = await api.pull(cursor);

        for (const wire of page.entries) {
            await applyPullEntry(dek, wire);
        }

        for (const wire of page.notes) {
            await applyPullNote(dek, wire);
        }

        for (const wire of page.schedules) {
            await applyPullSchedule(dek, wire);
        }

        cursor = page.cursor;
        await kvSet(KV.cursor, cursor);
        pages += 1;

        if (!page.has_more || pages >= 50) {
            return;
        }
    }
}

async function applyPullEntry(dek: string, wire: WireEntry): Promise<void> {
    const local = await getEntry(dek, wire.date);

    if (wire.deleted === true) {
        if (local === undefined || local.deleted) {
            return;
        }

        if (local.dirty && local.updatedAt >= wire.updated_ms) {
            return; // this device's version is newer: the next push resurrects it
        }

        await putEntry(dek, { ...local, deleted: true, dirty: false });

        return;
    }

    if (
        local?.dirty === true &&
        local.updatedAt >= wire.updated_ms
    ) {
        return; // local edit is newer or equal: keep it and push next run
    }

    const record: EntryRecord = {
        date: wire.date,
        title: wire.title ?? null,
        content: wire.content ?? null,
        mood: wire.mood ?? null,
        tags: wire.tags ?? [],
        attachments: mergeAttachments(local?.attachments ?? [], wire.attachments ?? []),
        updatedAt: wire.updated_ms,
        deleted: false,
        dirty: false,
        serverId: local?.serverId ?? null,
    };

    await putEntry(dek, record);
}

/** Reconcile the server's attachment list with what this device knows. */
function mergeAttachments(
    local: AttachmentMeta[],
    wire: WireAttachment[],
): AttachmentMeta[] {
    const merged: AttachmentMeta[] = wire.map((item) => {
        const existing = local.find(
            (attachment) =>
                attachment.serverId === item.id ||
                attachment.id === String(item.id),
        );

        return {
            id: String(item.id),
            serverId: item.id,
            kind: item.kind,
            mimeType: item.mime_type,
            size: item.size,
            originalName: item.original_name || existing?.originalName || '',
            pendingUpload: false,
            blobKey: existing?.blobKey ?? `srv-${item.id}`,
            createdAt:
                existing?.createdAt ??
                (item.created_at ? Date.parse(item.created_at) : Date.now()),
        };
    });

    // Files created on this device that the server has not received yet.
    for (const attachment of local) {
        if (attachment.pendingUpload && attachment.serverId === null) {
            merged.push(attachment);
        }
    }

    return merged;
}

async function applyPullNote(dek: string, wire: WireNote): Promise<void> {
    const row =
        (await db.notes.where('serverId').equals(wire.server_id).first()) ??
        undefined;

    if (wire.deleted === true) {
        if (row === undefined) {
            return;
        }

        const local = decodeNote(dek, row);

        if (local.dirty && local.updatedAt >= wire.updated_ms) {
            return;
        }

        if (!local.deleted) {
            await putNote(dek, { ...local, deleted: true, dirty: false });
        }

        return;
    }

    if (row !== undefined) {
        const local = decodeNote(dek, row);

        if (local.dirty && local.updatedAt >= wire.updated_ms) {
            return;
        }

        await applyServerNote(dek, local.localId, {
            ...wire,
            local_id: local.localId,
        });

        return;
    }

    const record: NoteRecord = {
        localId: crypto.randomUUID(),
        serverId: wire.server_id,
        title: wire.title ?? null,
        body: wire.body ?? null,
        color: wire.color ?? 'yellow',
        kind: wire.kind ?? 'note',
        date: wire.date ?? null,
        createdAt: Date.now(),
        updatedAt: wire.updated_ms,
        deleted: false,
        dirty: false,
    };

    await putNote(dek, record);
}

async function applyPullSchedule(
    dek: string,
    wire: WireSchedule,
): Promise<void> {
    const row =
        (await db.schedules
            .where('serverId')
            .equals(wire.server_id)
            .first()) ?? undefined;

    if (wire.deleted === true) {
        if (row === undefined) {
            return;
        }

        const local = decodeSchedule(dek, row);

        if (local.dirty && local.updatedAt >= wire.updated_ms) {
            return;
        }

        if (!local.deleted) {
            await putSchedule(dek, { ...local, deleted: true, dirty: false });
        }

        return;
    }

    if (row !== undefined) {
        const local = decodeSchedule(dek, row);

        if (local.dirty && local.updatedAt >= wire.updated_ms) {
            return;
        }

        await applyServerSchedule(dek, local.localId, {
            ...wire,
            local_id: local.localId,
        });

        return;
    }

    const record: ScheduleRecord = {
        localId: crypto.randomUUID(),
        serverId: wire.server_id,
        name: wire.name ?? '',
        slots: wire.slots ?? null,
        onlyWeekdays: wire.only_weekdays ?? false,
        active: wire.active ?? true,
        position: wire.position ?? 0,
        updatedAt: wire.updated_ms,
        deleted: false,
        dirty: false,
    };

    await putSchedule(dek, record);
}

/* --------------------------- attachments ----------------------------- */

/**
 * Upload every attachment this device created while offline, then rewrite
 * the entry content to reference the server ids. A network problem aborts
 * the sync (it will retry); a server-side rejection only skips that file so
 * one bad upload cannot wedge syncing forever.
 */
async function uploadPendingAttachments(
    api: DiarioApi,
    dek: string,
): Promise<void> {
    const rows = await db.entries.toArray();

    for (const row of rows) {
        const entry = decodeEntry(dek, row);

        const pending = entry.attachments.filter(
            (attachment) =>
                attachment.pendingUpload &&
                attachment.serverId === null &&
                attachment.blobKey !== null,
        );

        if (pending.length === 0 || entry.deleted) {
            continue;
        }

        for (const attachment of pending) {
            const bytes = await getBlob(dek, attachment.blobKey as string);

            if (bytes === null) {
                continue; // blob gone: drop the reference on the next push
            }

            let uploaded: WireAttachment;

            try {
                uploaded = await api.uploadAttachment(
                    entry.date,
                    new File([toArrayBufferView(bytes)], attachment.originalName, {
                        type: attachment.mimeType,
                    }),
                    attachment.originalName,
                );
            } catch (error) {
                if (error instanceof NetworkError) {
                    throw error; // offline: keep pending, the sync stops here
                }

                continue; // rejected (too large, invalid…): keep for inspection
            }

            const oldId = attachment.id;
            const blobKey = `srv-${uploaded.id}`;

            await putBlob(dek, blobKey, bytes, attachment.mimeType);

            if (attachment.blobKey !== null && attachment.blobKey !== blobKey) {
                await db.blobs.delete(attachment.blobKey);
            }

            if (entry.content !== null && oldId !== String(uploaded.id)) {
                entry.content = entry.content.split(`data-attachment-id="${oldId}"`).join(
                    `data-attachment-id="${uploaded.id}"`,
                );
            }

            entry.attachments = entry.attachments.map((item) =>
                item.id === oldId
                    ? {
                          ...item,
                          id: String(uploaded.id),
                          serverId: uploaded.id,
                          pendingUpload: false,
                          blobKey,
                      }
                    : item,
            );
            entry.dirty = true;
        }

        await putEntry(dek, entry);
    }
}

/**
 * Ensure an attachment's bytes are cached locally, downloading (and
 * re-encrypting for Dexie) on the first view so the image keeps working
 * with the server offline.
 */
export async function ensureAttachmentCached(
    dek: string,
    api: DiarioApi,
    attachment: AttachmentMeta,
): Promise<Blob | null> {
    if (attachment.serverId === null) {
        return null;
    }

    const key = attachment.blobKey ?? `srv-${attachment.serverId}`;
    const bytes = await getBlob(dek, key);

    if (bytes !== null) {
        return new Blob([toArrayBufferView(bytes)], {
            type: attachment.mimeType,
        });
    }

    const remote = await api.downloadAttachment(attachment.serverId);
    const plain = new Uint8Array(await remote.arrayBuffer());

    await putBlob(dek, key, plain, attachment.mimeType);

    return new Blob([toArrayBufferView(plain)], {
        type: attachment.mimeType,
    });
}

/* --------------------------- re-keying ------------------------------ */

/**
 * Re-encrypt everything on the device under a new DEK and flag every row
 * dirty, so the next sync pushes it all to the newly connected server.
 *
 * This is the local → server merge: the wizard pairs, then hands us the
 * server's key. Blobs are opened with the old key and rewritten with the
 * new one; a blob that cannot be opened (already server-encrypted under a
 * different key) is dropped rather than aborting the whole merge.
 */
export async function rekeyLocalData(
    oldDek: string,
    newDek: string,
): Promise<void> {
    await sodiumReady();

    const entryRows = await db.entries.toArray();

    for (const row of entryRows) {
        const record = decodeEntry(oldDek, row);

        await putEntry(newDek, { ...record, dirty: true });
    }

    const noteRows = await db.notes.toArray();

    for (const row of noteRows) {
        const record = decodeNote(oldDek, row);

        await putNote(newDek, { ...record, dirty: true });
    }

    const scheduleRows = await db.schedules.toArray();

    for (const row of scheduleRows) {
        const record = decodeSchedule(oldDek, row);

        await putSchedule(newDek, { ...record, dirty: true });
    }

    const blobRows = await db.blobs.toArray();

    for (const row of blobRows) {
        try {
            const plain = await getBlob(oldDek, row.id);

            if (plain !== null) {
                await putBlob(newDek, row.id, plain, row.mimeType);
            }
        } catch {
            await db.blobs.delete(row.id);
        }
    }
}
