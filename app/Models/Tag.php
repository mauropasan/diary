<?php

namespace App\Models;

use App\Casts\EncryptedEntryText;
use App\Crypto\TagNameIndex;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string $name_index
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['user_id', 'name', 'name_index'])]
class Tag extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'name' => EncryptedEntryText::class,
        ];
    }

    /**
     * Keep the deterministic blind index in sync with the encrypted name.
     */
    protected static function booted(): void
    {
        static::saving(function (Tag $tag): void {
            if ($tag->isDirty('name')) {
                $tag->name_index = app(TagNameIndex::class)->compute(
                    static::normalizeName((string) $tag->name),
                );
            }
        });
    }

    /**
     * Normalize a tag name so equal names share the same blind index.
     */
    public static function normalizeName(string $name): string
    {
        return mb_strtolower(trim((string) preg_replace('/\s+/u', ' ', $name)));
    }

    /**
     * Find an existing tag for the user by blind index or create it.
     */
    public static function findOrCreateForUser(User $user, string $normalized, string $displayName): self
    {
        $index = app(TagNameIndex::class)->compute($normalized);

        return $user->tags()->firstOrCreate(
            ['name_index' => $index],
            ['name' => $displayName],
        );
    }
}
