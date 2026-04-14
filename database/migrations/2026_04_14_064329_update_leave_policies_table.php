<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Use raw SQL to avoid Doctrine DBAL enum change issues on MariaDB/MySQL
        DB::statement("ALTER TABLE `leave_policies` MODIFY `fixed_days_unit` ENUM('days', 'weeks') NULL DEFAULT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `leave_policies` MODIFY `fixed_days_unit` ENUM('days', 'weeks') NOT NULL DEFAULT 'days'");
    }
};