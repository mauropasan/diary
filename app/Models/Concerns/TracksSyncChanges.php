<?php

namespace App\Models\Concerns;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Keeps the `updated_ms` column and the `sync_changes` journal in step for
 * the offline-first sync API.
 *
 * `updated_ms` holds the wall-clock moment (in milliseconds) of the last
 * write. Web code never sets it, so every server-side save stamps the server
 * clock; the sync API applies it explicitly from the client payload, and the
 * journal lets a client ask "what changed after cursor N?" — one row per
 * save, delete or restore, written for every code path because the hooks live
 * on the models themselves.
 */
trait TracksSyncChanges
{
    /**
     * Register the model hooks that maintain `updated_ms` and the journal.
     */
    protected static function bootTracksSyncChanges(): void
    {
        static::saving(function (Model $model): void {
            // A sync apply that brings its own last-writer-wins timestamp wins;
            // anything else is stamped with the server clock.
            if ($model->isDirty('updated_ms') && $model->getAttribute('updated_ms') !== null) {
                return;
            }

            $model->setAttribute('updated_ms', (int) now()->getTimestampMs());
        });

        static::saved(function (Model $model): void {
            // A restore saves first and announces itself through `restored`,
            // which writes the row; logging here too would duplicate it.
            if ($model->wasChanged('deleted_at')) {
                return;
            }

            // Inserts do not sync the change set, so a fresh model is always
            // a change worth journaling.
            if (! $model->wasRecentlyCreated
                && array_diff(array_keys($model->getChanges()), ['updated_at', 'updated_ms']) === []) {
                // A pure touch (or a save that only refreshed the timestamp)
                // leaves the record itself untouched: nothing to propagate.
                return;
            }

            self::journalSyncChange($model, deleted: false);
        });

        static::deleted(function (Model $model): void {
            // The flag mirrors `trashed()`; a forced delete leaves the column
            // null, and the pull treats a row that no longer exists as a
            // tombstone either way.
            $deleted = method_exists($model, 'trashed') ? $model->trashed() : false;

            self::journalSyncChange($model, deleted: $deleted);
        });

        static::restored(function (Model $model): void {
            self::journalSyncChange($model, deleted: false);
        });
    }

    /**
     * Append one row to the sync journal for the model's current state.
     *
     * Written through the query builder so no model event (and therefore no
     * further journal row) can ever be raised by the journal itself.
     */
    private static function journalSyncChange(Model $model, bool $deleted): void
    {
        DB::table('sync_changes')->insert([
            'user_id' => (int) $model->getAttribute('user_id'),
            'entity_type' => strtolower(class_basename($model)),
            'entity_id' => (int) $model->getKey(),
            'updated_ms' => (int) self::journalTimestamp($model),
            'deleted' => $deleted,
            'created_at' => now()->toDateTimeString(),
        ]);
    }

    /**
     * The model's last-write moment in milliseconds, falling back to the
     * creation date for rows written before `updated_ms` existed.
     */
    private static function journalTimestamp(Model $model): int
    {
        $updatedAt = $model->getAttribute('updated_ms');

        if ($updatedAt !== null) {
            return (int) $updatedAt;
        }

        $createdAt = $model->getAttribute('created_at');

        return $createdAt instanceof CarbonInterface ? (int) $createdAt->getTimestampMs() : 0;
    }
}
