<?php

namespace App\Http\Controllers;

use App\Http\Requests\DisableTwoFactorRequest;
use App\Security\RecoveryCodes;
use App\Security\Totp;
use App\Security\TrustedDevices;
use App\Security\TwoFactorNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Turn two-factor authentication on and off from the settings page.
 *
 * The secret is generated as soon as the account asks for it, but the account
 * only starts requiring a code once a valid code has been confirmed: the QR
 * code and the setup key are shown on settings while that confirmation is
 * pending.
 */
class TwoFactorController extends Controller
{
    /**
     * Generate the secret that the QR code on settings will carry.
     */
    public function enable(Request $request, Totp $totp): RedirectResponse
    {
        $user = $request->user();

        if ($user->twoFactorEnabled()) {
            return redirect()->route('diary.settings')->with('status', __('messages.two_factor.enabled'));
        }

        if (! is_string($user->two_factor_secret)) {
            $user->forceFill(['two_factor_secret' => $totp->generateSecret()])->save();
        }

        return redirect()->route('diary.settings')->with('status', __('messages.two_factor.ready'));
    }

    /**
     * Confirm a code from the authenticator app and issue the recovery codes.
     */
    public function confirm(Request $request, Totp $totp, RecoveryCodes $recovery, TwoFactorNotifier $notifier): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:32']]);

        $user = $request->user();
        $secret = $user->two_factor_secret;

        if ($user->twoFactorEnabled() || ! is_string($secret)) {
            return redirect()->route('diary.settings')->with('status', __('messages.two_factor.ready'));
        }

        if (! $totp->verify($request->string('code')->toString(), $secret)) {
            throw ValidationException::withMessages([
                'code' => __('messages.two_factor.invalid-code'),
            ]);
        }

        $codes = $recovery->generate();

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $recovery->hash($codes),
        ])->save();

        $notifier->enabled($user);

        return redirect()
            ->route('diary.settings')
            ->with('status', __('messages.two_factor.enabled'))
            ->with('recoveryCodes', $codes);
    }

    /**
     * Replace the recovery codes with a fresh set; the old ones stop working.
     */
    public function recoveryCodes(Request $request, RecoveryCodes $recovery): RedirectResponse
    {
        $user = $request->user();

        if (! $user->twoFactorEnabled()) {
            return redirect()->route('diary.settings')->with('status', __('messages.two_factor.disabled'));
        }

        $codes = $recovery->generate();

        $user->forceFill(['two_factor_recovery_codes' => $recovery->hash($codes)])->save();

        return redirect()
            ->route('diary.settings')
            ->with('status', __('messages.two_factor.codes-regenerated'))
            ->with('recoveryCodes', $codes);
    }

    /**
     * Turn two-factor authentication off: secret, recovery codes and every
     * trusted browser are removed, and signing in only needs the password.
     *
     * The account is asked for its password first, and the change is reported
     * to its owner. Cancelling an enrolment that was never confirmed needs no
     * password: it leaves the owner's way of signing in untouched.
     */
    public function disable(DisableTwoFactorRequest $request, TrustedDevices $trusted, TwoFactorNotifier $notifier): RedirectResponse
    {
        $user = $request->user();
        $wasEnabled = $user->twoFactorEnabled();

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ])->save();

        $trusted->revoke($user);

        if ($wasEnabled) {
            $notifier->disabled($user);
        }

        return redirect()->route('diary.settings')->with('status', __('messages.two_factor.disabled'));
    }
}
