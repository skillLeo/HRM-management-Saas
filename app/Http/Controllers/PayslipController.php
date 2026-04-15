<?php

namespace App\Http\Controllers;

use App\Models\PayrollEntry;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Inertia\Inertia;

class PayslipController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-payslips')) {
            $query = Payslip::with(['employee', 'payrollEntry.payrollRun', 'creator'])->where(function ($q) {
                if (Auth::user()->can('manage-any-payslips')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-payslips')) {
                    $q->orWhere('employee_id', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            // Get latest processed payroll run period for default filter
            $latestPayrollRun = PayrollRun::whereIn('created_by', getCompanyAndUsersId())
                ->whereIn('status', ['completed', 'pending_approval', 'final'])
                ->orderBy('pay_date', 'desc')
                ->first();

            // Fallback to current calendar month when no completed run exists
            $defaultPeriod = $latestPayrollRun ? [
                'from' => $latestPayrollRun->pay_period_start,
                'to'   => $latestPayrollRun->pay_period_end,
            ] : [
                'from' => Carbon::now()->startOfMonth()->toDateString(),
                'to'   => Carbon::now()->endOfMonth()->toDateString(),
            ];

            // Handle search
            if ($request->has('search') && !empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('payslip_number', 'like', '%' . $request->search . '%')
                        ->orWhere('employee_name', 'like', '%' . $request->search . '%')
                        ->orWhereHas('employee', function ($subQ) use ($request) {
                            $subQ->where('name', 'like', '%' . $request->search . '%');
                        });
                });
            }

            // Handle employee filter
            if ($request->has('employee_id') && !empty($request->employee_id) && $request->employee_id !== 'all') {
                $query->where('employee_id', $request->employee_id);
            }

            // Handle status filter
            if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Handle date range filter
            // If no dates passed in request → fallback to latest payroll run period
            $dateFrom = !empty($request->date_from) ? $request->date_from : ($defaultPeriod['from'] ?? null);
            $dateTo   = !empty($request->date_to)   ? $request->date_to   : ($defaultPeriod['to']   ?? null);

            if ($dateFrom) {
                $query->where('pay_period_start', '>=', $dateFrom);
            }
            if ($dateTo) {
                $query->where('pay_period_end', '<=', $dateTo);
            }

            // Handle sorting
            if ($request->has('sort_field') && !empty($request->sort_field)) {
                $sortField     = $request->sort_field;
                $sortDirection = $request->sort_direction ?? 'asc';

                if (in_array($sortField, ['pay_date', 'created_at'])) {
                    $query->orderBy($sortField, $sortDirection);
                } else {
                    $query->orderBy('pay_date', 'desc');
                }
            } else {
                $query->orderBy('pay_date', 'desc');
            }

            $payslips = $query->paginate($request->per_page ?? 10);

            // Get employees for filter dropdown
            $employees = User::where('type', 'employee')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->get(['id', 'name']);

            return Inertia::render('hr/payslips/index', [
                'payslips'      => $payslips,
                'employees'     => $employees,
                'filters'       => $request->all(['search', 'employee_id', 'status', 'date_from', 'date_to', 'sort_field', 'sort_direction', 'per_page']),
                'defaultPeriod' => $defaultPeriod,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'payroll_entry_ids'   => 'required|array',
            'payroll_entry_ids.*' => 'exists:payroll_entries,id',
        ]);

        $generatedCount = 0;
        $errors         = [];

        foreach ($validated['payroll_entry_ids'] as $entryId) {
            try {
                $payrollEntry = PayrollEntry::whereIn('created_by', getCompanyAndUsersId())
                    ->find($entryId);

                if (!$payrollEntry) {
                    continue;
                }

                // Generate payslip number first so we can check for duplicates
                $payslipNumber = Payslip::generatePayslipNumber(
                    $payrollEntry->employee_id,
                    $payrollEntry->payrollRun->pay_date
                );

                // Check if payslip already exists by entry ID or payslip number
                $exists = Payslip::where('payroll_entry_id', $entryId)
                    ->orWhere('payslip_number', $payslipNumber)
                    ->exists();

                if ($exists) {
                    continue;
                }

                $payslip = Payslip::create([
                    'payroll_entry_id' => $entryId,
                    'employee_id'      => $payrollEntry->employee_id,
                    'employee_name'    => $payrollEntry->employee?->name ?? null,
                    'payslip_number'   => $payslipNumber,
                    'pay_period_start' => $payrollEntry->payrollRun->pay_period_start,
                    'pay_period_end'   => $payrollEntry->payrollRun->pay_period_end,
                    'pay_date'         => $payrollEntry->payrollRun->pay_date,
                    'status'           => 'generated',
                    'created_by'       => creatorId(),
                ]);

                $payslip->generatePDF();
                $generatedCount++;
            } catch (\Exception $e) {
                $errors[] = "Failed to generate payslip for entry ID {$entryId}: " . $e->getMessage();
            }
        }

        if ($generatedCount > 0) {
            $message = "Generated {$generatedCount} payslip(s) successfully.";
            if (!empty($errors)) {
                $message .= ' Some errors occurred: ' . implode(', ', $errors);
            }
            return redirect()->back()->with('success', __($message));
        } else {
            return redirect()->back()->with('error', __('No payslips were generated. :errors', ['errors' => implode(', ', $errors)]));
        }
    }

    public function download($payslipId)
    {
        try {
            $payslip = Payslip::with([
                'employee',
                'payrollEntry.payrollRun',
                'payrollEntry.employee.employee',
            ])
                ->where('id', $payslipId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if (!$payslip) {
                return response()->json(['error' => __('Payslip not found.')], 404);
            }

            $payrollEntry = $payslip->payrollEntry;

            $userModel = $payrollEntry->employee;
            if ($userModel && !$userModel->relationLoaded('employee')) {
                $userModel->load('employee');
            }

            $companySettings = settings();
            $companyUser     = User::find(getCompanyId(Auth::user()->id));

            if ($companyUser) {
                $companySettings = array_merge($companySettings, [
                    'companyEmail' => $companyUser->email ?? null,
                ]);
            }

            $data = [
                'payslip'         => $payslip,
                'payrollEntry'    => $payrollEntry,
                'employee'        => $userModel,
                'payrollRun'      => $payrollEntry->payrollRun,
                'earnings'        => $payrollEntry->earnings_breakdown ?? [],
                'deductions'      => $payrollEntry->deductions_breakdown ?? [],
                'employeeData'    => $userModel?->employee,
                'companySettings' => $companySettings,
            ];

            $payslip->markAsDownloaded();

            return view('payslips.template', $data);
        } catch (\Exception $e) {
            return response()->json(['error' => __('Failed to download payslip: :message', ['message' => $e->getMessage()])], 500);
        }
    }

    public function bulkGenerate(Request $request)
    {
        $validated = $request->validate([
            'payroll_run_id' => 'required|exists:payroll_runs,id',
        ]);

        try {
            $payrollEntries = PayrollEntry::where('payroll_run_id', $validated['payroll_run_id'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->get();

            $generatedCount = 0;

            foreach ($payrollEntries as $entry) {
                // Generate payslip number first so we can check for duplicates
                $payslipNumber = Payslip::generatePayslipNumber(
                    $entry->employee_id,
                    $entry->payrollRun->pay_date
                );

                // Check if payslip already exists by entry ID or payslip number
                $exists = Payslip::where('payroll_entry_id', $entry->id)
                    ->orWhere('payslip_number', $payslipNumber)
                    ->exists();

                if ($exists) {
                    continue;
                }

                $payslip = Payslip::create([
                    'payroll_entry_id' => $entry->id,
                    'employee_id'      => $entry->employee_id,
                    'employee_name'    => $entry->employee?->name ?? $entry->employee_name ?? null,
                    'payslip_number'   => $payslipNumber,
                    'pay_period_start' => $entry->payrollRun->pay_period_start,
                    'pay_period_end'   => $entry->payrollRun->pay_period_end,
                    'pay_date'         => $entry->payrollRun->pay_date,
                    'status'           => 'generated',
                    'created_by'       => creatorId(),
                ]);

                try {
                    $payslip->generatePDF();
                } catch (\Exception $pdfEx) {
                    // PDF generation failed; payslip record still created
                }

                $generatedCount++;
            }

            return redirect()->back()->with('success', __('Generated :count payslips successfully.', ['count' => $generatedCount]));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to generate payslips: :message', ['message' => $e->getMessage()]));
        }
    }
}