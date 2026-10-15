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
        ->toContain(route('diary.background', ['v' => $this->user->refresh()->updated_at->getTimestamp()]))
        ->not->toContain('style=&quot;');
});

it('shares a background version so the client can tell image replacements apart', function () {
    ($this->unlock)();

    $this->put(route('diary.settings.update'), [
        'background' => 'data:image/png;base64,'.base64_encode('first-image'),
    ]);

    $version = (string) $this->user->refresh()->updated_at->getTimestamp();

    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('background', 'image')
            ->where('backgroundVersion', $version)
        );

    $this->travel(1)->seconds();

    $this->put(route('diary.settings.update'), [
        'background' => 'data:image/png;base64,'.base64_encode('second-image'),
    ]);

    $newVersion = (string) $this->user->refresh()->updated_at->getTimestamp();

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
