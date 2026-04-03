<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE payroll_runs MODIFY COLUMN status ENUM('draft', 'processing', 'completed', 'pending_approval', 'final', 'cancelled') NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE payroll_runs MODIFY COLUMN status ENUM('draft', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'draft'");
    }
};