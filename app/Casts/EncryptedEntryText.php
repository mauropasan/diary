<?php

namespace App\Casts;

use App\Crypto\DiaryCrypto;
use App\Crypto\DiaryKeyStore;
use App\Exceptions\DiaryLockedException;
use Illuminate\Contracts\Database\Eloquent\Castable;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Transparently encrypts an entry text attribute on write and decrypts it on
 * read, using the data encryption key held by the {@see DiaryKeyStore}.
 *
 * @implements CastsAttributes<string|null, string|null>
 */
class EncryptedEntryText implements Castable, CastsAttributes
{
    public function __construct(
        private readonly DiaryCrypto $crypto,
        private readonly DiaryKeyStore $keys,
    ) {}

    /**
     * @param  array<string, mixed>  $arguments
     */
    public static function castUsing(array $arguments): self
    {
        return app(self::class);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        return $this->crypto->decrypt($value, $this->dataEncryptionKey());
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $this->crypto->encrypt((string) $value, $this->dataEncryptionKey());
    }

    private function dataEncryptionKey(): string
    {
        $dek = $this->keys->get();

        if ($dek === null) {
            throw new DiaryLockedException('The diary is locked; entry content cannot be read or written.');
        }

        return $dek;
    }
}
