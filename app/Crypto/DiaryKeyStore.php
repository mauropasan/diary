<?php

namespace App\Crypto;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Contracts\Encryption\Encrypter;

/**
 * Holds the data encryption key (DEK) for the current request and keeps it in
 * the session so the diary stays unlocked between requests.
 *
 * The DEK is stored in the session wrapped with the application encrypter
 * (never in plaintext) alongside an inactivity deadline. When the deadline has
 * passed, the DEK is discarded and the diary must be unlocked again.
 */
class DiaryKeyStore
{
    private const DEK_KEY = 'diary.dek';

    private const EXPIRES_KEY = 'diary.dek_expires_at';

    private ?string $dek = null;

    public function __construct(private readonly Encrypter $encrypter) {}

    /**
     * Resolve the DEK for the current request, loading it from the session when needed.
     *
     * The inactivity deadline is re-checked on every call so a key cached earlier
     * in the process cannot outlive its expiry.
     */
    public function get(): ?string
    {
        if ($this->dek !== null) {
            if ($this->isExpired()) {
                $this->forget();
            } else {
                return $this->dek;
            }
        }

        return $this->dek = $this->readFromSession();
    }

    /**
     * Store the DEK for the current request and persist it in the session.
     */
    public function put(string $dek, CarbonInterface $expiresAt): void
    {
        $this->dek = $dek;

        session([
            self::DEK_KEY => $this->encrypter->encryptString($dek),
            self::EXPIRES_KEY => $expiresAt->getTimestamp(),
        ]);
    }

    /**
     * Discard the DEK from the current request and the session.
     */
    public function forget(): void
    {
        $this->dek = null;

        session()->forget([self::DEK_KEY, self::EXPIRES_KEY]);
    }

    /**
     * Extend the inactivity deadline of an already unlocked session.
     */
    public function refresh(CarbonInterface $expiresAt): void
    {
        if ($this->get() !== null) {
            session([self::EXPIRES_KEY => $expiresAt->getTimestamp()]);
        }
    }

    private function readFromSession(): ?string
    {
        if ($this->isExpired()) {
            $this->forget();

            return null;
        }

        $wrapped = session(self::DEK_KEY);

        if (! is_string($wrapped)) {
            return null;
        }

        try {
            return $this->encrypter->decryptString($wrapped);
        } catch (DecryptException) {
            $this->forget();

            return null;
        }
    }

    private function isExpired(): bool
    {
        $expiresAt = session(self::EXPIRES_KEY);

        return ! is_int($expiresAt) || $expiresAt < CarbonImmutable::now()->getTimestamp();
    }
}
