<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Setting;
use App\Models\User;

return new class extends Migration
{
    public function up(): void
    {
        // Seed default Zambia tax settings for all existing company users
        $defaults = [
            'zambia_paye_slab_1_min'    => '0',
            'zambia_paye_slab_1_max'    => '4800',
            'zambia_paye_slab_1_rate'   => '0',
            'zambia_paye_slab_2_min'    => '4801',
            'zambia_paye_slab_2_max'    => '9200',
            'zambia_paye_slab_2_rate'   => '25',
            'zambia_paye_slab_3_min'    => '9201',
            'zambia_paye_slab_3_max'    => '14300',
            'zambia_paye_slab_3_rate'   => '30',
            'zambia_paye_slab_4_min'    => '14301',
            'zambia_paye_slab_4_max'    => '999999999',
            'zambia_paye_slab_4_rate'   => '37.5',
            'zambia_napsa_employee_rate'  => '5',
            'zambia_napsa_employer_rate'  => '5',
            'zambia_napsa_monthly_cap'    => '1073.20',
            'zambia_nhima_employee_rate'  => '1',
            'zambia_nhima_employer_rate'  => '1',
            'zambia_sdl_rate'             => '0.5',
        ];

        $companies = User::where('type', 'company')->get();
        foreach ($companies as $company) {
            foreach ($defaults as $key => $value) {
                Setting::firstOrCreate(
                    ['user_id' => $company->id, 'key' => $key],
                    ['value' => $value]
                );
            }
        }
    }

    public function down(): void
    {
        $keys = [
            'zambia_paye_slab_1_min', 'zambia_paye_slab_1_max', 'zambia_paye_slab_1_rate',
            'zambia_paye_slab_2_min', 'zambia_paye_slab_2_max', 'zambia_paye_slab_2_rate',
            'zambia_paye_slab_3_min', 'zambia_paye_slab_3_max', 'zambia_paye_slab_3_rate',
            'zambia_paye_slab_4_min', 'zambia_paye_slab_4_max', 'zambia_paye_slab_4_rate',
            'zambia_napsa_employee_rate', 'zambia_napsa_employer_rate', 'zambia_napsa_monthly_cap',
            'zambia_nhima_employee_rate', 'zambia_nhima_employer_rate',
            'zambia_sdl_rate',
        ];
        \App\Models\Setting::whereIn('key', $keys)->delete();
    }
};