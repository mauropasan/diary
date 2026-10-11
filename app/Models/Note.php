<?php

namespace App\Models;

use App\Casts\EncryptedEntryText;
use Database\Factories\NoteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A free-form note owned by a user.
 *
 * Notes are independent from diary entries: a note always has a background
 * color and an optional `kind` (note, reminder or event). Attaching a `date`
 * ties the note to a day, so it can be shown next to that day's entry.
 *
 * @property int $id
 * @property int $user_id
 * @property string|null $title
 * @property string|null $body
 * @property string $color
 * @property string $kind
 * @property Carbon|null $date
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 */
#[Fillable(['user_id', 'title', 'body', 'color', 'kind', 'date', 'background_image'])]
class Note extends Model
{
    /** @use HasFactory<NoteFactory> */
    use HasFactory;

    public const string DEFAULT_COLOR = 'yellow';

    public const string DEFAULT_KIND = 'note';

    /**
     * The background colors a note can use. Keys are stored in the database
     * (plaintext) and mapped to Tailwind classes on the client.
     *
     * @var array<int, string>
     */
    public const array COLORS = ['yellow', 'pink', 'blue', 'green', 'purple', 'gray'];

    /**
     * The kinds a note can have. Reminders and events must be tied to a day.
     *
     * @var array<int, string>
     */
    public const array KINDS = ['note', 'reminder', 'event'];

    /**
     * Kinds that require a date to be meaningful.
     *
     * @var array<int, string>
     */
    public const array DATED_KINDS = ['reminder', 'event'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'title' => EncryptedEntryText::class,
            'body' => EncryptedEntryText::class,
            'background_image' => EncryptedEntryText::class,
            'date' => 'date:Y-m-d',
        ];
    }

    /**
     * The user that owns the note.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Serialize the note for the frontend, decrypting its text on demand.
     *
     * @return array{id: int, title: string|null, body: string|null, color: string, kind: string, date: string|null}
     */
    public function toPayload(): array
    {
        return [
            'id' => $this->getKey(),
            'title' => $this->title,
            'body' => $this->body,
            'color' => $this->color,
            'kind' => $this->kind,
            'date' => $this->date?->toDateString(),
            'background_image' => $this->background_image,
        ];
    }
}
