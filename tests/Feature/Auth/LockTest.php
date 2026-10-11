<?php

use App\Models\User;

it('locks the diary by discarding the session key', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);

    $this->get(route('diary.show', now()->toDateString()))->assertOk();

    $this->post(route('diary.lock'))->assertNoContent();

    $this->get(route('diary.show', now()->toDateString()))
        ->assertRedirect(route('diary.unlock'));
});

it('requires authentication to lock the diary', function () {
    $this->post(route('diary.lock'))->assertRedirect(route('login'));
});
