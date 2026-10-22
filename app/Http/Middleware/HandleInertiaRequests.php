<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'locale' => app()->getLocale(),
            'locales' => $this->locales(),
            'auth' => [
                'user' => $user,
            ],
            'background' => $user?->backgroundChoice(),
            'backgroundVersion' => (string) ($user === null ? 0 : $user->background_version),
            'notificationCount' => (int) ($user?->notifications()->unread()->due()->count() ?? 0),
            // scripts/apk.sh publishes the Android build here; the nav only
            // offers the download while a build is actually available and the
            // viewer is signed in (the routes are auth-protected).
            'apkAvailable' => $user !== null && Storage::disk('apk')->exists('diary.apk'),
            'diary' => [
                'lockAfterMinutes' => (int) config('diary.lock_after_minutes'),
                'timezone' => config('app.timezone'),
            ],
            'csrfToken' => csrf_token(),
            'flash' => [
                'status' => $request->session()->get('status'),
                'recoveryKey' => $request->session()->get('recoveryKey'),
                'recoveryCodes' => $request->session()->get('recoveryCodes'),
            ],
        ];
    }

    /**
     * The supported interface languages, as code/name pairs for the picker.
     *
     * @return array<int, array{code: string, name: string}>
     */
    private function locales(): array
    {
        $locales = [];

        foreach (config('diary.locales', []) as $code) {
            if (! is_string($code)) {
                continue;
            }

            $locales[] = [
                'code' => $code,
                'name' => (string) config("diary.locale_names.{$code}", $code),
            ];
        }

        return $locales;
    }
}
