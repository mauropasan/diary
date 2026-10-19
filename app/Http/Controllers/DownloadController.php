<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DownloadController extends Controller
{
    /**
     * Serve the latest Android build published by `scripts/apk.sh`.
     *
     * The Capacitor shell loads the hosted app, so the APK is distributed
     * from here: every `npm run apk:release` replaces the file and the link
     * below always points to the newest build.
     */
    public function apk(): BinaryFileResponse
    {
        $path = Storage::disk('apk')->path('diary.apk');

        abort_unless(is_file($path), 404);

        return response()->download($path, 'diary.apk', [
            'Content-Type' => 'application/vnd.android.package-archive',
        ]);
    }
}
