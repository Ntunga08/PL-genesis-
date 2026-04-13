<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_services', function (Blueprint $table) {
            $table->uuid('visit_id')->nullable()->after('patient_id');
            $table->index('visit_id');
        });
    }

    public function down(): void
    {
        Schema::table('patient_services', function (Blueprint $table) {
            $table->dropIndex(['visit_id']);
            $table->dropColumn('visit_id');
        });
    }
};
