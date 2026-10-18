<?php

use App\Jobs\SendReminderEmail;
use App\Mail\ReminderNotification;
use App\Models\Note;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Bus;
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

it('creates a hidden notification queued for the day before the note date', function () {
    ($this->unlock)();
    Bus::fake();

    $dueAt = Carbon::parse(now()->addDays(3)->toDateString())->subDay();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'body' => 'Go to the city hall.',
        'kind' => 'reminder',
        'date' => now()->addDays(3)->toDateString(),
    ])->assertRedirect(route('diary.notes'));

    Bus::assertDispatched(
        SendReminderEmail::class,
        fn (SendReminderEmail $job): bool => $job->delay->eq($dueAt),
    );

    $notification = $this->user->fresh()->notifications()->first();

    expect($notification->title)->toBe('Renew passport')
        ->and($notification->body)->toBe('Go to the city hall.')
        ->and($notification->read_at)->toBeNull()
        ->and($notification->due_at->equalTo($dueAt))->toBeTrue()
        ->and($notification->note_id)->toBe(Note::firstOrFail()->id)
        ->and(DB::table('notifications')->where('id', $notification->id)->value('title'))->not->toBe('Renew passport');

    // Still hidden: neither the popup list nor the badge show it yet.
    $this->get(route('diary.notifications.list'))->assertExactJson([]);

    $this->get(route('diary.notifications'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('notificationCount', 0)
        );
});

it('reveals the notification only from the day before the note date', function () {
    ($this->unlock)();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'body' => 'Go to the city hall.',
        'kind' => 'reminder',
        'date' => now()->addDays(3)->toDateString(),
    ])->assertRedirect(route('diary.notes'));

    // The day before arrives: the notification pops into view. Travelling
    // forward re-locks the diary, so unlock again before reading.
    $this->travelTo(now()->addDays(2)->startOfDay());
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

it('sends the reminder email when the trigger moment arrives and only once', function () {
    ($this->unlock)();
    Mail::fake();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => now()->addDays(3)->toDateString(),
    ])->assertRedirect(route('diary.notes'));

    $notification = $this->user->fresh()->notifications()->firstOrFail();

    $this->travelTo($notification->due_at);

    (new SendReminderEmail($notification->id))->handle();
    (new SendReminderEmail($notification->id))->handle();

    Mail::assertSent(ReminderNotification::class, 1);
    expect($notification->fresh()->emailed_at)->not->toBeNull();
});

it('does not send the reminder email when the preference was switched off after queueing', function () {
    ($this->unlock)();
    Mail::fake();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => now()->addDays(3)->toDateString(),
    ])->assertRedirect(route('diary.notes'));

    $this->user->forceFill(['email_notifications' => false])->save();

    $notification = $this->user->fresh()->notifications()->firstOrFail();

    $this->travelTo($notification->due_at);

    (new SendReminderEmail($notification->id))->handle();

    Mail::assertNotSent(ReminderNotification::class);
    expect($notification->fresh()->emailed_at)->toBeNull();
});

it('re-arms the pending notification when the note date changes', function () {
    ($this->unlock)();
    Bus::fake();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => now()->addDays(3)->toDateString(),
    ])->assertRedirect(route('diary.notes'));

    $note = Note::firstOrFail();
    $note->notifications()->firstOrFail()->markAsRead();

    $this->put(route('diary.notes.update', $note), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => now()->addDays(10)->toDateString(),
    ])->assertRedirect(route('diary.notes'));

    $notification = $this->user->fresh()->notifications()->firstOrFail();

    expect($notification->due_at->equalTo(Carbon::parse(now()->addDays(9)->toDateString())))->toBeTrue()
        ->and($notification->read_at)->toBeNull()
        ->and($notification->note_id)->toBe($note->id);

    Bus::assertDispatchedTimes(SendReminderEmail::class, 2);
});

it('keeps the trigger and read state when only the note content changes', function () {
    ($this->unlock)();
    Bus::fake();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => now()->addDays(3)->toDateString(),
    ])->assertRedirect(route('diary.notes'));

    $note = Note::firstOrFail();
    $notification = $note->notifications()->firstOrFail();
    $notification->markAsRead();

    $this->put(route('diary.notes.update', $note), [
        'title' => 'Renew passport tomorrow',
        'kind' => 'reminder',
        'date' => now()->addDays(3)->toDateString(),
    ])->assertRedirect(route('diary.notes'));

    $notification = $notification->fresh();
    $expectedDueAt = Carbon::parse(now()->addDays(3)->toDateString())->subDay();

    expect($notification->title)->toBe('Renew passport tomorrow')
        ->and($notification->due_at->equalTo($expectedDueAt))->toBeTrue()
        ->and($notification->read_at)->not->toBeNull();

    Bus::assertDispatchedTimes(SendReminderEmail::class, 1);
});

it('drops the pending notification when the note is deleted or turned into a plain note', function () {
    ($this->unlock)();
    Bus::fake();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'kind' => 'reminder',
        'date' => now()->addDays(3)->toDateString(),
    ]);

    $note = Note::firstOrFail();
    $this->delete(route('diary.notes.destroy', $note));

    expect($this->user->fresh()->notifications)->toHaveCount(0);

    $this->post(route('diary.notes.store'), [
        'title' => 'Second chance',
        'kind' => 'reminder',
        'date' => now()->addDays(5)->toDateString(),
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
    Mail::fake();

    $this->post(route('diary.notes.store'), [
        'title' => 'Loose note',
        'body' => 'Just a thought.',
        'kind' => 'note',
    ])->assertRedirect(route('diary.notes'));

    Mail::assertNotSent(ReminderNotification::class);

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
