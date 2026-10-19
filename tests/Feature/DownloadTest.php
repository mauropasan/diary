<?php

use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

it('serves the published android apk', function () {
    Storage::fake('apk');
    Storage::disk('apk')->put('diary.apk', 'fake apk bytes');

    $this->get(route('download.apk'))
        ->assertOk()
        ->assertDownload('diary.apk');
});

it('returns not found when no apk has been published', function () {
    Storage::fake('apk');

    $this->get(route('download.apk'))->assertNotFound();
});

it('tells the frontend when an apk is ready to download', function () {
    Storage::fake('apk');

    // The login page only renders once at least one account exists;
    // otherwise the first-run flow redirects to registration.
    User::factory()->create();

    $this->get(route('login'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('auth/login')
            ->where('apkAvailable', false)
        );

    Storage::disk('apk')->put('diary.apk', 'fake apk bytes');

    $this->get(route('login'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('apkAvailable', true)
        );
});
