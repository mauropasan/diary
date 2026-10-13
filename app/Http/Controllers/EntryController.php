<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesMonth;
use App\Http\Requests\SaveEntryRequest;
use App\Models\Entry;
use App\Models\Note;
use App\Models\Tag;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EntryController extends Controller
{
    use ResolvesMonth;

    /**
     * Show the entry for the given day, or an empty one when none exists.
     */
    public function show(Request $request, string $date): Response
    {
        $day = $this->resolveDate($date);
        $user = $request->user();

        $entry = $user->entries()->where('date', $day->toDateString())->first();
        $month = $this->resolveMonth($request->query('mes'), $day);
        $notes = $this->notesForDay($user, $day);

        $activeSchedule = $user->schedules()->where('active', true)->first();

        return Inertia::render('diary/show', [
            'date' => $day->toDateString(),
            'entry' => [
                'title' => $entry?->title,
                'content' => $entry?->content,
                'mood' => $entry?->mood,
            ],
            'canGoNext' => ! $day->isToday(),
            'calendar' => $this->calendarDates($user, $month),
            'calendarMonth' => $month->format('Y-m'),
            'tags' => $entry
                ? $entry->tags->map(fn (Tag $tag): string => $tag->name)->values()->all()
                : [],
            'memories' => $this->memories($user, $day),
            'prompt' => $this->dailyPrompt($day),
            'streak' => $this->streak($user, CarbonImmutable::today()),
            'notes' => $notes,
            'upcomingNotes' => $this->upcomingNotes($user, array_column($notes, 'id')),
            'activeSchedule' => $activeSchedule ? [
                'id' => $activeSchedule->id,
                'name' => $activeSchedule->name,
                'slots' => $activeSchedule->slots,
            ] : null,
        ]);
    }

    /**
     * Create, update or remove the entry for the given day.
     */
    public function update(SaveEntryRequest $request, string $date): RedirectResponse
    {
        $day = $this->resolveDate($date);
        $user = $request->user();

        $entry = $user->entries()->where('date', $day->toDateString())->first();

        if ($request->entryIsEmpty()) {
            $entry?->delete();
        } else {
            $entry = $user->entries()->updateOrCreate(
                ['date' => $day->toDateString()],
                [
                    'title' => $request->input('title'),
                    'content' => $request->input('content'),
                    'mood' => $request->input('mood'),
                ],
            );

            $entry->syncTags($request->input('tags', []));
            $this->reconcileAttachments($entry, $request->input('content'));
        }

        return redirect()->route('diary.show', $day->toDateString());
    }

    /**
     * Delete attachments that are no longer referenced by the entry content.
     *
     * The media nodes embed their `data-attachment-id`, so removing a node from
     * the editor and saving removes the corresponding file from disk.
     */
    private function reconcileAttachments(Entry $entry, mixed $content): void
    {
        $referenced = [];

        if (is_string($content) && preg_match_all('/data-attachment-id="(\d+)"/', $content, $matches)) {
            $referenced = array_map(fn (string $id): int => (int) $id, $matches[1]);
        }

        $entry->attachments()
            ->whereNotIn('id', $referenced)
            ->get()
            ->each->delete();
    }

    /**
     * Resolve and validate the day from the route, blocking future dates.
     */
    private function resolveDate(string $date): CarbonImmutable
    {
        $day = CarbonImmutable::createFromFormat('!Y-m-d', $date, config('app.timezone'));

        if ($day === null || $day->toDateString() !== $date || $day->isAfter(CarbonImmutable::today())) {
            abort(404);
        }

        return $day->startOfDay();
    }

    /**
     * List the days within the given month that contain an entry.
     *
     * Only the plaintext `date` column is selected, so no entry is ever decrypted.
     *
     * @return array<int, string>
     */
    private function calendarDates(User $user, CarbonImmutable $month): array
    {
        return $user->entries()
            ->whereBetween('date', [$month->startOfMonth()->toDateString(), $month->endOfMonth()->toDateString()])
            ->orderBy('date')
            ->get(['date'])
            ->map(fn (Entry $entry): string => $entry->date->toDateString())
            ->all();
    }

    /**
     * List entries from the same month and day in previous years.
     *
     * Only the plaintext `date` and the encrypted `title` are selected, so just
     * these few matching entries are decrypted (their content is never loaded).
     *
     * @return array<int, array{date: string, title: string|null}>
     */
    private function memories(User $user, CarbonImmutable $day): array
    {
        return $user->entries()
            ->whereMonth('date', $day->month)
            ->whereDay('date', $day->day)
            ->whereYear('date', '<', $day->year)
            ->orderByDesc('date')
            ->get(['date', 'title'])
            ->map(fn (Entry $entry): array => [
                'date' => $entry->date->toDateString(),
                'title' => $entry->title,
            ])
            ->all();
    }

    /**
     * List the notes attached to the given day, decrypting only their text.
     *
     * @return array<int, array{id: int, title: string|null, body: string|null, color: string, kind: string, date: string|null}>
     */
    private function notesForDay(User $user, CarbonImmutable $day): array
    {
        return $user->notes()
            ->where('date', $day->toDateString())
            ->orderBy('id')
            ->get()
            ->map(fn (Note $note): array => $note->toPayload())
            ->all();
    }

    /**
     * List upcoming reminders and events (today or later) for the agenda shown
     * under the calendar. Notes already shown for the selected day are skipped.
     *
     * @param  array<int, int>  $excludeIds
     * @return array<int, array{id: int, title: string|null, body: string|null, color: string, kind: string, date: string|null}>
     */
    private function upcomingNotes(User $user, array $excludeIds): array
    {
        return $user->notes()
            ->whereIn('kind', Note::DATED_KINDS)
            ->where('date', '>=', CarbonImmutable::today()->toDateString())
            ->whereNotIn('id', $excludeIds)
            ->orderBy('date')
            ->orderBy('id')
            ->limit(5)
            ->get()
            ->map(fn (Note $note): array => $note->toPayload())
            ->all();
    }

    /**
     * Pick a deterministic writing prompt for the given day.
     */
    private function dailyPrompt(CarbonImmutable $day): string
    {
        $prompts = __('prompts');

        if (! is_array($prompts) || $prompts === []) {
            return '';
        }

        /** @var array<int, string> $prompts */
        return $prompts[$day->dayOfYear % count($prompts)];
    }

    /**
     * Compute the current and longest writing streak from the plaintext dates.
     *
     * Only the `date` column is selected, so no entry is decrypted.
     *
     * @return array{current: int, longest: int}
     */
    private function streak(User $user, CarbonImmutable $today): array
    {
        $dates = $user->entries()
            ->orderBy('date')
            ->get(['date'])
            ->map(fn (Entry $entry): string => $entry->date->toDateString())
            ->unique()
            ->values()
            ->all();

        $longest = 0;
        $run = 0;
        $previous = null;

        foreach ($dates as $date) {
            $day = CarbonImmutable::createFromFormat('!Y-m-d', $date, config('app.timezone'));

            $run = $previous !== null && $previous->addDay()->toDateString() === $day->toDateString()
                ? $run + 1
                : 1;

            $longest = max($longest, $run);
            $previous = $day;
        }

        $written = array_flip($dates);
        $cursor = $today;

        if (! isset($written[$cursor->toDateString()])) {
            $cursor = $cursor->subDay();
        }

        $current = 0;

        while (isset($written[$cursor->toDateString()])) {
            $current++;
            $cursor = $cursor->subDay();
        }

        return ['current' => $current, 'longest' => $longest];
    }
}
