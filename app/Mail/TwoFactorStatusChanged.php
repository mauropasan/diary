<?php

namespace App\Mail;

use App\Models\User;
use App\Security\TwoFactorNotifier;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Warns an account that two-factor authentication was turned on or off.
 *
 * Like every other email in the application it never carries diary content: it
 * only says what changed and, when an administrator acted, who did it.
 */
class TwoFactorStatusChanged extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     *
     * @param  User  $user  The account the change applies to.
     * @param  string  $kind  One of the {@see TwoFactorNotifier} kinds.
     * @param  string|null  $actorName  The administrator, when one acted.
     */
    public function __construct(
        public User $user,
        public string $kind,
        public ?string $actorName = null,
    ) {}

    /**
     * Build the message.
     */
    public function build(): self
    {
        return $this
            ->subject(__("messages.emails.two_factor.{$this->kind}.subject", ['app' => config('app.name')]))
            ->markdown('emails.two-factor-status', [
                'user' => $this->user,
                'url' => config('app.url'),
                'heading' => __("messages.emails.two_factor.{$this->kind}.heading", ['app' => config('app.name')]),
                'body' => __("messages.emails.two_factor.{$this->kind}.body", ['actor' => $this->actorName]),
                'signedOut' => $this->kind === TwoFactorNotifier::DISABLED_BY_ADMIN,
            ]);
    }
}
