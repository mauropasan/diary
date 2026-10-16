<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
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
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'locale' => app()->getLocale(),
            'locales' => $this->locales(),
            'auth' => [
                'user' => $request->user(),
            ],
            'background' => $request->user()?->backgroundChoice(),
            'backgroundVersion' => (string) ($request->user()?->background_version ?? 0),
            'notificationCount' => (int) ($request->user()?->notifications()->whereNull('read_at')->count() ?? 0),
            'diary' => [
                'lockAfterMinutes' => (int) config('diary.lock_after_minutes'),
                'timezone' => config('app.timezone'),
            ],
            'csrfToken' => csrf_token(),
            'flash' => [
                'status' => $request->session()->get('status'),
                'recoveryKey' => $request->session()->get('recoveryKey'),
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
