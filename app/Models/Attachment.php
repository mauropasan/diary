<?php

namespace App\Models;

use App\Casts\EncryptedEntryText;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $user_id
 * @property int $entry_id
 * @property string $kind
 * @property string $original_name
 * @property string $mime_type
 * @property int $size
 * @property string $path
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['user_id', 'entry_id', 'kind', 'original_name', 'mime_type', 'size', 'path'])]
class Attachment extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'original_name' => EncryptedEntryText::class,
            'size' => 'integer',
        ];
    }

    /**
     * Remove the encrypted blob from the disk together with the row.
     */
    protected static function booted(): void
    {
        static::deleted(function (Attachment $attachment): void {
            Storage::disk('diary')->delete($attachment->path);
        });
    }

    /**
     * Classify a MIME type into one of the supported media kinds. Vector images
     * (SVG) are treated as plain files because they can carry scripts and must
     * never be served inline.
     */
    public static function kindForMime(string $mime): string
    {
        return match (true) {
            str_starts_with($mime, 'image/') && $mime !== 'image/svg+xml' => 'image',
            str_starts_with($mime, 'audio/') => 'audio',
            str_starts_with($mime, 'video/') => 'video',
            default => 'file',
        };
    }
}
