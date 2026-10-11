<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);

    $this->writeDay = function (int $daysAgo): void {
        $this->put(route('diary.update', now()->subDays($daysAgo)->toDateString()), [
            'content' => '<p>Escrito</p>',
        ]);
    };
});

it('reports no streak when there are no entries', function () {
    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('streak.current', 0)
            ->where('streak.longest', 0)
        );
});

it('counts consecutive days up to today', function () {
    ($this->writeDay)(0);
    ($this->writeDay)(1);
    ($this->writeDay)(2);

    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('streak.current', 3)
            ->where('streak.longest', 3)
        );
});

it('keeps the current streak alive when today is not written yet', function () {
    ($this->writeDay)(1);
    ($this->writeDay)(2);

    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('streak.current', 2)
        );
});

it('breaks the current streak on a missing day', function () {
    ($this->writeDay)(0);
    ($this->writeDay)(2);

    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('streak.current', 1)
            ->where('streak.longest', 1)
        );
});

it('reports the longest streak independently of the current one', function () {
    ($this->writeDay)(10);
    ($this->writeDay)(11);
    ($this->writeDay)(12);
    ($this->writeDay)(13);

    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('streak.current', 0)
            ->where('streak.longest', 4)
        );
});
