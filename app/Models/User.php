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
 * @property int $reminder_days_before
 * @property array<int, mixed>|null $reminder_times
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $kdf_salt
 * @property string|null $wrapped_key
 * @property string|null $recovery_wrapped_key
 * @property string|null $two_factor_secret
 * @property Carbon|null $two_factor_confirmed_at
 * @property array<int, string>|null $two_factor_recovery_codes
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'is_admin', 'kdf_salt', 'wrapped_key', 'recovery_wrapped_key', 'background', 'email_notifications', 'reminder_days_before', 'reminder_times'])]
#[Hidden(['password', 'remember_token', 'kdf_salt', 'wrapped_key', 'recovery_wrapped_key', 'background', 'two_factor_secret', 'two_factor_recovery_codes'])]
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
            'reminder_days_before' => 'integer',
            'reminder_times' => 'array',
            'two_factor_secret' => 'encrypted',
            'two_factor_confirmed_at' => 'datetime',
            'two_factor_recovery_codes' => 'array',
        ];
    }

    /**
     * Whether signing in requires a code from an authenticator app.
     *
     * The secret alone only means enrolment is in progress; the account starts
     * requiring a code once a valid code has been confirmed.
     */
    public function twoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
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
     * The hours at which the account's reminders pop each day.
     *
     * Stored as `HH:mm` strings, sorted and without duplicates, and capped at
     * the configured maximum. Anything unexpected in the column is discarded
     * and the configured default is used instead, so a corrupted value can
     * never silence every reminder.
     *
     * @return array<int, string>
     */
    public function reminderTimes(): array
    {
        $configured = $this->reminder_times;

        $times = is_array($configured)
            ? array_values(array_filter(
                $configured,
                fn (mixed $time): bool => is_string($time) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time) === 1,
            ))
            : [];

        $times = array_values(array_unique($times));
        sort($times);
        $times = array_slice($times, 0, (int) config('diary.reminder.times_max', 3));

        if ($times === []) {
            /** @var array<int, string> $default */
            $default = config('diary.reminder.times.default', ['09:00']);

            return $default;
        }

        return $times;
    }

    /**
     * How many days before the note's own date the reminders start.
     *
     * Zero means "on the day itself". The value is clamped to the configured
     * range so a hand-edited column cannot schedule a reminder a year ahead.
     */
    public function reminderDaysBefore(): int
    {
        $configured = (int) ($this->reminder_days_before ?? config('diary.reminder.days_before.default', 1));

        return max(
            0,
            min((int) config('diary.reminder.days_before.max', 30), $configured),
        );
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
