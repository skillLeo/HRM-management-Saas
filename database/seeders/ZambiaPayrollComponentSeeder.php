<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SalaryComponent;
use App\Models\User;

class ZambiaPayrollComponentSeeder extends Seeder
{
    public function run(): void
    {
        // Use the company user (first company type, fallback to first user)
        $creator = User::where('type', 'company')->first()
                 ?? User::orderBy('id')->first();

        if (! $creator) {
            $this->command->error('No user found. Cannot seed.');
            return;
        }

        $components = [

            // ── EARNINGS ────────────────────────────────────────────────────
            [
                'name'                => 'Basic Salary',
                'description'         => 'Fixed monthly basic salary',
                'type'                => 'earning',
                'calculation_type'    => 'fixed',
                'default_amount'      => 0,
                'percentage_of_basic' => null,
                'is_taxable'          => true,
                'is_mandatory'        => true,
            ],
            [
                'name'                => 'Housing Allowance',
                'description'         => 'Monthly housing allowance',
                'type'                => 'earning',
                'calculation_type'    => 'fixed',
                'default_amount'      => 0,
                'percentage_of_basic' => null,
                'is_taxable'          => true,
                'is_mandatory'        => false,
            ],
            [
                'name'                => 'Transport Allowance',
                'description'         => 'Monthly transport allowance',
                'type'                => 'earning',
                'calculation_type'    => 'fixed',
                'default_amount'      => 0,
                'percentage_of_basic' => null,
                'is_taxable'          => true,
                'is_mandatory'        => false,
            ],
            [
                'name'                => 'Overtime',
                'description'         => 'Overtime pay',
                'type'                => 'earning',
                'calculation_type'    => 'fixed',
                'default_amount'      => 0,
                'percentage_of_basic' => null,
                'is_taxable'          => true,
                'is_mandatory'        => false,
            ],
            [
                'name'                => 'Bonus',
                'description'         => 'Performance or annual bonus',
                'type'                => 'earning',
                'calculation_type'    => 'fixed',
                'default_amount'      => 0,
                'percentage_of_basic' => null,
                'is_taxable'          => true,
                'is_mandatory'        => false,
            ],

            // ── DEDUCTIONS ──────────────────────────────────────────────────
            [
                'name'                => 'PAYE Tax',
                'description'         => 'Pay As You Earn income tax — calculated using ZRA progressive tax slabs',
                'type'                => 'deduction',
                'calculation_type'    => 'zambia_paye',   // special type — handled by ZambiaPayrollService
                'default_amount'      => 0,
                'percentage_of_basic' => null,
                'is_taxable'          => false,
                'is_mandatory'        => true,
            ],
            [
                'name'                => 'NAPSA Employee',
                'description'         => 'Employee pension contribution — 5% of gross salary (capped)',
                'type'                => 'deduction',
                'calculation_type'    => 'percentage',
                'default_amount'      => 0,
                'percentage_of_basic' => 5.00,
                'is_taxable'          => false,
                'is_mandatory'        => true,
            ],
            [
                'name'                => 'NHIMA Employee',
                'description'         => 'Employee health insurance contribution — 1% of gross salary',
                'type'                => 'deduction',
                'calculation_type'    => 'percentage',
                'default_amount'      => 0,
                'percentage_of_basic' => 1.00,
                'is_taxable'          => false,
                'is_mandatory'        => true,
            ],
        ];

        foreach ($components as $data) {
            SalaryComponent::firstOrCreate(
                [
                    'name'       => $data['name'],
                    'created_by' => $creator->id,
                ],
                array_merge($data, [
                    'status'     => 'active',
                    'created_by' => $creator->id,
                ])
            );
        }

        $this->command->info('✅ Zambia salary components seeded for user: ' . $creator->email);
    }
}