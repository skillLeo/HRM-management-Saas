<?php

namespace App\Services;

use App\Models\Setting;

class ZambiaPayrollService
{
    protected array $settings;

    public function __construct(int $creatorId)
    {
        // Load all zambia settings for this company once
        $this->settings = Setting::where('user_id', $creatorId)
            ->where('key', 'like', 'zambia_%')
            ->pluck('value', 'key')
            ->toArray();
    }

    // ─── 1. PAYE ────────────────────────────────────────────────────────────

    public function calculatePAYE(float $grossSalary): float
    {
        $slabs = [
            [
                'min'  => (float) ($this->settings['zambia_paye_slab_1_min'] ?? 0),
                'max'  => (float) ($this->settings['zambia_paye_slab_1_max'] ?? 5100),
                'rate' => (float) ($this->settings['zambia_paye_slab_1_rate'] ?? 0) / 100,
            ],
            [
                'min'  => (float) ($this->settings['zambia_paye_slab_2_min'] ?? 5101),
                'max'  => (float) ($this->settings['zambia_paye_slab_2_max'] ?? 7100),
                'rate' => (float) ($this->settings['zambia_paye_slab_2_rate'] ?? 20) / 100,
            ],
            [
                'min'  => (float) ($this->settings['zambia_paye_slab_3_min'] ?? 7101),
                'max'  => (float) ($this->settings['zambia_paye_slab_3_max'] ?? 9200),
                'rate' => (float) ($this->settings['zambia_paye_slab_3_rate'] ?? 30) / 100,
            ],
            [
                'min'  => (float) ($this->settings['zambia_paye_slab_4_min'] ?? 9201),
                'max'  => (float) ($this->settings['zambia_paye_slab_4_max'] ?? 999999999),
                'rate' => (float) ($this->settings['zambia_paye_slab_4_rate'] ?? 37) / 100,
            ],
        ];

        $tax = 0.0;

        foreach ($slabs as $slab) {
            if ($grossSalary <= 0 || $grossSalary < $slab['min']) {
                continue;
            }
            $taxable = min($grossSalary, $slab['max']) - ($slab['min'] - 1);
            if ($taxable > 0) {
                $tax += $taxable * $slab['rate'];
            }
        }

        return round($tax, 2);
    }

    // ─── 2. NAPSA ───────────────────────────────────────────────────────────

    public function calculateNAPSA(float $grossSalary): array
    {
        $employeeRate = (float) ($this->settings['zambia_napsa_employee_rate'] ?? 5) / 100;
        $employerRate = (float) ($this->settings['zambia_napsa_employer_rate'] ?? 5) / 100;
        $cap          = (float) ($this->settings['zambia_napsa_monthly_cap']   ?? 1073.20);

        // Apply cap: if gross exceeds cap ceiling (cap / rate), use cap directly
        $employeeContribution = min($grossSalary * $employeeRate, $cap);
        $employerContribution = min($grossSalary * $employerRate, $cap);

        return [
            'employee' => round($employeeContribution, 2),
            'employer' => round($employerContribution, 2),
        ];
    }

    // ─── 3. NHIMA ───────────────────────────────────────────────────────────

    public function calculateNHIMA(float $grossSalary): array
    {
        $employeeRate = (float) ($this->settings['zambia_nhima_employee_rate'] ?? 1) / 100;
        $employerRate = (float) ($this->settings['zambia_nhima_employer_rate'] ?? 1) / 100;

        return [
            'employee' => round($grossSalary * $employeeRate, 2),
            'employer' => round($grossSalary * $employerRate, 2),
        ];
    }

    // ─── 4. SDL ─────────────────────────────────────────────────────────────

    public function calculateSDL(float $totalPayroll): float
    {
        $rate = (float) ($this->settings['zambia_sdl_rate'] ?? 0.5) / 100;

        return round($totalPayroll * $rate, 2);
    }

    // ─── 5. Full payroll for one employee ───────────────────────────────────

    public function calculateFullPayroll(float $grossPay): array
    {
        $paye  = $this->calculatePAYE($grossPay);
        $napsa = $this->calculateNAPSA($grossPay);
        $nhima = $this->calculateNHIMA($grossPay);

        $totalDeductions = $paye + $napsa['employee'] + $nhima['employee'];
        $netPay          = $grossPay - $totalDeductions;

        return [
            // Employee-facing
            'gross_pay'       => round($grossPay, 2),
            'paye'            => $paye,
            'napsa_employee'  => $napsa['employee'],
            'nhima_employee'  => $nhima['employee'],
            'total_deductions'=> round($totalDeductions, 2),
            'net_pay'         => round($netPay, 2),

            // Employer-facing (not deducted from employee)
            'napsa_employer'  => $napsa['employer'],
            'nhima_employer'  => $nhima['employer'],

            // SDL is calculated at payroll-run level (all employees combined)
            // call calculateSDL(totalPayroll) separately after processing all employees
        ];
    }
}