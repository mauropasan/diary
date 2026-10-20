<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The stateless sync API authenticates the data encryption key carried in
     * the `X-Diary-Key` header against this marker: the first request stores
     * it (encrypting `diary-key-check-v1` with the presented key) and every
     * later request must decrypt it back with the same key. Only the
     * ciphertext lives here; the key itself never does.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->text('key_check')->nullable()->after('recovery_wrapped_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('key_check');
        });
    }
};
