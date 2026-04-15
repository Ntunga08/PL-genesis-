<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            // Stellar public key = patient's universal medical ID
            $table->string('stellar_public_key')->nullable()->unique()->after('status');
            // Short human-readable share code (e.g. HMS-A3F9K2) for verbal/QR sharing
            $table->string('share_code', 20)->nullable()->unique()->after('stellar_public_key');
            // Linked user account (if patient self-registered)
            $table->uuid('user_id')->nullable()->after('share_code');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });

        // Access grants: patient explicitly grants a doctor access to their records
        Schema::create('medical_record_access_grants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('patient_id');
            $table->uuid('granted_to_user_id');          // doctor/specialist
            $table->string('patient_stellar_public_key'); // for on-chain verification
            $table->enum('access_level', ['view', 'full'])->default('view');
            $table->timestamp('expires_at')->nullable();  // null = permanent until revoked
            $table->boolean('is_active')->default(true);
            $table->string('purpose')->nullable();        // e.g. "Second opinion - cardiology"
            $table->string('access_token', 64)->unique(); // one-time or session token
            $table->timestamps();

            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            $table->foreign('granted_to_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['patient_id', 'is_active']);
            $table->index(['access_token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_record_access_grants');
        Schema::table('patients', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['stellar_public_key', 'share_code', 'user_id']);
        });
    }
};
