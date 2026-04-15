<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('icd10_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique()->index();
            $table->string('description');
            $table->string('category', 10)->nullable()->index(); // e.g. A, B, C...
            $table->string('chapter', 5)->nullable();            // e.g. I, II, III...
            // fulltext only on MySQL/MariaDB — SQLite (used in tests) doesn't support it
            if (DB::getDriverName() !== 'sqlite') {
                $table->fullText(['code', 'description']);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('icd10_codes');
    }
};
