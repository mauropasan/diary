<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * A dedicated, monotonically increasing version for the user's custom
     * background. It is used as the cache-busting `?v=` token on the
     * background image URL, so re-uploading a picture always forces a fresh
     * fetch even when `updated_at` (second-precision) has not ticked.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->unsignedInteger('background_version')->default(0)->after('background');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('background_version');
        });
    }
};
