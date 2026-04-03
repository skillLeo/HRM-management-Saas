<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE employees MODIFY COLUMN employee_status 
            ENUM('active','inactive','terminated','probation','suspended') 
            DEFAULT 'active'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE employees MODIFY COLUMN employee_status 
            ENUM('active','inactive','terminated','probation') 
            DEFAULT 'active'");
    }
};