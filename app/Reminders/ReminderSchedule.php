<?php

namespace App\Reminders;

use App\Models\Note;
use Carbon\CarbonImmutable as Carbon;

/**
 * Works out when a dated note should announce itself.
 *
 * A reminder runs at each of the account's configured hours, once per day,
 * from as many days ahead as requested up to and including the note's own day.
 * Only moments still ahead are produced: adding a note late in the day must
 * not back-fill the slots that already passed, which also keeps a freshly
 * created reminder from flooding the popup with overdue pings.
 */
class ReminderSchedule
{
    /**
     * The exact moments the note should pop, earliest first.
     *
     * @return array<int, Carbon>
     */
    public function occurrences(Note $note, ?Carbon $after = null): array
    {
        $date = $note->date;

        if ($date === null) {
            return [];
        }

        // The note's date may be typed as the mutable Carbon by the model
        // phpdoc, while the app clock is immutable; convert once so every
        // derived moment is an immutable instance too.
        $day = Carbon::instance($date->copy()->startOfDay());
        $cutoff = $after ?? now();
        $daysBefore = $note->user->reminderDaysBefore();
        $times = $note->user->reminderTimes();

        $occurrences = [];

        // Dates are immutable here (`Date::use(CarbonImmutable::class)`), so
        // the day has to be reassigned on every step of the loop.
        for (
            $cursor = $day->copy()->subDays($daysBefore);
            $cursor->lessThanOrEqualTo($day);
            $cursor = $cursor->addDay()
        ) {
            foreach ($times as $time) {
                $moment = $cursor->copy()->setTimeFromTimeString($time);

                if ($moment->greaterThan($cutoff)) {
                    $occurrences[] = $moment;
                }
            }
        }

        return $occurrences;
    }
}
