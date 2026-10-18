<?php

use App\Mail\ReminderNotification;
use App\Models\User;
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

it('creates a notification when a reminder note is created and sends a content-free email', function () {
    ($this->unlock)();
    Mail::fake();

    $future = now()->addDays(3)->toDateString();

    $this->post(route('diary.notes.store'), [
        'title' => 'Renew passport',
        'body' => 'Go to the city hall.',
        'kind' => 'reminder',
        'date' => $future,
    ])->assertRedirect(route('diary.notes'));

    Mail::assertSent(ReminderNotification::class);

    $notification = $this->user->fresh()->notifications()->first();

    expect($notification->title)->toBe('Renew passport')
        ->and($notification->body)->toBe('Go to the city hall.')
        ->and($notification->read_at)->toBeNull()
        ->and(DB::table('notifications')->where('id', $notification->id)->value('title'))->not->toBe('Renew passport');
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
