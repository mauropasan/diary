<?php

use App\Models\User;
use Illuminate\Support\Collection;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
});

it('defaults the calendar to the selected day\'s month', function () {
    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('calendarMonth', now()->format('Y-m'))
        );
});

it('returns the entry dates for the requested month', function () {
    $previous = now()->startOfMonth()->subDay();

    $this->put(route('diary.update', $previous->toDateString()), [
        'content' => '<p>Mes anterior</p>',
    ]);

    $this->get(route('diary.show', now()->toDateString()).'?mes='.$previous->format('Y-m'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('calendarMonth', $previous->format('Y-m'))
            ->where('calendar', fn (Collection $dates): bool => $dates->contains($previous->toDateString()))
        );
});

it('does not include other months in the calendar', function () {
    $previous = now()->startOfMonth()->subDay();

    $this->put(route('diary.update', $previous->toDateString()), [
        'content' => '<p>Mes anterior</p>',
    ]);

    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('calendarMonth', now()->format('Y-m'))
            ->where('calendar', fn (Collection $dates): bool => ! $dates->contains($previous->toDateString()))
        );
});

it('ignores an invalid month parameter', function () {
    $this->get(route('diary.show', now()->toDateString()).'?mes=bogus')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('calendarMonth', now()->format('Y-m'))
        );
});
