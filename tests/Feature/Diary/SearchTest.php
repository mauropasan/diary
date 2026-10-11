<?php

use App\Models\User;
use Illuminate\Support\Collection;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
});

it('finds entries by title', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'title' => 'Un día tranquilo',
        'content' => '<p>Texto cualquiera</p>',
    ]);

    $this->get(route('diary.search').'?q=tranquilo')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('query', 'tranquilo')
            ->where('results.0.date', $today)
            ->where('results.0.title', 'Un día tranquilo')
        );
});

it('finds entries by content', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'content' => '<p>Hoy fui a caminar por el parque</p>',
    ]);

    $this->get(route('diary.search').'?q=parque')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('results.0.date', $today)
        );
});

it('finds entries by tag', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'content' => '<p>Sin coincidencia</p>',
        'tags' => ['Trabajo'],
    ]);

    $this->get(route('diary.search').'?q=trabajo')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('results.0.date', $today)
        );
});

it('matches ignoring case and accents', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'content' => '<p>Me tomé un café</p>',
    ]);

    $this->get(route('diary.search').'?q=CAFE')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('results.0.date', $today)
        );
});

it('returns no results for a blank query', function () {
    $this->put(route('diary.update', now()->toDateString()), [
        'content' => '<p>Contenido</p>',
    ]);

    $this->get(route('diary.search').'?q=')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('results', [])
        );
});

it('orders results newest first', function () {
    $today = now()->toDateString();
    $yesterday = now()->subDay()->toDateString();

    $this->put(route('diary.update', $yesterday), [
        'content' => '<p>Coincidencia de ayer</p>',
    ]);
    $this->put(route('diary.update', $today), [
        'content' => '<p>Coincidencia de hoy</p>',
    ]);

    $this->get(route('diary.search').'?q=coincidencia')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('results.0.date', $today)
            ->where('results.1.date', $yesterday)
        );
});

it('returns an excerpt around the match', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'content' => '<p>Querido diario, hoy llovió mucho y salí a caminar por el parque</p>',
    ]);

    $this->get(route('diary.search').'?q=llovió')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('results', fn (Collection $results): bool => $results->contains(
                fn (array $result): bool => str_contains((string) $result['excerpt'], 'llovió')
            ))
        );
});
