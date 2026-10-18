<?php

namespace Database\Factories;

use App\Crypto\DiaryKeyManager;
use App\Models\User;
use App\Security\RecoveryCodes;
use App\Security\Totp;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'email_notifications' => true,
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Indicate that the model is an administrator.
     */
    public function asAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_admin' => true,
        ]);
    }

    /**
     * Provision diary key material wrapped with the given password.
     */
    public function withDiaryKey(string $password = 'password'): static
    {
        return $this
            ->state(fn (): array => ['password' => Hash::make($password)])
            ->afterCreating(fn (User $user) => app(DiaryKeyManager::class)->provision($user, $password));
    }

    /**
     * Turn two-factor authentication on for the account, exactly like a
     * confirmed enrolment: secret, confirmation date and hashed recovery codes.
     *
     * The plaintext secret can be read back from the user (the column is an
     * encrypted cast) to compute codes in tests; the plaintext recovery codes
     * cannot, so tests that need one generate their own set.
     */
    public function withTwoFactor(): static
    {
        return $this->afterCreating(function (User $user): void {
            $recovery = new RecoveryCodes;

            $user->forceFill([
                'two_factor_secret' => (new Totp)->generateSecret(),
                'two_factor_confirmed_at' => now(),
                'two_factor_recovery_codes' => $recovery->hash($recovery->generate()),
            ])->save();
        });
    }
}
