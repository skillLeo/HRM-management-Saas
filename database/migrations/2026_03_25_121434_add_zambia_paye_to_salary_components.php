<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL requires re-defining the full enum to add a value
        DB::statement("ALTER TABLE salary_components MODIFY COLUMN calculation_type ENUM('fixed', 'percentage', 'zambia_paye') NOT NULL DEFAULT 'fixed'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE salary_components MODIFY COLUMN calculation_type ENUM('fixed', 'percentage') NOT NULL DEFAULT 'fixed'");
    }
};