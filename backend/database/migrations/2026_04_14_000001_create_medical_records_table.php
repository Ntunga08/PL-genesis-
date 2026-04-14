<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('patient_id');
            $table->uuid('doctor_id');
            $table->string('cid_hash');                    // IPFS CID
            $table->string('stellar_tx_hash')->nullable(); // Stellar transaction hash
            $table->string('record_type', 50)->default('general'); // pdf, json, image, general
            $table->string('encryption_key_ref')->nullable(); // reference to key (never store key itself)
            $table->enum('status', ['pending', 'stored', 'verified', 'rejected'])->default('pending');
            $table->boolean('insurance_validated')->default(false);
            $table->boolean('doctor_approved')->default(false);
            $table->boolean('payment_released')->default(false);
            $table->string('payment_tx_hash')->nullable();
            $table->timestamps();

            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            $table->foreign('doctor_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['patient_id', 'cid_hash', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_records');
    }
};
