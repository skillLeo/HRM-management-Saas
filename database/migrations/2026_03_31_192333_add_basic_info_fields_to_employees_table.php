<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('title')->nullable()->after('id');
            $table->string('first_name')->nullable()->after('title');
            $table->string('middle_name')->nullable()->after('first_name');
            $table->string('last_name')->nullable()->after('middle_name');
            $table->string('nationality')->nullable()->after('gender');
            $table->string('marital_status')->nullable()->after('nationality');
            $table->string('nrc')->nullable()->after('tax_payer_id');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['title', 'first_name', 'middle_name', 'last_name', 'nationality', 'marital_status', 'nrc']);
        });
    }
};