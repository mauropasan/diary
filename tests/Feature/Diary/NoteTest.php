<?php

use App\Models\Note;
use App\Models\Notification;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
});

/**
 * The moment of every armed reminder of a user, oldest first.
 */
function dueDates(User $user): array
{
    return $user->notifications()
        ->orderBy('due_at')
        ->get()
        ->map(fn (Notification $notification): string => $notification->due_at->toDateTimeString())
        ->all();
}

it('creates a note and encrypts its text', function () {
    $this->post(route('diary.notes.store'), [
        'title' => 'Buy milk',
        'body' => 'And a loaf of bread',
        'color' => 'blue',
        'kind' => 'note',
    ])->assertRedirect(route('diary.notes'));

    $note = Note::firstOrFail();

    expect($note->getRawOriginal('title'))->not->toBe('Buy milk')
        ->and($note->getRawOriginal('body'))->not->toBe('And a loaf of bread')
        ->and($note->title)->toBe('Buy milk')
        ->and($note->body)->toBe('And a loaf of bread')
        ->and($note->color)->toBe('blue')
        ->and($note->kind)->toBe('note');
});

it('arms the reminder notifications for a dated reminder note', function () {
    $this->travelTo('2026-03-10 08:00:00');

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'body' => 'Go to the city hall.',
        'kind' => 'reminder',
        'date' => '2026-03-13',
    ])->assertRedirect(route('diary.notes'));

    // The default schedule is the day before and the day itself, at 09:00.
    expect(dueDates($this->user))->toBe(['2026-03-12 09:00:00', '2026-03-13 09:00:00']);
});

it('still arms the reminder notifications when email notifications are disabled', function () {
    $this->travelTo('2026-03-10 08:00:00');

    $this->user->forceFill(['email_notifications' => false])->save();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'body' => 'Go to the city hall.',
        'kind' => 'reminder',
        'date' => '2026-03-13',
    ])->assertRedirect(route('diary.notes'));

    // Only the email is optional; the reminder still pops in the app.
    expect($this->user->notifications()->count())->toBe(2);
});

it('does not arm any reminder notification for a plain note', function () {
    $this->post(route('diary.notes.store'), [
        'title' => 'Loose note',
        'body' => 'Just a thought.',
        'kind' => 'note',
    ])->assertRedirect(route('diary.notes'));

    expect($this->user->notifications()->count())->toBe(0);
});

it('attaches a note to a day and shows it on the entry page', function () {
    $today = now()->toDateString();

    $this->post(route('diary.notes.store'), [
        'title' => 'Dentist',
        'body' => 'At 10:00',
        'kind' => 'event',
        'date' => $today,
    ])->assertRedirect(route('diary.notes'));

    $this->get(route('diary.show', $today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/show')
            ->where('notes.0.title', 'Dentist')
            ->where('notes.0.kind', 'event')
            ->where('notes.0.date', $today)
        );
});

it('shows upcoming reminders and events in the agenda', function () {
    $today = now()->toDateString();
    $future = now()->addDays(3)->toDateString();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => $future,
    ]);

    $this->get(route('diary.show', $today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/show')
            ->where('notes', [])
            ->where('upcomingNotes.0.title', 'Renew passport')
            ->where('upcomingNotes.0.date', $future)
        );
});

it('does not repeat the selected day reminder in the agenda', function () {
    $today = now()->toDateString();

    $this->post(route('diary.notes.store'), [
        'title' => 'Call mum',
        'kind' => 'reminder',
        'date' => $today,
    ]);

    $this->get(route('diary.show', $today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/show')
            ->where('notes.0.title', 'Call mum')
            ->where('upcomingNotes', [])
        );
});

it('keeps plain notes out of the agenda', function () {
    $today = now()->toDateString();

    $this->post(route('diary.notes.store'), [
        'title' => 'Undated note',
        'kind' => 'note',
    ]);

    $this->post(route('diary.notes.store'), [
        'title' => 'Dated note',
        'kind' => 'note',
        'date' => now()->addDays(2)->toDateString(),
    ]);

    $this->get(route('diary.show', $today))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/show')
            ->where('upcomingNotes', [])
        );
});

it('does not show notes attached to other days', function () {
    $today = now()->toDateString();
    $yesterday = now()->subDay()->toDateString();

    $this->post(route('diary.notes.store'), [
        'body' => 'Only today',
        'kind' => 'note',
        'date' => $today,
    ]);

    $this->get(route('diary.show', $yesterday))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/show')
            ->where('notes', [])
        );
});

it('lists the notes on the notes page', function () {
    $this->post(route('diary.notes.store'), [
        'body' => 'Loose note',
        'kind' => 'note',
    ]);

    $this->get(route('diary.notes'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/notes')
            ->has('notes', 1)
            ->where('notes.0.body', 'Loose note')
        );
});

it('updates a note', function () {
    $this->post(route('diary.notes.store'), [
        'title' => 'Draft',
        'kind' => 'note',
    ]);

    $note = Note::firstOrFail();

    $this->put(route('diary.notes.update', $note), [
        'title' => 'Final',
        'color' => 'purple',
        'kind' => 'note',
    ])->assertRedirect(route('diary.notes'));

    expect($note->refresh()->title)->toBe('Final')
        ->and($note->color)->toBe('purple');
});

it('deletes a note', function () {
    $this->post(route('diary.notes.store'), [
        'body' => 'Temporary',
        'kind' => 'note',
    ]);

    $note = Note::firstOrFail();

    $this->delete(route('diary.notes.destroy', $note))
        ->assertRedirect(route('diary.notes'));

    $this->assertSoftDeleted('notes', ['id' => $note->getKey()]);
});

it('rejects a note with neither title nor body', function () {
    $this->post(route('diary.notes.store'), [
        'color' => 'yellow',
        'kind' => 'note',
    ])->assertSessionHasErrors('body');

    $this->assertDatabaseCount('notes', 0);
});

it('requires a date for reminders and events', function () {
    $this->post(route('diary.notes.store'), [
        'title' => 'Call mum',
        'kind' => 'reminder',
    ])->assertSessionHasErrors('date');

    $this->assertDatabaseCount('notes', 0);
});

it('allows notes attached to future days', function () {
    $future = now()->addDays(5)->toDateString();

    $this->post(route('diary.notes.store'), [
        'title' => 'Trip',
        'kind' => 'event',
        'date' => $future,
    ])->assertSessionHasNoErrors();

    expect(Note::firstOrFail()->date?->toDateString())->toBe($future);
});

it('rejects an unknown color or kind', function () {
    $this->post(route('diary.notes.store'), [
        'body' => 'Hello',
        'kind' => 'task',
    ])->assertSessionHasErrors('kind');
});

it('does not let a user touch another user\'s note', function () {
    $this->post(route('diary.notes.store'), [
        'body' => 'Mine',
        'kind' => 'note',
    ]);

    $note = Note::firstOrFail();
    $ciphertext = $note->getRawOriginal('body');

    $other = User::factory()->withDiaryKey('other-secret')->create();

    $this->actingAs($other)
        ->post(route('diary.unlock.store'), ['password' => 'other-secret']);

    $this->put(route('diary.notes.update', $note), [
        'body' => 'Hijacked',
        'kind' => 'note',
    ])->assertNotFound();

    $this->delete(route('diary.notes.destroy', $note))->assertNotFound();

    expect(Note::firstOrFail()->getRawOriginal('body'))->toBe($ciphertext);
});
