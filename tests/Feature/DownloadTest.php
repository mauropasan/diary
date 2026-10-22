<?php

use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

it('serves the published android apk only when authenticated', function () {
    Storage::fake('apk');
    Storage::disk('apk')->put('diary.apk', 'fake apk bytes');

    $this->get(route('download.apk'))->assertRedirect(route('login'));

    $user = User::factory()->create();
    $this->actingAs($user)
        ->get(route('download.apk'))
        ->assertOk()
        ->assertDownload('diary.apk');
});

it('returns not found when no apk has been published', function () {
    Storage::fake('apk');

    $user = User::factory()->create();
    $this->actingAs($user)->get(route('download.apk'))->assertNotFound();
});

it('reports the version of the published apk only when authenticated', function () {
    Storage::fake('apk');

    $user = User::factory()->create();
    $this->actingAs($user)->get(route('download.version'))->assertNotFound();

    Storage::disk('apk')->put('version.json', json_encode([
        'versionCode' => 37,
        'versionName' => '1.37',
        'publishedAt' => '2026-10-20T08:00:00Z',
    ]));

    $this->actingAs($user)
        ->get(route('download.version'))
        ->assertOk()
        ->assertExactJson([
            'versionCode' => 37,
            'versionName' => '1.37',
            'publishedAt' => '2026-10-20T08:00:00Z',
        ]);
});

it('does not report a version file that carries no build', function () {
    Storage::fake('apk');
    Storage::disk('apk')->put('version.json', 'not json at all');

    $user = User::factory()->create();
    $this->actingAs($user)->get(route('download.version'))->assertNotFound();
});

it('tells the frontend when an apk is ready to download only for signed in users', function () {
    Storage::fake('apk');

    // The login page only renders once at least one account exists;
    // otherwise the first-run flow redirects to registration.
    $user = User::factory()->withDiaryKey('secret-password')->create();

    $this->get(route('login'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('auth/login')
            ->where('apkAvailable', false)
        );

    Storage::disk('apk')->put('diary.apk', 'fake apk bytes');

    $this->actingAs($user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);

    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('apkAvailable', true)
        );
});
