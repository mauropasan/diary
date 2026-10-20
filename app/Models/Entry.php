<?php

namespace App\Models;

use App\Casts\EncryptedEntryText;
use App\Models\Concerns\TracksSyncChanges;
use Database\Factories\EntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property Carbon $date
 * @property string|null $title
 * @property string|null $content
 * @property int|null $mood
 * @property int|null $updated_ms
 * @property Carbon|null $deleted_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 */
#[Fillable(['user_id', 'date', 'title', 'content', 'mood'])]
class Entry extends Model
{
    /** @use HasFactory<EntryFactory> */
    use HasFactory, SoftDeletes, TracksSyncChanges;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'title' => EncryptedEntryText::class,
            'content' => EncryptedEntryText::class,
            'updated_ms' => 'integer',
        ];
    }

    /**
     * The user that owns the entry.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The tags attached to the entry.
     *
     * @return BelongsToMany<Tag, $this>
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class)->withTimestamps();
    }

    /**
     * Delete the attachment blobs alongside the entry so no encrypted file is
     * left behind. The rows themselves are removed by the foreign key cascade.
     *
     * A soft delete deliberately leaves the attachments alone: the entry keeps
     * referencing them from its content, so restoring the day (or re-editing
     * it later) recovers the media. Only a permanent delete cleans the files.
     */
    protected static function booted(): void
    {
        static::deleting(function (Entry $entry): void {
            if (! $entry->isForceDeleting()) {
                return;
            }

            $entry->attachments()->get()->each(fn (Attachment $attachment): bool => $attachment->delete());
        });
    }

    /**
     * The media attached to the entry.
     *
     * @return HasMany<Attachment, $this>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    /**
     * Replace the entry's tags with the given (possibly unsanitized) names.
     *
     * Names are normalized for deduplication and lookup, and the original
     * (trimmed) casing is kept as the displayed tag name.
     *
     * @param  array<int, mixed>  $names
     */
    public function syncTags(array $names): void
    {
        $user = $this->user;

        $tagIds = [];

        foreach ($names as $name) {
            if (! is_string($name)) {
                continue;
            }

            $normalized = Tag::normalizeName($name);

            if ($normalized === '') {
                continue;
            }

            $tagIds[$normalized] = Tag::findOrCreateForUser($user, $normalized, trim($name))->getKey();
        }

        $this->tags()->sync(array_values($tagIds));
    }
}
