<?php

use App\Crypto\DiaryKeyManager;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;

it('shows the registration screen when no user is registered', function () {
    $this->get(route('register'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('auth/register'));
});

it('redirects the login screen to registration when no user is registered', function () {
    $this->get(route('login'))->assertRedirect(route('register'));
});

it('creates the first user, unlocks the diary and flashes the recovery key', function () {
    $this->post(route('register.store'), [
        'name' => 'Alice',
        'email' => 'alice@example.com',
        'password' => 'super-secret-1',
        'password_confirmation' => 'super-secret-1',
    ])
        ->assertRedirect(route('diary.show', now()->toDateString()))
        ->assertSessionHas('recoveryKey');

    $user = User::query()->where('email', 'alice@example.com')->firstOrFail();

    $this->assertAuthenticatedAs($user);

    expect(Hash::check('super-secret-1', $user->password))->toBeTrue()
        ->and($user->kdf_salt)->not->toBeNull()
        ->and($user->wrapped_key)->not->toBeNull()
        ->and($user->recovery_wrapped_key)->not->toBeNull();

    $manager = app(DiaryKeyManager::class);

    expect($manager->unlockWithRecoveryKey($user, session('recoveryKey')))
        ->toBe($manager->unlock($user, 'super-secret-1'));

    $this->get(route('diary.show', now()->toDateString()))->assertOk();
});

it('rejects registration once a user exists', function () {
    User::factory()->create();

    $this->get(route('register'))->assertNotFound();

    $this->post(route('register.store'), [
        'name' => 'Intruder',
        'email' => 'intruder@example.com',
        'password' => 'super-secret-1',
        'password_confirmation' => 'super-secret-1',
    ])->assertNotFound();

    expect(User::query()->where('email', 'intruder@example.com')->exists())->toBeFalse();
});

it('rejects a mismatched password confirmation', function () {
    $this->post(route('register.store'), [
        'name' => 'Alice',
        'email' => 'alice@example.com',
        'password' => 'super-secret-1',
        'password_confirmation' => 'different-secret-1',
    ])->assertSessionHasErrors('password');

    expect(User::query()->count())->toBe(0);
});

it('rejects an empty payload', function () {
    $this->post(route('register.store'))
        ->assertSessionHasErrors(['name', 'email', 'password']);
});
