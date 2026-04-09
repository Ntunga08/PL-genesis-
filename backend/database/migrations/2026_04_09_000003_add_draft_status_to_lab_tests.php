<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE lab_tests MODIFY COLUMN status ENUM('Pending','In Progress','Completed','Cancelled','Draft','Ordered','Sample Collected') DEFAULT 'Pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE lab_tests MODIFY COLUMN status ENUM('Pending','In Progress','Completed','Cancelled','Ordered','Sample Collected') DEFAULT 'Pending'");
    }
};
