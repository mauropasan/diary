<?php

use App\Models\User;

it('shows the login screen', function () {
    User::factory()->create();

    $this->get(route('login'))->assertOk();
});

it('authenticates the user and unlocks the diary', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'secret-password',
    ])->assertRedirect(route('diary.show', now()->toDateString()));

    $this->assertAuthenticatedAs($user);

    $this->get(route('diary.show', now()->toDateString()))->assertOk();
});

it('rejects invalid credentials without unlocking', function () {
    $user = User::factory()->withDiaryKey()->create();

    $this->from(route('login'))->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ])->assertRedirect(route('login'))->assertSessionHasErrors('email');

    $this->assertGuest();
});

it('reports corrupted key material instead of a wrong password', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();
    $user->forceFill(['wrapped_key' => base64_encode(random_bytes(64))])->save();

    $this->from(route('login'))->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'secret-password',
    ])->assertSessionHasErrors('password');

    $this->assertGuest();
});

it('throttles repeated login attempts', function () {
    $user = User::factory()->withDiaryKey()->create();

    foreach (range(1, 6) as $attempt) {
        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'wrong']);
    }

    $this->post(route('login.store'), ['email' => $user->email, 'password' => 'wrong'])
        ->assertStatus(429);
});
