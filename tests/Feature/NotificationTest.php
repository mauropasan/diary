<?php

use App\Mail\ReminderNotification;
use App\Models\Note;
use App\Models\User;
use App\Security\TwoFactorNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->unlock = function (): void {
        $this->actingAs($this->user)
            ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
    };
});

it('redirects guests away from the notifications page', function () {
    $this->get(route('diary.notifications'))->assertRedirect(route('login'));
});

it('blocks a locked user from the notifications page', function () {
    ($this->unlock)();
    $this->post(route('diary.lock'));

    $this->get(route('diary.notifications'))->assertRedirect(route('diary.unlock'));
});

it('renders the notifications page', function () {
    ($this->unlock)();

    $this->get(route('diary.notifications'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/notifications')
            ->where('notifications', [])
        );
});

it('creates hidden notification rows for the reminder schedule', function () {
    ($this->unlock)();
    $this->travelTo('2026-03-10 08:00:00');

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'body' => 'Go to the city hall.',
        'kind' => 'reminder',
        'date' => '2026-03-13',
    ])->assertRedirect(route('diary.notes'));

    $notifications = $this->user->fresh()->notifications()->orderBy('due_at')->get();

    // One row per slot of the default schedule: the day before and the day
    // itself, at 09:00.
    expect($notifications->pluck('due_at')->map(fn ($due) => $due->toDateTimeString())->toArray())
        ->toBe(['2026-03-12 09:00:00', '2026-03-13 09:00:00'])
        ->and($notifications->pluck('note_id')->unique()->toArray())->toBe([Note::firstOrFail()->id])
        ->and($notifications->whereNotNull('read_at'))->toHaveCount(0)
        ->and($notifications->whereNotNull('emailed_at'))->toHaveCount(0);

    $first = $notifications->first();

    expect($first->title)->toBe('Renew passport')
        ->and($first->body)->toBe('Go to the city hall.')
        ->and(DB::table('notifications')->where('id', $first->id)->value('title'))->not->toBe('Renew passport');

    // Still hidden: neither the popup list nor the badge show it yet.
    $this->get(route('diary.notifications.list'))->assertExactJson([]);

    $this->get(route('diary.notifications'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('notificationCount', 0)
        );
});

it('reveals a notification only when its slot comes due', function () {
    ($this->unlock)();
    $this->travelTo('2026-03-10 08:00:00');

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'body' => 'Go to the city hall.',
        'kind' => 'reminder',
        'date' => '2026-03-13',
    ])->assertRedirect(route('diary.notes'));

    $this->travelTo('2026-03-12 09:00:00');
    ($this->unlock)();

    $this->get(route('diary.notifications.list'))
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJson([0 => ['title' => 'Renew passport']]);

    $this->get(route('diary.notifications'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('notificationCount', 1)
        );
});

it('shows application notifications translated without leaking their key', function () {
    ($this->unlock)();

    $this->user->notifications()->create([
        'kind' => TwoFactorNotifier::DISABLED_BY_ADMIN,
        'params' => ['actor' => 'Ada'],
        'due_at' => now(),
    ]);

    $this->get(route('diary.notifications.list'))
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJson([0 => [
            'title' => __('messages.notifications.kinds.two_factor_disabled_by_admin.title'),
            'body' => __('messages.notifications.kinds.two_factor_disabled_by_admin.body', ['actor' => 'Ada']),
        ]])
        ->assertJsonMissing(['kind' => TwoFactorNotifier::DISABLED_BY_ADMIN])
        ->assertJsonMissing(['params' => ['actor' => 'Ada']]);

    $this->get(route('diary.notifications'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('notificationCount', 1)
        );
});

it('sends the reminder email when the trigger moment arrives and only once', function () {
    ($this->unlock)();
    Mail::fake();
    $this->travelTo('2026-03-10 08:00:00');

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => '2026-03-13',
    ])->assertRedirect(route('diary.notes'));

    $first = $this->user->notifications()->whereDate('due_at', '2026-03-12')->firstOrFail();
    $this->travelTo($first->due_at);
    $this->artisan('diary:remind');
    $this->artisan('diary:remind');

    Mail::assertSent(ReminderNotification::class, 1);
    expect($first->fresh()->emailed_at)->not->toBeNull();
});

it('does not send the reminder email when the preference was switched off after creating', function () {
    ($this->unlock)();
    Mail::fake();
    $this->travelTo('2026-03-10 08:00:00');

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => '2026-03-13',
    ])->assertRedirect(route('diary.notes'));

    $this->user->forceFill(['email_notifications' => false])->save();

    $first = $this->user->fresh()->notifications()->whereDate('due_at', '2026-03-12')->firstOrFail();
    $this->travelTo($first->due_at);
    $this->artisan('diary:remind');

    Mail::assertNotSent(ReminderNotification::class);
    expect($first->fresh()->emailed_at)->toBeNull();
});

it('emails at most one reminder per note per day', function () {
    ($this->unlock)();
    $this->travelTo('2026-03-10 08:00:00');
    Mail::fake();

    $this->user->forceFill(['reminder_times' => ['08:00', '20:00']])->save();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => '2026-03-13',
    ])->assertRedirect(route('diary.notes'));

    expect($this->user->notifications()->count())->toBe(4);

    // Two slots a day over two days: two emails, not four.
    foreach (['2026-03-12 08:00:00', '2026-03-12 20:00:00', '2026-03-13 08:00:00', '2026-03-13 20:00:00'] as $moment) {
        $this->travelTo($moment);
        $this->artisan('diary:remind')->assertSuccessful();
    }

    Mail::assertSent(ReminderNotification::class, 2);
    expect($this->user->fresh()->notifications()->whereNotNull('emailed_at')->count())->toBe(4);
});

it('retries a reminder whose email could not be sent', function () {
    ($this->unlock)();
    $this->travelTo('2026-03-12 08:00:00');

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => '2026-03-13',
    ])->assertRedirect(route('diary.notes'));

    $first = $this->user->notifications()->whereDate('due_at', '2026-03-12')->firstOrFail();

    $this->travelTo($first->due_at);

    // The mail server is down: the row must stay unstamped so the next sweep
    // tries again. Keep the reported failure out of the log files.
    $manager = Mail::getFacadeRoot();
    config(['logging.default' => 'null']);
    Mail::shouldReceive('to')->once()->andThrow(new RuntimeException('SMTP down'));

    $this->artisan('diary:remind')->assertSuccessful();

    expect($first->fresh()->emailed_at)->toBeNull();

    // The mail server is back: swap the real manager in again and the
    // unstamped row is picked up by the next sweep.
    Mail::swap($manager);
    Mail::fake();
    $this->artisan('diary:remind')->assertSuccessful();

    Mail::assertSent(ReminderNotification::class, 1);
    expect($first->fresh()->emailed_at)->not->toBeNull();
});

it('re-arms the pending notifications when the note date changes', function () {
    ($this->unlock)();
    $this->travelTo('2026-03-10 08:00:00');

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => '2026-03-13',
    ])->assertRedirect(route('diary.notes'));

    $note = Note::firstOrFail();
    $note->notifications()->orderBy('due_at')->firstOrFail()->markAsRead();

    $this->put(route('diary.notes.update', $note), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => '2026-03-20',
    ])->assertRedirect(route('diary.notes'));

    $notifications = $this->user->fresh()->notifications()->orderBy('due_at')->get();

    // The ping that already popped stays behind as history; the pending one
    // follows the note to its new date.
    expect($notifications->pluck('due_at')->map(fn ($due) => $due->toDateTimeString())->toArray())
        ->toBe(['2026-03-12 09:00:00', '2026-03-19 09:00:00', '2026-03-20 09:00:00'])
        ->and($notifications->pluck('note_id')->unique()->toArray())->toBe([$note->id])
        ->and($notifications->whereNull('read_at'))->toHaveCount(2)
        ->and($notifications->first()->read_at)->not->toBeNull();
});

it('keeps the trigger and read state when only the note content changes', function () {
    ($this->unlock)();
    $this->travelTo('2026-03-10 08:00:00');

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => '2026-03-13',
    ])->assertRedirect(route('diary.notes'));

    $note = Note::firstOrFail();
    $notification = $note->notifications()->orderBy('due_at')->firstOrFail();
    $notification->markAsRead();

    $this->put(route('diary.notes.update', $note), [
        'title' => 'Renew passport tomorrow',
        'kind' => 'reminder',
        'date' => '2026-03-13',
    ])->assertRedirect(route('diary.notes'));

    $notification = $notification->fresh();

    // Nothing moves: the same two slots, the delivered one still delivered,
    // now carrying the note's new text.
    expect($notification->title)->toBe('Renew passport tomorrow')
        ->and($notification->due_at->toDateTimeString())->toBe('2026-03-12 09:00:00')
        ->and($notification->read_at)->not->toBeNull()
        ->and($note->notifications()->count())->toBe(2);
});

it('drops the pending notifications when the note is deleted or turned into a plain note', function () {
    ($this->unlock)();
    $this->travelTo('2026-03-10 08:00:00');

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => '2026-03-13',
    ]);

    expect($this->user->fresh()->notifications)->toHaveCount(2);

    $note = Note::firstOrFail();
    $this->delete(route('diary.notes.destroy', $note));

    expect($this->user->fresh()->notifications)->toHaveCount(0);

    $this->post(route('diary.notes.store'), [
        'title' => 'Second chance',
        'kind' => 'reminder',
        'date' => '2026-03-15',
    ]);

    $note = Note::orderByDesc('id')->firstOrFail();

    $this->put(route('diary.notes.update', $note), [
        'title' => 'Second chance',
        'kind' => 'note',
    ]);

    expect($this->user->fresh()->notifications)->toHaveCount(0);
});

it('does not create a notification for a plain note', function () {
    ($this->unlock)();

    $this->post(route('diary.notes.store'), [
        'title' => 'Loose note',
        'body' => 'Just a thought.',
        'kind' => 'note',
    ])->assertRedirect(route('diary.notes'));

    expect($this->user->fresh()->notifications)->toHaveCount(0);
});

it('shares the unread notification count', function () {
    ($this->unlock)();

    $this->user->notifications()->create(['title' => 'First reminder']);
    $this->user->notifications()->create(['title' => 'Second reminder']);
    $this->user->notifications()->create(['title' => 'Read reminder'])->markAsRead();

    $this->get(route('diary.notifications'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('notificationCount', 2)
        );
});

it('serves the notification list as JSON for the nav popup', function () {
    ($this->unlock)();

    $this->user->notifications()->create(['title' => 'Buy milk', 'body' => 'Two litres.']);

    $this->get(route('diary.notifications.list'))
        ->assertOk()
        ->assertJson([0 => ['title' => 'Buy milk', 'body' => 'Two litres.']]);
});

it('marks all notifications as read', function () {
    ($this->unlock)();

    $this->user->notifications()->create(['title' => 'First reminder']);
    $this->user->notifications()->create(['title' => 'Second reminder']);

    $this->patch(route('diary.notifications.read-all'))
        ->assertOk();

    expect($this->user->fresh()->notifications()->whereNull('read_at')->count())->toBe(0);
});

it('only marks due notifications as read, leaving future ones to pop later', function () {
    ($this->unlock)();

    $due = $this->user->notifications()->create(['title' => 'Due now']);
    $future = $this->user->notifications()->create([
        'title' => 'Not yet',
        'due_at' => now()->addDay(),
    ]);

    $this->patch(route('diary.notifications.read-all'))
        ->assertOk();

    expect($due->fresh()->read_at)->not->toBeNull()
        ->and($future->fresh()->read_at)->toBeNull();
});

it('marks a notification as read', function () {
    ($this->unlock)();

    $notification = $this->user->notifications()->create(['title' => 'Read me']);

    $this->patch(route('diary.notifications.read', $notification))
        ->assertOk()
        ->assertJson(['id' => $notification->id]);

    expect($notification->fresh()->read_at)->not->toBeNull();
});

it('deletes a notification', function () {
    ($this->unlock)();

    $notification = $this->user->notifications()->create(['title' => 'To delete']);

    $this->delete(route('diary.notifications.destroy', $notification))
        ->assertRedirect(route('diary.notifications'))
        ->assertSessionHas('status', __('messages.notifications.deleted'));

    expect($this->user->fresh()->notifications)->toHaveCount(0);
});

it('deletes a notification in place for json clients', function () {
    ($this->unlock)();

    $notification = $this->user->notifications()->create(['title' => 'To delete']);

    $this->deleteJson(route('diary.notifications.destroy', $notification))
        ->assertNoContent();

    expect($this->user->fresh()->notifications)->toHaveCount(0);
});

it('blocks a locked user from saving a note-based notification', function () {
    ($this->unlock)();
    $this->post(route('diary.lock'));

    $this->post(route('diary.notes.store'), [
        'title' => 'Blocked reminder',
        'kind' => 'reminder',
        'date' => now()->addDay()->toDateString(),
    ])->assertRedirect(route('diary.unlock'));

    expect($this->user->fresh()->notifications)->toHaveCount(0);
});

it('prevents accessing another user notification', function () {
    ($this->unlock)();

    $other = User::factory()->withDiaryKey('other-password')->create();
    $notification = $other->notifications()->create(['title' => 'Private']);

    $this->patch(route('diary.notifications.read', $notification))->assertNotFound();
    $this->delete(route('diary.notifications.destroy', $notification))->assertNotFound();
});
