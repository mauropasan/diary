<?php

namespace Database\Factories;

use App\Models\Note;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Note>
 */
class NoteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * The encrypted `title` and `body` are left out on purpose: writing them
     * requires the diary to be unlocked. Tests that need text create the note
     * through the application so the data encryption key is available.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'color' => Note::DEFAULT_COLOR,
            'kind' => Note::DEFAULT_KIND,
            'date' => null,
        ];
    }

    /**
     * Attach the note to the given day.
     */
    public function on(string $date): static
    {
        return $this->state(fn (array $attributes): array => ['date' => $date]);
    }

    /**
     * Set the note's color.
     */
    public function color(string $color): static
    {
        return $this->state(fn (array $attributes): array => ['color' => $color]);
    }

    /**
     * Set the note's kind.
     */
    public function kind(string $kind): static
    {
        return $this->state(fn (array $attributes): array => ['kind' => $kind]);
    }
}
