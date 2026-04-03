<?php

namespace App\Services;

use App\Models\Setting;

class ZambiaPayrollService
{
    protected array $settings;

    public function __construct(int $creatorId)
    {
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

    public function calculateNAPSA(float $grossSalary, bool $exempt = false): array
    {
        // If employee is exempt, return zero contributions
        if ($exempt) {
            return ['employee' => 0.0, 'employer' => 0.0];
        }

        $employeeRate = (float) ($this->settings['zambia_napsa_employee_rate'] ?? 5) / 100;
        $employerRate = (float) ($this->settings['zambia_napsa_employer_rate'] ?? 5) / 100;
        $cap          = (float) ($this->settings['zambia_napsa_monthly_cap']   ?? 1073.20);

        $employeeContribution = min($grossSalary * $employeeRate, $cap);
        $employerContribution = min($grossSalary * $employerRate, $cap);

        return [
            'employee' => round($employeeContribution, 2),
            'employer' => round($employerContribution, 2),
        ];
    }

    // ─── 3. NHIMA ───────────────────────────────────────────────────────────
    // FIX: NHIMA must be calculated on BASIC SALARY only, not gross pay

    public function calculateNHIMA(float $basicSalary, bool $exempt = false): array
    {
        // If employee is exempt, return zero contributions
        if ($exempt) {
            return ['employee' => 0.0, 'employer' => 0.0];
        }

        $employeeRate = (float) ($this->settings['zambia_nhima_employee_rate'] ?? 1) / 100;
        $employerRate = (float) ($this->settings['zambia_nhima_employer_rate'] ?? 1) / 100;

        return [
            'employee' => round($basicSalary * $employeeRate, 2),
            'employer' => round($basicSalary * $employerRate, 2),
        ];
    }

    // ─── 4. SDL ─────────────────────────────────────────────────────────────

    public function calculateSDL(float $totalPayroll, bool $exempt = false): float
    {
        if ($exempt) {
            return 0.0;
        }

        $rate = (float) ($this->settings['zambia_sdl_rate'] ?? 0.5) / 100;

        return round($totalPayroll * $rate, 2);
    }

    // ─── 5. Full payroll for one employee ───────────────────────────────────
    // Now accepts basicSalary separately for NHIMA fix
    // And exemption flags for NAPSA/NHIMA

    public function calculateFullPayroll(
        float $grossPay,
        float $basicSalary = 0,
        bool $exemptNapsa = false,
        bool $exemptNhima = false
    ): array {
        $paye  = $this->calculatePAYE($grossPay);
        $napsa = $this->calculateNAPSA($grossPay, $exemptNapsa);

        // ── NHIMA fix: use basicSalary, fallback to grossPay if not provided ──
        $nhimaBase = $basicSalary > 0 ? $basicSalary : $grossPay;
        $nhima     = $this->calculateNHIMA($nhimaBase, $exemptNhima);

        $totalDeductions = $paye + $napsa['employee'] + $nhima['employee'];
        $netPay          = $grossPay - $totalDeductions;

        return [
            'gross_pay'        => round($grossPay, 2),
            'paye'             => $paye,
            'napsa_employee'   => $napsa['employee'],
            'nhima_employee'   => $nhima['employee'],
            'total_deductions' => round($totalDeductions, 2),
            'net_pay'          => round($netPay, 2),
            'napsa_employer'   => $napsa['employer'],
            'nhima_employer'   => $nhima['employer'],
        ];
    }
}