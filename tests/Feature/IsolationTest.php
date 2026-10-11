<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;

function unlockDiaryAs(User $user, string $password = 'secret-password'): void
{
    test()->actingAs($user)->post(route('diary.unlock.store'), ['password' => $password]);
}

function writeEntryFor(string $title, string $content): void
{
    $today = now()->toDateString();

    test()->put(route('diary.update', $today), [
        'title' => $title,
        'content' => $content,
        'mood' => 4,
    ]);
}

it('serves an empty entry when another user has an entry for the same date', function () {
    $owner = User::factory()->withDiaryKey('owner-secret')->create();
    $other = User::factory()->withDiaryKey('other-secret')->create();

    unlockDiaryAs($owner, 'owner-secret');
    writeEntryFor('Día privado', '<p>Contenido que solo ve su autora.</p>');

    unlockDiaryAs($other, 'other-secret');

    $this->get(route('diary.show', now()->toDateString()))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/show')
            ->where('entry.title', null)
            ->where('entry.content', null)
        );
});

it('keeps each user\'s entry content encrypted under their own key', function () {
    $owner = User::factory()->withDiaryKey('owner-secret')->create();
    $other = User::factory()->withDiaryKey('other-secret')->create();

    unlockDiaryAs($owner, 'owner-secret');
    writeEntryFor('Día privado', '<p>Contenido secreto de la autora.</p>');

    $raw = DB::table('entries')->where('user_id', $owner->id)->value('content');

    expect((string) $raw)->not->toContain('secreto')
        ->and((string) $raw)->not->toContain('Conte');
});

it('does not show other users\' entries to an administrator', function () {
    $admin = User::factory()->asAdmin()->withDiaryKey('admin-secret')->create();
    $other = User::factory()->withDiaryKey('other-secret')->create();

    unlockDiaryAs($other, 'other-secret');
    writeEntryFor('Día privado', '<p>Contenido ajeno.</p>');

    unlockDiaryAs($admin, 'admin-secret');

    $this->get(route('diary.show', now()->toDateString()))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('entry.title', null)
            ->where('entry.content', null)
        );
});

it('scopes search results to the current user', function () {
    $owner = User::factory()->withDiaryKey('owner-secret')->create();
    $other = User::factory()->withDiaryKey('other-secret')->create();

    unlockDiaryAs($owner, 'owner-secret');
    writeEntryFor('Rutina de septiembre', '<p>Nadé por la mañana.</p>');

    unlockDiaryAs($other, 'other-secret');

    $this->get(route('diary.search', ['q' => 'Nadé']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/search')
            ->where('results', [])
        );
});

it('scopes the export to the current user', function () {
    $owner = User::factory()->withDiaryKey('owner-secret')->create();
    $other = User::factory()->withDiaryKey('other-secret')->create();

    unlockDiaryAs($owner, 'owner-secret');
    writeEntryFor('Rutina de septiembre', '<p>Contenido de la autora.</p>');

    unlockDiaryAs($other, 'other-secret');

    $this->get(route('diary.export'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/export')
            ->where('entries', [])
        );
});
