<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Reminders are no longer a single ping the day before the date: the owner
     * chooses how many days ahead they start and at which hours of the day they
     * repeat (up to `diary.reminder.times_max`). `reminder_times` holds the
     * `HH:mm` slots as a JSON list, `reminder_days_before` how far back the
     * window opens. Both are optional: a missing value falls back to the config
     * defaults.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->unsignedTinyInteger('reminder_days_before')->default(1)->after('email_notifications');
            $table->text('reminder_times')->nullable()->after('reminder_days_before');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['reminder_days_before', 'reminder_times']);
        });
    }
};
