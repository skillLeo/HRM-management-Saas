<?php

namespace App\Http\Controllers;

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