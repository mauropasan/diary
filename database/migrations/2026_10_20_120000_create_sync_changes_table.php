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
     * The journal the sync API pulls from: one row per change to an entry,
     * note or schedule, appended by the model events so every write path
     * (web, sync API, factories, seeding) is covered. Rows already in the
     * database when this ships are backfilled so an existing diary shows up
     * on the first pull of a fresh client.
     */
    public function up(): void
    {
        Schema::create('sync_changes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('entity_type');
            $table->unsignedBigInteger('entity_id');
            $table->unsignedBigInteger('updated_ms');
            $table->boolean('deleted')->default(false);
            $table->timestamp('created_at')->nullable();

            $table->index(['user_id', 'id']);
        });

        foreach (['entry' => 'entries', 'note' => 'notes', 'schedule' => 'schedules'] as $type => $table) {
            $rows = [];

            DB::table($table)->orderBy('id')->chunk(200, function ($chunk) use (&$rows, $type): void {
                foreach ($chunk as $row) {
                    $rows[] = [
                        'user_id' => (int) $row->user_id,
                        'entity_type' => $type,
                        'entity_id' => (int) $row->id,
                        'updated_ms' => (int) ($row->updated_ms
                            ?? ($row->updated_at !== null ? strtotime((string) $row->updated_at) * 1000 : 0)),
                        'deleted' => $row->deleted_at !== null,
                        'created_at' => now()->toDateTimeString(),
                    ];
                }

                if ($rows !== []) {
                    DB::table('sync_changes')->insert($rows);
                    $rows = [];
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sync_changes');
    }
};
