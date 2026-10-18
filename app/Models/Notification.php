<?php

namespace App\Models;

use App\Casts\EncryptedEntryText;
use Database\Factories\NotificationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int|null $note_id
 * @property string|null $kind
 * @property array<string, string>|null $params
 * @property string|null $title
 * @property string|null $body
 * @property Carbon $due_at
 * @property Carbon|null $emailed_at
 * @property Carbon|null $read_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 */
#[Fillable(['title', 'body', 'kind', 'params', 'note_id', 'due_at', 'emailed_at', 'read_at'])]
#[Hidden(['title', 'body', 'kind', 'params'])]
class Notification extends Model
{
    /** @use HasFactory<NotificationFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'title' => EncryptedEntryText::class,
            'body' => EncryptedEntryText::class,
            // Application notifications are built by the server, often for an
            // account whose diary key is not available, so they are encrypted
            // with the application key instead of the diary key.
            'kind' => 'encrypted',
            'params' => 'encrypted:array',
            'due_at' => 'datetime',
            'emailed_at' => 'datetime',
            'read_at' => 'datetime',
        ];
    }

    /**
     * Whether the notification was raised by the application itself.
     *
     * Those carry a message key and its parameters instead of diary text, so
     * they can be rendered without the diary key.
     */
    public function isSystem(): bool
    {
        return is_string($this->kind) && $this->kind !== '';
    }

    /**
     * The title to show: a translation for application notifications, the
     * decrypted text for the ones derived from a note.
     */
    public function displayTitle(): ?string
    {
        if (! $this->isSystem()) {
            return $this->title;
        }

        return $this->translate('title');
    }

    /**
     * The body to show, following the same rule as {@see displayTitle()}.
     */
    public function displayBody(): ?string
    {
        if (! $this->isSystem()) {
            return $this->body;
        }

        return $this->translate('body');
    }

    /**
     * Resolve one line of an application notification in the reader's language.
     */
    private function translate(string $line): ?string
    {
        $text = __("messages.notifications.kinds.{$this->kind}.{$line}", $this->params ?? []);

        return is_string($text) ? $text : null;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for unread notifications.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    /**
     * Scope for notifications that have reached their trigger moment.
     *
     * Notifications for dated notes are created up front but stay hidden
     * until the day before the note's date, so every read path only sees
     * the ones that are due.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeDue(Builder $query): Builder
    {
        return $query->where('due_at', '<=', now());
    }

    /**
     * Scope for read notifications.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeRead(Builder $query): Builder
    {
        return $query->whereNotNull('read_at');
    }

    /**
     * Mark the notification as read.
     */
    public function markAsRead(): void
    {
        $this->update(['read_at' => now()]);
    }
}
