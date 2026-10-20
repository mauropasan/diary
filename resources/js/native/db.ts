import Dexie, { type Table } from 'dexie';
import {
    decryptField,
    encryptField,
    encryptBytes,
    decryptBytes,
    toArrayBufferView,
} from '@/native/crypto';
import type {
    AttachmentMeta,
    BlobRecord,
    EntryRecord,
    KnownServer,
    NoteRecord,
    Profile,
    ScheduleRecord,
} from '@/native/types';

/**
 * The device-local database.
 *
 * Every diary text field is encrypted with the DEK before it reaches Dexie
 * (see `crypto.ts`): IndexedDB itself gets envelopes, never plaintext, so a
 * backup or an extracted WebView database is unreadable without the key —
 * the same property the server's database has.
 *
 * Rows carry `updatedAt`/`deleted`/`dirty` mirroring the sync protocol:
 * `dirty` marks local changes not pushed yet, `deleted` is the local
 * tombstone until the server has seen it.
 */

/* ---------------------------- row shapes ---------------------------- */

type EntryRow = {
    date: string;
    titleEnc: string | null;
    contentEnc: string | null;
    mood: number | null;
    tagsEnc: string | null;
    attachmentsEnc: string | null;
    updatedAt: number;
    deleted: boolean;
    dirty: boolean;
    serverId: number | null;
};

type NoteRow = Omit<
    NoteRecord,
    'title' | 'body'
> & {
    titleEnc: string | null;
    bodyEnc: string | null;
};

type ScheduleRow = Omit<ScheduleRecord, 'name' | 'slots'> & {
    nameEnc: string;
    slotsEnc: string | null;
};

type KvRow = { key: string; value: unknown };

export const KV = {
    cursor: 'sync.cursor',
    knownServers: 'servers.known',
    lastSyncAt: 'sync.lastAt',
    biometricEnabled: 'security.biometric',
    lockMinutes: 'security.lockMinutes',
    updateDismissed: 'update.dismissedVersion',
} as const;

class DiarioDatabase extends Dexie {
    profiles!: Table<Profile, string>;
    entries!: Table<EntryRow, string>;
    notes!: Table<NoteRow, string>;
    schedules!: Table<ScheduleRow, string>;
    blobs!: Table<BlobRecord, string>;
    kv!: Table<KvRow, string>;

    constructor() {
        super('diario');

        // IndexedDB keys cannot be booleans, so `dirty`/`deleted` stay
        // unindexed: the tables are tiny (one row per day/note/schedule) and
        // the sync engine filters them in memory.
        this.version(1).stores({
            profiles: 'id, mode, serverUrl',
            entries: 'date, updatedAt',
            notes: 'localId, serverId, date, updatedAt',
            schedules: 'localId, serverId, position',
            blobs: 'id',
            kv: 'key',
        });
    }
}

export const db = new DiarioDatabase();

/* ----------------------------- key/value ---------------------------- */

export async function kvGet<T>(key: string): Promise<T | undefined> {
    const row = await db.kv.get(key);

    return row?.value as T | undefined;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
    await db.kv.put({ key, value });
}

export async function kvDelete(key: string): Promise<void> {
    await db.kv.delete(key);
}

/* ----------------------------- profile ------------------------------ */

export async function getProfile(): Promise<Profile | undefined> {
    return db.profiles.get('active');
}

export async function putProfile(profile: Profile): Promise<void> {
    await db.profiles.put(profile);
}

export async function patchProfile(
    patch: Partial<Profile>,
): Promise<Profile> {
    const current = await getProfile();
    const next: Profile = {
        id: 'active',
        mode: 'local',
        serverUrl: null,
        email: null,
        name: null,
        token: null,
        kdfSalt: null,
        wrappedKey: null,
        dekWrapped: null,
        recoveryAvailable: false,
        createdAt: Date.now(),
        ...current,
        ...patch,
    };

    await db.profiles.put(next);

    return next;
}

/** Servers remembered by this device, most recently used first. */
export async function knownServers(): Promise<KnownServer[]> {
    const list = await kvGet<KnownServer[]>(KV.knownServers);

    return Array.isArray(list) ? list : [];
}

export async function rememberServer(
    server: KnownServer,
): Promise<void> {
    const rest = (await knownServers()).filter(
        (item) => item.serverUrl !== server.serverUrl,
    );

    await kvSet(KV.knownServers, [server, ...rest].slice(0, 8));
}

/* ----------------------------- entries ------------------------------ */

/** Decrypt an entry row into its plaintext record. */
export function decodeEntry(dek: string, row: EntryRow): EntryRecord {
    return {
        date: row.date,
        title: row.titleEnc === null ? null : decryptField(dek, row.titleEnc),
        content:
            row.contentEnc === null ? null : decryptField(dek, row.contentEnc),
        mood: row.mood,
        tags: row.tagsEnc === null ? [] : (JSON.parse(decryptField(dek, row.tagsEnc)) as string[]),
        attachments:
            row.attachmentsEnc === null
                ? []
                : (JSON.parse(
                      decryptField(dek, row.attachmentsEnc),
                  ) as AttachmentMeta[]),
        updatedAt: row.updatedAt,
        deleted: row.deleted,
        dirty: row.dirty,
        serverId: row.serverId,
    };
}

/** Encrypt a plaintext entry into its storage row. */
export function encodeEntry(
    dek: string,
    record: EntryRecord,
): EntryRow {
    return {
        date: record.date,
        titleEnc:
            record.title === null || record.title === ''
                ? null
                : encryptField(dek, record.title),
        contentEnc:
            record.content === null || record.content === ''
                ? null
                : encryptField(dek, record.content),
        mood: record.mood,
        tagsEnc:
            record.tags.length === 0
                ? null
                : encryptField(dek, JSON.stringify(record.tags)),
        attachmentsEnc:
            record.attachments.length === 0
                ? null
                : encryptField(dek, JSON.stringify(record.attachments)),
        updatedAt: record.updatedAt,
        deleted: record.deleted,
        dirty: record.dirty,
        serverId: record.serverId,
    };
}

/** Read one entry (already decrypted); undefined when the day is unknown. */
export async function getEntry(
    dek: string,
    date: string,
): Promise<EntryRecord | undefined> {
    const row = await db.entries.get(date);

    return row ? decodeEntry(dek, row) : undefined;
}

/** Write one entry (encrypting it) — the single write path for diary days. */
export async function putEntry(
    dek: string,
    record: EntryRecord,
): Promise<void> {
    await db.entries.put(encodeEntry(dek, record));
}

/**
 * The dates and moods of every known day (calendar and mood chart), read
 * without decrypting any text: only the plaintext index columns are used.
 */
export async function entrySummaries(): Promise<
    { date: string; mood: number | null; deleted: boolean }[]
> {
    const rows = await db.entries.toArray();

    return rows.map((row) => ({
        date: row.date,
        mood: row.mood,
        deleted: row.deleted,
    }));
}

/* ------------------------------ notes ------------------------------- */

export function decodeNote(dek: string, row: NoteRow): NoteRecord {
    return {
        localId: row.localId,
        serverId: row.serverId,
        title: row.titleEnc === null ? null : decryptField(dek, row.titleEnc),
        body: row.bodyEnc === null ? null : decryptField(dek, row.bodyEnc),
        color: row.color,
        kind: row.kind,
        date: row.date,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deleted: row.deleted,
        dirty: row.dirty,
    };
}

export function encodeNote(dek: string, record: NoteRecord): NoteRow {
    return {
        localId: record.localId,
        serverId: record.serverId,
        titleEnc:
            record.title === null || record.title === ''
                ? null
                : encryptField(dek, record.title),
        bodyEnc:
            record.body === null || record.body === ''
                ? null
                : encryptField(dek, record.body),
        color: record.color,
        kind: record.kind,
        date: record.date,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        deleted: record.deleted,
        dirty: record.dirty,
    };
}

export async function listNotes(dek: string): Promise<NoteRecord[]> {
    const rows = await db.notes.toArray();

    return rows
        .map((row) => decodeNote(dek, row))
        .filter((note) => !note.deleted)
        .sort((a, b) => {
            // Dated notes first (newest day), then loose ones (newest id-ish).
            if ((a.date === null) !== (b.date === null)) {
                return a.date === null ? 1 : -1;
            }

            if (a.date !== null && b.date !== null && a.date !== b.date) {
                return a.date < b.date ? 1 : -1;
            }

            return b.createdAt - a.createdAt;
        });
}

export async function putNote(dek: string, record: NoteRecord): Promise<void> {
    await db.notes.put(encodeNote(dek, record));
}

/* ---------------------------- schedules ----------------------------- */

export function decodeSchedule(
    dek: string,
    row: ScheduleRow,
): ScheduleRecord {
    return {
        localId: row.localId,
        serverId: row.serverId,
        name: decryptField(dek, row.nameEnc),
        slots: row.slotsEnc === null ? null : decryptField(dek, row.slotsEnc),
        onlyWeekdays: row.onlyWeekdays,
        active: row.active,
        position: row.position,
        updatedAt: row.updatedAt,
        deleted: row.deleted,
        dirty: row.dirty,
    };
}

export function encodeSchedule(
    dek: string,
    record: ScheduleRecord,
): ScheduleRow {
    return {
        localId: record.localId,
        serverId: record.serverId,
        nameEnc: encryptField(dek, record.name),
        slotsEnc:
            record.slots === null
                ? null
                : encryptField(dek, record.slots),
        onlyWeekdays: record.onlyWeekdays,
        active: record.active,
        position: record.position,
        updatedAt: record.updatedAt,
        deleted: record.deleted,
        dirty: record.dirty,
    };
}

export async function listSchedules(
    dek: string,
): Promise<ScheduleRecord[]> {
    const rows = await db.schedules.toArray();

    return rows
        .map((row) => decodeSchedule(dek, row))
        .filter((schedule) => !schedule.deleted)
        .sort(
            (a, b) => a.position - b.position || a.localId.localeCompare(b.localId),
        );
}

export async function putSchedule(
    dek: string,
    record: ScheduleRecord,
): Promise<void> {
    await db.schedules.put(encodeSchedule(dek, record));
}

/* ------------------------------ blobs ------------------------------- */

/** Store an attachment's bytes encrypted under the DEK. */
export async function putBlob(
    dek: string,
    id: string,
    data: Uint8Array,
    mimeType: string,
): Promise<void> {
    const cipher = encryptBytes(dek, data);

    await db.blobs.put({
        id,
        cipher: toArrayBufferView(cipher).buffer,
        mimeType,
        size: data.byteLength,
    });
}

/** Read an attachment's bytes back (throws when the DEK cannot open them). */
export async function getBlob(dek: string, id: string): Promise<Uint8Array | null> {
    const row = await db.blobs.get(id);

    if (!row) {
        return null;
    }

    return decryptBytes(dek, new Uint8Array(row.cipher));
}

/* --------------------------- sync helpers --------------------------- */

/** All rows with unsynced changes, across entities (used by the push step). */
export async function dirtyEntries(dek: string): Promise<EntryRecord[]> {
    const rows = await db.entries.filter((row) => row.dirty).toArray();

    return rows.map((row) => decodeEntry(dek, row));
}

export async function dirtyNotes(dek: string): Promise<NoteRecord[]> {
    const rows = await db.notes.filter((row) => row.dirty).toArray();

    return rows.map((row) => decodeNote(dek, row));
}

export async function dirtySchedules(dek: string): Promise<ScheduleRecord[]> {
    const rows = await db.schedules.filter((row) => row.dirty).toArray();

    return rows.map((row) => decodeSchedule(dek, row));
}
