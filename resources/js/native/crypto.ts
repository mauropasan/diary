import sodium from 'libsodium-wrappers';

/**
 * Diary encryption primitives for the app.
 *
 * The formats mirror the server's `App\Crypto\DiaryCrypto` exactly: a random
 * 32-byte DEK, an Argon2id KEK for password-wrapped copies of it, and
 * XChaCha20-Poly1305 messages stored as base64 `nonce || ciphertext`. Bytes
 * produced by the server decrypt here and vice versa, which is what lets the
 * same DEK protect the local database, the Keystore copy, the server's
 * at-rest ciphertext and the sync requests alike.
 */

const NONCE_BYTES = 24;
const KEY_BYTES = 32;
const MAC_BYTES = 16;

let ready: Promise<void> | null = null;

/** Wait for libsodium (loading the WASM module) exactly once. */
export function sodiumReady(): Promise<void> {
    ready ??= sodium.ready.then(() => undefined);

    return ready;
}

/** base64 → bytes (original variant, as PHP's `base64_encode` emits). */
export function b64decode(value: string): Uint8Array {
    return sodium.from_base64(value, sodium.base64_variants.ORIGINAL);
}

/** bytes → base64 (original variant, no padding). */
export function b64encode(value: Uint8Array): string {
    return sodium.to_base64(value, sodium.base64_variants.ORIGINAL);
}

/**
 * Copy bytes into a plain `ArrayBuffer`-backed view. libsodium's typings
 * admit `SharedArrayBuffer`, which the DOM's `Blob`/`CryptoKey` APIs reject.
 */
export function toArrayBufferView(value: Uint8Array): Uint8Array<ArrayBuffer> {
    const copy = new Uint8Array(new ArrayBuffer(value.byteLength));

    copy.set(value);

    return copy;
}

/** A fresh random 32-byte DEK, base64-encoded. */
export function generateDek(): string {
    return b64encode(sodium.randombytes_buf(KEY_BYTES));
}

/**
 * Derive the KEK from a password and the server's base64 `kdf_salt`.
 *
 * The parameters are the interactive Argon2id ones the server uses
 * (`opslimit 2`, `memlimit 64 MiB`) — anything else would refuse the
 * `wrapped_key` the server hands out.
 */
export function deriveKek(password: string, saltB64: string): Uint8Array {
    const salt = b64decode(saltB64);

    if (salt.byteLength !== sodium.crypto_pwhash_SALTBYTES) {
        throw new Error('The stored key salt is malformed.');
    }

    return sodium.crypto_pwhash(
        KEY_BYTES,
        password,
        salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13,
    );
}

/** Unwrap the DEK with a key (a derived KEK or the recovery key). */
export function unwrapDek(wrappedKey: string, key: Uint8Array): Uint8Array {
    const envelope = b64decode(wrappedKey);

    if (envelope.byteLength <= NONCE_BYTES) {
        throw new Error('The wrapped key is malformed.');
    }

    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        envelope.subarray(NONCE_BYTES),
        null,
        envelope.subarray(0, NONCE_BYTES),
        key,
    );

    if (plaintext === null) {
        throw new Error('The wrapped key failed authentication.');
    }

    return plaintext;
}

/**
 * Encrypt bytes into the shared envelope (base64 `nonce || ciphertext`).
 * Used for field ciphertext and for wrapping keys.
 */
export function sealEnvelope(key: Uint8Array, plaintext: Uint8Array): string {
    const nonce = sodium.randombytes_buf(NONCE_BYTES);
    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        toArrayBufferView(plaintext),
        null,
        null,
        nonce,
        key,
    );

    const envelope = new Uint8Array(nonce.byteLength + ciphertext.byteLength);

    envelope.set(nonce, 0);
    envelope.set(ciphertext, nonce.byteLength);

    return b64encode(envelope);
}

/** Reverse {@link sealEnvelope}. Throws on a wrong key or corrupt payload. */
export function openEnvelope(key: Uint8Array, envelopeB64: string): Uint8Array {
    const envelope = b64decode(envelopeB64);

    if (envelope.byteLength <= NONCE_BYTES + MAC_BYTES) {
        throw new Error('The ciphertext is malformed.');
    }

    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        envelope.subarray(NONCE_BYTES),
        null,
        envelope.subarray(0, NONCE_BYTES),
        key,
    );

    if (plaintext === null) {
        throw new Error('The ciphertext failed authentication.');
    }

    return plaintext;
}

/** Wrap a DEK (base64) with a password-derived KEK. */
export function wrapDek(dekB64: string, kek: Uint8Array): string {
    return sealEnvelope(kek, b64decode(dekB64));
}

/** Encrypt a text field for the local database with the DEK. */
export function encryptField(dek: string, plaintext: string): string {
    return sealEnvelope(b64decode(dek), sodium.from_string(plaintext));
}

/** Decrypt a field written by {@link encryptField}. */
export function decryptField(dek: string, envelope: string): string {
    return sodium.to_string(openEnvelope(b64decode(dek), envelope));
}

/** Encrypt arbitrary bytes (an attachment) for the local blob store. */
export function encryptBytes(dek: string, data: Uint8Array): Uint8Array {
    return openEnvelopeBytes(b64decode(dek), data, true);
}

/** Decrypt bytes written by {@link encryptBytes}. */
export function decryptBytes(dek: string, data: Uint8Array): Uint8Array {
    return openEnvelopeBytes(b64decode(dek), data, false);
}

function openEnvelopeBytes(
    key: Uint8Array,
    data: Uint8Array,
    encrypt: boolean,
): Uint8Array {
    if (encrypt) {
        const nonce = sodium.randombytes_buf(NONCE_BYTES);
        const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
            toArrayBufferView(data),
            null,
            null,
            nonce,
            key,
        );
        const envelope = new Uint8Array(
            nonce.byteLength + ciphertext.byteLength,
        );

        envelope.set(nonce, 0);
        envelope.set(ciphertext, nonce.byteLength);

        return envelope;
    }

    if (data.byteLength <= NONCE_BYTES + MAC_BYTES) {
        throw new Error('The ciphertext is malformed.');
    }

    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        toArrayBufferView(data.subarray(NONCE_BYTES)),
        null,
        data.subarray(0, NONCE_BYTES),
        key,
    );

    if (plaintext === null) {
        throw new Error('The ciphertext failed authentication.');
    }

    return plaintext;
}
