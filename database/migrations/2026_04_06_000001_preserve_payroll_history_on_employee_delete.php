<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Preserve payroll and payslip history when an employee user is deleted.
 *
 * Changes:
 *  - payroll_entries.employee_id  → nullable, FK becomes SET NULL
 *  - payroll_entries.employee_name → new snapshot column
 *  - payslips.employee_id          → nullable, FK becomes SET NULL
 *  - payslips.employee_name        → new snapshot column
 *
 * MySQL note: The composite unique index on (payroll_run_id, employee_id) is
 * used by MySQL as the backing index for the payroll_run_id FK constraint.
 * We must create a dedicated single-column index on payroll_run_id first,
 * then safely drop the composite unique index.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── payroll_entries ──────────────────────────────────────────────────
        Schema::table('payroll_entries', function (Blueprint $table) {
            // 1. Create a dedicated index on payroll_run_id so MySQL has a
            //    backing index for that FK before we drop the composite unique.
            $table->index('payroll_run_id', 'payroll_entries_payroll_run_id_backing');

            // 2. Drop the composite unique index (now safe — payroll_run_id FK
            //    will use the new single-column index above).
            $table->dropUnique('payroll_entries_payroll_run_id_employee_id_unique');

            // 3. Drop the employee_id FK (was CASCADE → will be recreated as SET NULL).
            $table->dropForeign(['employee_id']);

            // 4. Make employee_id nullable.
            $table->unsignedBigInteger('employee_id')->nullable()->change();

            // 5. Re-add the FK with SET NULL on delete.
            $table->foreign('employee_id')
                  ->references('id')->on('users')
                  ->onDelete('set null');

            // 6. Add a plain composite index (not unique — multiple NULLs are OK).
            $table->index(['payroll_run_id', 'employee_id'], 'payroll_entries_run_employee_index');

            // 7. Employee name snapshot.
            $table->string('employee_name')->nullable()->after('employee_id');
        });

        // ── payslips ─────────────────────────────────────────────────────────
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);

            $table->unsignedBigInteger('employee_id')->nullable()->change();

            $table->foreign('employee_id')
                  ->references('id')->on('users')
                  ->onDelete('set null');

            $table->string('employee_name')->nullable()->after('employee_id');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_entries', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropIndex('payroll_entries_run_employee_index');
            $table->dropIndex('payroll_entries_payroll_run_id_backing');
            $table->dropColumn('employee_name');
            $table->unsignedBigInteger('employee_id')->nullable(false)->change();
            $table->foreign('employee_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['payroll_run_id', 'employee_id']);
        });

        Schema::table('payslips', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropColumn('employee_name');
            $table->unsignedBigInteger('employee_id')->nullable(false)->change();
            $table->foreign('employee_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
