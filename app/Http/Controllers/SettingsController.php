<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateEmailRequest;
use App\Models\User;
use App\Reminders\ReminderScheduler;
use App\Security\Totp;
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
    public function index(Request $request, Totp $totp): InertiaResponse
    {
        return Inertia::render('settings/index', [
            'background' => $request->user()->backgroundChoice(),
            'backgrounds' => array_values(config('diary.backgrounds', [])),
            'emailNotifications' => (bool) $request->user()->email_notifications,
            'reminderSchedule' => [
                'daysBefore' => $request->user()->reminderDaysBefore(),
                'times' => $request->user()->reminderTimes(),
                'daysBeforeMax' => (int) config('diary.reminder.days_before.max', 30),
                'timesMax' => (int) config('diary.reminder.times_max', 3),
            ],
            'twoFactor' => $this->twoFactor($request->user(), $totp),
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
    public function update(Request $request, ReminderScheduler $scheduler): RedirectResponse
    {
        $maxBytes = (int) config('diary.background.max_size_kb') * 1024;
        $maxDaysBefore = (int) config('diary.reminder.days_before.max', 30);
        $maxTimes = (int) config('diary.reminder.times_max', 3);

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
            'reminder_days_before' => ['nullable', 'integer', 'between:0,'.$maxDaysBefore],
            'reminder_times' => ['nullable', 'array', 'min:1', 'max:'.$maxTimes],
            'reminder_times.*' => ['required', 'string', 'date_format:H:i'],
        ], [
            'reminder_days_before.integer' => __('messages.settings.reminder-days-invalid', ['max' => $maxDaysBefore]),
            'reminder_days_before.between' => __('messages.settings.reminder-days-invalid', ['max' => $maxDaysBefore]),
            'reminder_times.min' => __('messages.settings.reminder-times-invalid', ['max' => $maxTimes]),
            'reminder_times.max' => __('messages.settings.reminder-times-invalid', ['max' => $maxTimes]),
            'reminder_times.*.required' => __('messages.settings.reminder-time-invalid'),
            'reminder_times.*.date_format' => __('messages.settings.reminder-time-invalid'),
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

        if (array_key_exists('reminder_days_before', $validated)) {
            $attributes['reminder_days_before'] = (int) $validated['reminder_days_before'];
        }

        if (array_key_exists('reminder_times', $validated)) {
            /** @var array<int, string> $times */
            $times = array_values(array_unique($validated['reminder_times']));
            sort($times);

            $attributes['reminder_times'] = $times;
        }

        if ($attributes !== []) {
            $request->user()->forceFill($attributes)->save();
        }

        $updatesBackground = array_key_exists('background', $validated);
        $updatesSchedule = array_key_exists('reminder_days_before', $validated)
            || array_key_exists('reminder_times', $validated);

        if ($updatesBackground) {
            // Bump the dedicated background version so the client-side cache-busting
            // token changes on every upload, even within the same second.
            $request->user()->increment('background_version');
        }

        if ($updatesSchedule) {
            // The reminders already queued follow the old hours, so move the
            // ones still ahead onto the new schedule. What was already
            // delivered stays as history.
            $scheduler->syncAll($request->user());
        }

        return redirect()
            ->route('diary.settings')
            ->with('status', __(match (true) {
                $updatesBackground => 'messages.settings.background-updated',
                $updatesSchedule => 'messages.settings.reminder-updated',
                default => 'messages.settings.notifications-updated',
            }));
    }

    /**
     * Save the new sign-in email of the authenticated user.
     *
     * The address is the login and account recovery identifier, so it has to
     * stay unique across every account. Nothing else changes: the diary key
     * is wrapped by the password, never by the email.
     */
    public function updateEmail(UpdateEmailRequest $request): RedirectResponse
    {
        $request->user()->forceFill([
            'email' => $request->string('email')->toString(),
        ])->save();

        return redirect()
            ->route('diary.settings')
            ->with('status', __('messages.settings.email-updated'));
    }

    /**
     * The two-factor state for the settings page.
     *
     * The QR code and the setup key are only exposed while enrolment is
     * pending, and never again once the code has been confirmed.
     *
     * @return array{enabled: bool, pending: bool, secret: string|null, qr: string|null, recoveryCodesRemaining: int}
     */
    private function twoFactor(User $user, Totp $totp): array
    {
        $secret = $user->two_factor_secret;
        $enabled = $user->twoFactorEnabled();
        $pending = ! $enabled && is_string($secret) && $secret !== '';

        return [
            'enabled' => $enabled,
            'pending' => $pending,
            'secret' => $pending ? $secret : null,
            'qr' => $pending
                ? $totp->qrCodeDataUri($totp->otpauthUrl((string) config('app.name'), $user->email, $secret))
                : null,
            'recoveryCodesRemaining' => is_array($user->two_factor_recovery_codes)
                ? count($user->two_factor_recovery_codes)
                : 0,
        ];
    }
}
