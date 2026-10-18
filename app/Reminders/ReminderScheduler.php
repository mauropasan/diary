<?php

namespace App\Reminders;

use App\Models\Note;
use App\Models\Notification;
use App\Models\User;
use Carbon\CarbonImmutable as Carbon;

/**
 * Keeps the notification rows of a dated note in step with the schedule.
 *
 * Every moment a note should pop is its own row, so the existing due/read/
 * emailed handling and the popup keep working untouched. Rows that already
 * popped, were read or were emailed are history: their moment stays put while
 * the text follows the note. Only the pings still ahead are re-armed, which is
 * what happens when a note moves or when the account's schedule is edited.
 */
class ReminderScheduler
{
    public function __construct(private ReminderSchedule $schedule) {}

    /**
     * Create, move or drop the pending notifications of one note.
     */
    public function sync(Note $note): void
    {
        if ($note->date === null) {
            return;
        }

        $moments = $this->schedule->occurrences($note);
        $wanted = array_map(fn (Carbon $moment): string => $moment->toDateTimeString(), $moments);

        /** @var array<string, Notification> $taken */
        $taken = [];

        foreach ($note->notifications()->get() as $notification) {
            $dueAt = $notification->due_at->toDateTimeString();
            $taken[$dueAt] = $notification;

            if ($this->isPending($notification) && ! in_array($dueAt, $wanted, true)) {
                $notification->delete();
                unset($taken[$dueAt]);

                continue;
            }

            $this->refreshText($notification, $note);
        }

        foreach ($moments as $moment) {
            // Any row already sitting on a moment keeps it, delivered or not:
            // that is what stops a re-sync from stacking a second ping on a
            // slot the user has already seen.
            if (isset($taken[$moment->toDateTimeString()])) {
                continue;
            }

            $note->user->notifications()->create([
                'note_id' => $note->id,
                'title' => $note->title,
                'body' => $note->body,
                'due_at' => $moment,
            ]);
        }
    }

    /**
     * Re-arm every pending reminder of an account.
     *
     * Used when the schedule itself changes: the pings still ahead follow the
     * new window and hours, while everything already delivered stays put.
     */
    public function syncAll(User $user): void
    {
        $user->notes()
            ->whereNotNull('date')
            ->whereIn('kind', Note::DATED_KINDS)
            ->each(fn (Note $note) => $this->sync($note));
    }

    /**
     * Whether a ping has not been delivered yet and can still be moved.
     */
    private function isPending(Notification $notification): bool
    {
        return $notification->read_at === null
            && $notification->emailed_at === null
            && $notification->due_at->isFuture();
    }

    /**
     * Let an existing row follow the note's current text.
     *
     * The decrypted title is only readable while the diary is unlocked, which
     * is always the case here: every path that syncs a note runs behind the
     * `diary.unlocked` middleware.
     */
    private function refreshText(Notification $notification, Note $note): void
    {
        if ($notification->title === $note->title && $notification->body === $note->body) {
            return;
        }

        $notification->forceFill([
            'title' => $note->title,
            'body' => $note->body,
        ])->save();
    }
}
