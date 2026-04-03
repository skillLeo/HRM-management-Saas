<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->boolean('exempt_from_napsa')->default(false)->after('tax_payer_id');
            $table->boolean('exempt_from_nhima')->default(false)->after('exempt_from_napsa');
            $table->boolean('exempt_from_sdl')->default(false)->after('exempt_from_nhima');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['exempt_from_napsa', 'exempt_from_nhima', 'exempt_from_sdl']);
        });
    }
};