<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('stellar_tx_hash')->nullable()->after('notes');
            $table->decimal('xlm_amount', 18, 7)->nullable()->after('stellar_tx_hash');
            $table->enum('bridge_status', ['pending', 'bridged', 'failed'])->default('pending')->after('xlm_amount');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['stellar_tx_hash', 'xlm_amount', 'bridge_status']);
        });
    }
};
