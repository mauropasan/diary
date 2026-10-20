import { Capacitor, registerPlugin } from '@capacitor/core';
import { b64decode, b64encode } from '@/native/crypto';

/**
 * Bridge to the app's own Android plugin (`DiarySecurity`).
 *
 * The plugin keeps AES-256-GCM keys inside the hardware-backed Android
 * Keystore — the WebView only ever hands it plaintext and gets ciphertext
 * back, so nothing readable to a script ever sits in JS storage. It also
 * exposes BiometricPrompt for the optional fingerprint unlock.
 *
 * Outside the native shell (browser development) the same calls fall back to
 * reversible base64: purely a development convenience, never a security
 * boundary, and `isNative` lets UI code say so.
 */
type DiarySecurityPlugin = {
    encrypt(options: {
        alias: string;
        data: string;
    }): Promise<{ data: string }>;
    decrypt(options: {
        alias: string;
        data: string;
    }): Promise<{ data: string }>;
    biometricAvailable(): Promise<{
        available: boolean;
        enrolled: boolean;
        reason: number;
    }>;
    biometricVerify(options: {
        title: string;
        subtitle?: string;
        description?: string;
        cancelTitle?: string;
    }): Promise<{ success: true }>;
};

const plugin = registerPlugin<DiarySecurityPlugin>('DiarySecurity');

/** Whether the secure implementation (Android Keystore) backs the calls. */
export function isNative(): boolean {
    return Capacitor.isNativePlatform();
}

/**
 * An alias the plugin accepts (`[A-Za-z0-9._-]+`) for a given profile:
 * the server URL reduced to safe characters, or `local` for local mode.
 */
export function aliasFor(key: string): string {
    const slug = key.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 60);

    return slug === '' ? 'default' : slug;
}

/** Encrypt secret bytes under the device Keystore key for `alias`. */
export async function sealSecret(
    alias: string,
    secret: Uint8Array,
): Promise<string> {
    if (!isNative()) {
        return `plain:${b64encode(secret)}`;
    }

    const { data } = await plugin.encrypt({
        alias,
        data: b64encode(secret),
    });

    return data;
}

/** Reverse {@link sealSecret}. Rejects with `{ message, code }` on failure. */
export async function openSecret(
    alias: string,
    sealed: string,
): Promise<Uint8Array> {
    if (!isNative()) {
        if (!sealed.startsWith('plain:')) {
            throw { message: 'Sealed with the native keystore.', code: 'KEY_MISSING' };
        }

        return b64decode(sealed.slice('plain:'.length));
    }

    const { data } = await plugin.decrypt({ alias, data: sealed });

    return b64decode(data);
}

/** Whether the device can ask for a fingerprint (or screen lock) right now. */
export async function biometricAvailable(): Promise<{
    available: boolean;
    enrolled: boolean;
    reason: number;
}> {
    if (!isNative()) {
        return { available: false, enrolled: false, reason: 0 };
    }

    return plugin.biometricAvailable();
}

/** Show the system biometric prompt; rejects when it is not satisfied. */
export function biometricVerify(options: {
    title: string;
    subtitle?: string;
    description?: string;
}): Promise<{ success: true }> {
    return plugin.biometricVerify(options);
}
