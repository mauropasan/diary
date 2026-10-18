<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Browsers that have passed the two-factor challenge can be trusted for a
     * while so a returning device skips it. The browser only holds a random
     * token; the database stores its SHA-256 hash, so the table alone cannot
     * be turned back into a working cookie. Every device is deleted when
     * two-factor authentication is turned off.
     */
    public function up(): void
    {
        Schema::create('two_factor_devices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('two_factor_devices');
    }
};
