<?php

use App\Models\Entry;
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

it('reports a zero streak without any mood', function () {
    $this->get(route('diary.mood'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('streak', 0)
            ->where('days', 0)
        );
});

it('counts every logged day across months regardless of the visible month', function () {
    $this->travelTo('2026-03-02 18:00');

    foreach (['2026-03-02', '2026-03-01', '2026-01-15'] as $date) {
        $this->put(route('diary.update', $date), [
            'content' => '<p>Día</p>',
            'mood' => 4,
        ]);
    }

    $this->get(route('diary.mood'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('days', 3)
            ->where('streak', 2)
        );
});

it('does not reset logged days when a day was missed', function () {
    $this->travelTo('2026-03-02 18:00');

    foreach (['2026-03-02', '2026-02-27'] as $date) {
        $this->put(route('diary.update', $date), [
            'content' => '<p>Día</p>',
            'mood' => 5,
        ]);
    }

    $this->get(route('diary.mood'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('days', 2)
            ->where('streak', 1)
        );
});

it('counts consecutive days ending today as the streak', function () {
    $this->travelTo('2026-03-02 18:00');

    foreach (['2026-03-02', '2026-03-01', '2026-02-28'] as $date) {
        $this->put(route('diary.update', $date), [
            'content' => '<p>Día</p>',
            'mood' => 4,
        ]);
    }

    $this->get(route('diary.mood'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('streak', 3)
        );
});

it('keeps the streak when today has no mood yet', function () {
    $this->travelTo('2026-03-02 18:00');

    foreach (['2026-03-01', '2026-02-28', '2026-02-27'] as $date) {
        $this->put(route('diary.update', $date), [
            'content' => '<p>Día</p>',
            'mood' => 3,
        ]);
    }

    $this->get(route('diary.mood'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('streak', 3)
        );
});

it('resets the streak when a day was missed', function () {
    $this->travelTo('2026-03-02 18:00');

    foreach (['2026-03-02', '2026-02-27'] as $date) {
        $this->put(route('diary.update', $date), [
            'content' => '<p>Día</p>',
            'mood' => 5,
        ]);
    }

    $this->get(route('diary.mood'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('streak', 1)
        );
});

it('ignores future entries for the streak', function () {
    $this->travelTo('2026-03-02 18:00');

    Entry::factory()->for($this->user)->create([
        'date' => '2026-03-03',
        'mood' => 5,
    ]);

    $this->get(route('diary.mood'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('streak', 0)
            ->where('days', 0)
        );
});
