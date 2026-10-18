<?php

namespace App\Http\Controllers\Auth;

use App\Crypto\DiaryUnlocker;
use App\Exceptions\InvalidPasswordException;
use App\Exceptions\KeyUnwrapException;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Security\RecoveryCodes;
use App\Security\Totp;
use App\Security\TrustedDevices;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Second step of the sign-in: the password has already been checked by the
 * login controller, which parks the attempt in the session for a few minutes.
 * Nothing is authenticated and the diary key stays out of the session until
 * this code (or a recovery code) has been confirmed.
 */
class TwoFactorChallengeController extends Controller
{
    /**
     * How long a parked sign-in attempt stays valid.
     */
    public const PENDING_TTL_MINUTES = 5;

    /**
     * Show the code form, or send an abandoned attempt back to sign in.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        if ($this->pending($request) === null) {
            $request->session()->forget('two_factor.pending');

            return redirect()->route('login');
        }

        return Inertia::render('auth/two-factor', [
            'trustDays' => TrustedDevices::TTL_DAYS,
        ]);
    }

    /**
     * Finish the sign-in with a code from the authenticator app or a
     * single-use recovery code, then unlock the diary as a normal login does.
     */
    public function store(
        Request $request,
        Totp $totp,
        RecoveryCodes $recovery,
        TrustedDevices $trusted,
        DiaryUnlocker $unlocker,
    ): RedirectResponse {
        $pending = $this->pending($request);

        if ($pending === null) {
            $request->session()->forget('two_factor.pending');

            return redirect()->route('login');
        }

        $request->validate(['code' => ['required', 'string', 'max:32']]);

        $user = User::query()->find($pending['user_id']);

        if ($user === null || ! $user->twoFactorEnabled()) {
            return redirect()->route('login');
        }

        $code = $request->string('code')->toString();

        if (! $this->verified($user, $code, $totp, $recovery)) {
            throw ValidationException::withMessages([
                'code' => __('messages.two_factor.invalid-code'),
            ]);
        }

        $password = $pending['password'];

        $request->session()->forget('two_factor.pending');

        Auth::login($user, $pending['remember']);

        $request->session()->regenerate();

        try {
            $unlocker->unlock($user, $password);
        } catch (InvalidPasswordException|KeyUnwrapException) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'code' => __('messages.login.unwrap-failed'),
            ]);
        }

        if ($request->boolean('trust')) {
            $trusted->trust($user);
        }

        return redirect()->intended(route('diary.show', now()->toDateString()));
    }

    /**
     * A valid code is either a current time-based code or a recovery code
     * that has not been used yet.
     */
    private function verified(User $user, string $code, Totp $totp, RecoveryCodes $recovery): bool
    {
        if (preg_match('/^\d{6}$/', $code) === 1) {
            $secret = $user->two_factor_secret;

            return is_string($secret) && $totp->verify($code, $secret);
        }

        return $recovery->consume($user, $code);
    }

    /**
     * The parked sign-in attempt, or null when there is none or it expired.
     *
     * @return array{user_id: int, password: string, remember: bool, expires_at: int}|null
     */
    private function pending(Request $request): ?array
    {
        $pending = $request->session()->get('two_factor.pending');

        if (! is_array($pending)
            || ! isset($pending['user_id'], $pending['password'], $pending['expires_at'])
            || ! is_int($pending['user_id'])
            || ! is_string($pending['password'])
            || ! is_int($pending['expires_at'])
            || $pending['expires_at'] < now()->getTimestamp()) {
            return null;
        }

        return [
            'user_id' => $pending['user_id'],
            'password' => $pending['password'],
            'remember' => (bool) ($pending['remember'] ?? false),
            'expires_at' => $pending['expires_at'],
        ];
    }
}
