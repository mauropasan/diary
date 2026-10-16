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

it('creates a notification, sends a content-free email and stores it encrypted', function () {
    ($this->unlock)();
    Mail::fake();

    $response = $this->post(route('diary.notifications.store'), [
        'title' => 'Call the bank',
        'body' => 'Ask about the mortgage rate.',
    ]);

    $response->assertRedirect(route('diary.notifications'))
        ->assertSessionHas('status');

    Mail::assertSent(ReminderNotification::class);

    $notification = $this->user->fresh()->notifications()->first();

    expect($notification->title)->toBe('Call the bank')
        ->and($notification->body)->toBe('Ask about the mortgage rate.')
        ->and($notification->read_at)->toBeNull()
        ->and(DB::table('notifications')->where('id', $notification->id)->value('title'))->not->toBe('Call the bank');
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
        ->assertSessionHas('status');

    expect($this->user->fresh()->notifications)->toHaveCount(0);
});

it('blocks a locked user from saving a notification', function () {
    ($this->unlock)();
    $this->post(route('diary.lock'));

    $this->post(route('diary.notifications.store'), ['title' => 'Blocked'])
        ->assertRedirect(route('diary.unlock'));

    expect($this->user->fresh()->notifications)->toHaveCount(0);
});

it('prevents accessing another user notification', function () {
    ($this->unlock)();

    $other = User::factory()->withDiaryKey('other-password')->create();
    $notification = $other->notifications()->create(['title' => 'Private']);

    $this->patch(route('diary.notifications.read', $notification))->assertNotFound();
    $this->delete(route('diary.notifications.destroy', $notification))->assertNotFound();
});
