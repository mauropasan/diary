<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Notifications derived from a dated note only become visible at
     * `due_at` (the day before the note's date) and the reminder email is
     * queued for that same moment. `emailed_at` keeps the delayed job from
     * sending twice, and `note_id` lets edits and deletions of the note
     * reschedule or drop its pending notification.
     */
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->timestamp('due_at')->useCurrent()->after('body');
            $table->timestamp('emailed_at')->nullable()->after('due_at');
            $table->foreignId('note_id')->nullable()->after('user_id')->constrained()->cascadeOnDelete();

            $table->index(['user_id', 'due_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('note_id');
            $table->dropIndex(['user_id', 'due_at']);
            $table->dropColumn(['due_at', 'emailed_at']);
        });
    }
};
