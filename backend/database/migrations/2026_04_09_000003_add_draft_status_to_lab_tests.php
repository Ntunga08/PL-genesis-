<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MODIFY COLUMN is MySQL/MariaDB only — skip on SQLite (used in tests)
        if (DB::getDriverName() === 'sqlite') return;
        DB::statement("ALTER TABLE lab_tests MODIFY COLUMN status ENUM('Pending','In Progress','Completed','Cancelled','Draft','Ordered','Sample Collected') DEFAULT 'Pending'");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') return;
        DB::statement("ALTER TABLE lab_tests MODIFY COLUMN status ENUM('Pending','In Progress','Completed','Cancelled','Ordered','Sample Collected') DEFAULT 'Pending'");
    }
};
