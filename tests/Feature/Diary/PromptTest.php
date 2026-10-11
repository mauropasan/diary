<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
});

it('returns a non-empty prompt', function () {
    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('prompt', fn (string $prompt): bool => $prompt !== '')
        );
});

it('returns the same prompt for the same day', function () {
    $date = now()->toDateString();

    $first = $this->get(route('diary.show', $date));
    $second = $this->get(route('diary.show', $date));

    expect($first->viewData('page')['props']['prompt'])
        ->toBe($second->viewData('page')['props']['prompt']);
});

it('rotates the prompt between consecutive days', function () {
    $today = $this->get(route('diary.show', now()->toDateString()));
    $yesterday = $this->get(route('diary.show', now()->subDay()->toDateString()));

    expect($today->viewData('page')['props']['prompt'])
        ->not->toBe($yesterday->viewData('page')['props']['prompt']);
});
