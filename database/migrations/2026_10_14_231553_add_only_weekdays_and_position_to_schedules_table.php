<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->boolean('only_weekdays')->default(false)->after('slots');
            $table->unsignedInteger('position')->default(0)->after('active');
        });

        $positionByUser = [];

        DB::table('schedules')
            ->orderByDesc('active')
            ->orderByDesc('updated_at')
            ->orderBy('id')
            ->get(['id', 'user_id'])
            ->each(function (object $schedule) use (&$positionByUser): void {
                $position = $positionByUser[$schedule->user_id] ?? 0;

                DB::table('schedules')
                    ->where('id', $schedule->id)
                    ->update(['position' => $position]);

                $positionByUser[$schedule->user_id] = $position + 1;
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn(['only_weekdays', 'position']);
        });
    }
};
