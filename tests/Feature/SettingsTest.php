<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->unlock = function (): void {
        $this->actingAs($this->user)
            ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
    };
});

it('redirects guests away from the settings page', function () {
    $this->get(route('diary.settings'))->assertRedirect(route('login'));
});

it('blocks a locked user from the settings page', function () {
    ($this->unlock)();
    $this->post(route('diary.lock'));

    $this->get(route('diary.settings'))->assertRedirect(route('diary.unlock'));
});

it('renders the settings page with the default background and no users for a non-admin', function () {
    ($this->unlock)();

    User::factory()->create();

    $this->get(route('diary.settings'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('settings/index')
            ->where('background', null)
            ->where('backgrounds', ['default', 'paper', 'sky', 'sage', 'peach', 'slate'])
            ->where('users', null)
        );
});

it('lists every account for an admin', function () {
    ($this->unlock)();

    $this->user->forceFill(['is_admin' => true])->save();
    User::factory()->create();

    $this->get(route('diary.settings'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('settings/index')
            ->has('users', 2)
        );
});

it('redirects the old password page to settings', function () {
    ($this->unlock)();

    $this->get(route('diary.password'))->assertRedirect(route('diary.settings'));
});

it('redirects the old admin users page to settings', function () {
    ($this->unlock)();

    $this->user->forceFill(['is_admin' => true])->save();

    $this->get(route('admin.users.index'))->assertRedirect(route('diary.settings'));
});

it('persists a preset background encrypted at rest', function () {
    ($this->unlock)();

    $this->put(route('diary.settings.update'), ['background' => 'sky'])
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status');

    $this->user->refresh();

    expect($this->user->background)->toBe('sky')
        ->and($this->user->getRawOriginal('background'))->not->toBe('sky')
        ->and(DB::table('users')->where('id', $this->user->id)->value('background'))->not->toBe('sky');
});

it('shares the email notifications preference on the settings page', function () {
    ($this->unlock)();

    $this->get(route('diary.settings'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('settings/index')
            ->where('emailNotifications', true)
        );
});

it('persists the email notifications toggle', function () {
    ($this->unlock)();

    $this->put(route('diary.settings.update'), ['email_notifications' => false])
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status');

    expect($this->user->refresh()->email_notifications)->toBeFalse();

    $this->put(route('diary.settings.update'), ['email_notifications' => true])
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status');

    expect($this->user->refresh()->email_notifications)->toBeTrue();
});

it('keeps the background and its version when only the email notifications toggle changes', function () {
    ($this->unlock)();

    $this->put(route('diary.settings.update'), ['background' => 'sky']);

    $before = $this->user->refresh();

    $this->put(route('diary.settings.update'), ['email_notifications' => false])
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status', __('messages.settings.notifications-updated'));

    $after = $this->user->refresh();

    expect($after->background)->toBe($before->background)
        ->and($after->background_version)->toBe($before->background_version)
        ->and($after->email_notifications)->toBeFalse();
});

it('rejects a non boolean email notifications value', function () {
    ($this->unlock)();

    $this->put(route('diary.settings.update'), ['email_notifications' => 'yes'])
        ->assertSessionHasErrors('email_notifications');

    expect($this->user->refresh()->email_notifications)->toBeTrue();
});

it('blocks a locked user from saving the email notifications toggle', function () {
    ($this->unlock)();
    $this->post(route('diary.lock'));

    $this->put(route('diary.settings.update'), ['email_notifications' => false])
        ->assertRedirect(route('diary.unlock'));

    expect($this->user->refresh()->email_notifications)->toBeTrue();
});

it('rejects an unknown preset background', function () {
    ($this->unlock)();

    $this->put(route('diary.settings.update'), ['background' => 'rainbow'])
        ->assertSessionHasErrors('background');

    expect($this->user->refresh()->background)->toBeNull();
});

it('clears a custom background back to the default', function () {
    ($this->unlock)();

    $this->put(route('diary.settings.update'), ['background' => 'sage'])
        ->assertRedirect(route('diary.settings'));

    $this->put(route('diary.settings.update'), ['background' => null])
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status');

    expect($this->user->refresh()->background)->toBeNull();
});

it('accepts a small custom image as a data uri', function () {
    ($this->unlock)();

    $png = base64_encode(base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        true,
    ));
    $uri = 'data:image/png;base64,'.$png;

    $this->put(route('diary.settings.update'), ['background' => $uri])
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status');

    $this->user->refresh();

    expect($this->user->background)->toBe($uri)
        ->and($this->user->backgroundChoice())->toBe('image')
        ->and(DB::table('users')->where('id', $this->user->id)->value('background'))->not->toContain('iVBOR');
});

it('bumps background_version so the client cache-busting version changes on upload', function () {
    ($this->unlock)();

    $before = $this->user->fresh()->background_version;

    $png = base64_encode(base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        true,
    ));
    $uri = 'data:image/png;base64,'.$png;

    $this->put(route('diary.settings.update'), ['background' => $uri])
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status');

    expect($this->user->refresh()->background_version)->toBeGreaterThan($before);
});

it('rejects a custom image over the size limit', function () {
    ($this->unlock)();

    config(['diary.background.max_size_kb' => 1]);

    $huge = 'data:image/png;base64,'.base64_encode(random_bytes(2 * 1024 * 1024));

    $this->put(route('diary.settings.update'), ['background' => $huge])
        ->assertSessionHasErrors('background');

    expect($this->user->refresh()->background)->toBeNull();
});

it('rejects a data uri with an unsupported image type', function () {
    ($this->unlock)();

    $uri = 'data:image/gif;base64,'.base64_encode('R0lGODlhAQABAAAAACw=');

    $this->put(route('diary.settings.update'), ['background' => $uri])
        ->assertSessionHasErrors('background');

    expect($this->user->refresh()->background)->toBeNull();
});

it('blocks a locked user from saving a background', function () {
    ($this->unlock)();
    $this->post(route('diary.lock'));

    $this->put(route('diary.settings.update'), ['background' => 'paper'])
        ->assertRedirect(route('diary.unlock'));

    expect($this->user->refresh()->getRawOriginal('background'))->toBeNull();
});

it('hides the background while the diary is locked', function () {
    ($this->unlock)();

    $this->put(route('diary.settings.update'), ['background' => 'peach']);

    $this->post(route('diary.lock'));

    expect($this->user->refresh()->backgroundChoice())->toBeNull();
});

it('renders the default background on the unlock screen while the diary is locked', function () {
    ($this->unlock)();

    $this->put(route('diary.settings.update'), ['background' => 'sky']);

    $this->post(route('diary.lock'));

    $html = $this->get(route('diary.unlock'))->getContent();

    expect($html)->toContain('<body class="font-sans antialiased">');
});

it('shares the background with every page so the client can keep the body in sync', function () {
    ($this->unlock)();

    $this->get(route('diary.show', now()->toDateString()))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->where('background', null));

    $this->put(route('diary.settings.update'), ['background' => 'sky']);

    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('background', 'sky'));
});

it('renders a preset background on the body', function () {
    ($this->unlock)();

    $this->put(route('diary.settings.update'), ['background' => 'sky']);

    $html = $this->get(route('diary.show', now()->toDateString()))->getContent();

    expect($html)->toContain('<body class="font-sans antialiased bg-sky">');
});

it('renders a well formed image style on the body', function () {
    ($this->unlock)();

    $uri = 'data:image/png;base64,'.base64_encode(base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        true,
    ));

    $this->put(route('diary.settings.update'), ['background' => $uri]);

    $html = $this->get(route('diary.show', now()->toDateString()))->getContent();

    expect($html)
        ->toContain('<body class="font-sans antialiased app-background-image" style="--app-background-image: url(')
        ->toContain(route('diary.background', ['v' => $this->user->refresh()->background_version]))
        ->not->toContain('style=&quot;');
});

it('shares a background version so the client can tell image replacements apart', function () {
    ($this->unlock)();

    $this->put(route('diary.settings.update'), [
        'background' => 'data:image/png;base64,'.base64_encode('first-image'),
    ]);

    $version = (string) $this->user->refresh()->background_version;

    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('background', 'image')
            ->where('backgroundVersion', $version)
        );

    $this->travel(1)->seconds();

    $this->put(route('diary.settings.update'), [
        'background' => 'data:image/png;base64,'.base64_encode('second-image'),
    ]);

    $newVersion = (string) $this->user->refresh()->background_version;

    expect($newVersion)->not->toBe($version);

    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('background', 'image')
            ->where('backgroundVersion', $newVersion)
        );
});

it('serves the custom background image from a short url', function () {
    ($this->unlock)();

    $png = (string) base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        true,
    );

    $this->put(route('diary.settings.update'), [
        'background' => 'data:image/png;base64,'.base64_encode($png),
    ]);

    $response = $this->get(route('diary.background'))->assertOk();

    expect($response->getContent())->toBe($png);

    $response->assertHeader('Content-Type', 'image/png')
        ->assertHeader('Cache-Control', 'must-revalidate, no-store, private')
        ->assertHeader('Cross-Origin-Resource-Policy', 'same-origin');
});

it('serves the uploaded image with a cache-busting query string', function () {
    ($this->unlock)();

    $png = base64_encode(base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        true,
    ));
    $uri = 'data:image/png;base64,'.$png;

    $this->put(route('diary.settings.update'), ['background' => $uri])
        ->assertRedirect(route('diary.settings'));

    $version = $this->user->fresh()->updated_at->getTimestamp();

    $response = $this->get(route('diary.background', ['v' => $version]))
        ->assertOk();

    expect($response->getContent())->toBe(base64_decode($png));
});

it('blocks a locked user from the background image', function () {
    ($this->unlock)();

    $uri = 'data:image/png;base64,'.base64_encode(base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        true,
    ));

    $this->put(route('diary.settings.update'), ['background' => $uri]);

    $this->post(route('diary.lock'));

    $this->get(route('diary.background'))->assertRedirect(route('diary.unlock'));
});

it('returns 404 when the user has no custom background image', function () {
    ($this->unlock)();

    $this->put(route('diary.settings.update'), ['background' => 'peach']);

    $this->get(route('diary.background'))->assertNotFound();
});

it('redirects guests away from the background image', function () {
    $this->get(route('diary.background'))->assertRedirect(route('login'));
});

it('lets a user change their own email', function () {
    ($this->unlock)();

    $this->patch(route('diary.settings.email'), ['email' => 'new@example.com'])
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status', __('messages.settings.email-updated'));

    expect($this->user->refresh()->email)->toBe('new@example.com');

    $this->assertAuthenticatedAs($this->user);
});

it('accepts the current email again without changing anything', function () {
    ($this->unlock)();

    $original = $this->user->email;

    $this->patch(route('diary.settings.email'), ['email' => $original])
        ->assertRedirect(route('diary.settings'));

    expect($this->user->refresh()->email)->toBe($original);
});

it('requires an email address on the settings page', function () {
    ($this->unlock)();

    $original = $this->user->email;

    $this->patch(route('diary.settings.email'), [])
        ->assertSessionHasErrors('email');

    expect($this->user->refresh()->email)->toBe($original);
});

it('rejects an invalid email address', function () {
    ($this->unlock)();

    $original = $this->user->email;

    $this->patch(route('diary.settings.email'), ['email' => 'not-an-email'])
        ->assertSessionHasErrors('email');

    expect($this->user->refresh()->email)->toBe($original);
});

it('rejects an email already used by another account', function () {
    ($this->unlock)();

    $taken = User::factory()->create();
    $original = $this->user->email;

    $this->patch(route('diary.settings.email'), ['email' => $taken->email])
        ->assertSessionHasErrors('email');

    expect($this->user->refresh()->email)->toBe($original);
});

it('blocks a locked user from changing their email', function () {
    ($this->unlock)();
    $this->post(route('diary.lock'));

    $this->patch(route('diary.settings.email'), ['email' => 'new@example.com'])
        ->assertRedirect(route('diary.unlock'));

    expect($this->user->refresh()->email)->not->toBe('new@example.com');
});

it('redirects guests away from the email update', function () {
    $this->patch(route('diary.settings.email'), ['email' => 'new@example.com'])
        ->assertRedirect(route('login'));
});
