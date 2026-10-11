<?php

use App\Crypto\DiaryKeyManager;
use App\Exceptions\KeyUnwrapException;
use App\Models\Entry;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);

    $this->today = now()->toDateString();

    $this->put(route('diary.update', $this->today), [
        'title' => 'Antes del cambio',
        'content' => '<p>Contenido que debe sobrevivir.</p>',
    ]);
});

it('shows the change password screen', function () {
    $this->get(route('diary.password'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('auth/password'));
});

it('changes the password and re-wraps the key without touching entry content', function () {
    $rawBefore = Entry::firstOrFail()->getRawOriginal('content');

    $this->put(route('diary.password.update'), [
        'current_password' => 'secret-password',
        'password' => 'brand-new-password',
        'password_confirmation' => 'brand-new-password',
    ])->assertRedirect(route('diary.show', $this->today))
        ->assertSessionHas('status');

    $this->user->refresh();

    expect(Hash::check('brand-new-password', $this->user->password))->toBeTrue();

    $rawAfter = Entry::firstOrFail()->getRawOriginal('content');

    expect($rawAfter)->toBe($rawBefore);

    $manager = app(DiaryKeyManager::class);

    expect($manager->unlock($this->user, 'brand-new-password'))->toBeString();

    expect(fn () => $manager->unlock($this->user, 'secret-password'))
        ->toThrow(KeyUnwrapException::class);

    $this->get(route('diary.show', $this->today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('entry.content', '<p>Contenido que debe sobrevivir.</p>')
            ->where('flash.status', __('messages.password.updated'))
        );
});

it('rejects a wrong current password', function () {
    $this->from(route('diary.password'))
        ->put(route('diary.password.update'), [
            'current_password' => 'not-the-password',
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])
        ->assertRedirect(route('diary.password'))
        ->assertSessionHasErrors('current_password');

    expect(Hash::check('secret-password', $this->user->fresh()->password))->toBeTrue();
});

it('requires the new password to be confirmed', function () {
    $this->from(route('diary.password'))
        ->put(route('diary.password.update'), [
            'current_password' => 'secret-password',
            'password' => 'brand-new-password',
            'password_confirmation' => 'something-else',
        ])
        ->assertSessionHasErrors('password');

    expect(Hash::check('secret-password', $this->user->fresh()->password))->toBeTrue();
});
