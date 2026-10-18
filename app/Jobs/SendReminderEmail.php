<?php

namespace App\Jobs;

use App\Mail\ReminderNotification;
use App\Models\Notification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

/**
 * Deliver the reminder email when its notification becomes due.
 *
 * The job is queued the moment a dated note is saved and delayed until the
 * day before the note's date, so nothing is emailed while the event is
 * still further away than a day. It re-checks the mail preference and the
 * `emailed_at` flag at send time, which keeps stale or duplicate jobs (an
 * edited date leaves the old one queued) from mailing twice.
 */
class SendReminderEmail implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $notificationId,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $notification = Notification::find($this->notificationId);

        if ($notification === null
            || $notification->emailed_at !== null
            || $notification->due_at->isFuture()
            || ! $notification->user->email_notifications) {
            return;
        }

        Mail::to($notification->user->email)
            ->send(new ReminderNotification($notification->user));

        $notification->forceFill(['emailed_at' => now()])->save();
    }
}
