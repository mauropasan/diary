import {
    deriveKek,
    generateDek,
    sodiumReady,
    unwrapDek,
    wrapDek,
    b64encode,
} from '@/native/crypto';
import {
    getProfile,
    knownServers,
    kvGet,
    kvSet,
    KV,
    patchProfile,
    putProfile,
    rememberServer,
} from '@/native/db';
import {
    aliasFor,
    biometricAvailable,
    biometricVerify,
    isNative as isNativePlatform,
    openSecret,
    sealSecret,
} from '@/native/keystore';
import { DiarioApi, normalizeServerUrl } from '@/native/api';
import type { PairSuccess, Profile } from '@/native/types';

/**
 * The device session: which mode the app runs in (setup → locked →
 * unlocked), the in-memory DEK, and every way to get from locked to
 * unlocked.
 *
 * Offline is the normal case here. A paired device keeps the server's
 * `kdf_salt`/`wrapped_key` locally, so the same password unwraps the DEK
 * with no network at all; the optional biometric path opens the Keystore
 * copy instead. Local-only devices simply hold the Keystore copy.
 */

export type SessionPhase =
    | 'boot'
    | 'setup'
    | 'locked'
    | 'unlocked'
    | 'broken';

export type SessionState = {
    phase: SessionPhase;
    profile: Profile | null;
    /** Whether the lock screen may offer a fingerprint (paired mode). */
    biometric: boolean;
    /** Set when stored key material cannot open (e.g. password changed). */
    error: string | null;
};

const LOCK_MINUTES_DEFAULT = 15;

let state: SessionState = {
    phase: 'boot',
    profile: null,
    biometric: false,
    error: null,
};

let dek: string | null = null;

let api: DiarioApi | null = null;

const listeners = new Set<() => void>();

let lockTimer: ReturnType<typeof setTimeout> | null = null;

function emit(): void {
    for (const listener of listeners) {
        listener();
    }
}

function setState(patch: Partial<SessionState>): void {
    state = { ...state, ...patch };
    emit();
}

export function subscribeSession(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

export function getSessionState(): SessionState {
    return state;
}

/** The unlocked DEK, or null while locked. */
export function currentDek(): string | null {
    return dek;
}

/** The API client bound to the paired server, or null in local mode. */
export function currentApi(): DiarioApi | null {
    return api;
}

function aliasForProfile(profile: { serverUrl: string | null }): string {
    return aliasFor(profile.serverUrl ?? 'local');
}

/**
 * Load the profile and decide the initial phase. Runs once at boot.
 */
export async function bootSession(): Promise<void> {
    await sodiumReady();

    const profile = (await getProfile()) ?? null;

    if (profile === null) {
        setState({ phase: 'setup', profile: null, biometric: false });

        return;
    }

    if (profile.mode === 'local') {
        // Local-only devices open on device possession: the DEK lives sealed
        // in the Keystore and there is no password to ask. Enabling the
        // biometric lock is the one thing that puts a gate in front of it.
        const biometricSetting = await kvGet<boolean>(KV.biometricEnabled);

        if (biometricSetting === true && profile.dekWrapped !== null) {
            setState({ phase: 'locked', profile, biometric: true, error: null });

            return;
        }

        if (profile.dekWrapped === null) {
            // The Keystore key is gone (restored backup on another device):
            // nothing on this device can open the diary — start over.
            setState({ phase: 'setup', profile: null, biometric: false, error: null });

            return;
        }

        try {
            const raw = await openSecret('local', profile.dekWrapped);
            unlockWith(b64encode(raw));
        } catch {
            setState({ phase: 'setup', profile: null, biometric: false, error: null });
        }

        return;
    }

    if (profile.mode === 'server' && profile.serverUrl !== null) {
        api = new DiarioApi(profile.serverUrl);
        api.setToken(profile.token);
    } else {
        api = null;
    }

    const biometricSetting = await kvGet<boolean>(KV.biometricEnabled);
    const canBiometric =
        profile.dekWrapped !== null && biometricSetting === true;

    setState({ phase: 'locked', profile, biometric: canBiometric, error: null });
}

/* ----------------------------- setup flow ---------------------------- */

/**
 * Finish the setup wizard for a server profile: persist the account, wrap
 * the DEK under the device Keystore key and enter the app unlocked.
 *
 * The DEK must be unwrapped locally from the returned key material before
 * calling this function.
 */
export async function finishPairing(input: {
    serverUrl: string;
    pair: PairSuccess;
    dekB64: string;
}): Promise<void> {
    await sodiumReady();

    const serverUrl = normalizeServerUrl(input.serverUrl);

    const profile = await patchProfile({
        mode: 'server',
        serverUrl,
        email: input.pair.user.email,
        name: input.pair.user.name,
        token: input.pair.token,
        kdfSalt: input.pair.key.kdf_salt,
        wrappedKey: input.pair.key.wrapped_key,
        dekWrapped: await sealSecret(
            aliasForProfile({ serverUrl }),
            b64decodeSafe(input.dekB64),
        ),
        recoveryAvailable: input.pair.recovery_available,
        createdAt: Date.now(),
    });

    await rememberServer({
        serverUrl,
        email: input.pair.user.email,
        name: input.pair.user.name,
        lastUsedAt: Date.now(),
    });

    api = new DiarioApi(serverUrl);
    api.setToken(profile.token);

    unlockWith(input.dekB64);
}

/** Finish setup in local mode: a fresh DEK sealed in the device Keystore. */
export async function finishLocalSetup(): Promise<void> {
    await sodiumReady();

    const raw = generateDek();

    await patchProfile({
        mode: 'local',
        serverUrl: null,
        email: null,
        name: null,
        token: null,
        kdfSalt: null,
        wrappedKey: null,
        dekWrapped: await sealSecret('local', b64decodeSafe(raw)),
        recoveryAvailable: false,
        createdAt: Date.now(),
    });

    api = null;
    unlockWith(raw);
}

/* ------------------------------ unlocking ---------------------------- */

function unlockWith(dekB64: string): void {
    dek = dekB64;
    api?.setDek(dekB64);

    setState({ phase: 'unlocked', error: null });
    armLockTimer();
}

function b64decodeSafe(value: string): Uint8Array {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

/**
 * Open the diary with the account password — offline: the server's wrapped
 * key is on the device, so the only network this needs is none. Throws an
 * Error with a translated message key in `message` on failure.
 */
export async function unlockWithPassword(password: string): Promise<void> {
    const profile = state.profile;

    if (profile === null || profile.mode !== 'server') {
        throw new Error('session.no-profile');
    }

    if (profile.kdfSalt === null || profile.wrappedKey === null) {
        throw new Error('session.no-key-material');
    }

    await sodiumReady();

    let dekB64: string;

    try {
        const kek = deriveKek(password, profile.kdfSalt);
        dekB64 = b64encode(unwrapDek(profile.wrappedKey, kek));
    } catch {
        throw new Error('session.wrong-password');
    }

    // Keep a Keystore copy so the chosen biometric unlock can work next time.
    const sealed = await sealSecret(aliasForProfile(profile), b64decodeSafe(dekB64));

    await patchProfile({ dekWrapped: sealed });

    unlockWith(dekB64);
}

/** Open the diary with the device Keystore copy (biometric path). */
export async function unlockWithBiometric(): Promise<void> {
    const profile = state.profile;

    if (profile?.dekWrapped === null || profile?.dekWrapped === undefined) {
        throw new Error('session.no-key-material');
    }

    if (isNativePlatform()) {
        const title = 'Diario';

        await biometricVerify({ title });
    }

    await sodiumReady();

    let raw: Uint8Array;

    try {
        raw = await openSecret(aliasForProfile(profile), profile.dekWrapped);
    } catch {
        throw new Error('session.wrong-password');
    }

    unlockWith(b64encode(raw));
}

/** Whether biometric unlock is usable and enabled right now. */
export async function biometricState(): Promise<{
    available: boolean;
    enrolled: boolean;
}> {
    const setting = await kvGet<boolean>(KV.biometricEnabled);

    if (setting !== true || state.profile?.dekWrapped == null) {
        return { available: false, enrolled: false };
    }

    return biometricAvailable();
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
    await kvSet(KV.biometricEnabled, enabled);

    setState({ biometric: enabled && state.profile?.dekWrapped != null });
}

/* ------------------------------- locking ----------------------------- */

export async function lockMinutes(): Promise<number> {
    const stored = await kvGet<number>(KV.lockMinutes);

    return typeof stored === 'number' && stored > 0
        ? stored
        : LOCK_MINUTES_DEFAULT;
}

export async function setLockMinutes(minutes: number): Promise<void> {
    await kvSet(KV.lockMinutes, minutes);
}

/** Drop the DEK from memory — the diary is closed until unlocked again. */
export function lock(): void {
    dek = null;
    api?.setDek(null);

    if (lockTimer !== null) {
        clearTimeout(lockTimer);
        lockTimer = null;
    }

    setState({ phase: 'locked' });
}

function armLockTimer(): void {
    if (lockTimer !== null) {
        clearTimeout(lockTimer);
    }

    void lockMinutes().then((minutes) => {
        lockTimer = setTimeout(() => lock(), minutes * 60_000);
    });
}

/**
 * Call from any interaction: resets the inactivity countdown (and the
 * countdown starts again for the whole app) exactly like the web's
 * `useInactivityLock`.
 */
export function noteActivity(): void {
    if (state.phase !== 'unlocked') {
        return;
    }

    armLockTimer();
}

/* ------------------------------ pairing ------------------------------ */

/** Forget the account on this device (the server keeps its data). */
export async function forgetProfile(): Promise<void> {
    lock();

    api = null;
    await putProfile({
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
    });

    setState({ phase: 'setup', profile: null, biometric: false, error: null });
}

/** Mark the current token dead so the lock screen can re-pair. */
export async function markPairingBroken(reason: string): Promise<void> {
    await patchProfile({ token: null });
    setState({ error: reason, phase: 'locked' });
}

/** Servers previously used on this device, for the picker. */
export function listKnownServers(): Promise<{ serverUrl: string; email: string | null; name: string | null; lastUsedAt: number }[]> {
    return knownServers();
}
