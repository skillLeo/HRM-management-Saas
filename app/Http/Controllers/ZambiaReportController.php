<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\PayrollEntry;
use App\Models\PayrollRun;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ZambiaReportController extends Controller
{
    // ─── Index Page ──────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        if (! Auth::user()->can('manage-payroll-runs')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        // All processed payroll runs for the dropdown (completed, pending_approval, or final)
        $payrollRuns = PayrollRun::whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('status', ['completed', 'pending_approval', 'final'])
            ->orderBy('pay_period_start', 'desc')
            ->get(['id', 'title', 'pay_period_start', 'pay_period_end', 'pay_date', 'status']);

        return Inertia::render('hr/zambia-reports/index', [
            'payrollRuns' => $payrollRuns,
        ]);
    }

    // ─── Report 1 — PAYE P11 (for ZRA) ──────────────────────────────────────

    public function payeP11(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getEntries($request->payroll_run_id);

        $fileName = 'PAYE_P11_' . $run->pay_period_start->format('M_Y') . '.csv';

        return response()->streamDownload(function () use ($entries, $run) {
            $f = fopen('php://output', 'w');
            fputcsv($f, ['PAYE P11 Report — ' . $run->pay_period_start->format('F Y')]);
            fputcsv($f, ['Employee Name', 'TPIN', 'Basic Salary (ZMW)', 'Gross Pay (ZMW)', 'PAYE Deducted (ZMW)']);

            foreach ($entries as $entry) {
                $emp         = $entry->employee?->employee ?? null;
                $paye        = $this->getDeductionAmount($entry, 'zambia_paye');

                fputcsv($f, [
                    $entry->employee?->name ?? $entry->employee_name ?? 'Unknown Employee',
                    $emp->tpin ?? 'N/A',
                    number_format($entry->basic_salary, 2, '.', ''),
                    number_format($entry->gross_pay, 2, '.', ''),
                    number_format($paye, 2, '.', ''),
                ]);
            }
            fclose($f);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    // ─── Report 2 — NAPSA Schedule ───────────────────────────────────────────

    public function napsaSchedule(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getEntries($request->payroll_run_id);

        $fileName = 'NAPSA_Schedule_' . $run->pay_period_start->format('M_Y') . '.csv';

        return response()->streamDownload(function () use ($entries, $run) {
            $f = fopen('php://output', 'w');
            fputcsv($f, ['NAPSA Schedule — ' . $run->pay_period_start->format('F Y')]);
            fputcsv($f, ['Employee Name', 'NAPSA Number', 'Gross Pay (ZMW)', 'Employee Contribution (ZMW)', 'Employer Contribution (ZMW)', 'Total (ZMW)']);

            foreach ($entries as $entry) {
                $emp      = $entry->employee?->employee ?? null;
                $employee = $this->getDeductionAmount($entry, 'zambia_napsa_employee');
                $employer = $this->getEarningAmount($entry, 'zambia_napsa_employer');

                fputcsv($f, [
                    $entry->employee?->name ?? $entry->employee_name ?? 'Unknown Employee',
                    $emp->napsa_number ?? 'N/A',
                    number_format($entry->gross_pay, 2, '.', ''),
                    number_format($employee, 2, '.', ''),
                    number_format($employer, 2, '.', ''),
                    number_format($employee + $employer, 2, '.', ''),
                ]);
            }
            fclose($f);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    // ─── Report 3 — NHIMA Report ─────────────────────────────────────────────

    public function nhimaReport(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getEntries($request->payroll_run_id);

        $fileName = 'NHIMA_Report_' . $run->pay_period_start->format('M_Y') . '.csv';

        return response()->streamDownload(function () use ($entries, $run) {
            $f = fopen('php://output', 'w');
            fputcsv($f, ['NHIMA Report — ' . $run->pay_period_start->format('F Y')]);
            fputcsv($f, ['Employee Name', 'NHIMA Number', 'Gross Pay (ZMW)', 'Employee Contribution (ZMW)', 'Employer Contribution (ZMW)', 'Total (ZMW)']);

            foreach ($entries as $entry) {
                $emp      = $entry->employee?->employee ?? null;
                $employee = $this->getDeductionAmount($entry, 'zambia_nhima_employee');
                $employer = $this->getEarningAmount($entry, 'zambia_nhima_employer');

                fputcsv($f, [
                    $entry->employee?->name ?? $entry->employee_name ?? 'Unknown Employee',
                    $emp->nhima_number ?? 'N/A',
                    number_format($entry->gross_pay, 2, '.', ''),
                    number_format($employee, 2, '.', ''),
                    number_format($employer, 2, '.', ''),
                    number_format($employee + $employer, 2, '.', ''),
                ]);
            }
            fclose($f);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    // ─── Report 4 — Bank Payment Schedule ───────────────────────────────────

    public function bankSchedule(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getEntries($request->payroll_run_id);

        $fileName = 'Bank_Payment_Schedule_' . $run->pay_period_start->format('M_Y') . '.csv';

        return response()->streamDownload(function () use ($entries, $run) {
            $f = fopen('php://output', 'w');
            fputcsv($f, ['Bank Payment Schedule — ' . $run->pay_period_start->format('F Y')]);
            fputcsv($f, ['Employee Name', 'Bank Name', 'Account Holder', 'Account Number', 'BIC/SWIFT', 'Net Pay (ZMW)']);

            foreach ($entries as $entry) {
                $emp  = $entry->employee?->employee ?? null;
                $name = $entry->employee?->name ?? $entry->employee_name ?? 'Unknown Employee';

                fputcsv($f, [
                    $name,
                    $emp->bank_name ?? 'N/A',
                    $emp->account_holder_name ?? $name,
                    $emp->account_number ?? 'N/A',
                    $emp->bank_identifier_code ?? 'N/A',
                    number_format($entry->net_pay, 2, '.', ''),
                ]);
            }
            fclose($f);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    // ─── Report 5 — Payroll Summary ──────────────────────────────────────────

    public function payrollSummary(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getEntries($request->payroll_run_id);

        $totalGross       = $entries->sum('gross_pay');
        $totalPaye        = $entries->sum(fn ($e) => $this->getDeductionAmount($e, 'zambia_paye'));
        $totalNapsaEmp    = $entries->sum(fn ($e) => $this->getDeductionAmount($e, 'zambia_napsa_employee'));
        $totalNapsaEmr    = $entries->sum(fn ($e) => $this->getEarningAmount($e, 'zambia_napsa_employer'));
        $totalNhimaEmp    = $entries->sum(fn ($e) => $this->getDeductionAmount($e, 'zambia_nhima_employee'));
        $totalNhimaEmr    = $entries->sum(fn ($e) => $this->getEarningAmount($e, 'zambia_nhima_employer'));
        $totalSdl         = $entries->sum(fn ($e) => $this->getEarningAmount($e, 'zambia_sdl'));
        $totalDeductions  = $entries->sum('total_deductions');
        $totalNet         = $entries->sum('net_pay');
        $totalEmployerCost = $totalNet + $totalNapsaEmr + $totalNhimaEmr + $totalSdl;

        $fileName = 'Payroll_Summary_' . $run->pay_period_start->format('M_Y') . '.csv';

        return response()->streamDownload(function () use (
            $run, $entries, $totalGross, $totalPaye, $totalNapsaEmp, $totalNapsaEmr,
            $totalNhimaEmp, $totalNhimaEmr, $totalSdl, $totalDeductions, $totalNet, $totalEmployerCost
        ) {
            $f = fopen('php://output', 'w');
            fputcsv($f, ['Payroll Summary — ' . $run->pay_period_start->format('F Y')]);
            fputcsv($f, ['Pay Period', $run->pay_period_start->format('d M Y') . ' to ' . $run->pay_period_end->format('d M Y')]);
            fputcsv($f, ['Pay Date', $run->pay_date->format('d M Y')]);
            fputcsv($f, ['Total Employees', $entries->count()]);
            fputcsv($f, []);
            fputcsv($f, ['Description', 'Amount (ZMW)']);
            fputcsv($f, ['Total Gross Pay', number_format($totalGross, 2, '.', '')]);
            fputcsv($f, ['Total PAYE Tax', number_format($totalPaye, 2, '.', '')]);
            fputcsv($f, ['Total NAPSA (Employee)', number_format($totalNapsaEmp, 2, '.', '')]);
            fputcsv($f, ['Total NHIMA (Employee)', number_format($totalNhimaEmp, 2, '.', '')]);
            fputcsv($f, ['Total Deductions', number_format($totalDeductions, 2, '.', '')]);
            fputcsv($f, ['Total Net Pay', number_format($totalNet, 2, '.', '')]);
            fputcsv($f, []);
            fputcsv($f, ['Employer Contributions']);
            fputcsv($f, ['Total NAPSA (Employer)', number_format($totalNapsaEmr, 2, '.', '')]);
            fputcsv($f, ['Total NHIMA (Employer)', number_format($totalNhimaEmr, 2, '.', '')]);
            fputcsv($f, ['Total SDL', number_format($totalSdl, 2, '.', '')]);
            fputcsv($f, ['Total Employer Cost', number_format($totalEmployerCost, 2, '.', '')]);
            fclose($f);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    // ─── Report 6 — Employee List Report ────────────────────────────────────

    public function employeeList(Request $request)
    {
        if (! Auth::user()->can('manage-employees')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $employees = Employee::with(['user', 'branch', 'department', 'designation'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->orderBy('id')
            ->get();

        return response()->streamDownload(function () use ($employees) {
            $f = fopen('php://output', 'w');
            fputcsv($f, ['Employee List Report — ' . now()->format('d M Y')]);
            fputcsv($f, ['Employee ID', 'Full Name', 'Date of Joining', 'Branch', 'Department', 'Designation', 'Status', 'TPIN', 'NAPSA No', 'NHIMA No', 'NRC / Passport No', 'Nationality', 'Email']);

            foreach ($employees as $emp) {
                $idDoc = $emp->nrc ?? $emp->passport_no ?? 'N/A';
                fputcsv($f, [
                    $emp->employee_id,
                    trim(($emp->first_name ?? '') . ' ' . ($emp->middle_name ? $emp->middle_name . ' ' : '') . ($emp->last_name ?? '')) ?: ($emp->user->name ?? 'Unknown'),
                    $emp->date_of_joining ?? 'N/A',
                    $emp->branch->name ?? 'N/A',
                    $emp->department->name ?? 'N/A',
                    $emp->designation->name ?? 'N/A',
                    $emp->employee_status ?? 'active',
                    $emp->tpin ?? 'N/A',
                    $emp->napsa_number ?? 'N/A',
                    $emp->nhima_number ?? 'N/A',
                    $idDoc,
                    $emp->nationality ?? 'N/A',
                    $emp->user->email ?? 'N/A',
                ]);
            }
            fclose($f);
        }, 'Employee_List_' . now()->format('d_M_Y') . '.csv', ['Content-Type' => 'text/csv']);
    }

    // ─── Report 7 — Employee Status Report ───────────────────────────────────

    public function employeeStatus(Request $request)
    {
        if (! Auth::user()->can('manage-employees')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $status = $request->input('status', 'all');

        $query = Employee::with(['user', 'branch', 'department', 'designation'])
            ->whereIn('created_by', getCompanyAndUsersId());

        if ($status !== 'all') {
            $query->where('employee_status', $status);
        }

        $employees = $query->orderBy('employee_status')->orderBy('id')->get();

        $label = $status === 'all' ? 'All_Statuses' : ucfirst($status);

        return response()->streamDownload(function () use ($employees, $status, $label) {
            $f = fopen('php://output', 'w');
            $labelDisplay = $status === 'all' ? 'All Statuses' : ucfirst($status);
            fputcsv($f, ['Employee Status Report — ' . $labelDisplay . ' — ' . now()->format('d M Y')]);
            fputcsv($f, ['Employee ID', 'Full Name', 'Status', 'Date of Joining', 'Branch', 'Department', 'TPIN', 'Email']);

            foreach ($employees as $emp) {
                fputcsv($f, [
                    $emp->employee_id,
                    trim(($emp->first_name ?? '') . ' ' . ($emp->last_name ?? '')) ?: ($emp->user->name ?? 'Unknown'),
                    ucfirst($emp->employee_status ?? 'active'),
                    $emp->date_of_joining ?? 'N/A',
                    $emp->branch->name ?? 'N/A',
                    $emp->department->name ?? 'N/A',
                    $emp->tpin ?? 'N/A',
                    $emp->user->email ?? 'N/A',
                ]);
            }
            fclose($f);
        }, 'Employee_Status_' . $label . '_' . now()->format('d_M_Y') . '.csv', ['Content-Type' => 'text/csv']);
    }

    // ─── Report 7b — Employee Payroll Entries Report ─────────────────────────

    public function payrollEntries(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getEntries($request->payroll_run_id);

        $fileName = 'Payroll_Entries_' . $run->pay_period_start->format('M_Y') . '.csv';

        return response()->streamDownload(function () use ($entries, $run) {
            $f = fopen('php://output', 'w');
            fputcsv($f, ['Employee Payroll Entries — ' . $run->pay_period_start->format('F Y')]);
            fputcsv($f, ['Pay Period', $run->pay_period_start->format('d M Y') . ' to ' . $run->pay_period_end->format('d M Y')]);
            fputcsv($f, ['Pay Date', $run->pay_date->format('d M Y')]);
            fputcsv($f, []);
            fputcsv($f, [
                'Employee Name', 'TPIN', 'Employee ID',
                'Basic Salary', 'Component Earnings', 'Gross Pay',
                'Total Deductions', 'Net Pay',
                'Working Days', 'Present Days', 'Absent Days',
                'Unpaid Leave Deduction', 'Overtime Amount',
            ]);

            foreach ($entries as $entry) {
                $emp = $entry->employee?->employee ?? null;
                fputcsv($f, [
                    $entry->employee?->name ?? $entry->employee_name ?? 'Unknown',
                    $emp->tpin ?? 'N/A',
                    $emp->employee_id ?? 'N/A',
                    number_format($entry->basic_salary, 2, '.', ''),
                    number_format($entry->component_earnings, 2, '.', ''),
                    number_format($entry->gross_pay, 2, '.', ''),
                    number_format($entry->total_deductions, 2, '.', ''),
                    number_format($entry->net_pay, 2, '.', ''),
                    $entry->working_days ?? 'N/A',
                    $entry->present_days ?? 'N/A',
                    $entry->absent_days ?? 'N/A',
                    number_format($entry->unpaid_leave_deduction ?? 0, 2, '.', ''),
                    number_format($entry->overtime_amount ?? 0, 2, '.', ''),
                ]);
            }

            // Totals
            fputcsv($f, []);
            fputcsv($f, [
                'TOTALS', '', '',
                number_format($entries->sum('basic_salary'), 2, '.', ''),
                number_format($entries->sum('component_earnings'), 2, '.', ''),
                number_format($entries->sum('gross_pay'), 2, '.', ''),
                number_format($entries->sum('total_deductions'), 2, '.', ''),
                number_format($entries->sum('net_pay'), 2, '.', ''),
            ]);
            fclose($f);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    // ─── Report 8 — Payroll Run Detailed Report ───────────────────────────────

    public function payrollDetailed(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getEntries($request->payroll_run_id);

        $fileName = 'Payroll_Detailed_' . $run->pay_period_start->format('M_Y') . '.csv';

        return response()->streamDownload(function () use ($entries, $run) {
            $f = fopen('php://output', 'w');
            fputcsv($f, ['Payroll Detailed Report — ' . $run->pay_period_start->format('F Y')]);
            fputcsv($f, ['Pay Period', $run->pay_period_start->format('d M Y') . ' to ' . $run->pay_period_end->format('d M Y')]);
            fputcsv($f, ['Pay Date', $run->pay_date->format('d M Y')]);
            fputcsv($f, []);
            fputcsv($f, [
                'Employee Name', 'TPIN', 'Basic Salary', 'Component Earnings',
                'Gross Pay', 'PAYE', 'NAPSA (Emp)', 'NHIMA (Emp)',
                'Other Deductions', 'Total Deductions', 'Net Pay',
                'NAPSA (Emr)', 'NHIMA (Emr)', 'SDL',
            ]);

            foreach ($entries as $entry) {
                $emp          = $entry->employee?->employee ?? null;
                $paye         = $this->getDeductionAmount($entry, 'zambia_paye');
                $napsaEmp     = $this->getDeductionAmount($entry, 'zambia_napsa_employee');
                $nhimaEmp     = $this->getDeductionAmount($entry, 'zambia_nhima_employee');
                $napsaEmr     = $this->getEarningAmount($entry, 'zambia_napsa_employer');
                $nhimaEmr     = $this->getEarningAmount($entry, 'zambia_nhima_employer');
                $sdl          = $this->getEarningAmount($entry, 'zambia_sdl');
                $statutory    = $paye + $napsaEmp + $nhimaEmp;
                $otherDeds    = max(0, (float) $entry->total_deductions - $statutory);

                fputcsv($f, [
                    $entry->employee?->name ?? $entry->employee_name ?? 'Unknown',
                    $emp->tpin ?? 'N/A',
                    number_format($entry->basic_salary, 2, '.', ''),
                    number_format($entry->component_earnings, 2, '.', ''),
                    number_format($entry->gross_pay, 2, '.', ''),
                    number_format($paye, 2, '.', ''),
                    number_format($napsaEmp, 2, '.', ''),
                    number_format($nhimaEmp, 2, '.', ''),
                    number_format($otherDeds, 2, '.', ''),
                    number_format($entry->total_deductions, 2, '.', ''),
                    number_format($entry->net_pay, 2, '.', ''),
                    number_format($napsaEmr, 2, '.', ''),
                    number_format($nhimaEmr, 2, '.', ''),
                    number_format($sdl, 2, '.', ''),
                ]);
            }

            // Totals row
            fputcsv($f, []);
            fputcsv($f, [
                'TOTALS', '',
                number_format($entries->sum('basic_salary'), 2, '.', ''),
                number_format($entries->sum('component_earnings'), 2, '.', ''),
                number_format($entries->sum('gross_pay'), 2, '.', ''),
                number_format($entries->sum(fn ($e) => $this->getDeductionAmount($e, 'zambia_paye')), 2, '.', ''),
                number_format($entries->sum(fn ($e) => $this->getDeductionAmount($e, 'zambia_napsa_employee')), 2, '.', ''),
                number_format($entries->sum(fn ($e) => $this->getDeductionAmount($e, 'zambia_nhima_employee')), 2, '.', ''),
                '',
                number_format($entries->sum('total_deductions'), 2, '.', ''),
                number_format($entries->sum('net_pay'), 2, '.', ''),
                number_format($entries->sum(fn ($e) => $this->getEarningAmount($e, 'zambia_napsa_employer')), 2, '.', ''),
                number_format($entries->sum(fn ($e) => $this->getEarningAmount($e, 'zambia_nhima_employer')), 2, '.', ''),
                number_format($entries->sum(fn ($e) => $this->getEarningAmount($e, 'zambia_sdl')), 2, '.', ''),
            ]);
            fclose($f);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    // ─── Report 9 — NAPSA/NHIMA Contributory History (cross-run) ─────────────

    public function contributoryHistory(Request $request)
    {
        if (! Auth::user()->can('manage-payroll-runs')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $request->validate([
            'type'       => 'required|in:napsa,nhima',
            'year'       => 'required|digits:4|integer',
            'employee_id' => 'nullable|exists:users,id',
        ]);

        $type     = $request->input('type');   // 'napsa' or 'nhima'
        $year     = $request->input('year');
        $empId    = $request->input('employee_id');

        $runs = PayrollRun::whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('status', ['completed', 'pending_approval', 'final'])
            ->whereYear('pay_period_start', $year)
            ->orderBy('pay_period_start')
            ->get();

        $fileName = strtoupper($type) . '_Contributory_History_' . $year . '.csv';

        return response()->streamDownload(function () use ($runs, $type, $year, $empId) {
            $f = fopen('php://output', 'w');
            $label = strtoupper($type) === 'NAPSA' ? 'NAPSA' : 'NHIMA';
            fputcsv($f, [$label . ' Contributory History — ' . $year]);
            fputcsv($f, ['Employee Name', $label . ' Number', 'TPIN', 'Period', 'Basic Salary', 'Employee Contribution', 'Employer Contribution', 'Total']);

            foreach ($runs as $run) {
                $entryQuery = PayrollEntry::where('payroll_run_id', $run->id)
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->with('employee.employee');

                if ($empId) {
                    $entryQuery->where('employee_id', $empId);
                }

                $entries = $entryQuery->get();
                $period  = $run->pay_period_start->format('M Y');

                foreach ($entries as $entry) {
                    $emp    = $entry->employee?->employee ?? null;
                    $empKey = $type === 'napsa' ? 'zambia_napsa_employee' : 'zambia_nhima_employee';
                    $emrKey = $type === 'napsa' ? 'zambia_napsa_employer' : 'zambia_nhima_employer';
                    $numKey = $type === 'napsa' ? 'napsa_number' : 'nhima_number';

                    $empCont = $this->getDeductionAmount($entry, $empKey);
                    $emrCont = $this->getEarningAmount($entry, $emrKey);

                    fputcsv($f, [
                        $entry->employee?->name ?? $entry->employee_name ?? 'Unknown',
                        $emp->{$numKey} ?? 'N/A',
                        $emp->tpin ?? 'N/A',
                        $period,
                        number_format($entry->basic_salary, 2, '.', ''),
                        number_format($empCont, 2, '.', ''),
                        number_format($emrCont, 2, '.', ''),
                        number_format($empCont + $emrCont, 2, '.', ''),
                    ]);
                }
            }
            fclose($f);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    // ─── Report 10 — Deductions Report ───────────────────────────────────────

    public function deductionsReport(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $run     = $this->getPayrollRun($request->payroll_run_id);
        $entries = $this->getEntries($request->payroll_run_id);

        $fileName = 'Deductions_Report_' . $run->pay_period_start->format('M_Y') . '.csv';

        return response()->streamDownload(function () use ($entries, $run) {
            $f = fopen('php://output', 'w');
            fputcsv($f, ['Deductions Report — ' . $run->pay_period_start->format('F Y')]);
            fputcsv($f, []);

            // ── Detailed section ──────────────────────────────────────────
            fputcsv($f, ['DETAILED DEDUCTIONS']);
            fputcsv($f, ['Employee Name', 'TPIN', 'Gross Pay', 'PAYE', 'NAPSA (Emp)', 'NHIMA (Emp)', 'Other Deductions', 'Total Deductions', 'Net Pay']);

            foreach ($entries as $entry) {
                $emp       = $entry->employee?->employee ?? null;
                $paye      = $this->getDeductionAmount($entry, 'zambia_paye');
                $napsa     = $this->getDeductionAmount($entry, 'zambia_napsa_employee');
                $nhima     = $this->getDeductionAmount($entry, 'zambia_nhima_employee');
                $statutory = $paye + $napsa + $nhima;
                $other     = max(0, (float) $entry->total_deductions - $statutory);

                fputcsv($f, [
                    $entry->employee?->name ?? $entry->employee_name ?? 'Unknown',
                    $emp->tpin ?? 'N/A',
                    number_format($entry->gross_pay, 2, '.', ''),
                    number_format($paye, 2, '.', ''),
                    number_format($napsa, 2, '.', ''),
                    number_format($nhima, 2, '.', ''),
                    number_format($other, 2, '.', ''),
                    number_format($entry->total_deductions, 2, '.', ''),
                    number_format($entry->net_pay, 2, '.', ''),
                ]);
            }

            // ── Summary section ───────────────────────────────────────────
            fputcsv($f, []);
            fputcsv($f, ['SUMMARY']);
            fputcsv($f, ['Description', 'Amount (ZMW)']);
            fputcsv($f, ['Total Employees', $entries->count()]);
            fputcsv($f, ['Total Gross Pay', number_format($entries->sum('gross_pay'), 2, '.', '')]);
            fputcsv($f, ['Total PAYE', number_format($entries->sum(fn ($e) => $this->getDeductionAmount($e, 'zambia_paye')), 2, '.', '')]);
            fputcsv($f, ['Total NAPSA (Employee)', number_format($entries->sum(fn ($e) => $this->getDeductionAmount($e, 'zambia_napsa_employee')), 2, '.', '')]);
            fputcsv($f, ['Total NHIMA (Employee)', number_format($entries->sum(fn ($e) => $this->getDeductionAmount($e, 'zambia_nhima_employee')), 2, '.', '')]);
            fputcsv($f, ['Total Other Deductions', number_format($entries->sum(fn ($e) => max(0, (float)$e->total_deductions - $this->getDeductionAmount($e, 'zambia_paye') - $this->getDeductionAmount($e, 'zambia_napsa_employee') - $this->getDeductionAmount($e, 'zambia_nhima_employee'))), 2, '.', '')]);
            fputcsv($f, ['Total Deductions', number_format($entries->sum('total_deductions'), 2, '.', '')]);
            fputcsv($f, ['Total Net Pay', number_format($entries->sum('net_pay'), 2, '.', '')]);
            fclose($f);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    // ─── Report 11 — Variance vs Previous Month ───────────────────────────────

    public function varianceReport(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|exists:payroll_runs,id']);

        $currentRun     = $this->getPayrollRun($request->payroll_run_id);
        $currentEntries = $this->getEntries($request->payroll_run_id);

        // Find previous run (closest completed run before current period)
        $prevRun = PayrollRun::whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('status', ['completed', 'pending_approval', 'final'])
            ->where('pay_period_start', '<', $currentRun->pay_period_start)
            ->orderBy('pay_period_start', 'desc')
            ->first();

        $prevEntries = $prevRun ? $this->getEntries($prevRun->id) : collect();
        $prevMap     = $prevEntries->keyBy('employee_id');

        $fileName = 'Variance_Report_' . $currentRun->pay_period_start->format('M_Y') . '.csv';

        return response()->streamDownload(function () use ($currentRun, $prevRun, $currentEntries, $prevMap, $prevEntries) {
            $f = fopen('php://output', 'w');
            fputcsv($f, ['Variance Report — ' . $currentRun->pay_period_start->format('F Y')]);
            fputcsv($f, ['Current Period', $currentRun->pay_period_start->format('F Y')]);
            fputcsv($f, ['Previous Period', $prevRun ? $prevRun->pay_period_start->format('F Y') : 'N/A']);
            fputcsv($f, []);
            fputcsv($f, ['Employee Name', 'Current Gross', 'Prev Gross', 'Gross Variance', 'Current Net', 'Prev Net', 'Net Variance', 'Current PAYE', 'Prev PAYE', 'PAYE Variance', 'Notes']);

            foreach ($currentEntries as $entry) {
                $prev        = $prevMap->get($entry->employee_id);
                $currGross   = (float) $entry->gross_pay;
                $prevGross   = $prev ? (float) $prev->gross_pay : 0.0;
                $currNet     = (float) $entry->net_pay;
                $prevNet     = $prev ? (float) $prev->net_pay : 0.0;
                $currPaye    = $this->getDeductionAmount($entry, 'zambia_paye');
                $prevPaye    = $prev ? $this->getDeductionAmount($prev, 'zambia_paye') : 0.0;

                $note = '';
                if (!$prev) {
                    $note = 'New employee this period';
                } elseif (abs($currGross - $prevGross) > 0.01) {
                    $note = $currGross > $prevGross ? 'Increase' : 'Decrease';
                }

                fputcsv($f, [
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
                ]);
            }

            // Flag employees in prev but not in current
            $currentIds = $currentEntries->pluck('employee_id')->filter()->all();
            foreach ($prevEntries as $prev) {
                if ($prev->employee_id && !in_array($prev->employee_id, $currentIds)) {
                    fputcsv($f, [
                        $prev->employee?->name ?? $prev->employee_name ?? 'Unknown',
                        '',
                        number_format($prev->gross_pay, 2, '.', ''),
                        number_format(-(float)$prev->gross_pay, 2, '.', ''),
                        '',
                        number_format($prev->net_pay, 2, '.', ''),
                        number_format(-(float)$prev->net_pay, 2, '.', ''),
                        '',
                        '',
                        '',
                        'Absent this period',
                    ]);
                }
            }
            fclose($f);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function getPayrollRun($id)
    {
        return PayrollRun::whereIn('created_by', getCompanyAndUsersId())->findOrFail($id);
    }

    private function getEntries($payrollRunId)
    {
        return PayrollEntry::where('payroll_run_id', $payrollRunId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->with('employee.employee')
            ->get();
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