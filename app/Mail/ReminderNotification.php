<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Email notification sent when a new reminder is created in the diary.
 *
 * IMPORTANT: this email must never contain diary content (titles, bodies,
 * entries...). Everything in the diary is encrypted with a key derived from
 * the user's password, so the email only informs that a new reminder is
 * waiting and invites the user to open the app.
 */
class ReminderNotification extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     *
     * @param  User  $user  The registered email address that receives the notification.
     */
    public function __construct(
        public User $user,
    ) {}

    /**
     * Build the message.
     */
    public function build(): self
    {
        return $this
            ->subject(__('messages.emails.reminder.subject', ['app' => config('app.name')]))
            ->markdown('emails.reminder', [
                'user' => $this->user,
                'app' => config('app.name'),
                'url' => config('app.url'),
            ]);
    }
}
