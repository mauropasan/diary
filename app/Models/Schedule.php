<?php

namespace App\Models;

use App\Casts\EncryptedEntryText;
use Database\Factories\ScheduleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string|null $slots
 * @property bool $only_weekdays
 * @property bool $active
 * @property int $position
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['user_id', 'name', 'slots', 'only_weekdays', 'active', 'position'])]
class Schedule extends Model
{
    /** @use HasFactory<ScheduleFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'name' => EncryptedEntryText::class,
            'slots' => EncryptedEntryText::class,
            'only_weekdays' => 'boolean',
            'active' => 'boolean',
            'position' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
