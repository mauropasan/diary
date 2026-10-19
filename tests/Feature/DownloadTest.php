<?php

use Illuminate\Support\Facades\Storage;

it('serves the published android apk', function () {
    Storage::fake('local');
    Storage::disk('local')->put('apk/diary.apk', 'fake apk bytes');

    $this->get(route('download.apk'))
        ->assertOk()
        ->assertDownload('diary.apk');
});

it('returns not found when no apk has been published', function () {
    Storage::fake('local');

    $this->get(route('download.apk'))->assertNotFound();
});
