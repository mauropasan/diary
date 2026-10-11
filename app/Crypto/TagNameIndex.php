<?php

namespace App\Crypto;

use App\Exceptions\DiaryLockedException;

/**
 * Computes the deterministic blind index stored alongside an encrypted tag name.
 *
 * Tag names are encrypted with a random nonce, so the ciphertext differs on every
 * write and cannot be queried. The blind index is a keyed HMAC of the *normalized*
 * name, which is stable for equal names and therefore lets tags be deduplicated
 * and looked up without decrypting them.
 */
class TagNameIndex
{
    public function __construct(
        private readonly DiaryCrypto $crypto,
        private readonly DiaryKeyStore $keys,
    ) {}

    /**
     * @throws DiaryLockedException When the diary is locked and no key is available.
     */
    public function compute(string $normalizedName): string
    {
        $dek = $this->keys->get();

        if ($dek === null) {
            throw new DiaryLockedException('The diary is locked; tags cannot be indexed.');
        }

        return $this->crypto->blindIndex($normalizedName, $dek);
    }
}
