<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\PayrollEntry;
use App\Models\PayrollRun;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ZambiaReportController extends Controller
{
    // ─── Index Page ──────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        if (! Auth::user()->can('manage-payroll-runs')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $payrollRuns = PayrollRun::whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('status', ['completed', 'pending_approval', 'final'])
            ->orderBy('pay_period_start', 'desc')
            ->get(['id', 'title', 'pay_period_start', 'pay_period_end', 'pay_date', 'status']);

        $branches     = Branch::whereIn('created_by', getCompanyAndUsersId())->get(['id', 'name']);
        $departments  = Department::whereIn('created_by', getCompanyAndUsersId())->get(['id', 'name']);
        $designations = Designation::whereIn('created_by', getCompanyAndUsersId())->get(['id', 'name']);

        return Inertia::render('hr/zambia-reports/index', [
            'payrollRuns'  => $payrollRuns,
            'branches'     => $branches,
            'departments'  => $departments,
            'designations' => $designations,
        ]);
    }

    // ─── Report 1 — PAYE P11 (for ZRA) ──────────────────────────────────────

    public function payeP11(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getFilteredEntries($request->payroll_run_id, $request);
        $format  = $request->input('format', 'csv');

        $rows = $entries->map(fn($e) => [
            $e->employee?->name ?? $e->employee_name ?? 'Unknown',
            $e->employee?->employee?->tpin ?? 'N/A',
            number_format($e->basic_salary, 2, '.', ''),
            number_format($e->gross_pay, 2, '.', ''),
            number_format($this->getDeductionAmount($e, 'zambia_paye'), 2, '.', ''),
        ])->toArray();

        $totals = [
            'TOTALS', '',
            number_format($entries->sum('basic_salary'), 2, '.', ''),
            number_format($entries->sum('gross_pay'), 2, '.', ''),
            number_format($entries->sum(fn($e) => $this->getDeductionAmount($e, 'zambia_paye')), 2, '.', ''),
        ];

        $sections = [
            ['type' => 'title', 'content' => 'PAYE P11 Report — ' . $run->pay_period_start->format('F Y')],
            ['type' => 'info', 'rows' => [
                ['Pay Period', $run->pay_period_start->format('d M Y') . ' – ' . $run->pay_period_end->format('d M Y')],
                ['Pay Date', $run->pay_date->format('d M Y')],
                ['Total Employees', $entries->count()],
            ]],
            ['type' => 'blank'],
            ['type' => 'table',
                'headers' => ['Employee Name', 'TPIN', 'Basic Salary (ZMW)', 'Gross Pay (ZMW)', 'PAYE Deducted (ZMW)'],
                'rows'    => $rows,
                'totals'  => $totals,
            ],
        ];

        return $this->exportSections($format, 'PAYE_P11_' . $run->pay_period_start->format('M_Y'), $sections);
    }

    // ─── Report 2 — NAPSA Schedule ───────────────────────────────────────────

    public function napsaSchedule(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getFilteredEntries($request->payroll_run_id, $request);
        $format  = $request->input('format', 'csv');

        $rows = $entries->map(function ($e) {
            $empCont = $this->getDeductionAmount($e, 'zambia_napsa_employee');
            $emrCont = $this->getEarningAmount($e, 'zambia_napsa_employer');
            return [
                $e->employee?->name ?? $e->employee_name ?? 'Unknown',
                $e->employee?->employee?->napsa_number ?? 'N/A',
                number_format($e->gross_pay, 2, '.', ''),
                number_format($empCont, 2, '.', ''),
                number_format($emrCont, 2, '.', ''),
                number_format($empCont + $emrCont, 2, '.', ''),
            ];
        })->toArray();

        $totalEmp = $entries->sum(fn($e) => $this->getDeductionAmount($e, 'zambia_napsa_employee'));
        $totalEmr = $entries->sum(fn($e) => $this->getEarningAmount($e, 'zambia_napsa_employer'));

        $sections = [
            ['type' => 'title', 'content' => 'NAPSA Schedule — ' . $run->pay_period_start->format('F Y')],
            ['type' => 'info', 'rows' => [
                ['Pay Period', $run->pay_period_start->format('d M Y') . ' – ' . $run->pay_period_end->format('d M Y')],
                ['Pay Date', $run->pay_date->format('d M Y')],
                ['Total Employees', $entries->count()],
            ]],
            ['type' => 'blank'],
            ['type' => 'table',
                'headers' => ['Employee Name', 'NAPSA Number', 'Gross Pay (ZMW)', 'Employee Contribution (ZMW)', 'Employer Contribution (ZMW)', 'Total (ZMW)'],
                'rows'    => $rows,
                'totals'  => ['TOTALS', '', number_format($entries->sum('gross_pay'), 2, '.', ''), number_format($totalEmp, 2, '.', ''), number_format($totalEmr, 2, '.', ''), number_format($totalEmp + $totalEmr, 2, '.', '')],
            ],
        ];

        return $this->exportSections($format, 'NAPSA_Schedule_' . $run->pay_period_start->format('M_Y'), $sections);
    }

    // ─── Report 3 — NHIMA Report ─────────────────────────────────────────────

    public function nhimaReport(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getFilteredEntries($request->payroll_run_id, $request);
        $format  = $request->input('format', 'csv');

        $rows = $entries->map(function ($e) {
            $empCont = $this->getDeductionAmount($e, 'zambia_nhima_employee');
            $emrCont = $this->getEarningAmount($e, 'zambia_nhima_employer');
            return [
                $e->employee?->name ?? $e->employee_name ?? 'Unknown',
                $e->employee?->employee?->nhima_number ?? 'N/A',
                number_format($e->gross_pay, 2, '.', ''),
                number_format($empCont, 2, '.', ''),
                number_format($emrCont, 2, '.', ''),
                number_format($empCont + $emrCont, 2, '.', ''),
            ];
        })->toArray();

        $totalEmp = $entries->sum(fn($e) => $this->getDeductionAmount($e, 'zambia_nhima_employee'));
        $totalEmr = $entries->sum(fn($e) => $this->getEarningAmount($e, 'zambia_nhima_employer'));

        $sections = [
            ['type' => 'title', 'content' => 'NHIMA Report — ' . $run->pay_period_start->format('F Y')],
            ['type' => 'info', 'rows' => [
                ['Pay Period', $run->pay_period_start->format('d M Y') . ' – ' . $run->pay_period_end->format('d M Y')],
                ['Pay Date', $run->pay_date->format('d M Y')],
                ['Total Employees', $entries->count()],
            ]],
            ['type' => 'blank'],
            ['type' => 'table',
                'headers' => ['Employee Name', 'NHIMA Number', 'Gross Pay (ZMW)', 'Employee Contribution (ZMW)', 'Employer Contribution (ZMW)', 'Total (ZMW)'],
                'rows'    => $rows,
                'totals'  => ['TOTALS', '', number_format($entries->sum('gross_pay'), 2, '.', ''), number_format($totalEmp, 2, '.', ''), number_format($totalEmr, 2, '.', ''), number_format($totalEmp + $totalEmr, 2, '.', '')],
            ],
        ];

        return $this->exportSections($format, 'NHIMA_Report_' . $run->pay_period_start->format('M_Y'), $sections);
    }

    // ─── Report 4 — Bank Payment Schedule ───────────────────────────────────

    public function bankSchedule(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getFilteredEntries($request->payroll_run_id, $request);
        $format  = $request->input('format', 'csv');

        $rows = $entries->map(function ($e) {
            $emp  = $e->employee?->employee ?? null;
            $name = $e->employee?->name ?? $e->employee_name ?? 'Unknown';
            return [
                $name,
                $emp->bank_name ?? 'N/A',
                $emp->account_holder_name ?? $name,
                $emp->account_number ?? 'N/A',
                $emp->bank_identifier_code ?? 'N/A',
                number_format($e->net_pay, 2, '.', ''),
            ];
        })->toArray();

        $sections = [
            ['type' => 'title', 'content' => 'Bank Payment Schedule — ' . $run->pay_period_start->format('F Y')],
            ['type' => 'info', 'rows' => [
                ['Pay Period', $run->pay_period_start->format('d M Y') . ' – ' . $run->pay_period_end->format('d M Y')],
                ['Pay Date', $run->pay_date->format('d M Y')],
                ['Total Employees', $entries->count()],
            ]],
            ['type' => 'blank'],
            ['type' => 'table',
                'headers' => ['Employee Name', 'Bank Name', 'Account Holder', 'Account Number', 'BIC/SWIFT', 'Net Pay (ZMW)'],
                'rows'    => $rows,
                'totals'  => ['TOTALS', '', '', '', '', number_format($entries->sum('net_pay'), 2, '.', '')],
            ],
        ];

        return $this->exportSections($format, 'Bank_Payment_Schedule_' . $run->pay_period_start->format('M_Y'), $sections);
    }

    // ─── Report 5 — Payroll Summary ──────────────────────────────────────────

    public function payrollSummary(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getFilteredEntries($request->payroll_run_id, $request);
        $format  = $request->input('format', 'csv');

        $totalGross      = $entries->sum('gross_pay');
        $totalPaye       = $entries->sum(fn($e) => $this->getDeductionAmount($e, 'zambia_paye'));
        $totalNapsaEmp   = $entries->sum(fn($e) => $this->getDeductionAmount($e, 'zambia_napsa_employee'));
        $totalNapsaEmr   = $entries->sum(fn($e) => $this->getEarningAmount($e, 'zambia_napsa_employer'));
        $totalNhimaEmp   = $entries->sum(fn($e) => $this->getDeductionAmount($e, 'zambia_nhima_employee'));
        $totalNhimaEmr   = $entries->sum(fn($e) => $this->getEarningAmount($e, 'zambia_nhima_employer'));
        $totalSdl        = $entries->sum(fn($e) => $this->getEarningAmount($e, 'zambia_sdl'));
        $totalDeductions = $entries->sum('total_deductions');
        $totalNet        = $entries->sum('net_pay');
        $totalEmpCost    = $totalNet + $totalNapsaEmr + $totalNhimaEmr + $totalSdl;

        $fmt = fn($v) => number_format($v, 2, '.', '');

        $sections = [
            ['type' => 'title', 'content' => 'Payroll Summary — ' . $run->pay_period_start->format('F Y')],
            ['type' => 'info', 'rows' => [
                ['Pay Period', $run->pay_period_start->format('d M Y') . ' – ' . $run->pay_period_end->format('d M Y')],
                ['Pay Date', $run->pay_date->format('d M Y')],
                ['Total Employees', $entries->count()],
            ]],
            ['type' => 'blank'],
            ['type' => 'table',
                'title'   => 'Payroll Totals',
                'headers' => ['Description', 'Amount (ZMW)'],
                'rows'    => [
                    ['Total Gross Pay',         $fmt($totalGross)],
                    ['Total PAYE Tax',           $fmt($totalPaye)],
                    ['Total NAPSA (Employee)',   $fmt($totalNapsaEmp)],
                    ['Total NHIMA (Employee)',   $fmt($totalNhimaEmp)],
                    ['Total Deductions',         $fmt($totalDeductions)],
                    ['Total Net Pay',            $fmt($totalNet)],
                ],
            ],
            ['type' => 'blank'],
            ['type' => 'table',
                'title'   => 'Employer Contributions',
                'headers' => ['Description', 'Amount (ZMW)'],
                'rows'    => [
                    ['Total NAPSA (Employer)',  $fmt($totalNapsaEmr)],
                    ['Total NHIMA (Employer)',  $fmt($totalNhimaEmr)],
                    ['Total SDL',               $fmt($totalSdl)],
                    ['Total Employer Cost',     $fmt($totalEmpCost)],
                ],
            ],
        ];

        return $this->exportSections($format, 'Payroll_Summary_' . $run->pay_period_start->format('M_Y'), $sections);
    }

    // ─── Report 6 — Employee List Report ────────────────────────────────────

    public function employeeList(Request $request)
    {
        if (! Auth::user()->can('manage-employees')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $format = $request->input('format', 'csv');

        $query = Employee::with(['user', 'branch', 'department', 'designation'])
            ->whereIn('created_by', getCompanyAndUsersId());

        if ($branchId = $request->input('branch_id')) {
            $query->where('branch_id', $branchId);
        }
        if ($deptId = $request->input('department_id')) {
            $query->where('department_id', $deptId);
        }
        if ($desigId = $request->input('designation_id')) {
            $query->where('designation_id', $desigId);
        }

        $employees = $query->orderBy('id')->get();

        $rows = $employees->map(function ($emp) {
            $idDoc    = $emp->nrc ?? $emp->passport_no ?? 'N/A';
            $fullName = trim(($emp->first_name ?? '') . ' ' . ($emp->middle_name ? $emp->middle_name . ' ' : '') . ($emp->last_name ?? ''))
                ?: ($emp->user->name ?? 'Unknown');
            return [
                $emp->employee_id,
                $fullName,
                $emp->date_of_joining ?? 'N/A',
                $emp->branch->name ?? 'N/A',
                $emp->department->name ?? 'N/A',
                $emp->designation->name ?? 'N/A',
                ucfirst($emp->employee_status ?? 'active'),
                $emp->tpin ?? 'N/A',
                $emp->napsa_number ?? 'N/A',
                $emp->nhima_number ?? 'N/A',
                $idDoc,
                $emp->nationality ?? 'N/A',
                $emp->user->email ?? 'N/A',
            ];
        })->toArray();

        $sections = [
            ['type' => 'title', 'content' => 'Employee List Report — ' . now()->format('d M Y')],
            ['type' => 'info', 'rows' => [['Total Employees', $employees->count()]]],
            ['type' => 'blank'],
            ['type' => 'table',
                'headers' => ['Employee ID', 'Full Name', 'Date of Joining', 'Branch', 'Department', 'Designation', 'Status', 'TPIN', 'NAPSA No', 'NHIMA No', 'NRC / Passport No', 'Nationality', 'Email'],
                'rows'    => $rows,
            ],
        ];

        return $this->exportSections($format, 'Employee_List_' . now()->format('d_M_Y'), $sections);
    }

    // ─── Report 7 — Employee Status Report ───────────────────────────────────

    public function employeeStatus(Request $request)
    {
        if (! Auth::user()->can('manage-employees')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $format = $request->input('format', 'csv');
        $status = $request->input('status', 'all');

        $query = Employee::with(['user', 'branch', 'department', 'designation'])
            ->whereIn('created_by', getCompanyAndUsersId());

        if ($status !== 'all') {
            $query->where('employee_status', $status);
        }
        if ($branchId = $request->input('branch_id')) {
            $query->where('branch_id', $branchId);
        }
        if ($deptId = $request->input('department_id')) {
            $query->where('department_id', $deptId);
        }

        $employees  = $query->orderBy('employee_status')->orderBy('id')->get();
        $label      = $status === 'all' ? 'All Statuses' : ucfirst($status);

        $rows = $employees->map(fn($emp) => [
            $emp->employee_id,
            trim(($emp->first_name ?? '') . ' ' . ($emp->last_name ?? '')) ?: ($emp->user->name ?? 'Unknown'),
            ucfirst($emp->employee_status ?? 'active'),
            $emp->date_of_joining ?? 'N/A',
            $emp->branch->name ?? 'N/A',
            $emp->department->name ?? 'N/A',
            $emp->tpin ?? 'N/A',
            $emp->user->email ?? 'N/A',
        ])->toArray();

        $sections = [
            ['type' => 'title', 'content' => 'Employee Status Report — ' . $label . ' — ' . now()->format('d M Y')],
            ['type' => 'info', 'rows' => [['Total Employees', $employees->count()], ['Status Filter', $label]]],
            ['type' => 'blank'],
            ['type' => 'table',
                'headers' => ['Employee ID', 'Full Name', 'Status', 'Date of Joining', 'Branch', 'Department', 'TPIN', 'Email'],
                'rows'    => $rows,
            ],
        ];

        $fileLabel = $status === 'all' ? 'All_Statuses' : ucfirst($status);
        return $this->exportSections($format, 'Employee_Status_' . $fileLabel . '_' . now()->format('d_M_Y'), $sections);
    }

    // ─── Report 7b — Employee Payroll Entries Report ─────────────────────────

    public function payrollEntries(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getFilteredEntries($request->payroll_run_id, $request);
        $format  = $request->input('format', 'csv');

        // Collect all unique non-statutory earning component names across all entries
        $earningCompNames = collect();
        $statutoryEarningTypes = ['basic_salary', 'zambia_napsa_employer', 'zambia_nhima_employer', 'zambia_sdl'];
        foreach ($entries as $e) {
            foreach ($e->earnings_breakdown ?? [] as $item) {
                if (is_array($item) && !in_array($item['type'] ?? '', $statutoryEarningTypes)) {
                    $earningCompNames->push($item['name'] ?? 'Unknown');
                }
            }
        }
        $earningCompNames = $earningCompNames->unique()->values()->toArray();

        $rows = $entries->map(function ($e) use ($earningCompNames) {
            $emp = $e->employee?->employee ?? null;
            $row = [
                $e->employee?->name ?? $e->employee_name ?? 'Unknown',
                $emp->tpin ?? 'N/A',
                $emp->employee_id ?? 'N/A',
                number_format($e->basic_salary, 2, '.', ''),
            ];

            // One column per earning component
            foreach ($earningCompNames as $compName) {
                $amount = 0.0;
                foreach ($e->earnings_breakdown ?? [] as $item) {
                    if (is_array($item) && ($item['name'] ?? '') === $compName) {
                        $amount = (float) $item['amount'];
                        break;
                    }
                }
                $row[] = number_format($amount, 2, '.', '');
            }

            $row[] = number_format($e->gross_pay, 2, '.', '');
            $row[] = number_format($e->total_deductions, 2, '.', '');
            $row[] = number_format($e->net_pay, 2, '.', '');
            $row[] = $e->working_days ?? 'N/A';
            $row[] = $e->present_days ?? 'N/A';
            $row[] = $e->absent_days ?? 'N/A';
            $row[] = number_format($e->unpaid_leave_deduction ?? 0, 2, '.', '');
            $row[] = number_format($e->overtime_amount ?? 0, 2, '.', '');

            return $row;
        })->toArray();

        $totalsRow = ['TOTALS', '', ''];
        $totalsRow[] = number_format($entries->sum('basic_salary'), 2, '.', '');
        foreach ($earningCompNames as $compName) {
            $totalsRow[] = number_format($entries->sum(function ($e) use ($compName) {
                foreach ($e->earnings_breakdown ?? [] as $item) {
                    if (is_array($item) && ($item['name'] ?? '') === $compName) {
                        return (float) $item['amount'];
                    }
                }
                return 0.0;
            }), 2, '.', '');
        }
        $totalsRow[] = number_format($entries->sum('gross_pay'), 2, '.', '');
        $totalsRow[] = number_format($entries->sum('total_deductions'), 2, '.', '');
        $totalsRow[] = number_format($entries->sum('net_pay'), 2, '.', '');

        $headers = ['Employee Name', 'TPIN', 'Employee ID', 'Basic Salary'];
        foreach ($earningCompNames as $name) {
            $headers[] = $name;
        }
        $headers = array_merge($headers, ['Gross Pay', 'Total Deductions', 'Net Pay', 'Working Days', 'Present Days', 'Absent Days', 'Unpaid Leave Deduction', 'Overtime Amount']);

        $sections = [
            ['type' => 'title', 'content' => 'Employee Payroll Entries — ' . $run->pay_period_start->format('F Y')],
            ['type' => 'info', 'rows' => [
                ['Pay Period', $run->pay_period_start->format('d M Y') . ' – ' . $run->pay_period_end->format('d M Y')],
                ['Pay Date', $run->pay_date->format('d M Y')],
                ['Total Employees', $entries->count()],
            ]],
            ['type' => 'blank'],
            ['type' => 'table',
                'headers' => $headers,
                'rows'    => $rows,
                'totals'  => $totalsRow,
            ],
        ];

        return $this->exportSections($format, 'Payroll_Entries_' . $run->pay_period_start->format('M_Y'), $sections);
    }

    // ─── Report 8 — Payroll Run Detailed Report ───────────────────────────────

    public function payrollDetailed(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getFilteredEntries($request->payroll_run_id, $request);
        $format  = $request->input('format', 'csv');

        // Statutory types to exclude from dynamic columns
        $statutoryEarningTypes   = ['basic_salary', 'zambia_napsa_employer', 'zambia_nhima_employer', 'zambia_sdl'];
        $statutoryDeductionTypes = ['zambia_paye', 'zambia_napsa_employee', 'zambia_nhima_employee'];

        // Collect all unique non-statutory component names across all entries
        $earningCompNames   = collect();
        $deductionCompNames = collect();
        foreach ($entries as $e) {
            foreach ($e->earnings_breakdown ?? [] as $item) {
                if (is_array($item) && !in_array($item['type'] ?? '', $statutoryEarningTypes)) {
                    $earningCompNames->push($item['name'] ?? 'Unknown');
                }
            }
            foreach ($e->deductions_breakdown ?? [] as $item) {
                if (is_array($item) && !in_array($item['type'] ?? '', $statutoryDeductionTypes)) {
                    $deductionCompNames->push($item['name'] ?? 'Unknown');
                }
            }
        }
        $earningCompNames   = $earningCompNames->unique()->values()->toArray();
        $deductionCompNames = $deductionCompNames->unique()->values()->toArray();

        $rows = $entries->map(function ($e) use ($earningCompNames, $deductionCompNames) {
            $emp      = $e->employee?->employee ?? null;
            $paye     = $this->getDeductionAmount($e, 'zambia_paye');
            $napsaEmp = $this->getDeductionAmount($e, 'zambia_napsa_employee');
            $nhimaEmp = $this->getDeductionAmount($e, 'zambia_nhima_employee');
            $napsaEmr = $this->getEarningAmount($e, 'zambia_napsa_employer');
            $nhimaEmr = $this->getEarningAmount($e, 'zambia_nhima_employer');
            $sdl      = $this->getEarningAmount($e, 'zambia_sdl');

            $row = [
                $e->employee?->name ?? $e->employee_name ?? 'Unknown',
                $emp->tpin ?? 'N/A',
                number_format($e->basic_salary, 2, '.', ''),
            ];

            // One column per non-statutory earning component
            foreach ($earningCompNames as $compName) {
                $amount = 0.0;
                foreach ($e->earnings_breakdown ?? [] as $item) {
                    if (is_array($item) && ($item['name'] ?? '') === $compName) {
                        $amount = (float) $item['amount'];
                        break;
                    }
                }
                $row[] = number_format($amount, 2, '.', '');
            }

            $row[] = number_format($e->gross_pay, 2, '.', '');
            $row[] = number_format($paye, 2, '.', '');
            $row[] = number_format($napsaEmp, 2, '.', '');
            $row[] = number_format($nhimaEmp, 2, '.', '');

            // One column per non-statutory deduction component
            foreach ($deductionCompNames as $compName) {
                $amount = 0.0;
                foreach ($e->deductions_breakdown ?? [] as $item) {
                    if (is_array($item) && ($item['name'] ?? '') === $compName) {
                        $amount = (float) $item['amount'];
                        break;
                    }
                }
                $row[] = number_format($amount, 2, '.', '');
            }

            $row[] = number_format($e->total_deductions, 2, '.', '');
            $row[] = number_format($e->net_pay, 2, '.', '');
            $row[] = number_format($napsaEmr, 2, '.', '');
            $row[] = number_format($nhimaEmr, 2, '.', '');
            $row[] = number_format($sdl, 2, '.', '');

            return $row;
        })->toArray();

        // Build totals row
        $totalsRow = ['TOTALS', '', number_format($entries->sum('basic_salary'), 2, '.', '')];
        foreach ($earningCompNames as $compName) {
            $totalsRow[] = number_format($entries->sum(function ($e) use ($compName) {
                foreach ($e->earnings_breakdown ?? [] as $item) {
                    if (is_array($item) && ($item['name'] ?? '') === $compName) {
                        return (float) $item['amount'];
                    }
                }
                return 0.0;
            }), 2, '.', '');
        }
        $totalsRow[] = number_format($entries->sum('gross_pay'), 2, '.', '');
        $totalsRow[] = number_format($entries->sum(fn($e) => $this->getDeductionAmount($e, 'zambia_paye')), 2, '.', '');
        $totalsRow[] = number_format($entries->sum(fn($e) => $this->getDeductionAmount($e, 'zambia_napsa_employee')), 2, '.', '');
        $totalsRow[] = number_format($entries->sum(fn($e) => $this->getDeductionAmount($e, 'zambia_nhima_employee')), 2, '.', '');
        foreach ($deductionCompNames as $compName) {
            $totalsRow[] = number_format($entries->sum(function ($e) use ($compName) {
                foreach ($e->deductions_breakdown ?? [] as $item) {
                    if (is_array($item) && ($item['name'] ?? '') === $compName) {
                        return (float) $item['amount'];
                    }
                }
                return 0.0;
            }), 2, '.', '');
        }
        $totalsRow[] = number_format($entries->sum('total_deductions'), 2, '.', '');
        $totalsRow[] = number_format($entries->sum('net_pay'), 2, '.', '');
        $totalsRow[] = number_format($entries->sum(fn($e) => $this->getEarningAmount($e, 'zambia_napsa_employer')), 2, '.', '');
        $totalsRow[] = number_format($entries->sum(fn($e) => $this->getEarningAmount($e, 'zambia_nhima_employer')), 2, '.', '');
        $totalsRow[] = number_format($entries->sum(fn($e) => $this->getEarningAmount($e, 'zambia_sdl')), 2, '.', '');

        // Build headers dynamically
        $headers = ['Employee Name', 'TPIN', 'Basic Salary'];
        foreach ($earningCompNames as $name) {
            $headers[] = $name;
        }
        $headers[] = 'Gross Pay';
        $headers[] = 'PAYE';
        $headers[] = 'NAPSA (Emp)';
        $headers[] = 'NHIMA (Emp)';
        foreach ($deductionCompNames as $name) {
            $headers[] = $name;
        }
        $headers[] = 'Total Deductions';
        $headers[] = 'Net Pay';
        $headers[] = 'NAPSA (Emr)';
        $headers[] = 'NHIMA (Emr)';
        $headers[] = 'SDL';

        $sections = [
            ['type' => 'title', 'content' => 'Payroll Detailed Report — ' . $run->pay_period_start->format('F Y')],
            ['type' => 'info', 'rows' => [
                ['Pay Period', $run->pay_period_start->format('d M Y') . ' – ' . $run->pay_period_end->format('d M Y')],
                ['Pay Date', $run->pay_date->format('d M Y')],
                ['Total Employees', $entries->count()],
            ]],
            ['type' => 'blank'],
            ['type' => 'table',
                'headers' => $headers,
                'rows'    => $rows,
                'totals'  => $totalsRow,
            ],
        ];

        return $this->exportSections($format, 'Payroll_Detailed_' . $run->pay_period_start->format('M_Y'), $sections);
    }

    // ─── Report 9 — NAPSA/NHIMA Contributory History (cross-run) ─────────────

    public function contributoryHistory(Request $request)
    {
        if (! Auth::user()->can('manage-payroll-runs')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $request->validate([
            'type'        => 'required|in:napsa,nhima',
            'year'        => 'required|digits:4|integer',
            'employee_id' => 'nullable|exists:users,id',
        ]);

        $type   = $request->input('type');
        $year   = $request->input('year');
        $empId  = $request->input('employee_id');
        $format = $request->input('format', 'csv');

        $runs = PayrollRun::whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('status', ['completed', 'pending_approval', 'final'])
            ->whereYear('pay_period_start', $year)
            ->orderBy('pay_period_start')
            ->get();

        $label    = strtoupper($type);
        $empKey   = "zambia_{$type}_employee";
        $emrKey   = "zambia_{$type}_employer";
        $numField = $type === 'napsa' ? 'napsa_number' : 'nhima_number';

        $allRows = [];
        foreach ($runs as $run) {
            $entryQuery = PayrollEntry::where('payroll_run_id', $run->id)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->with('employee.employee');

            if ($empId) {
                $entryQuery->where('employee_id', $empId);
            }
            if ($branchId = $request->input('branch_id')) {
                $entryQuery->whereHas('employee.employee', fn($q) => $q->where('branch_id', $branchId));
            }
            if ($deptId = $request->input('department_id')) {
                $entryQuery->whereHas('employee.employee', fn($q) => $q->where('department_id', $deptId));
            }

            $period = $run->pay_period_start->format('M Y');
            foreach ($entryQuery->get() as $entry) {
                $emp     = $entry->employee?->employee ?? null;
                $empCont = $this->getDeductionAmount($entry, $empKey);
                $emrCont = $this->getEarningAmount($entry, $emrKey);
                $allRows[] = [
                    $entry->employee?->name ?? $entry->employee_name ?? 'Unknown',
                    $emp->{$numField} ?? 'N/A',
                    $emp->tpin ?? 'N/A',
                    $period,
                    number_format($entry->basic_salary, 2, '.', ''),
                    number_format($empCont, 2, '.', ''),
                    number_format($emrCont, 2, '.', ''),
                    number_format($empCont + $emrCont, 2, '.', ''),
                ];
            }
        }

        $sections = [
            ['type' => 'title', 'content' => $label . ' Contributory History — ' . $year],
            ['type' => 'info', 'rows' => [
                ['Year', $year],
                ['Contribution Type', $label],
                ['Total Records', count($allRows)],
            ]],
            ['type' => 'blank'],
            ['type' => 'table',
                'headers' => ['Employee Name', $label . ' Number', 'TPIN', 'Period', 'Basic Salary', 'Employee Contribution', 'Employer Contribution', 'Total'],
                'rows'    => $allRows,
            ],
        ];

        return $this->exportSections($format, strtoupper($type) . '_Contributory_History_' . $year, $sections);
    }

    // ─── Report 10 — Deductions Report ───────────────────────────────────────

    public function deductionsReport(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getFilteredEntries($request->payroll_run_id, $request);
        $format  = $request->input('format', 'csv');

        $detailRows = $entries->map(function ($e) {
            $emp       = $e->employee?->employee ?? null;
            $paye      = $this->getDeductionAmount($e, 'zambia_paye');
            $napsa     = $this->getDeductionAmount($e, 'zambia_napsa_employee');
            $nhima     = $this->getDeductionAmount($e, 'zambia_nhima_employee');
            $statutory = $paye + $napsa + $nhima;
            $other     = max(0, (float) $e->total_deductions - $statutory);
            return [
                $e->employee?->name ?? $e->employee_name ?? 'Unknown',
                $emp->tpin ?? 'N/A',
                number_format($e->gross_pay, 2, '.', ''),
                number_format($paye, 2, '.', ''),
                number_format($napsa, 2, '.', ''),
                number_format($nhima, 2, '.', ''),
                number_format($other, 2, '.', ''),
                number_format($e->total_deductions, 2, '.', ''),
                number_format($e->net_pay, 2, '.', ''),
            ];
        })->toArray();

        $totalPaye  = $entries->sum(fn($e) => $this->getDeductionAmount($e, 'zambia_paye'));
        $totalNapsa = $entries->sum(fn($e) => $this->getDeductionAmount($e, 'zambia_napsa_employee'));
        $totalNhima = $entries->sum(fn($e) => $this->getDeductionAmount($e, 'zambia_nhima_employee'));
        $totalOther = $entries->sum(fn($e) => max(0, (float)$e->total_deductions - $this->getDeductionAmount($e, 'zambia_paye') - $this->getDeductionAmount($e, 'zambia_napsa_employee') - $this->getDeductionAmount($e, 'zambia_nhima_employee')));

        $sections = [
            ['type' => 'title', 'content' => 'Deductions Report — ' . $run->pay_period_start->format('F Y')],
            ['type' => 'info', 'rows' => [
                ['Pay Period', $run->pay_period_start->format('d M Y') . ' – ' . $run->pay_period_end->format('d M Y')],
                ['Pay Date', $run->pay_date->format('d M Y')],
                ['Total Employees', $entries->count()],
            ]],
            ['type' => 'blank'],
            ['type' => 'table',
                'title'   => 'Detailed Deductions',
                'headers' => ['Employee Name', 'TPIN', 'Gross Pay', 'PAYE', 'NAPSA (Emp)', 'NHIMA (Emp)', 'Other Deductions', 'Total Deductions', 'Net Pay'],
                'rows'    => $detailRows,
                'totals'  => [
                    'TOTALS', '',
                    number_format($entries->sum('gross_pay'), 2, '.', ''),
                    number_format($totalPaye, 2, '.', ''),
                    number_format($totalNapsa, 2, '.', ''),
                    number_format($totalNhima, 2, '.', ''),
                    number_format($totalOther, 2, '.', ''),
                    number_format($entries->sum('total_deductions'), 2, '.', ''),
                    number_format($entries->sum('net_pay'), 2, '.', ''),
                ],
            ],
            ['type' => 'blank'],
            ['type' => 'table',
                'title'   => 'Summary',
                'headers' => ['Description', 'Amount (ZMW)'],
                'rows'    => [
                    ['Total Employees',         $entries->count()],
                    ['Total Gross Pay',          number_format($entries->sum('gross_pay'), 2, '.', '')],
                    ['Total PAYE',               number_format($totalPaye, 2, '.', '')],
                    ['Total NAPSA (Employee)',    number_format($totalNapsa, 2, '.', '')],
                    ['Total NHIMA (Employee)',    number_format($totalNhima, 2, '.', '')],
                    ['Total Other Deductions',   number_format($totalOther, 2, '.', '')],
                    ['Total Deductions',         number_format($entries->sum('total_deductions'), 2, '.', '')],
                    ['Total Net Pay',            number_format($entries->sum('net_pay'), 2, '.', '')],
                ],
            ],
        ];

        return $this->exportSections($format, 'Deductions_Report_' . $run->pay_period_start->format('M_Y'), $sections);
    }

    // ─── Report 11 — Variance vs Previous Month ───────────────────────────────

    public function varianceReport(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $currentRun     = $this->getPayrollRun($request->payroll_run_id);
        $currentEntries = $this->getFilteredEntries($request->payroll_run_id, $request);
        $format         = $request->input('format', 'csv');

        $prevRun = PayrollRun::whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('status', ['completed', 'pending_approval', 'final'])
            ->where('pay_period_start', '<', $currentRun->pay_period_start)
            ->orderBy('pay_period_start', 'desc')
            ->first();

        $prevEntries = $prevRun ? PayrollEntry::where('payroll_run_id', $prevRun->id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->with('employee.employee')
            ->get() : collect();

        $prevMap    = $prevEntries->keyBy('employee_id');
        $currentIds = $currentEntries->pluck('employee_id')->filter()->all();

        $rows = $currentEntries->map(function ($entry) use ($prevMap) {
            $prev      = $prevMap->get($entry->employee_id);
            $currGross = (float) $entry->gross_pay;
            $prevGross = $prev ? (float) $prev->gross_pay : 0.0;
            $currNet   = (float) $entry->net_pay;
            $prevNet   = $prev ? (float) $prev->net_pay : 0.0;
            $currPaye  = $this->getDeductionAmount($entry, 'zambia_paye');
            $prevPaye  = $prev ? $this->getDeductionAmount($prev, 'zambia_paye') : 0.0;

            $note = '';
            if (!$prev) {
                $note = 'New employee this period';
            } elseif (abs($currGross - $prevGross) > 0.01) {
                $note = $currGross > $prevGross ? 'Increase' : 'Decrease';
            }

            return [
                $entry->employee?->name ?? $entry->employee_name ?? 'Unknown',
                number_format($currGross, 2, '.', ''),
                number_format($prevGross, 2, '.', ''),
                number_format($currGross - $prevGross, 2, '.', ''),
                number_format($currNet, 2, '.', ''),
                number_format($prevNet, 2, '.', ''),
                number_format($currNet - $prevNet, 2, '.', ''),
                number_format($currPaye, 2, '.', ''),
                number_format($prevPaye, 2, '.', ''),
                number_format($currPaye - $prevPaye, 2, '.', ''),
                $note,
            ];
        })->toArray();

        // Employees in previous period but not in current
        foreach ($prevEntries as $prev) {
            if ($prev->employee_id && !in_array($prev->employee_id, $currentIds)) {
                $rows[] = [
                    $prev->employee?->name ?? $prev->employee_name ?? 'Unknown',
                    '', number_format($prev->gross_pay, 2, '.', ''), number_format(-(float)$prev->gross_pay, 2, '.', ''),
                    '', number_format($prev->net_pay, 2, '.', ''), number_format(-(float)$prev->net_pay, 2, '.', ''),
                    '', '', '', 'Absent this period',
                ];
            }
        }

        $sections = [
            ['type' => 'title', 'content' => 'Variance Report — ' . $currentRun->pay_period_start->format('F Y')],
            ['type' => 'info', 'rows' => [
                ['Current Period', $currentRun->pay_period_start->format('F Y')],
                ['Previous Period', $prevRun ? $prevRun->pay_period_start->format('F Y') : 'N/A'],
                ['Total Employees', $currentEntries->count()],
            ]],
            ['type' => 'blank'],
            ['type' => 'table',
                'headers' => ['Employee Name', 'Current Gross', 'Prev Gross', 'Gross Variance', 'Current Net', 'Prev Net', 'Net Variance', 'Current PAYE', 'Prev PAYE', 'PAYE Variance', 'Notes'],
                'rows'    => $rows,
            ],
        ];

        return $this->exportSections($format, 'Variance_Report_' . $currentRun->pay_period_start->format('M_Y'), $sections);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ─── EXPORT ENGINE ───────────────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * Dispatch to the correct format exporter.
     * Sections schema:
     *   ['type' => 'title',  'content' => string]
     *   ['type' => 'info',   'rows'    => [[key, value], ...]]
     *   ['type' => 'blank']
     *   ['type' => 'table',  'title?'  => string, 'headers' => [...], 'rows' => [[...], ...], 'totals?' => [...]]
     */
    private function exportSections(string $format, string $baseName, array $sections): mixed
    {
        return match ($format) {
            'excel' => $this->exportSectionsExcel($baseName . '.xlsx', $sections),
            'pdf'   => $this->exportSectionsPdf($baseName . '.pdf', $sections),
            default => $this->exportSectionsCsv($baseName . '.csv', $sections),
        };
    }

    // ─── CSV ─────────────────────────────────────────────────────────────────

    private function exportSectionsCsv(string $filename, array $sections): mixed
    {
        return response()->streamDownload(function () use ($sections) {
            $f = fopen('php://output', 'w');
            foreach ($sections as $s) {
                match ($s['type']) {
                    'title' => fputcsv($f, [$s['content']]),
                    'info'  => array_map(fn($r) => fputcsv($f, $r), $s['rows']),
                    'blank' => fputcsv($f, []),
                    'table' => $this->writeCsvTable($f, $s),
                    default => null,
                };
            }
            fclose($f);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function writeCsvTable($f, array $s): void
    {
        if (!empty($s['title'])) fputcsv($f, [$s['title']]);
        if (!empty($s['headers'])) fputcsv($f, $s['headers']);
        foreach ($s['rows'] ?? [] as $row) fputcsv($f, $row);
        if (!empty($s['totals'])) fputcsv($f, $s['totals']);
    }

    // ─── Excel ───────────────────────────────────────────────────────────────

    private function exportSectionsExcel(string $filename, array $sections): mixed
    {
        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $rowIdx      = 1;

        foreach ($sections as $s) {
            switch ($s['type']) {
                case 'title':
                    $sheet->setCellValue("A{$rowIdx}", $s['content']);
                    $sheet->getStyle("A{$rowIdx}")->getFont()->setBold(true)->setSize(13);
                    $rowIdx++;
                    break;

                case 'info':
                    foreach ($s['rows'] as $r) {
                        $sheet->setCellValue("A{$rowIdx}", $r[0] ?? '');
                        $sheet->setCellValue("B{$rowIdx}", $r[1] ?? '');
                        $sheet->getStyle("A{$rowIdx}")->getFont()->setBold(true);
                        $rowIdx++;
                    }
                    break;

                case 'blank':
                    $rowIdx++;
                    break;

                case 'table':
                    if (!empty($s['title'])) {
                        $sheet->setCellValue("A{$rowIdx}", $s['title']);
                        $sheet->getStyle("A{$rowIdx}")->getFont()->setBold(true)->setSize(11);
                        $rowIdx++;
                    }
                    if (!empty($s['headers'])) {
                        $colIdx = 1;
                        foreach ($s['headers'] as $h) {
                            $cell = Coordinate::stringFromColumnIndex($colIdx) . $rowIdx;
                            $sheet->setCellValue($cell, $h);
                            $sheet->getStyle($cell)->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
                            $sheet->getStyle($cell)->getFill()
                                ->setFillType(Fill::FILL_SOLID)
                                ->getStartColor()->setARGB('FF4338CA');
                            $colIdx++;
                        }
                        $rowIdx++;
                    }
                    foreach ($s['rows'] ?? [] as $row) {
                        $colIdx = 1;
                        foreach ($row as $cell) {
                            $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIdx) . $rowIdx, $cell);
                            $colIdx++;
                        }
                        $rowIdx++;
                    }
                    if (!empty($s['totals'])) {
                        $colIdx = 1;
                        foreach ($s['totals'] as $cell) {
                            $cellAddr = Coordinate::stringFromColumnIndex($colIdx) . $rowIdx;
                            $sheet->setCellValue($cellAddr, $cell);
                            $sheet->getStyle($cellAddr)->getFont()->setBold(true);
                            $sheet->getStyle($cellAddr)->getFill()
                                ->setFillType(Fill::FILL_SOLID)
                                ->getStartColor()->setARGB('FFE5E7EB');
                            $colIdx++;
                        }
                        $rowIdx++;
                    }
                    break;
            }
        }

        // Auto-size all used columns
        $maxCol = $sheet->getHighestColumnIndex();
        for ($c = 1; $c <= $maxCol; $c++) {
            $sheet->getColumnDimensionByColumn($c)->setAutoSize(true);
        }

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type'  => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
            'Pragma'        => 'public',
        ]);
    }

    // ─── PDF ─────────────────────────────────────────────────────────────────

    private function exportSectionsPdf(string $filename, array $sections): mixed
    {
        $html = $this->buildSectionsPdfHtml($sections);
        return Pdf::loadHTML($html)->setPaper('a4', 'landscape')->download($filename);
    }

    private function buildSectionsPdfHtml(array $sections): string
    {
        $styles = '
            body  { font-family: DejaVu Sans, Arial, sans-serif; font-size: 9pt; margin: 15px; color: #111827; }
            h1    { font-size: 13pt; color: #1f2937; margin: 0 0 6px 0; }
            h3    { font-size: 10pt; color: #374151; margin: 14px 0 4px 0; }
            .info-tbl { border-collapse: collapse; margin-bottom: 10px; }
            .info-tbl td { padding: 2px 14px 2px 0; border: none; }
            .info-tbl td.lbl { font-weight: bold; }
            table.dt { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            table.dt thead th { background: #4338ca; color: #fff; padding: 5px 6px; text-align: left; font-size: 8pt; }
            table.dt tbody td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; }
            table.dt tbody tr.alt { background: #f9fafb; }
            table.dt tfoot td  { font-weight: bold; background: #e5e7eb; padding: 4px 6px; border-top: 2px solid #9ca3af; }
            .sep { border: none; border-top: 1px solid #d1d5db; margin: 10px 0; }
        ';

        $html = '<html><head><meta charset="UTF-8"><style>' . $styles . '</style></head><body>';

        foreach ($sections as $s) {
            switch ($s['type']) {
                case 'title':
                    $html .= '<h1>' . htmlspecialchars($s['content']) . '</h1>';
                    break;

                case 'info':
                    $html .= '<table class="info-tbl"><tbody>';
                    foreach ($s['rows'] as $r) {
                        $html .= '<tr>'
                            . '<td class="lbl">' . htmlspecialchars((string)($r[0] ?? '')) . '</td>'
                            . '<td>' . htmlspecialchars((string)($r[1] ?? '')) . '</td>'
                            . '</tr>';
                    }
                    $html .= '</tbody></table>';
                    break;

                case 'blank':
                    $html .= '<div class="sep"></div>';
                    break;

                case 'table':
                    if (!empty($s['title'])) {
                        $html .= '<h3>' . htmlspecialchars($s['title']) . '</h3>';
                    }
                    $html .= '<table class="dt">';
                    if (!empty($s['headers'])) {
                        $html .= '<thead><tr>';
                        foreach ($s['headers'] as $h) {
                            $html .= '<th>' . htmlspecialchars($h) . '</th>';
                        }
                        $html .= '</tr></thead>';
                    }
                    $html .= '<tbody>';
                    $alt = false;
                    foreach ($s['rows'] ?? [] as $row) {
                        $html .= '<tr' . ($alt ? ' class="alt"' : '') . '>';
                        foreach ($row as $cell) {
                            $html .= '<td>' . htmlspecialchars((string) $cell) . '</td>';
                        }
                        $html .= '</tr>';
                        $alt = !$alt;
                    }
                    $html .= '</tbody>';
                    if (!empty($s['totals'])) {
                        $html .= '<tfoot><tr>';
                        foreach ($s['totals'] as $cell) {
                            $html .= '<td>' . htmlspecialchars((string) $cell) . '</td>';
                        }
                        $html .= '</tr></tfoot>';
                    }
                    $html .= '</table>';
                    break;
            }
        }

        $html .= '</body></html>';
        return $html;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ─── QUERY HELPERS ───────────────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════════

    private function getPayrollRun($id): PayrollRun
    {
        return PayrollRun::whereIn('created_by', getCompanyAndUsersId())->findOrFail($id);
    }

    /** Return PayrollEntries for a run, optionally filtered by branch / dept / designation. */
    private function getFilteredEntries($payrollRunId, Request $request)
    {
        $query = PayrollEntry::where('payroll_run_id', $payrollRunId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->with('employee.employee');

        if ($branchId = $request->input('branch_id')) {
            $query->whereHas('employee.employee', fn($q) => $q->where('branch_id', $branchId));
        }
        if ($deptId = $request->input('department_id')) {
            $query->whereHas('employee.employee', fn($q) => $q->where('department_id', $deptId));
        }
        if ($desigId = $request->input('designation_id')) {
            $query->whereHas('employee.employee', fn($q) => $q->where('designation_id', $desigId));
        }

        return $query->get();
    }

    private function getDeductionAmount(PayrollEntry $entry, string $type): float
    {
        foreach ($entry->deductions_breakdown ?? [] as $item) {
            if (is_array($item) && ($item['type'] ?? '') === $type) {
                return (float) $item['amount'];
            }
        }
        return 0.0;
    }

    private function getEarningAmount(PayrollEntry $entry, string $type): float
    {
        foreach ($entry->earnings_breakdown ?? [] as $item) {
            if (is_array($item) && ($item['type'] ?? '') === $type) {
                return (float) $item['amount'];
            }
        }
        return 0.0;
    }
}
