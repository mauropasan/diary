<?php

namespace App\Console\Commands;

use App\Mail\ReminderNotification;
use App\Models\Notification;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Deliver the reminder emails whose moment has come.
 *
 * A reminder pops in the app on its own, but its email is sent by this sweep
 * rather than by a long-delayed queued job: the scheduler already runs for the
 * backups, the same pending rows drive both channels, and a queue restart can
 * no longer lose a reminder. Only the first ping of a day is emailed, so
 * several daily pings do not turn into several daily emails.
 */
class SendReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'diary:remind';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send the reminder emails that have become due';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // Only the reminders derived from a note; application notifications
        // such as a two-factor change are raised and announced elsewhere.
        $notifications = Notification::query()
            ->whereNull('kind')
            ->whereNull('emailed_at')
            ->where('due_at', '<=', now())
            ->whereHas('user', function (Builder $query): void {
                $query->where('email_notifications', true);
            })
            ->with('user')
            ->get();

        $sent = 0;

        foreach ($notifications as $notification) {
            if ($this->deliver($notification)) {
                $sent++;
            }
        }

        $this->info("Reminder emails sent: {$sent}");

        return self::SUCCESS;
    }

    /**
     * Email one notification unless a ping earlier that day already spoke.
     *
     * Either way the row is stamped, so the next sweep skips it: `emailed_at`
     * means "the email question was settled", not "an email left the server".
     */
    private function deliver(Notification $notification): bool
    {
        $user = $notification->user;

        if (! $user->email_notifications) {
            return false;
        }

        if ($this->alreadySpokeToday($notification)) {
            $notification->forceFill(['emailed_at' => now()])->save();

            return false;
        }

        try {
            Mail::to($user->email)->send(new ReminderNotification($user));
        } catch (Throwable $exception) {
            // Leave the row unstamped so the next sweep tries again, but keep
            // the failure visible instead of stopping the whole run.
            report($exception);

            return false;
        }

        $notification->forceFill(['emailed_at' => now()])->save();

        return true;
    }

    /**
     * Whether an earlier ping of the same note and day exists.
     *
     * That earlier ping is the one allowed to send the day's email, so this
     * one only has to be marked as handled.
     */
    private function alreadySpokeToday(Notification $notification): bool
    {
        if ($notification->note_id === null) {
            return false;
        }

        return Notification::query()
            ->where('note_id', $notification->note_id)
            ->whereDate('due_at', $notification->due_at->toDateString())
            ->where('due_at', '<', $notification->due_at)
            ->exists();
    }
}
