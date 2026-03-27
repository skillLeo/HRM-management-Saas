<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('tpin', 20)->nullable()->after('tax_payer_id');
            $table->string('napsa_number', 50)->nullable()->after('tpin');
            $table->string('nhima_number', 50)->nullable()->after('napsa_number');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['tpin', 'napsa_number', 'nhima_number']);
        });
    }
};