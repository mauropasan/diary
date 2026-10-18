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
 * @property string|null $title
 * @property string|null $body
 * @property Carbon $due_at
 * @property Carbon|null $emailed_at
 * @property Carbon|null $read_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 */
#[Fillable(['title', 'body', 'note_id', 'due_at', 'emailed_at', 'read_at'])]
#[Hidden(['title', 'body'])]
class Notification extends Model
{
    /** @use HasFactory<NotificationFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'title' => EncryptedEntryText::class,
            'body' => EncryptedEntryText::class,
            'due_at' => 'datetime',
            'emailed_at' => 'datetime',
            'read_at' => 'datetime',
        ];
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
