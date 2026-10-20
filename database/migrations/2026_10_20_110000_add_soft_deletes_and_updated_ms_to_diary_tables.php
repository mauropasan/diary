<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The offline-first sync API tracks row changes with an `updated_ms`
     * column (client clocks decide last-writer-wins) and soft deletes, so a
     * deletion can travel to the other devices as a tombstone instead of
     * disappearing from the journal. Existing rows get their `updated_ms`
     * backfilled from `updated_at`; the column stays nullable so the schema
     * accepts any row, and every save keeps it maintained from there on.
     */
    public function up(): void
    {
        foreach (['entries', 'notes', 'schedules'] as $table) {
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->softDeletes();
                $blueprint->unsignedBigInteger('updated_ms')->nullable()->index();
            });
        }

        foreach (['entries', 'notes', 'schedules'] as $table) {
            DB::table($table)->orderBy('id')->chunk(200, function ($rows) use ($table): void {
                foreach ($rows as $row) {
                    $updatedAt = ! empty($row->updated_at)
                        ? strtotime((string) $row->updated_at) * 1000
                        : null;
                    $createdAt = ! empty($row->created_at)
                        ? strtotime((string) $row->created_at) * 1000
                        : null;

                    DB::table($table)->where('id', $row->id)->update([
                        'updated_ms' => $updatedAt ?? $createdAt ?? (int) now()->getTimestampMs(),
                    ]);
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['entries', 'notes', 'schedules'] as $table) {
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->dropSoftDeletes();
            });

            Schema::table($table, function (Blueprint $blueprint) use ($table): void {
                $blueprint->dropIndex($table.'_updated_ms_index');
            });
        }
    }
};
