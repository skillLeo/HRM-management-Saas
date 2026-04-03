<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payroll_runs', function (Blueprint $table) {
            $table->timestamp('unlocked_at')->nullable()->after('status');
            $table->unsignedBigInteger('unlocked_by')->nullable()->after('unlocked_at');
            $table->timestamp('submitted_for_final_at')->nullable()->after('unlocked_by');
            $table->unsignedBigInteger('submitted_by')->nullable()->after('submitted_for_final_at');
            $table->timestamp('approved_at')->nullable()->after('submitted_by');
            $table->unsignedBigInteger('approved_by')->nullable()->after('approved_at');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_runs', function (Blueprint $table) {
            $table->dropColumn([
                'unlocked_at', 'unlocked_by',
                'submitted_for_final_at', 'submitted_by',
                'approved_at', 'approved_by',
            ]);
        });
    }
};