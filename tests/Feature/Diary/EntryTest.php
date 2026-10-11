<?php

use App\Models\Entry;
use App\Models\User;
use Illuminate\Support\Collection;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
});

it('redirects an unlocked user from the home page to today\'s entry', function () {
    $today = now()->toDateString();

    $this->get(route('home'))->assertRedirect(route('diary.show', $today));
});

it('shows an empty entry for a day without content', function () {
    $today = now()->toDateString();

    $this->get(route('diary.show', $today))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/show')
            ->where('date', $today)
            ->where('entry.title', null)
            ->where('entry.content', null)
            ->where('entry.mood', null)
        );
});

it('stores the entry encrypted and reads it back decrypted', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'title' => 'Un día tranquilo',
        'content' => '<p>Querido diario, hoy llovió.</p>',
        'mood' => 4,
    ])->assertRedirect(route('diary.show', $today));

    $this->assertDatabaseCount('entries', 1);

    $raw = Entry::firstOrFail();
    expect($raw->getRawOriginal('title'))->not->toBe('Un día tranquilo')
        ->and($raw->getRawOriginal('content'))->not->toContain('llovió')
        ->and($raw->getRawOriginal('title'))->not->toContain('tranquilo');

    $this->get(route('diary.show', $today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('entry.title', 'Un día tranquilo')
            ->where('entry.content', '<p>Querido diario, hoy llovió.</p>')
            ->where('entry.mood', 4)
        );
});

it('does not create an entry when the content is empty', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'title' => '',
        'content' => '<p></p>',
        'mood' => null,
    ])->assertRedirect(route('diary.show', $today));

    $this->assertDatabaseCount('entries', 0);
});

it('deletes the entry when its content is cleared', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'title' => 'Temporal',
        'content' => '<p>Algo</p>',
    ]);

    $this->assertDatabaseCount('entries', 1);

    $this->put(route('diary.update', $today), [
        'title' => '',
        'content' => '<p></p>',
    ]);

    $this->assertDatabaseCount('entries', 0);
});

it('rejects entries for future dates', function () {
    $tomorrow = now()->addDay()->toDateString();

    $this->put(route('diary.update', $tomorrow), [
        'title' => 'Futuro',
        'content' => '<p>No debería guardarse</p>',
    ])->assertSessionHasErrors('date');

    $this->assertDatabaseCount('entries', 0);

    $this->get(route('diary.show', $tomorrow))->assertNotFound();
});

it('lists within the current month the days that have an entry', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'title' => 'Hoy',
        'content' => '<p>Contenido</p>',
    ]);

    $this->get(route('diary.show', $today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('calendar', fn (Collection $dates): bool => $dates->contains($today))
        );
});
