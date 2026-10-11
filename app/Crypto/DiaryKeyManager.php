<?php

namespace App\Crypto;

use App\Exceptions\KeyUnwrapException;
use App\Models\User;

/**
 * Manages the lifecycle of a user's diary encryption keys: provisioning a new
 * DEK wrapped with a password-derived KEK, unlocking it, and re-wrapping it
 * after a password change (without re-encrypting any entry content).
 *
 * The salt is persisted base64-encoded so it can be stored in a text column.
 */
class DiaryKeyManager
{
    public function __construct(private readonly DiaryCrypto $crypto) {}

    /**
     * Generate and store fresh key material for a user from their password.
     *
     * The DEK is wrapped a second time with a random recovery key so the diary
     * can be recovered without the password. The recovery key is returned as a
     * base64 string and must be shown to the user exactly once; it is never
     * stored in plaintext.
     */
    public function provision(User $user, string $password): string
    {
        $salt = $this->crypto->generateSalt();
        $dek = $this->crypto->generateDek();
        $kek = $this->crypto->deriveKek($password, $salt);
        $recoveryKey = $this->crypto->generateRecoveryKey();

        $user->forceFill([
            'kdf_salt' => base64_encode($salt),
            'wrapped_key' => $this->crypto->wrapDek($dek, $kek),
            'recovery_wrapped_key' => $this->crypto->wrapDek($dek, $recoveryKey),
        ])->save();

        return base64_encode($recoveryKey);
    }

    /**
     * Unwrap and return the user's data encryption key using their password.
     *
     * @throws KeyUnwrapException When the password is wrong or the key material is corrupted.
     */
    public function unlock(User $user, string $password): string
    {
        if ($user->kdf_salt === null || $user->wrapped_key === null) {
            throw new KeyUnwrapException('The user has no diary key material.');
        }

        $salt = base64_decode($user->kdf_salt, true);

        if ($salt === false) {
            throw new KeyUnwrapException('The stored key salt is corrupted.');
        }

        $kek = $this->crypto->deriveKek($password, $salt);

        return $this->crypto->unwrapDek($user->wrapped_key, $kek);
    }

    /**
     * Unwrap and return the user's DEK using their one-time recovery key.
     *
     * @throws KeyUnwrapException When the recovery key is wrong or the key material is corrupted.
     */
    public function unlockWithRecoveryKey(User $user, string $recoveryKey): string
    {
        if ($user->recovery_wrapped_key === null) {
            throw new KeyUnwrapException('The user has no recovery key material.');
        }

        $key = base64_decode($recoveryKey, true);

        if ($key === false || strlen($key) !== DiaryCrypto::DEK_BYTES) {
            throw new KeyUnwrapException('The recovery key is malformed.');
        }

        return $this->crypto->unwrapDek($user->recovery_wrapped_key, $key);
    }

    /**
     * Re-wrap the existing DEK with a KEK derived from a new password.
     *
     * @throws KeyUnwrapException When the current password or key material is invalid.
     */
    public function rewrap(User $user, string $currentPassword, string $newPassword): void
    {
        $dek = $this->unlock($user, $currentPassword);

        $this->rewrapWithDek($user, $dek, $newPassword);
    }

    /**
     * Re-wrap an already-unwrapped DEK with a KEK derived from a new password.
     *
     * The recovery copy is intentionally left untouched: it wraps the same DEK,
     * so it remains valid after the password changes.
     */
    public function rewrapWithDek(User $user, string $dek, string $newPassword): void
    {
        $salt = $this->crypto->generateSalt();
        $kek = $this->crypto->deriveKek($newPassword, $salt);

        $user->forceFill([
            'kdf_salt' => base64_encode($salt),
            'wrapped_key' => $this->crypto->wrapDek($dek, $kek),
        ])->save();
    }
}
