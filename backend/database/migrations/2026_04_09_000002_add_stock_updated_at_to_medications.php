<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medications', function (Blueprint $table) {
            $table->timestamp('stock_updated_at')->nullable()->after('initial_quantity');
        });

        // Backfill existing records with created_at
        DB::statement('UPDATE medications SET stock_updated_at = created_at WHERE stock_updated_at IS NULL');
    }

    public function down(): void
    {
        Schema::table('medications', function (Blueprint $table) {
            $table->dropColumn('stock_updated_at');
        });
    }
};
