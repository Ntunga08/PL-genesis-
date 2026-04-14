<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('stellar_public_key')->nullable()->after('phone');
            $table->text('stellar_encrypted_secret')->nullable()->after('stellar_public_key'); // AES-256 encrypted
            $table->string('avatar_url')->nullable()->after('stellar_encrypted_secret');
            $table->string('specialization')->nullable()->after('avatar_url'); // for doctors
            $table->timestamp('last_login_at')->nullable()->after('specialization');
            $table->string('password_reset_token')->nullable()->after('last_login_at');
            $table->timestamp('password_reset_expires_at')->nullable()->after('password_reset_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'stellar_public_key',
                'stellar_encrypted_secret',
                'avatar_url',
                'specialization',
                'last_login_at',
                'password_reset_token',
                'password_reset_expires_at',
            ]);
        });
    }
};
