<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
});

it('shows entries from the same day in previous years', function () {
    $today = now()->toDateString();
    $lastYear = now()->subYear()->toDateString();

    $this->put(route('diary.update', $lastYear), [
        'title' => 'Hace un año',
        'content' => '<p>Recuerdo</p>',
    ]);

    $this->get(route('diary.show', $today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('memories.0.date', $lastYear)
            ->where('memories.0.title', 'Hace un año')
        );
});

it('lists memories newest year first', function () {
    $today = now()->toDateString();
    $oneYearAgo = now()->subYear()->toDateString();
    $twoYearsAgo = now()->subYears(2)->toDateString();

    $this->put(route('diary.update', $twoYearsAgo), ['content' => '<p>Antiguo</p>']);
    $this->put(route('diary.update', $oneYearAgo), ['content' => '<p>Reciente</p>']);

    $this->get(route('diary.show', $today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('memories.0.date', $oneYearAgo)
            ->where('memories.1.date', $twoYearsAgo)
        );
});

it('ignores entries from other days', function () {
    $today = now()->toDateString();
    $otherDay = now()->subYear()->subDay()->toDateString();

    $this->put(route('diary.update', $otherDay), ['content' => '<p>Otro día</p>']);

    $this->get(route('diary.show', $today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('memories', [])
        );
});

it('does not include the current year entry', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), ['content' => '<p>Hoy</p>']);

    $this->get(route('diary.show', $today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('memories', [])
        );
});
