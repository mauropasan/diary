<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;

it('shares the inactivity window and timezone with the frontend', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);

    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('diary.lockAfterMinutes', 15)
            ->where('diary.timezone', 'Europe/Madrid')
        );
});

it('redirects a locked session to the unlock screen', function () {
    $user = User::factory()->withDiaryKey()->create();

    $this->actingAs($user)
        ->get(route('diary.show', now()->toDateString()))
        ->assertRedirect(route('diary.unlock'));
});

it('unlocks the diary with the correct password', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password'])
        ->assertRedirect(route('diary.show', now()->toDateString()));

    $this->get(route('diary.show', now()->toDateString()))->assertOk();
});

it('rejects an incorrect unlock password', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($user)
        ->from(route('diary.unlock'))
        ->post(route('diary.unlock.store'), ['password' => 'nope'])
        ->assertRedirect(route('diary.unlock'))
        ->assertSessionHasErrors('password');

    $this->get(route('diary.show', now()->toDateString()))
        ->assertRedirect(route('diary.unlock'));
});

it('keeps the diary unlocked before the inactivity window elapses', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();

    $window = (int) config('diary.lock_after_minutes');

    expect($window)->toBe(15);

    $this->actingAs($user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);

    $this->get(route('diary.show', now()->toDateString()))->assertOk();

    $this->travel($window - 1)->minutes();

    $this->get(route('diary.show', now()->toDateString()))->assertOk();
});

it('locks the diary again after the inactivity window elapses', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();

    $window = (int) config('diary.lock_after_minutes');

    $this->actingAs($user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);

    $this->get(route('diary.show', now()->toDateString()))->assertOk();

    $this->travel($window + 1)->minutes();

    $this->get(route('diary.show', now()->toDateString()))
        ->assertRedirect(route('diary.unlock'));
});
