<?php

namespace App\Models;

use App\Services\ZambiaPayrollService;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PayrollRun extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'title',
        'payroll_frequency',
        'pay_period_start',
        'pay_period_end',
        'pay_date',
        'total_gross_pay',
        'total_deductions',
        'total_net_pay',
        'employee_count',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'pay_period_start' => 'date',
        'pay_period_end'   => 'date',
        'pay_date'         => 'date',
        'total_gross_pay'  => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'total_net_pay'    => 'decimal:2',
    ];

    // ─── Relationships ───────────────────────────────────────────────────────

    public function payrollEntries()
    {
        return $this->hasMany(PayrollEntry::class);
    }

    public function payslips()
    {
        return $this->hasManyThrough(Payslip::class, PayrollEntry::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ─── Totals ──────────────────────────────────────────────────────────────

    public function calculateTotals()
    {
        $entries = $this->payrollEntries;

        $this->total_gross_pay  = $entries->sum('gross_pay');
        $this->total_deductions = $entries->sum('total_deductions');
        $this->total_net_pay    = $entries->sum('net_pay');
        $this->employee_count   = $entries->count();

        $this->save();
    }

    // ─── Process Payroll ─────────────────────────────────────────────────────

    public function processPayroll()
    {
        if ($this->status !== 'draft') {
            return false;
        }

        $this->status = 'draft';
        $this->save();

        try {
            // Boot Zambia service once for this company
            $zambiaService = new ZambiaPayrollService($this->created_by);

            $employees = User::with('employee')
                ->where('type', 'employee')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->whereHas('employee', function ($q) {
                    $q->whereIn('employee_status', ['active', 'probation']);
                })
                ->orderBy('id', 'desc')
                ->get();

            foreach ($employees as $employee) {
                $this->processEmployeePayroll($employee, $zambiaService);
            }

            // SDL is calculated on total payroll after all entries are created
            $this->applySDL($zambiaService);

            $this->calculateTotals();
            $this->status = 'completed';
            $this->save();

            return true;
        } catch (\Exception $e) {
            $this->status = 'draft';
            $this->save();
            throw $e;
        }
    }

    // ─── Process Single Employee ─────────────────────────────────────────────

    private function processEmployeePayroll($employee, ZambiaPayrollService $zambiaService)
    {
        $existingEntry = PayrollEntry::where('payroll_run_id', $this->id)
            ->where('employee_id', $employee->id)
            ->exists();

        if ($existingEntry) {
            return;
        }

        $globalSettings      = settings();
        $workingDaysIndices  = json_decode($globalSettings['working_days'] ?? '[]', true);

        if (empty($workingDaysIndices)) {
            throw new \Exception(__('Please configure working days first.'));
        }

        $employeeSalary = EmployeeSalary::getActiveSalary($employee->id);
        if (! $employeeSalary) {
            return;
        }

        $salaryBreakdown = $employeeSalary->calculateAllComponents();

        // Attendance
        $attendanceRecords = AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('date', [$this->pay_period_start, $this->pay_period_end])
            ->orderBy('date')
            ->get();

        // Working days in period
        $startDate       = new \DateTime($this->pay_period_start);
        $endDate         = new \DateTime($this->pay_period_end);
        $totalWorkingDays = 0;

        for ($date = clone $startDate; $date <= $endDate; $date->modify('+1 day')) {
            if (in_array((int) $date->format('w'), $workingDaysIndices)) {
                $totalWorkingDays++;
            }
        }

        $presentDays    = $attendanceRecords->whereIn('status', ['present', 'holiday'])->count();
        $halfDays       = $attendanceRecords->where('status', 'half_day')->count();
        $absentDays     = $attendanceRecords->where('status', 'absent')->count();
        $holidayDays    = $attendanceRecords->where('status', 'holiday')->count();
        $overtimeHours  = $attendanceRecords->sum('overtime_hours');
        $overtimeAmount = $attendanceRecords->sum('overtime_amount');

        $leaveData          = $this->getEmployeeLeaveData($employee->id);
        $unpaidLeaveDays    = $leaveData['unpaid_leave_days'] + $absentDays + ($halfDays * 0.5);
        $perDaySalary       = $totalWorkingDays > 0 ? $employeeSalary->basic_salary / $totalWorkingDays : 0;
        $unpaidLeaveDeduction = $perDaySalary * $unpaidLeaveDays;

        // Gross pay (before Zambia deductions)
        $totalEarnings  = $salaryBreakdown['total_earnings'];
        $grossPay       = $totalEarnings - $unpaidLeaveDeduction + $overtimeAmount;

        // ── Zambia Calculations ──────────────────────────────────────────────
        $zambia = $zambiaService->calculateFullPayroll($grossPay);

        $totalDeductions = $zambia['total_deductions'];
        $netPay          = $zambia['net_pay'];
        $componentEarnings = $totalEarnings - $employeeSalary->basic_salary;

        // Build deductions breakdown — merge existing components + Zambia items
        $deductionsBreakdown = array_merge(
            $salaryBreakdown['deductions'] ?? [],
            [
                [
                    'name'   => 'PAYE Tax',
                    'amount' => $zambia['paye'],
                    'type'   => 'zambia_paye',
                ],
                [
                    'name'   => 'NAPSA Employee',
                    'amount' => $zambia['napsa_employee'],
                    'type'   => 'zambia_napsa_employee',
                ],
                [
                    'name'   => 'NHIMA Employee',
                    'amount' => $zambia['nhima_employee'],
                    'type'   => 'zambia_nhima_employee',
                ],
            ]
        );

        // Store employer shares in earnings_breakdown (not deducted from employee)
        $earningsBreakdown = array_merge(
            $salaryBreakdown['earnings'] ?? [],
            [
                [
                    'name'   => 'NAPSA Employer',
                    'amount' => $zambia['napsa_employer'],
                    'type'   => 'zambia_napsa_employer',
                ],
                [
                    'name'   => 'NHIMA Employer',
                    'amount' => $zambia['nhima_employer'],
                    'type'   => 'zambia_nhima_employer',
                ],
            ]
        );

        PayrollEntry::create([
            'payroll_run_id'        => $this->id,
            'employee_id'           => $employee->id,
            'basic_salary'          => $employeeSalary->basic_salary,
            'component_earnings'    => $componentEarnings,
            'total_earnings'        => $totalEarnings,
            'total_deductions'      => $totalDeductions,
            'gross_pay'             => $grossPay,
            'net_pay'               => $netPay,
            'working_days'          => $totalWorkingDays,
            'present_days'          => $presentDays,
            'half_days'             => $halfDays,
            'holiday_days'          => $holidayDays,
            'paid_leave_days'       => $leaveData['paid_leave_days'],
            'unpaid_leave_days'     => $unpaidLeaveDays,
            'absent_days'           => $absentDays,
            'overtime_hours'        => $overtimeHours,
            'overtime_amount'       => $overtimeAmount,
            'per_day_salary'        => $perDaySalary,
            'unpaid_leave_deduction'=> $unpaidLeaveDeduction,
            'earnings_breakdown'    => $earningsBreakdown,
            'deductions_breakdown'  => $deductionsBreakdown,
            'created_by'            => $this->created_by,
        ]);
    }

    // ─── SDL (applied after all entries exist) ───────────────────────────────

    private function applySDL(ZambiaPayrollService $zambiaService)
    {
        $totalGross = $this->payrollEntries()->sum('gross_pay');

        if ($totalGross <= 0) {
            return;
        }

        $sdlAmount     = $zambiaService->calculateSDL($totalGross);
        $employeeCount = $this->payrollEntries()->count();

        if ($employeeCount === 0) {
            return;
        }

        // Distribute SDL evenly across all entries (stored for reporting)
        $sdlPerEmployee = round($sdlAmount / $employeeCount, 2);

        foreach ($this->payrollEntries as $entry) {
            $breakdown   = $entry->earnings_breakdown ?? [];
            $breakdown[] = [
                'name'   => 'SDL (Employer)',
                'amount' => $sdlPerEmployee,
                'type'   => 'zambia_sdl',
            ];
            $entry->earnings_breakdown = $breakdown;
            $entry->save();
        }
    }

    // ─── Leave Data ──────────────────────────────────────────────────────────

    private function getEmployeeLeaveData($employeeId)
    {
        $leaveApplications = \App\Models\LeaveApplication::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where(function ($query) {
                $query->whereBetween('start_date', [$this->pay_period_start, $this->pay_period_end])
                    ->orWhereBetween('end_date', [$this->pay_period_start, $this->pay_period_end])
                    ->orWhere(function ($q) {
                        $q->where('start_date', '<=', $this->pay_period_start)
                            ->where('end_date', '>=', $this->pay_period_end);
                    });
            })
            ->with('leaveType')
            ->get();

        $paidLeaveDays   = 0;
        $unpaidLeaveDays = 0;

        foreach ($leaveApplications as $leave) {
            $leaveStart = max($leave->start_date, $this->pay_period_start);
            $leaveEnd   = min($leave->end_date, $this->pay_period_end);
            $leaveDays  = $leaveStart->diffInDays($leaveEnd) + 1;

            if ($leave->leaveType->is_paid) {
                $paidLeaveDays += $leaveDays;
            } else {
                $unpaidLeaveDays += $leaveDays;
            }
        }

        return [
            'paid_leave_days'   => $paidLeaveDays,
            'unpaid_leave_days' => $unpaidLeaveDays,
        ];
    }
}