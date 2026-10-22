<?php

namespace App\Http\Controllers\Auth;

use App\Crypto\DiaryKeyManager;
use App\Crypto\DiaryKeyStore;
use App\Exceptions\KeyUnwrapException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RecoveryRequest;
use App\Models\User;
use App\Security\Totp;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RecoveryController extends Controller
{
    /**
     * Show the recovery screen.
     */
    public function create(): Response
    {
        return Inertia::render('auth/recovery');
    }

    /**
     * Restore access using the one-time recovery key and set a new password.
     *
     * The recovery key unwraps the existing DEK, so entry content is never
     * re-encrypted; only the wrapped copy of the DEK and the login hash change.
     */
    public function store(
        RecoveryRequest $request,
        DiaryKeyManager $keys,
        DiaryKeyStore $store,
        Totp $totp,
    ): RedirectResponse {
        $user = User::query()
            ->where('email', $request->string('email')->toString())
            ->first();

        // Unknown accounts and accounts without recovery material fail with
        // the same message as a wrong key, so this form cannot be used to
        // discover which email addresses are registered.
        if ($user === null || $user->recovery_wrapped_key === null) {
            throw ValidationException::withMessages([
                'recovery_key' => __('messages.recovery.invalid-key'),
            ]);
        }

        try {
            $dek = $keys->unlockWithRecoveryKey($user, trim($request->string('recovery_key')->toString()));
        } catch (KeyUnwrapException) {
            throw ValidationException::withMessages([
                'recovery_key' => __('messages.recovery.invalid-key'),
            ]);
        }

        // The recovery key must not bypass an enabled second factor: check it
        // only after the key itself has been proven, so a wrong key still gets
        // the generic error and cannot be used to probe account settings.
        if ($user->twoFactorEnabled()) {
            $secret = $user->two_factor_secret;
            $code = trim($request->string('code')->toString());

            if (! is_string($secret)
                || preg_match('/^\d{'.Totp::DIGITS.'}$/', $code) !== 1
                || ! $totp->verify($code, $secret)) {
                throw ValidationException::withMessages([
                    'code' => __('messages.two_factor.invalid-code'),
                ]);
            }
        }

        $newPassword = $request->string('password')->toString();

        DB::transaction(function () use ($keys, $user, $dek, $newPassword): void {
            $keys->rewrapWithDek($user, $dek, $newPassword);

            $user->forceFill(['password' => Hash::make($newPassword)])->save();
        });

        Auth::login($user);
        $request->session()->regenerate();

        $store->put($dek, now()->addMinutes((int) config('diary.lock_after_minutes')));

        return redirect()
            ->route('diary.show', now()->toDateString())
            ->with('status', __('messages.recovery.restored'));
    }
}
