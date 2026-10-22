/**
 * Record shapes shared by the local database, the sync engine and the API
 * client.
 *
 * Everything in this module is PLAINTEXT — records are decrypted as they are
 * read from Dexie and re-encrypted on write (see `db.ts`). The wire types at
 * the bottom mirror what `/api/v1` sends and receives.
 */

/**
 * How a device is configured: paired with a server, or fully local (no
 * account, nothing ever leaves the device).
 */
export type ProfileMode = 'local' | 'server';

/**
 * The single active profile. There is exactly one row (id `'active'`); the
 * server list kept for the picker lives in the `kv` store instead.
 */
export type Profile = {
    id: 'active';
    mode: ProfileMode;
    /** Normalized base URL of the server, null in local mode. */
    serverUrl: string | null;
    email: string | null;
    name: string | null;
    /** Sanctum token for `/api/v1`, null in local mode. */
    token: string | null;
    /** base64 `kdf_salt` from the server — offline unlock material. */
    kdfSalt: string | null;
    /** base64 `wrapped_key` from the server — offline unlock material. */
    wrappedKey: string | null;
    /** DEK wrapped with the device Keystore key (enables biometric unlock). */
    dekWrapped: string | null;
    recoveryAvailable: boolean;
    createdAt: number;
};

/** A server the user has paired with before, offered by the picker. */
export type KnownServer = {
    serverUrl: string;
    email: string | null;
    name: string | null;
    lastUsedAt: number;
};

/** One media file attached to an entry, locally or from the server. */
export type AttachmentMeta = {
    /**
     * The id referenced by `data-attachment-id` inside the entry content:
     * the server id (as a string) once uploaded, a `local_…` uuid before.
     */
    id: string;
    serverId: number | null;
    kind: string;
    mimeType: string;
    size: number;
    originalName: string;
    /** True until the file has been uploaded to the paired server. */
    pendingUpload: boolean;
    /** Dexie `blobs` key, null while not cached locally. */
    blobKey: string | null;
    createdAt: number;
};

/** A diary day. Keyed by `date` and encrypted at rest with the DEK. */
export type EntryRecord = {
    date: string;
    title: string | null;
    content: string | null;
    mood: number | null;
    tags: string[];
    attachments: AttachmentMeta[];
    /** Epoch milliseconds of the last change (LWW comparison value). */
    updatedAt: number;
    deleted: boolean;
    /** True while the record has local changes not yet pushed. */
    dirty: boolean;
    serverId: number | null;
};

/** A free-form note. */
export type NoteRecord = {
    /** Client-generated uuid; the primary key. */
    localId: string;
    serverId: number | null;
    title: string | null;
    body: string | null;
    color: string;
    kind: string;
    date: string | null;
    createdAt: number;
    updatedAt: number;
    deleted: boolean;
    dirty: boolean;
};

/** A weekly schedule grid. */
export type ScheduleRecord = {
    localId: string;
    serverId: number | null;
    name: string;
    /** JSON string of the slot grid, exactly as the server stores it. */
    slots: string | null;
    onlyWeekdays: boolean;
    active: boolean;
    position: number;
    updatedAt: number;
    deleted: boolean;
    dirty: boolean;
};

/** An encrypted file blob stored in Dexie (never plaintext at rest). */
export type BlobRecord = {
    id: string;
    /** DEK-encrypted file bytes (XChaCha20 envelope, base64 → ArrayBuffer). */
    cipher: ArrayBuffer;
    mimeType: string;
    size: number;
};

/* ------------------------------------------------------------------ */
/* Wire types for /api/v1                                             */
/* ------------------------------------------------------------------ */

export type PairSuccess = {
    token: string;
    token_type?: string;
    /**
     * Always false on a success payload — present only so a `login()` result
     * can be narrowed against {@link PairChallenge} with a single check.
     */
    two_factor_required?: false;
    /** The diary key is no longer returned; clients unwrap it locally. */
    dek?: string | null;
    user: {
        id: number;
        email: string;
        name: string;
        is_admin?: boolean;
        two_factor_enabled?: boolean;
    };
    key: {
        kdf_salt: string | null;
        wrapped_key: string | null;
        recovery_wrapped_key?: string | null;
    };
    recovery_available: boolean;
    /** Only present on register: shown once. */
    recovery_key?: string;
};

export type PairChallenge = {
    two_factor_required: true;
    challenge_id: string;
    /** Seconds the parked attempt stays valid. */
    expires_in: number;
};

export type PullPayload = {
    cursor: number;
    has_more: boolean;
    entries: WireEntry[];
    notes: WireNote[];
    schedules: WireSchedule[];
};

export type WireEntry = {
    date: string;
    deleted?: boolean;
    updated_ms: number;
    title?: string | null;
    content?: string | null;
    mood?: number | null;
    tags?: string[];
    attachments?: WireAttachment[];
};

export type WireAttachment = {
    id: number;
    kind: string;
    mime_type: string;
    size: number;
    original_name: string;
    created_at?: string;
};

export type WireNote = {
    server_id: number;
    local_id?: string;
    deleted?: boolean;
    updated_ms: number;
    title?: string | null;
    body?: string | null;
    color?: string;
    kind?: string;
    date?: string | null;
};

export type WireSchedule = {
    server_id: number;
    local_id?: string;
    deleted?: boolean;
    updated_ms: number;
    name?: string;
    slots?: string | null;
    only_weekdays?: boolean;
    active?: boolean;
    position?: number;
};

export type PushResult<T> = {
    cursor: number;
    results: T;
};

export type PushEntryResult = {
    entries: {
        date: string;
        won: boolean;
        record: WireEntry;
    }[];
    notes: {
        local_id: string;
        server_id: number;
        won: boolean;
        record: WireNote;
    }[];
    schedules: {
        local_id: string;
        server_id: number;
        won: boolean;
        record: WireSchedule;
    }[];
};
