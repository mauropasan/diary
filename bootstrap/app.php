<?php

use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\EnsureDiaryUnlocked;
use App\Http\Middleware\EnsureNoUsersRegistered;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\VerifyDiaryKey;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            SetLocale::class,
            HandleInertiaRequests::class,
            AddSecurityHeaders::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // The `lang` cookie is written by the client via document.cookie, so it
        // must stay in plaintext for the SetLocale middleware to read it.
        $middleware->encryptCookies(except: ['lang']);

        $middleware->alias([
            'diary.unlocked' => EnsureDiaryUnlocked::class,
            'admin' => EnsureUserIsAdmin::class,
            'registration.open' => EnsureNoUsersRegistered::class,
            'diary.key' => VerifyDiaryKey::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
