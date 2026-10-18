<?php

namespace App\Security;

use App\Mail\TwoFactorStatusChanged;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Tells an account that its two-factor authentication was turned on or off.
 *
 * Every change is reported on both channels the account can see: an entry in
 * the notification list and an email, because a change nobody asked for only
 * stands out if it is reported twice.
 *
 * The in-app notification carries a message key and its parameters instead of
 * diary text, so an administrator turning the feature off for somebody else can
 * raise it even though that account's diary key is not available.
 */
class TwoFactorNotifier
{
    public const ENABLED = 'two_factor_enabled';

    public const DISABLED = 'two_factor_disabled';

    public const DISABLED_BY_ADMIN = 'two_factor_disabled_by_admin';

    /**
     * Report that the account now needs a code from an authenticator app.
     */
    public function enabled(User $user): void
    {
        $this->announce($user, self::ENABLED, [], null);
    }

    /**
     * Report that the account only needs its password again.
     *
     * The administrator is named when somebody else made the change, so the
     * owner knows who to ask about it.
     */
    public function disabled(User $user, ?User $actor = null): void
    {
        if ($actor === null) {
            $this->announce($user, self::DISABLED, [], null);

            return;
        }

        $this->announce($user, self::DISABLED_BY_ADMIN, ['actor' => $actor->name], $actor);
    }

    /**
     * Raise the notification, send the email and leave an audit trail.
     *
     * @param  array<string, string>  $params
     */
    private function announce(User $user, string $kind, array $params, ?User $actor): void
    {
        $user->notifications()->create([
            'kind' => $kind,
            'params' => $params === [] ? null : $params,
            'due_at' => now(),
        ]);

        Log::notice('Two-factor authentication changed.', [
            'user_id' => $user->id,
            'kind' => $kind,
            'actor_id' => $actor?->id,
        ]);

        try {
            Mail::to($user->email)->send(
                new TwoFactorStatusChanged($user, $kind, $params['actor'] ?? null),
            );
        } catch (Throwable $exception) {
            // A mail server that is down must not undo the security change
            // that was already made, but the failure should still be visible.
            report($exception);
        }
    }
}
