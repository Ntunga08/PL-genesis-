<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            if (!Schema::hasColumn('patients', 'insurance_company_id')) {
                $table->uuid('insurance_company_id')->nullable()->after('insurance_number');
            }
            if (!Schema::hasColumn('patients', 'status')) {
                $table->string('status', 50)->nullable()->default('Active')->after('insurance_company_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['insurance_company_id', 'status']);
        });
    }
};
