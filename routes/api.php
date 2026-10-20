<?php

use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SyncController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Sync API routes
|--------------------------------------------------------------------------
|
| The JSON surface the Android app talks to: stateless (Sanctum personal
| access tokens instead of a session) and keyless unless the request proves
| it holds the diary key (`X-Diary-Key`, verified after authentication).
| The framework mounts this file under the /api prefix; each route is
| versioned as /api/v1 so a future breaking contract can ship beside it.
|
*/

Route::prefix('v1')->group(function (): void {
    // Signing in, recovering and the one-time registration: throttled like
    // their web counterparts so the endpoints cannot be guessed at speed.
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:6,1')
        ->name('api.auth.login');
    Route::post('auth/two-factor', [AuthController::class, 'twoFactor'])
        ->middleware('throttle:6,1')
        ->name('api.auth.two-factor');
    Route::post('auth/recover', [AuthController::class, 'recover'])
        ->middleware('throttle:6,1')
        ->name('api.auth.recover');
    Route::post('auth/recover-key', [AuthController::class, 'recoverKey'])
        ->middleware('throttle:6,1')
        ->name('api.auth.recover-key');
    Route::post('auth/register', [AuthController::class, 'register'])
        ->middleware(['registration.open', 'throttle:6,1'])
        ->name('api.auth.register');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('auth/me', [AuthController::class, 'me'])
            ->name('api.auth.me');
        Route::post('auth/logout', [AuthController::class, 'logout'])
            ->name('api.auth.logout');
    });

    // Everything that touches diary data: the token names the account and the
    // header proves the data encryption key, which is parked for the request
    // so the encrypted cast and the attachment blobs open as usual.
    Route::middleware(['auth:sanctum', 'diary.key', 'throttle:120,1'])->group(function (): void {
        Route::get('sync', [SyncController::class, 'pull'])
            ->name('api.sync.pull');
        Route::post('sync', [SyncController::class, 'push'])
            ->name('api.sync.push');

        Route::post('entries/{date}/attachments', [AttachmentController::class, 'store'])
            ->where('date', '\d{4}-\d{2}-\d{2}')
            ->name('api.attachments.store');
        Route::get('attachments/{attachment}', [AttachmentController::class, 'show'])
            ->name('api.attachments.show');
    });
});
