<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Only create table if it doesn't exist
        if (!Schema::hasTable('service_forms')) {
            Schema::create('service_forms', function (Blueprint $table) {
                $table->id();
                $table->uuid('visit_id');
                $table->foreign('visit_id')->references('id')->on('patient_visits')->onDelete('cascade');
                $table->uuid('patient_id');
                $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
                $table->string('service_id')->nullable(); // Reference to medical_services
                $table->json('form_data');
                $table->uuid('completed_by');
                $table->foreign('completed_by')->references('id')->on('users');
                $table->timestamp('completed_at');
                $table->timestamps();
                
                // Indexes for performance
                $table->index('visit_id');
                $table->index('patient_id');
                $table->index('completed_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_forms');
    }
};