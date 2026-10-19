<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
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

    /**
     * Report the version of the published build as JSON.
     *
     * `scripts/apk.sh` writes `version.json` beside the APK, so the installed
     * shell can compare its own versionCode with the published one and offer
     * the update without fetching the APK itself. Version codes only grow, so
     * a plain number comparison tells a newer build apart from the running one.
     */
    public function version(): JsonResponse
    {
        $contents = Storage::disk('apk')->get('version.json');

        abort_unless(is_string($contents), 404);

        $version = json_decode($contents, true);

        abort_unless(is_array($version) && isset($version['versionCode']), 404);

        return response()->json($version);
    }
}
