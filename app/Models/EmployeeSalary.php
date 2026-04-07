<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeSalary extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'basic_salary',
        'components',
        'is_active',
        'calculation_status',
        'notes',
        'created_by'
    ];

    protected $casts = [
        'basic_salary' => 'decimal:2',
        'components' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get the employee.
     */
    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id','id');
    }



    /**
     * Get the user who created the salary.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get active salary for employee.
     */
    public static function getActiveSalary($employeeId)
    {
        return static::where('employee_id', $employeeId)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Get basic salary for employee.
     */
    public static function getBasicSalary($employeeId)
    {
        $salary = static::getActiveSalary($employeeId);
        return $salary ? $salary->basic_salary : 0;
    }

    /**
     * Normalise the stored components value into a consistent structure:
     *   [ ['id' => 1, 'amount' => 300.00], ... ]
     *
     * Supports two legacy formats transparently:
     *   - Old plain-ID array : [1, 2, 3]
     *   - New object array   : [{'id':1,'amount':300}, ...]
     */
    public function getNormalisedComponents(): array
    {
        $raw = $this->components ?? [];

        if (empty($raw)) {
            return [];
        }

        // Already in new format?
        if (is_array($raw[0] ?? null) && isset($raw[0]['id'])) {
            return $raw;
        }

        // Old plain-ID format — convert, amount = null means use component default
        return array_map(fn($id) => ['id' => (int) $id, 'amount' => null], $raw);
    }

    /**
     * Calculate salary components based on selected components.
     *
     * Supports per-employee amount overrides: if an 'amount' key is present
     * and non-null in the stored component record, that value is used instead
     * of the component's default_amount / percentage_of_basic.
     */
    public function calculateAllComponents()
    {
        $normalisedComponents = $this->getNormalisedComponents();
        $componentIds         = array_column($normalisedComponents, 'id');

        $components = SalaryComponent::whereIn('id', $componentIds)
            ->where('status', 'active')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->get()
            ->keyBy('id');

        // Build a quick lookup of custom amounts
        $customAmounts = [];
        foreach ($normalisedComponents as $entry) {
            if (isset($entry['amount']) && $entry['amount'] !== null && $entry['amount'] !== '') {
                $customAmounts[(int) $entry['id']] = (float) $entry['amount'];
            }
        }

        $earnings        = ['Basic Salary' => $this->basic_salary];
        $deductions      = [];
        $totalEarnings   = $this->basic_salary;
        $totalDeductions = 0;

        foreach ($normalisedComponents as $entry) {
            $id        = (int) $entry['id'];
            $component = $components->get($id);

            if (!$component) {
                continue;
            }

            // Use the custom per-employee amount when provided, otherwise fall
            // back to the component's own calculation (percentage or fixed).
            $amount = array_key_exists($id, $customAmounts)
                ? $customAmounts[$id]
                : $component->calculateAmount($this->basic_salary);

            if ($component->type === 'earning') {
                $earnings[$component->name] = $amount;
                $totalEarnings += $amount;
            } else {
                $deductions[$component->name] = $amount;
                $totalDeductions += $amount;
            }
        }

        return [
            'basic_salary'    => $this->basic_salary,
            'earnings'        => $earnings,
            'deductions'      => $deductions,
            'total_earnings'  => $totalEarnings,
            'total_deductions'=> $totalDeductions,
            'gross_salary'    => $totalEarnings,
            'net_salary'      => $totalEarnings - $totalDeductions,
        ];
    }
}
