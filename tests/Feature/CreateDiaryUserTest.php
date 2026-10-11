<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('creates a user with recovery material and prints the recovery key once', function () {
    $this->artisan('diary:create-user')
        ->expectsQuestion('Name', 'Alice')
        ->expectsQuestion('Email address', 'alice@example.com')
        ->expectsQuestion('Password', 'super-secret-1')
        ->expectsQuestion('Confirm password', 'super-secret-1')
        ->expectsOutputToContain('Recovery key:')
        ->assertSuccessful();

    $user = User::query()->where('email', 'alice@example.com')->firstOrFail();

    expect(Hash::check('super-secret-1', $user->password))->toBeTrue()
        ->and($user->is_admin)->toBeTrue()
        ->and($user->kdf_salt)->not->toBeNull()
        ->and($user->wrapped_key)->not->toBeNull()
        ->and($user->recovery_wrapped_key)->not->toBeNull();
});

it('creates regular users after an administrator already exists', function () {
    User::factory()->asAdmin()->create();

    $this->artisan('diary:create-user')
        ->expectsQuestion('Name', 'Bob')
        ->expectsQuestion('Email address', 'bob@example.com')
        ->expectsQuestion('Password', 'super-secret-1')
        ->expectsQuestion('Confirm password', 'super-secret-1')
        ->assertSuccessful();

    $bob = User::query()->where('email', 'bob@example.com')->firstOrFail();

    expect($bob->is_admin)->toBeFalse();
});
