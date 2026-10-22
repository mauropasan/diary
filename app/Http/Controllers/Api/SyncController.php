<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\SyncRequest;
use App\Models\Concerns\TracksSyncChanges;
use App\Models\Entry;
use App\Models\Note;
use App\Models\Schedule;
use App\Models\User;
use App\Reminders\ReminderScheduler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Mews\Purifier\Facades\Purifier;

/**
 * The pull/push heart of the offline-first sync API.
 *
 * Every write to an entry, note or schedule appends one row to the
 * `sync_changes` journal (see the {@see TracksSyncChanges}
 * trait). A pull walks that journal after the client's cursor and reports the
 * current state of each record that changed, so a client that was offline for
 * a week catches up in one call. A push applies the client's records with
 * last-writer-wins: the client's version is applied only when its
 * `updated_ms` is strictly newer than the server's, ties go to the server, and
 * a deletion travels as a tombstone that soft-deletes (or restores, when the
 * client's edit is newer than the server's delete).
 */
class SyncController extends Controller
{
    /** How many journal rows one pull reads before handing back the cursor. */
    public const PULL_LIMIT = 500;

    public function __construct(private readonly ReminderScheduler $scheduler) {}

    /**
     * Everything that changed after the client's cursor.
     *
     * Query: `cursor` (int, 0 on first pull). The journal rows after the
     * cursor are folded down to the latest row per record, each record is
     * read in its current server state, and the response carries the new
     * cursor plus a `has_more` flag when the journal batch was exhausted
     * before the limit.
     */
    public function pull(Request $request): JsonResponse
    {
        $user = $request->user();
        $cursor = max(0, $request->integer('cursor', 0));

        $journal = DB::table('sync_changes')
            ->where('user_id', $user->id)
            ->where('id', '>', $cursor)
            ->orderBy('id')
            ->limit(self::PULL_LIMIT + 1)
            ->get();

        $hasMore = $journal->count() > self::PULL_LIMIT;

        if ($hasMore) {
            $journal = $journal->take(self::PULL_LIMIT);
        }

        $nextCursor = $cursor;

        /**
         * One journal row per record (the newest), folded from the query
         * builder's stdClass rows into plain typed arrays so the exact
         * columns each pull reads are known statically.
         */
        $latest = [];

        foreach ($journal as $row) {
            $nextCursor = (int) $row->id;
            $latest[$row->entity_type.':'.$row->entity_id] = [
                'id' => (int) $row->id,
                'entity_type' => (string) $row->entity_type,
                'entity_id' => (int) $row->entity_id,
                'user_id' => (int) $row->user_id,
                'updated_ms' => (int) $row->updated_ms,
            ];
        }

        $payload = [
            'cursor' => $nextCursor,
            'has_more' => $hasMore,
            'entries' => [],
            'notes' => [],
            'schedules' => [],
        ];

        foreach ($latest as $row) {
            match ($row['entity_type']) {
                'entry' => $payload['entries'][] = $this->pullEntry($row['entity_id'], $row),
                'note' => $payload['notes'][] = $this->pullNote($row['entity_id'], $row),
                'schedule' => $payload['schedules'][] = $this->pullSchedule($row['entity_id'], $row),
                default => null,
            };
        }

        return response()->json($payload);
    }

    /**
     * Apply the client's records, newest write winning.
     *
     * The response reports, per submitted record, whether the client's
     * version was applied (`won`) and the full current server state (`record`,
     * null when the record no longer exists), so the client can reconcile its
     * local store without a second pull. The returned `cursor` is the journal
     * head after the push, ready to be used on the next pull.
     */
    public function push(SyncRequest $request): JsonResponse
    {
        $user = $request->user();

        $results = ['entries' => [], 'notes' => [], 'schedules' => []];

        DB::transaction(function () use ($request, $user, &$results): void {
            foreach ($this->records($request, 'entries') as $record) {
                $results['entries'][] = $this->applyEntry($user, $record);
            }

            foreach ($this->records($request, 'notes') as $record) {
                $results['notes'][] = $this->applyNote($user, $record);
            }

            foreach ($this->records($request, 'schedules') as $record) {
                $results['schedules'][] = $this->applySchedule($user, $record);
            }
        });

        return response()->json([
            'cursor' => (int) (DB::table('sync_changes')->where('user_id', $user->id)->max('id') ?? 0),
            'results' => $results,
        ]);
    }

    /**
     * The current state of one entry, or its tombstone when it is deleted
     * (or was hard-deleted after the journal row was written).
     *
     * @param  array{id: int, user_id: int, updated_ms: int}  $row
     * @return array<string, mixed>
     */
    private function pullEntry(int $id, array $row): array
    {
        $entry = Entry::withTrashed()->where('user_id', $row['user_id'])->find($id);

        if ($entry === null) {
            return ['date' => null, 'deleted' => true, 'updated_ms' => $row['updated_ms']];
        }

        if ($entry->trashed()) {
            return [
                'date' => $entry->date->toDateString(),
                'deleted' => true,
                'updated_ms' => (int) $entry->updated_ms,
            ];
        }

        return [
            'date' => $entry->date->toDateString(),
            'deleted' => false,
            'updated_ms' => (int) $entry->updated_ms,
            'title' => $entry->title,
            'content' => $entry->content,
            'mood' => $entry->mood,
            'tags' => $entry->tags->map(fn ($tag): string => $tag->name)->values()->all(),
            'attachments' => $entry->attachments->map(fn ($attachment): array => [
                'id' => $attachment->getKey(),
                'kind' => $attachment->kind,
                'original_name' => $attachment->original_name,
                'mime' => $attachment->mime_type,
                'size' => $attachment->size,
            ])->values()->all(),
        ];
    }

    /**
     * The current state of one note, or its tombstone.
     *
     * @param  array{id: int, user_id: int, updated_ms: int}  $row
     * @return array<string, mixed>
     */
    private function pullNote(int $id, array $row): array
    {
        $note = Note::withTrashed()->where('user_id', $row['user_id'])->find($id);

        if ($note === null) {
            return ['server_id' => null, 'deleted' => true, 'updated_ms' => $row['updated_ms']];
        }

        if ($note->trashed()) {
            return [
                'server_id' => $note->getKey(),
                'deleted' => true,
                'updated_ms' => (int) $note->updated_ms,
            ];
        }

        return $this->notePayload($note);
    }

    /**
     * The current state of one schedule, or its tombstone.
     *
     * @param  array{id: int, user_id: int, updated_ms: int}  $row
     * @return array<string, mixed>
     */
    private function pullSchedule(int $id, array $row): array
    {
        $schedule = Schedule::withTrashed()->where('user_id', $row['user_id'])->find($id);

        if ($schedule === null) {
            return ['server_id' => null, 'deleted' => true, 'updated_ms' => $row['updated_ms']];
        }

        if ($schedule->trashed()) {
            return [
                'server_id' => $schedule->getKey(),
                'deleted' => true,
                'updated_ms' => (int) $schedule->updated_ms,
            ];
        }

        return $this->schedulePayload($schedule);
    }

    /**
     * Apply one pushed entry record (keyed by its date, which is the natural
     * identity on the server) under last-writer-wins.
     *
     * @param  array<string, mixed>  $record
     * @return array<string, mixed>
     */
    private function applyEntry(User $user, array $record): array
    {
        $date = (string) $record['date'];
        $clientMs = (int) $record['updated_ms'];
        $deleted = (bool) ($record['deleted'] ?? false);

        $entry = $user->entries()->withTrashed()->where('date', $date)->first();

        if ($entry === null) {
            if ($deleted) {
                // A tombstone for a day the server never saw: nothing to
                // remove, and the server has converged to the client's state.
                return ['date' => $date, 'won' => true, 'record' => null];
            }

            $entry = $user->entries()->make(['date' => $date]);
            $entry->forceFill([
                'title' => isset($record['title']) && is_string($record['title']) ? strip_tags($record['title']) : ($record['title'] ?? null),
                'content' => isset($record['content']) && is_string($record['content']) ? Purifier::clean($record['content']) : ($record['content'] ?? null),
                'mood' => $record['mood'] ?? null,
                'updated_ms' => $clientMs,
            ])->save();

            if (array_key_exists('tags', $record)) {
                $entry->syncTags(is_array($record['tags']) ? $record['tags'] : []);
            }

            return ['date' => $date, 'won' => true, 'record' => $this->entryPayload($entry)];
        }

        $won = $clientMs > (int) ($entry->updated_ms ?? 0);

        if ($won) {
            if ($deleted) {
                $entry->forceFill(['updated_ms' => $clientMs])->save();

                if (! $entry->trashed()) {
                    $entry->delete();
                }
            } else {
                $entry->forceFill([
                    'title' => isset($record['title']) && is_string($record['title']) ? strip_tags($record['title']) : ($record['title'] ?? null),
                    'content' => isset($record['content']) && is_string($record['content']) ? Purifier::clean($record['content']) : ($record['content'] ?? null),
                    'mood' => $record['mood'] ?? null,
                    'updated_ms' => $clientMs,
                ]);

                // A soft-deleted row still holds the (user_id, date) unique
                // index, so a newer edit resurrects the day in place.
                if ($entry->trashed()) {
                    $entry->restore();
                } else {
                    $entry->save();
                }

                if (array_key_exists('tags', $record)) {
                    $entry->syncTags(is_array($record['tags']) ? $record['tags'] : []);
                }
            }
        }

        return ['date' => $date, 'won' => $won, 'record' => $this->entryPayload($entry)];
    }

    /**
     * Apply one pushed note record under last-writer-wins.
     *
     * A record with only a `local_id` is new to the server: it is created and
     * the assigned `server_id` comes back in the result so later pushes can
     * address it. Reminder bookkeeping follows the same rules as the web
     * controller: dated notes arm their pings, deleted notes drop them.
     *
     * @param  array<string, mixed>  $record
     * @return array<string, mixed>
     */
    private function applyNote(User $user, array $record): array
    {
        $localId = isset($record['local_id']) && is_int($record['local_id']) ? $record['local_id'] : null;
        $serverId = isset($record['server_id']) && is_int($record['server_id']) ? $record['server_id'] : null;
        $clientMs = (int) $record['updated_ms'];
        $deleted = (bool) ($record['deleted'] ?? false);

        $note = $serverId !== null ? $user->notes()->withTrashed()->find($serverId) : null;

        if ($note === null) {
            if ($serverId !== null || $deleted) {
                // A tombstone (or update) for a record the server does not
                // have: nothing to apply, nothing to converge.
                return ['local_id' => $localId, 'server_id' => $serverId, 'won' => true, 'record' => null];
            }

            $note = $user->notes()->make(['color' => Note::DEFAULT_COLOR, 'kind' => Note::DEFAULT_KIND]);
            $noteAttrs = $this->noteAttributes($record);
            if (isset($noteAttrs['body']) && is_string($noteAttrs['body'])) {
                $noteAttrs['body'] = Purifier::clean($noteAttrs['body']);
            }
            if (isset($noteAttrs['title']) && is_string($noteAttrs['title'])) {
                $noteAttrs['title'] = strip_tags($noteAttrs['title']);
            }
            $note->forceFill($noteAttrs + ['updated_ms' => $clientMs])->save();

            $this->scheduleReminders($note);

            return [
                'local_id' => $localId,
                'server_id' => $note->getKey(),
                'won' => true,
                'record' => $this->notePayload($note),
            ];
        }

        $won = $clientMs > (int) ($note->updated_ms ?? 0);

        if ($won) {
            if ($deleted) {
                $note->forceFill(['updated_ms' => $clientMs])->save();

                if (! $note->trashed()) {
                    $note->notifications()->delete();
                    $note->delete();
                }
            } else {
                $noteAttrs = $this->noteAttributes($record);
                if (isset($noteAttrs['body']) && is_string($noteAttrs['body'])) {
                    $noteAttrs['body'] = Purifier::clean($noteAttrs['body']);
                }
                if (isset($noteAttrs['title']) && is_string($noteAttrs['title'])) {
                    $noteAttrs['title'] = strip_tags($noteAttrs['title']);
                }
                $note->forceFill($noteAttrs + ['updated_ms' => $clientMs]);

                if ($note->trashed()) {
                    $note->restore();
                } else {
                    $note->save();
                }

                $this->scheduleReminders($note);
            }
        }

        return [
            'local_id' => $localId,
            'server_id' => $note->getKey(),
            'won' => $won,
            'record' => $this->notePayload($note),
        ];
    }

    /**
     * Apply one pushed schedule record under last-writer-wins.
     *
     * @param  array<string, mixed>  $record
     * @return array<string, mixed>
     */
    private function applySchedule(User $user, array $record): array
    {
        $localId = isset($record['local_id']) && is_int($record['local_id']) ? $record['local_id'] : null;
        $serverId = isset($record['server_id']) && is_int($record['server_id']) ? $record['server_id'] : null;
        $clientMs = (int) $record['updated_ms'];
        $deleted = (bool) ($record['deleted'] ?? false);

        $schedule = $serverId !== null ? $user->schedules()->withTrashed()->find($serverId) : null;

        if ($schedule === null) {
            if ($serverId !== null || $deleted) {
                return ['local_id' => $localId, 'server_id' => $serverId, 'won' => true, 'record' => null];
            }

            $schedule = $user->schedules()->make([
                'name' => (string) ($record['name'] ?? ''),
                'slots' => $record['slots'] ?? null,
                'only_weekdays' => (bool) ($record['only_weekdays'] ?? false),
                'active' => (bool) ($record['active'] ?? true),
                'position' => is_int($record['position'] ?? null)
                    ? $record['position']
                    : $this->nextPosition($user),
            ]);
            $schedule->forceFill(['updated_ms' => $clientMs])->save();

            return [
                'local_id' => $localId,
                'server_id' => $schedule->getKey(),
                'won' => true,
                'record' => $this->schedulePayload($schedule),
            ];
        }

        $won = $clientMs > (int) ($schedule->updated_ms ?? 0);

        if ($won) {
            if ($deleted) {
                $schedule->forceFill(['updated_ms' => $clientMs])->save();

                if (! $schedule->trashed()) {
                    $schedule->delete();
                }
            } else {
                $schedule->forceFill([
                    'name' => (string) ($record['name'] ?? $schedule->name),
                    'slots' => $record['slots'] ?? $schedule->slots,
                    'only_weekdays' => (bool) ($record['only_weekdays'] ?? $schedule->only_weekdays),
                    'active' => (bool) ($record['active'] ?? $schedule->active),
                    'position' => is_int($record['position'] ?? null) ? $record['position'] : $schedule->position,
                    'updated_ms' => $clientMs,
                ]);

                if ($schedule->trashed()) {
                    $schedule->restore();
                } else {
                    $schedule->save();
                }
            }
        }

        return [
            'local_id' => $localId,
            'server_id' => $schedule->getKey(),
            'won' => $won,
            'record' => $this->schedulePayload($schedule),
        ];
    }

    /**
     * The validated record list under the given key.
     *
     * @return array<int, array<string, mixed>>
     */
    private function records(SyncRequest $request, string $key): array
    {
        $records = $request->input($key);

        if (! is_array($records)) {
            return [];
        }

        /** @var array<int, array<string, mixed>> $records */
        return array_values($records);
    }

    /**
     * The writable note fields from a pushed record, defaulting colour and
     * kind exactly like the web form does.
     *
     * @param  array<string, mixed>  $record
     * @return array<string, mixed>
     */
    private function noteAttributes(array $record): array
    {
        return [
            'title' => $record['title'] ?? null,
            'body' => $record['body'] ?? null,
            'color' => $record['color'] ?? Note::DEFAULT_COLOR,
            'kind' => $record['kind'] ?? Note::DEFAULT_KIND,
            'date' => $record['date'] ?? null,
            'background_image' => $record['background_image'] ?? null,
        ];
    }

    /**
     * Keep the note's reminder notifications in step, mirroring the web
     * controller: a dated note arms its pings, anything else drops them.
     */
    private function scheduleReminders(Note $note): void
    {
        if ($note->date !== null && in_array($note->kind, Note::DATED_KINDS, true)) {
            $this->scheduler->sync($note);

            return;
        }

        $note->notifications()->delete();
    }

    /**
     * The next free schedule position, matching the web controller's
     * append-at-the-end behaviour.
     */
    private function nextPosition(User $user): int
    {
        $schedules = $user->schedules();

        return $schedules->exists() ? (int) $schedules->max('position') + 1 : 0;
    }

    /**
     * The full server state of an entry, as the pull and push report it.
     *
     * @return array<string, mixed>
     */
    private function entryPayload(Entry $entry): array
    {
        if ($entry->trashed()) {
            return [
                'date' => $entry->date->toDateString(),
                'deleted' => true,
                'updated_ms' => (int) $entry->updated_ms,
            ];
        }

        return [
            'date' => $entry->date->toDateString(),
            'deleted' => false,
            'updated_ms' => (int) $entry->updated_ms,
            'title' => $entry->title,
            'content' => $entry->content,
            'mood' => $entry->mood,
            'tags' => $entry->tags->map(fn ($tag): string => $tag->name)->values()->all(),
            'attachments' => $entry->attachments->map(fn ($attachment): array => [
                'id' => $attachment->getKey(),
                'kind' => $attachment->kind,
                'original_name' => $attachment->original_name,
                'mime' => $attachment->mime_type,
                'size' => $attachment->size,
            ])->values()->all(),
        ];
    }

    /**
     * The full server state of a note, as the pull and push report it.
     *
     * @return array<string, mixed>
     */
    private function notePayload(Note $note): array
    {
        if ($note->trashed()) {
            return [
                'server_id' => $note->getKey(),
                'deleted' => true,
                'updated_ms' => (int) $note->updated_ms,
            ];
        }

        return [
            'server_id' => $note->getKey(),
            'deleted' => false,
            'updated_ms' => (int) $note->updated_ms,
            'title' => $note->title,
            'body' => $note->body,
            'color' => $note->color,
            'kind' => $note->kind,
            'date' => $note->date?->toDateString(),
            'background_image' => $note->background_image,
        ];
    }

    /**
     * The full server state of a schedule, as the pull and push report it.
     *
     * @return array<string, mixed>
     */
    private function schedulePayload(Schedule $schedule): array
    {
        if ($schedule->trashed()) {
            return [
                'server_id' => $schedule->getKey(),
                'deleted' => true,
                'updated_ms' => (int) $schedule->updated_ms,
            ];
        }

        return [
            'server_id' => $schedule->getKey(),
            'deleted' => false,
            'updated_ms' => (int) $schedule->updated_ms,
            'name' => $schedule->name,
            'slots' => $schedule->slots,
            'only_weekdays' => $schedule->only_weekdays,
            'active' => $schedule->active,
            'position' => $schedule->position,
        ];
    }
}
