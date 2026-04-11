<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medication_stock_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('medication_id');
            $table->integer('quantity_before');
            $table->integer('quantity_after');
            $table->integer('change'); // positive = restock, negative = dispensed
            $table->enum('type', ['restock', 'dispense', 'adjustment', 'import'])->default('adjustment');
            $table->string('reference')->nullable(); // prescription id, import batch, etc.
            $table->text('notes')->nullable();
            $table->uuid('performed_by')->nullable();
            $table->timestamps();
            $table->foreign('medication_id')->references('id')->on('medications')->onDelete('cascade');
            $table->index(['medication_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medication_stock_logs');
    }
};
