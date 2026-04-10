<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_policies', function (Blueprint $table) {
            // New allocation mode: accrual (existing) or fixed (set days/weeks per year)
            $table->enum('allocation_type', ['accrual', 'fixed'])->default('accrual')->after('leave_type_id');
            $table->decimal('fixed_days', 8, 2)->nullable()->after('allocation_type');
            $table->enum('fixed_days_unit', ['days', 'weeks'])->default('days')->after('fixed_days');

            // Make accrual fields nullable since fixed policies don't need them
            $table->string('accrual_type')->nullable()->change();
            $table->decimal('accrual_rate', 8, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('leave_policies', function (Blueprint $table) {
            $table->dropColumn(['allocation_type', 'fixed_days', 'fixed_days_unit']);
            $table->string('accrual_type')->default('yearly')->change();
            $table->decimal('accrual_rate', 8, 2)->default(0)->change();
        });
    }
};
