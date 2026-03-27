<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;
use App\Models\User;

class FixZambiaTaxSettingsSeeder extends Seeder
{
    /**
     * Overwrites Zambia tax settings with correct ZRA values as per project documentation.
     * Run with: php artisan db:seed --class=FixZambiaTaxSettingsSeeder
     */
    public function run(): void
    {
        // In CLI there is no authenticated user, so fetch the super admin directly.
        // Adjust the condition if your admin is identified differently (e.g. role, type column).
        $admin = User::where('type', 'super admin')->first()
               ?? User::orderBy('id')->first();

        if (! $admin) {
            $this->command->error('No user found in the database. Cannot seed.');
            return;
        }

        $userId = $admin->id;
        $this->command->info("Using user: [{$userId}] {$admin->email}");

        $correctSettings = [
            // PAYE Slab 1 — Tax-free band
            'zambia_paye_slab_1_min'  => '0',
            'zambia_paye_slab_1_max'  => '5100',
            'zambia_paye_slab_1_rate' => '0',

            // PAYE Slab 2 — 20% band
            'zambia_paye_slab_2_min'  => '5101',
            'zambia_paye_slab_2_max'  => '7100',
            'zambia_paye_slab_2_rate' => '20',

            // PAYE Slab 3 — 30% band
            'zambia_paye_slab_3_min'  => '7101',
            'zambia_paye_slab_3_max'  => '9200',
            'zambia_paye_slab_3_rate' => '30',

            // PAYE Slab 4 — 37% top band
            'zambia_paye_slab_4_min'  => '9201',
            'zambia_paye_slab_4_max'  => '999999999',
            'zambia_paye_slab_4_rate' => '37',

            // NAPSA
            'zambia_napsa_employee_rate' => '5',
            'zambia_napsa_employer_rate' => '5',
            'zambia_napsa_monthly_cap'   => '1073.20',

            // NHIMA
            'zambia_nhima_employee_rate' => '1',
            'zambia_nhima_employer_rate' => '1',

            // SDL
            'zambia_sdl_rate' => '0.5',
        ];

        foreach ($correctSettings as $key => $value) {
            Setting::updateOrCreate(
                ['user_id' => $userId, 'key' => $key],
                ['value'   => $value]
            );
        }

        $this->command->info('✅ Zambia tax settings reset to correct ZRA values.');
        $this->command->table(
            ['Key', 'Value'],
            collect($correctSettings)->map(fn ($v, $k) => [$k, $v])->values()->toArray()
        );
    }
}