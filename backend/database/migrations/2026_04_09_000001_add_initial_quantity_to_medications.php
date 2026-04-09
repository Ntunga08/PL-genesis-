<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medications', function (Blueprint $table) {
            $table->integer('initial_quantity')->default(0)->after('stock_quantity');
        });

        // Seed initial_quantity from current stock_quantity for existing records
        DB::statement('UPDATE medications SET initial_quantity = stock_quantity WHERE initial_quantity = 0');
    }

    public function down(): void
    {
        Schema::table('medications', function (Blueprint $table) {
            $table->dropColumn('initial_quantity');
        });
    }
};
