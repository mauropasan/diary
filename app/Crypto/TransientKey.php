<?php

namespace App\Crypto;

use Carbon\CarbonInterface;

/**
 * Holds the data encryption key (DEK) for the current stateless API request.
 *
 * The web app keeps the DEK in the session, but an API request from the
 * Android app carries the key in the `X-Diary-Key` header instead, validated
 * by the `VerifyDiaryKey` middleware. The key is parked here so the existing
 * {@see DiaryKeyStore} (and through it the encrypted cast, the tag blind index
 * and attachment encryption) works unchanged on sync requests.
 *
 * The holder is a container singleton, so it lives exactly as long as the
 * request that populated it and carries an inactivity deadline of its own:
 * once it expires, the diary is locked again just like a session would be.
 */
class TransientKey
{
    private ?string $dek = null;

    private ?int $expiresAt = null;

    /**
     * Store the DEK for the current request until the given moment.
     */
    public function put(string $dek, CarbonInterface $expiresAt): void
    {
        $this->dek = $dek;
        $this->expiresAt = $expiresAt->getTimestamp();
    }

    /**
     * Resolve the DEK for the current request, honouring the deadline.
     */
    public function get(): ?string
    {
        if ($this->dek === null) {
            return null;
        }

        if ($this->expiresAt === null || $this->expiresAt < now()->getTimestamp()) {
            $this->forget();

            return null;
        }

        return $this->dek;
    }

    /**
     * Discard the DEK from the current request.
     */
    public function forget(): void
    {
        $this->dek = null;
        $this->expiresAt = null;
    }
}
