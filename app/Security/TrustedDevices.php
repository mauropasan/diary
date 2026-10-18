<?php

namespace App\Security;

use App\Models\TwoFactorDevice;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;

/**
 * Browsers that have already passed the two-factor challenge, so a returning
 * device can skip it for a while.
 *
 * The browser only holds a random token; the database stores its SHA-256
 * hash, so the table alone cannot be turned back into a working cookie.
 * Every device is deleted when two-factor authentication is turned off.
 */
class TrustedDevices
{
    /** How long a browser stays trusted. */
    public const TTL_DAYS = 30;

    /** Name of the cookie carrying the device token. */
    public const COOKIE = 'two_factor_device';

    /**
     * Whether the request comes from a browser this account already trusts.
     */
    public function trusted(Request $request, User $user): bool
    {
        $token = $request->cookie(self::COOKIE);

        if (! is_string($token) || $token === '') {
            return false;
        }

        return TwoFactorDevice::query()
            ->where('user_id', $user->id)
            ->where('token_hash', hash('sha256', $token))
            ->where('expires_at', '>', now())
            ->exists();
    }

    /**
     * Remember this browser after a successful challenge.
     */
    public function trust(User $user): void
    {
        TwoFactorDevice::query()
            ->where('user_id', $user->id)
            ->where('expires_at', '<=', now())
            ->delete();

        $token = Str::random(40);

        TwoFactorDevice::query()->create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addDays(self::TTL_DAYS),
        ]);

        Cookie::queue(Cookie::make(
            self::COOKIE,
            $token,
            self::TTL_DAYS * 24 * 60,
            secure: (bool) config('session.secure'),
        ));
    }

    /**
     * Forget every trusted browser for the account.
     */
    public function revoke(User $user): void
    {
        TwoFactorDevice::query()->where('user_id', $user->id)->delete();

        Cookie::queue(Cookie::forget(self::COOKIE));
    }
}
