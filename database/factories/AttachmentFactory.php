<?php

namespace Database\Factories;

use App\Models\Attachment;
use App\Models\Entry;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Attachment>
 */
class AttachmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'entry_id' => Entry::factory(),
            'kind' => 'image',
            'original_name' => 'photo.png',
            'mime_type' => 'image/png',
            'size' => 1024,
            'path' => 'attachments/'.Str::uuid()->toString(),
        ];
    }
}
