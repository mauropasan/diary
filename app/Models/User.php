<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Casts\EncryptedEntryText;
use App\Exceptions\DiaryLockedException;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property bool $is_admin
 * @property string|null $background
 * @property bool $email_notifications
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $kdf_salt
 * @property string|null $wrapped_key
 * @property string|null $recovery_wrapped_key
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'is_admin', 'kdf_salt', 'wrapped_key', 'recovery_wrapped_key', 'background', 'email_notifications'])]
#[Hidden(['password', 'remember_token', 'kdf_salt', 'wrapped_key', 'recovery_wrapped_key', 'background'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'background' => EncryptedEntryText::class,
            'email_notifications' => 'boolean',
        ];
    }

    /**
     * The background as the interface needs it: a preset key from the config,
     * the `image` marker for a custom `data:` URI, or null for the default.
     *
     * The background is encrypted with the diary key like entry content, so a
     * locked diary simply falls back to the default background: it is not
     * readable until the user unlocks.
     */
    public function backgroundChoice(): ?string
    {
        try {
            $background = $this->background;
        } catch (DiaryLockedException) { // @phpstan-ignore catch.neverThrown (thrown by the encrypted cast's magic get)
            return null;
        }

        if (! is_string($background) || $background === '') {
            return null;
        }

        if (str_starts_with($background, 'data:image/')) {
            return 'image';
        }

        if ($background === 'default' || ! in_array($background, config('diary.backgrounds', []), true)) {
            return null;
        }

        return $background;
    }

    /**
     * The diary entries owned by the user.
     *
     * @return HasMany<Entry, $this>
     */
    public function entries(): HasMany
    {
        return $this->hasMany(Entry::class);
    }

    /**
     * The tags owned by the user.
     *
     * @return HasMany<Tag, $this>
     */
    public function tags(): HasMany
    {
        return $this->hasMany(Tag::class);
    }

    /**
     * The media attachments owned by the user.
     *
     * @return HasMany<Attachment, $this>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    /**
     * The notes owned by the user.
     *
     * @return HasMany<Note, $this>
     */
    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }

    /**
     * The schedules owned by the user.
     *
     * @return HasMany<Schedule, $this>
     */
    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class);
    }

    /**
     * The notifications owned by the user.
     *
     * @return HasMany<Notification, $this>
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }
}
