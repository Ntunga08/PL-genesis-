<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_visits', function (Blueprint $table) {
            $table->string('icd10_code', 10)->nullable()->after('provisional_diagnosis');
            $table->string('icd10_description')->nullable()->after('icd10_code');
            $table->string('final_icd10_code', 10)->nullable()->after('final_diagnosis');
            $table->string('final_icd10_description')->nullable()->after('final_icd10_code');
        });

        Schema::table('insurance_claims', function (Blueprint $table) {
            $table->string('icd10_code', 10)->nullable()->after('notes');
            $table->string('icd10_description')->nullable()->after('icd10_code');
        });
    }

    public function down(): void
    {
        Schema::table('patient_visits', function (Blueprint $table) {
            $table->dropColumn(['icd10_code', 'icd10_description', 'final_icd10_code', 'final_icd10_description']);
        });

        Schema::table('insurance_claims', function (Blueprint $table) {
            $table->dropColumn(['icd10_code', 'icd10_description']);
        });
    }
};
