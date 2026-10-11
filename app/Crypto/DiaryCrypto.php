<?php

namespace App\Crypto;

use App\Exceptions\DecryptionFailedException;
use App\Exceptions\KeyUnwrapException;

/**
 * Envelope encryption primitives for the diary.
 *
 * A random 32-byte data encryption key (DEK) encrypts entry content. The DEK is
 * wrapped (encrypted) with a key encryption key (KEK) derived from the user's
 * password via Argon2id, so it can only be unwrapped while the password is known.
 *
 * All AEAD operations use XChaCha20-Poly1305 with a fresh random nonce per
 * message, and every value is stored base64-encoded as `nonce || ciphertext`.
 */
class DiaryCrypto
{
    public const DEK_BYTES = SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES;

    public const SALT_BYTES = SODIUM_CRYPTO_PWHASH_SALTBYTES;

    public const NONCE_BYTES = SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES;

    /**
     * Generate a new random data encryption key.
     */
    public function generateDek(): string
    {
        return random_bytes(self::DEK_BYTES);
    }

    /**
     * Generate a new random password hashing salt.
     */
    public function generateSalt(): string
    {
        return random_bytes(self::SALT_BYTES);
    }

    /**
     * Generate a new random recovery key.
     */
    public function generateRecoveryKey(): string
    {
        return random_bytes(self::DEK_BYTES);
    }

    /**
     * Derive a key encryption key from a password and salt using Argon2id.
     */
    public function deriveKek(string $password, string $salt): string
    {
        return sodium_crypto_pwhash(
            self::DEK_BYTES,
            $password,
            $salt,
            SODIUM_CRYPTO_PWHASH_OPSLIMIT_INTERACTIVE,
            SODIUM_CRYPTO_PWHASH_MEMLIMIT_INTERACTIVE,
            SODIUM_CRYPTO_PWHASH_ALG_ARGON2ID13,
        );
    }

    /**
     * Encrypt (wrap) the data encryption key with a key encryption key.
     */
    public function wrapDek(string $dek, string $kek): string
    {
        return $this->encrypt($dek, $kek);
    }

    /**
     * Decrypt (unwrap) the data encryption key with a key encryption key.
     *
     * @throws KeyUnwrapException When the key material cannot be decrypted, either
     *                            because the password is wrong or the data is corrupted.
     */
    public function unwrapDek(string $wrappedKey, string $kek): string
    {
        try {
            return $this->decrypt($wrappedKey, $kek);
        } catch (DecryptionFailedException $exception) {
            throw new KeyUnwrapException(
                'Unable to unwrap the data encryption key.',
                previous: $exception,
            );
        }
    }

    /**
     * Derive a deterministic, keyed blind index for a value.
     *
     * The index lets equal plaintexts be matched in the database (for example to
     * deduplicate tags) without revealing the plaintext itself. It must only ever
     * be computed from a normalized value, so callers normalize first.
     */
    public function blindIndex(string $value, string $key): string
    {
        return hash_hmac('sha256', $value, $key);
    }

    /**
     * Encrypt a plaintext message with a key using AEAD.
     */
    public function encrypt(string $plaintext, string $key): string
    {
        $nonce = random_bytes(self::NONCE_BYTES);

        $ciphertext = sodium_crypto_aead_xchacha20poly1305_ietf_encrypt(
            $plaintext,
            '',
            $nonce,
            $key,
        );

        return base64_encode($nonce.$ciphertext);
    }

    /**
     * Encrypt raw bytes with a key using AEAD, returning `nonce || ciphertext` as
     * raw binary (no base64 envelope), for payloads that are stored as files.
     */
    public function encryptBytes(string $bytes, string $key): string
    {
        $nonce = random_bytes(self::NONCE_BYTES);

        $ciphertext = sodium_crypto_aead_xchacha20poly1305_ietf_encrypt(
            $bytes,
            '',
            $nonce,
            $key,
        );

        return $nonce.$ciphertext;
    }

    /**
     * Decrypt a payload produced by {@see self::encryptBytes()}.
     *
     * @throws DecryptionFailedException When the payload is malformed or fails authentication.
     */
    public function decryptBytes(string $payload, string $key): string
    {
        if (strlen($payload) <= self::NONCE_BYTES) {
            throw new DecryptionFailedException('The ciphertext is malformed.');
        }

        $nonce = substr($payload, 0, self::NONCE_BYTES);
        $ciphertext = substr($payload, self::NONCE_BYTES);

        $plaintext = sodium_crypto_aead_xchacha20poly1305_ietf_decrypt(
            $ciphertext,
            '',
            $nonce,
            $key,
        );

        if ($plaintext === false) {
            throw new DecryptionFailedException('The ciphertext failed authentication.');
        }

        return $plaintext;
    }

    /**
     * Decrypt a message produced by {@see self::encrypt()}.
     *
     * @throws DecryptionFailedException When the payload is malformed or fails authentication.
     */
    public function decrypt(string $payload, string $key): string
    {
        $decoded = base64_decode($payload, true);

        if ($decoded === false || strlen($decoded) <= self::NONCE_BYTES) {
            throw new DecryptionFailedException('The ciphertext is malformed.');
        }

        $nonce = substr($decoded, 0, self::NONCE_BYTES);
        $ciphertext = substr($decoded, self::NONCE_BYTES);

        $plaintext = sodium_crypto_aead_xchacha20poly1305_ietf_decrypt(
            $ciphertext,
            '',
            $nonce,
            $key,
        );

        if ($plaintext === false) {
            throw new DecryptionFailedException('The ciphertext failed authentication.');
        }

        return $plaintext;
    }
}
