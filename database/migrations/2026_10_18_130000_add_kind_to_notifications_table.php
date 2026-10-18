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
     * Notifications are no longer only reminders derived from a note: the
     * application also raises its own warnings, such as a change to two-factor
     * authentication. Those carry a message `kind` and its `params` instead of a
     * title and a body, so they can be shown without the diary key: an
     * administrator turning the feature off for somebody else has no access to
     * that account's key. `kind` and `params` are encrypted with the
     * application key, never with the diary key, and `title` becomes nullable
     * because an application notification has no diary text at all.
     */
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->string('kind')->nullable()->after('note_id');
            $table->text('params')->nullable()->after('kind');
        });

        Schema::table('notifications', function (Blueprint $table): void {
            $table->text('title')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Application notifications have no title, so they cannot survive the
        // title column being made non-nullable again.
        DB::table('notifications')->whereNotNull('kind')->delete();

        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropColumn(['kind', 'params']);
        });

        Schema::table('notifications', function (Blueprint $table): void {
            $table->text('title')->nullable(false)->change();
        });
    }
};
