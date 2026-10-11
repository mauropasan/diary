<?php

use App\Crypto\DiaryKeyManager;
use App\Exceptions\KeyUnwrapException;
use App\Models\Entry;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->create([
        'email' => 'diarista@example.com',
        'password' => Hash::make('old-password'),
    ]);

    $this->recoveryKey = app(DiaryKeyManager::class)->provision($this->user, 'old-password');
    $this->dek = app(DiaryKeyManager::class)->unlock($this->user, 'old-password');

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'old-password']);

    $this->today = now()->toDateString();

    $this->put(route('diary.update', $this->today), [
        'title' => 'Entrada secreta',
        'content' => '<p>Solo yo puedo leer esto.</p>',
    ]);
});

it('shows the recovery screen to guests', function () {
    Auth::logout();

    $this->get(route('diary.recovery'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('auth/recovery'));
});

it('restores access with the recovery key and sets a new password', function () {
    $rawBefore = Entry::firstOrFail()->getRawOriginal('content');
    $recoveryWrappedBefore = $this->user->recovery_wrapped_key;

    Auth::logout();

    $this->post(route('diary.recovery.store'), [
        'email' => 'diarista@example.com',
        'recovery_key' => $this->recoveryKey,
        'password' => 'recovered-password',
        'password_confirmation' => 'recovered-password',
    ])->assertRedirect(route('diary.show', $this->today));

    $this->assertAuthenticatedAs($this->user->fresh());

    $this->user->refresh();

    expect(Hash::check('recovered-password', $this->user->password))->toBeTrue();

    $manager = app(DiaryKeyManager::class);

    expect($manager->unlock($this->user, 'recovered-password'))->toBe($this->dek);

    expect(fn () => $manager->unlock($this->user, 'old-password'))
        ->toThrow(KeyUnwrapException::class);

    expect($this->user->recovery_wrapped_key)->toBe($recoveryWrappedBefore);

    expect(Entry::firstOrFail()->getRawOriginal('content'))->toBe($rawBefore);

    $this->get(route('diary.show', $this->today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('entry.content', '<p>Solo yo puedo leer esto.</p>')
        );
});

it('rejects an invalid recovery key', function () {
    Auth::logout();

    $this->post(route('diary.recovery.store'), [
        'email' => 'diarista@example.com',
        'recovery_key' => base64_encode(str_repeat('z', 32)),
        'password' => 'recovered-password',
        'password_confirmation' => 'recovered-password',
    ])->assertSessionHasErrors('recovery_key');

    expect(Hash::check('old-password', $this->user->fresh()->password))->toBeTrue();
});

it('rejects an account without recovery material', function () {
    Auth::logout();

    User::factory()->create(['email' => 'otro@example.com']);

    $this->post(route('diary.recovery.store'), [
        'email' => 'otro@example.com',
        'recovery_key' => $this->recoveryKey,
        'password' => 'recovered-password',
        'password_confirmation' => 'recovered-password',
    ])->assertSessionHasErrors('email');
});
