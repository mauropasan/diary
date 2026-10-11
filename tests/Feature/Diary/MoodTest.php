<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
});

it('shows the moods of the current month by default', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'content' => '<p>Hoy</p>',
        'mood' => 4,
    ]);

    $this->get(route('diary.mood'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/mood')
            ->where('month', now()->format('Y-m'))
            ->where('moods.0.date', $today)
            ->where('moods.0.mood', 4)
        );
});

it('shows the moods of a requested month', function () {
    $lastMonth = now()->subMonthNoOverflow();
    $date = $lastMonth->startOfMonth()->toDateString();

    $this->put(route('diary.update', $date), [
        'content' => '<p>Mes pasado</p>',
        'mood' => 2,
    ]);

    $this->get(route('diary.mood').'?mes='.$lastMonth->format('Y-m'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('month', $lastMonth->format('Y-m'))
            ->where('moods.0.date', $date)
            ->where('moods.0.mood', 2)
        );
});

it('ignores entries without a mood', function () {
    $this->put(route('diary.update', now()->toDateString()), [
        'content' => '<p>Sin ánimo</p>',
    ]);

    $this->get(route('diary.mood'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('moods', [])
        );
});

it('does not leak moods from other months', function () {
    $lastMonth = now()->subMonthNoOverflow();

    $this->put(route('diary.update', $lastMonth->startOfMonth()->toDateString()), [
        'content' => '<p>Mes pasado</p>',
        'mood' => 5,
    ]);

    $this->get(route('diary.mood'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('moods', [])
        );
});

it('falls back to the current month for an invalid month', function () {
    $this->get(route('diary.mood').'?mes=not-a-month')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('month', now()->format('Y-m'))
        );
});

it('blocks navigation to future months', function () {
    $this->get(route('diary.mood'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('canGoNext', false)
        );

    $this->get(route('diary.mood').'?mes='.now()->subMonthNoOverflow()->format('Y-m'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('canGoNext', true)
        );
});
