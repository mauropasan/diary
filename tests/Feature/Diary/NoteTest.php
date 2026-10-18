<?php

use App\Jobs\SendReminderEmail;
use App\Mail\ReminderNotification;
use App\Models\Note;
use App\Models\User;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
});

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

it('queues the reminder email by default when a dated reminder note is created', function () {
    Bus::fake();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'body' => 'Go to the city hall.',
        'kind' => 'reminder',
        'date' => now()->addDays(3)->toDateString(),
    ])->assertRedirect(route('diary.notes'));

    Bus::assertDispatched(SendReminderEmail::class);
});

it('does not queue a reminder email when email notifications are disabled', function () {
    Bus::fake();
    Mail::fake();

    $this->user->forceFill(['email_notifications' => false])->save();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'body' => 'Go to the city hall.',
        'kind' => 'reminder',
        'date' => now()->addDays(3)->toDateString(),
    ])->assertRedirect(route('diary.notes'));

    Bus::assertNotDispatched(SendReminderEmail::class);
    Mail::assertNotSent(ReminderNotification::class);
});

it('does not send a reminder email for a plain note', function () {
    Mail::fake();

    $this->post(route('diary.notes.store'), [
        'title' => 'Loose note',
        'body' => 'Just a thought.',
        'kind' => 'note',
    ])->assertRedirect(route('diary.notes'));

    Mail::assertNotSent(ReminderNotification::class);
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

    $this->assertDatabaseMissing('notes', ['id' => $note->getKey()]);
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
