<?php

use App\Models\Entry;
use App\Models\Tag;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
});

it('stores the tags encrypted and reads them back', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'content' => '<p>Con etiquetas</p>',
        'tags' => ['Trabajo', 'Salud'],
    ])->assertRedirect(route('diary.show', $today));

    $this->assertDatabaseCount('tags', 2);

    $raw = Tag::orderBy('id')->firstOrFail();
    expect($raw->getRawOriginal('name'))->not->toBe('Trabajo')
        ->and($raw->getRawOriginal('name'))->not->toContain('Trabajo')
        ->and($raw->name_index)->not->toBe('');

    $this->get(route('diary.show', $today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('tags', ['Trabajo', 'Salud'])
        );
});

it('reuses a single tag regardless of casing and surrounding whitespace', function () {
    $this->put(route('diary.update', now()->toDateString()), [
        'content' => '<p>Uno</p>',
        'tags' => ['Trabajo'],
    ]);

    $this->put(route('diary.update', now()->subDay()->toDateString()), [
        'content' => '<p>Dos</p>',
        'tags' => ['  trabajo  '],
    ]);

    $this->assertDatabaseCount('tags', 1);

    $entry = Entry::whereDate('date', now()->subDay())->firstOrFail();
    expect($entry->tags->pluck('name')->all())->toBe(['Trabajo']);
});

it('detaches tags that are no longer present', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'content' => '<p>Primero</p>',
        'tags' => ['Trabajo', 'Salud'],
    ]);

    $this->put(route('diary.update', $today), [
        'content' => '<p>Segundo</p>',
        'tags' => ['Trabajo'],
    ]);

    $entry = Entry::firstOrFail();
    expect($entry->tags->pluck('name')->all())->toBe(['Trabajo']);
    expect(Tag::count())->toBe(2);
});

it('ignores blank tag names', function () {
    $this->put(route('diary.update', now()->toDateString()), [
        'content' => '<p>Con ruido</p>',
        'tags' => ['Trabajo', '', '   ', '  '],
    ]);

    $this->assertDatabaseCount('tags', 1);
});

it('does not keep tags when the entry content is empty', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'content' => '<p></p>',
        'tags' => ['Trabajo'],
    ]);

    $this->assertDatabaseCount('entries', 0);
    expect(Entry::first())->toBeNull();
});
