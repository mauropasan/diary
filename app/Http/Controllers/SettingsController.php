<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class SettingsController extends Controller
{
    /**
     * Show the settings page.
     */
    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('settings/index', [
            'background' => $request->user()->backgroundChoice(),
            'backgrounds' => array_values(config('diary.backgrounds', [])),
            'emailNotifications' => (bool) $request->user()->email_notifications,
            'users' => $request->user()->is_admin
                ? $this->users()
                : null,
        ]);
    }

    /**
     * Serve the custom background image so the body can point at a short,
     * stable URL instead of carrying a multi-megabyte `data:` URI in every
     * rendered page and Inertia payload.
     */
    public function image(Request $request): Response
    {
        $background = $request->user()->background;

        if (! is_string($background) || ! str_starts_with($background, 'data:image/')) {
            abort(404);
        }

        [$header, $encoded] = array_pad(explode(',', $background, 2), 2, '');
        $binary = base64_decode($encoded, true);

        if ($binary === false) {
            abort(404);
        }

        $mime = 'image/'.Str::between($header, 'data:image/', ';');

        return response($binary, 200, [
            'Content-Type' => $mime,
            'Content-Length' => (string) strlen($binary),
            'Cache-Control' => 'private, no-store, must-revalidate',
            'X-Content-Type-Options' => 'nosniff',
            'Cross-Origin-Resource-Policy' => 'same-origin',
        ]);
    }

    /**
     * Save the chosen background for the user.
     *
     * The value is either a preset key from the config, a `data:image/...`
     * URI produced by the picker, or null to restore the default.
     */
    public function update(Request $request): RedirectResponse
    {
        $maxBytes = (int) config('diary.background.max_size_kb') * 1024;

        $validated = $request->validate([
            'background' => [
                'nullable',
                'string',
                function (string $attribute, mixed $value, callable $fail) use ($maxBytes): void {
                    if (! is_string($value)) {
                        $fail(__('validation.in', ['attribute' => $attribute]));

                        return;
                    }

                    if (str_starts_with($value, 'data:image/')) {
                        if (! preg_match('#^data:image/(?:jpeg|jpg|png|webp);base64,#', $value)) {
                            $fail(__('validation.mimes', ['attribute' => $attribute, 'values' => 'jpeg, png, webp']));

                            return;
                        }

                        $comma = strpos($value, ',');
                        $binary = base64_decode($comma === false ? '' : substr($value, $comma + 1), true);

                        if ($binary === false || strlen($binary) > $maxBytes) {
                            $fail(__('validation.max.string', ['attribute' => $attribute, 'max' => (string) (int) ($maxBytes / 1024)]));
                        }

                        return;
                    }

                    if (! in_array($value, config('diary.backgrounds', []), true)) {
                        $fail(__('validation.in', ['attribute' => $attribute]));
                    }
                },
            ],
            'email_notifications' => ['nullable', 'boolean'],
        ]);

        // Only touch the columns the request actually carries, so saving the
        // notification toggle never resets the chosen background.
        $attributes = [];

        if (array_key_exists('background', $validated)) {
            $background = $validated['background'];
            $attributes['background'] = $background === null || $background === 'default'
                ? null
                : $background;
        }

        if (array_key_exists('email_notifications', $validated)) {
            $attributes['email_notifications'] = (bool) $validated['email_notifications'];
        }

        if ($attributes !== []) {
            $request->user()->forceFill($attributes)->save();
        }

        $updatesBackground = array_key_exists('background', $validated);

        if ($updatesBackground) {
            // Bump the dedicated background version so the client-side cache-busting
            // token changes on every upload, even within the same second.
            $request->user()->increment('background_version');
        }

        return redirect()
            ->route('diary.settings')
            ->with('status', __($updatesBackground
                ? 'messages.settings.background-updated'
                : 'messages.settings.notifications-updated'));
    }

    /**
     * List every diary account for the admin section of the settings page.
     *
     * Only plaintext information is shown; entry content is never decrypted here.
     *
     * @return array<int, array{id: int, name: string, email: string, is_admin: bool, entries_count: int, created_at: string}>
     */
    private function users(): array
    {
        return User::query()
            ->withCount('entries')
            ->orderBy('created_at')
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
                'entries_count' => (int) $user->entries_count,
                'created_at' => $user->created_at->toDateString(),
            ])
            ->all();
    }
}
