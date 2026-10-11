<?php

namespace App\Crypto;

use App\Exceptions\InvalidPasswordException;
use App\Exceptions\KeyUnwrapException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * Verifies a password and unlocks the diary by placing the data encryption key
 * in the session. Distinguishes an incorrect password from corrupted key
 * material so the caller can react accordingly.
 */
class DiaryUnlocker
{
    public function __construct(
        private readonly DiaryKeyManager $keys,
        private readonly DiaryKeyStore $store,
    ) {}

    /**
     * Unlock the diary for the given user.
     *
     * @throws InvalidPasswordException When the password does not match the stored hash.
     * @throws KeyUnwrapException When the password is correct but the key material is corrupted.
     */
    public function unlock(User $user, string $password): void
    {
        if (! Hash::check($password, $user->password)) {
            throw new InvalidPasswordException('The supplied password is incorrect.');
        }

        $dek = $this->keys->unlock($user, $password);

        $this->store->put($dek, now()->addMinutes((int) config('diary.lock_after_minutes')));
    }
}
