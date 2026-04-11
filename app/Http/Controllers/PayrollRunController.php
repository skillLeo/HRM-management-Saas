<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\PayrollEntry;
use App\Models\PayrollRun;
use App\Models\Payslip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class PayrollRunController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-payroll-runs')) {
            $query = PayrollRun::with(['creator'])->where(function ($q) {
                if (Auth::user()->can('manage-any-payroll-runs')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-payroll-runs')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            if ($request->has('search') && ! empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('title', 'like', '%'.$request->search.'%')
                        ->orWhere('notes', 'like', '%'.$request->search.'%');
                });
            }

            if ($request->has('status') && ! empty($request->status) && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->has('date_from') && ! empty($request->date_from)) {
                $query->where('pay_period_start', '>=', $request->date_from);
            }
            if ($request->has('date_to') && ! empty($request->date_to)) {
                $query->where('pay_period_end', '<=', $request->date_to);
            }

            if ($request->has('sort_field') && ! empty($request->sort_field)) {
                $sortField     = $request->sort_field;
                $sortDirection = $request->sort_direction ?? 'asc';
                if ($sortField === 'pay_date') {
                    $query->orderBy('pay_date', $sortDirection);
                } else {
                    $query->orderBy('pay_period_start', 'desc');
                }
            } else {
                $query->orderBy('id', 'desc');
            }

            $payrollRuns = $query->paginate($request->per_page ?? 10);

            $lastCompleted = PayrollRun::whereIn('created_by', getCompanyAndUsersId())
                ->whereIn('status', ['completed', 'pending_approval', 'final'])
                ->orderBy('pay_period_end', 'desc')
                ->first(['id', 'title', 'pay_period_start', 'pay_period_end', 'payroll_frequency', 'pay_date']);

            $branches     = Branch::whereIn('created_by', getCompanyAndUsersId())->get(['id', 'name']);
            $departments  = Department::whereIn('created_by', getCompanyAndUsersId())->get(['id', 'name']);
            $designations = Designation::whereIn('created_by', getCompanyAndUsersId())->get(['id', 'name']);

            return Inertia::render('hr/payroll-runs/index', [
                'payrollRuns'   => $payrollRuns,
                'hasSampleFile' => file_exists(storage_path('uploads/sample/sample-payroll-run.xlsx')),
                'filters'       => $request->all(['search', 'status', 'date_from', 'date_to', 'sort_field', 'sort_direction', 'per_page']),
                'lastCompleted' => $lastCompleted,
                'branches'      => $branches,
                'departments'   => $departments,
                'designations'  => $designations,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function show($payrollRunId)
    {
        if (Auth::user()->can('view-payroll-runs')) {
            $payrollRun = PayrollRun::where('id', $payrollRunId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->with(['payrollEntries.employee'])
                ->first();

            if (! $payrollRun) {
                return redirect()->back()->with('error', __('Payroll run not found.'));
            }

            return Inertia::render('hr/payroll-runs/show', [
                'payrollRun' => $payrollRun,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function store(Request $request)
    {
        if (Auth::user()->can('create-payroll-runs')) {
            $validated = $request->validate([
                'title'             => 'required|string|max:255',
                'payroll_frequency' => 'required|in:weekly,biweekly,monthly',
                'pay_period_start'  => 'required|date',
                'pay_period_end'    => 'required|date|after:pay_period_start',
                'pay_date'          => 'required|date',
                'notes'             => 'nullable|string',
            ]);

            $validated['pay_date']   = $this->adjustPayDate($validated['pay_date']);
            $validated['created_by'] = creatorId();
            $validated['status']     = 'draft';

            $exists = PayrollRun::where('pay_period_start', $validated['pay_period_start'])
                ->where('pay_period_end', $validated['pay_period_end'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->exists();

            if ($exists) {
                return redirect()->back()->with('error', __('Payroll run already exists for this period.'));
            }

            PayrollRun::create($validated);

            return redirect()->back()->with('success', __('Payroll run created successfully.'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function update(Request $request, $payrollRunId)
    {
        if (Auth::user()->can('edit-payroll-runs')) {
            $payrollRun = PayrollRun::where('id', $payrollRunId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if ($payrollRun) {
                try {
                    $validated = $request->validate([
                        'title'             => 'required|string|max:255',
                        'payroll_frequency' => 'required|in:weekly,biweekly,monthly',
                        'pay_period_start'  => 'required|date',
                        'pay_period_end'    => 'required|date|after:pay_period_start',
                        'pay_date'          => 'required|date',
                        'notes'             => 'nullable|string',
                    ]);

                    $validated['pay_date'] = $this->adjustPayDate($validated['pay_date']);

                    if ($payrollRun->status !== 'draft') {
                        return redirect()->back()->with('error', __('Cannot update a payroll run that is not in draft status.'));
                    }

                    $payrollRun->update($validated);

                    return redirect()->back()->with('success', __('Payroll run updated successfully'));
                } catch (\Exception $e) {
                    return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update payroll run'));
                }
            } else {
                return redirect()->back()->with('error', __('Payroll run Not Found.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function destroy($payrollRunId)
    {
        if (Auth::user()->can('delete-payroll-runs')) {
            $payrollRun = PayrollRun::where('id', $payrollRunId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if ($payrollRun) {
                try {
                    if ($payrollRun->status !== 'draft') {
                        return redirect()->back()->with('error', __('Cannot delete a payroll run that is not in draft status.'));
                    }
                    $payrollRun->delete();
                    return redirect()->back()->with('success', __('Payroll run deleted successfully'));
                } catch (\Exception $e) {
                    return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete payroll run'));
                }
            } else {
                return redirect()->back()->with('error', __('Payroll run Not Found.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function process(Request $request, $payrollRunId)
    {
        if (Auth::user()->can('process-payroll-runs')) {
            $payrollRun = PayrollRun::where('id', $payrollRunId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if ($payrollRun) {
                try {
                    if (!in_array($payrollRun->status, ['draft', 'processing'])) {
                        return redirect()->back()->with('error', __('Payroll run cannot be processed in its current status.'));
                    }

                    $filters = array_filter([
                        'branch_id'      => $request->input('branch_id'),
                        'department_id'  => $request->input('department_id'),
                        'designation_id' => $request->input('designation_id'),
                    ]);

                    $success = $payrollRun->processPayroll($filters);

                    if ($success) {
                        return redirect()->back()->with('success', __('Payroll run processed successfully'));
                    } else {
                        return redirect()->back()->with('error', __('Failed to process payroll run'));
                    }
                } catch (\Exception $e) {
                    return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to process payroll run'));
                }
            } else {
                return redirect()->back()->with('error', __('Payroll run Not Found.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    // ─── Unlock completed/final run back to draft ─────────────────────────────
    public function unlock($payrollRunId)
    {
        if (Auth::user()->can('edit-payroll-runs')) {
            $payrollRun = PayrollRun::where('id', $payrollRunId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if (!$payrollRun) {
                return redirect()->back()->with('error', __('Payroll run not found.'));
            }

            if (!in_array($payrollRun->status, ['completed', 'pending_approval', 'final'])) {
                return redirect()->back()->with('error', __('Only completed or final payroll runs can be unlocked.'));
            }

            $payrollRun->update([
                'status'      => 'draft',
                'unlocked_at' => now(),
                'unlocked_by' => Auth::id(),
            ]);

            return redirect()->back()->with('success', __('Payroll run unlocked and moved back to draft. Existing entries are kept.'));
        }

        return redirect()->back()->with('error', __('Permission Denied.'));
    }

    // ─── Submit completed run for final approval ──────────────────────────────
    public function submitFinal($payrollRunId)
    {
        if (Auth::user()->can('process-payroll-runs')) {
            $payrollRun = PayrollRun::where('id', $payrollRunId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if (!$payrollRun) {
                return redirect()->back()->with('error', __('Payroll run not found.'));
            }

            if ($payrollRun->status !== 'completed') {
                return redirect()->back()->with('error', __('Only completed payroll runs can be submitted for final approval.'));
            }

            // ── Block if any active/probation employee has not been processed ─────
            $allActiveUserIds = \App\Models\Employee::whereIn('created_by', getCompanyAndUsersId())
                ->whereIn('employee_status', ['active', 'probation'])
                ->pluck('user_id');

            $processedUserIds = $payrollRun->payrollEntries()->pluck('employee_id');
            $unprocessedIds   = $allActiveUserIds->diff($processedUserIds);

            if ($unprocessedIds->isNotEmpty()) {
                $unprocessedEmps = \App\Models\Employee::whereIn('user_id', $unprocessedIds)
                    ->with('branch')
                    ->get();

                $branches = $unprocessedEmps
                    ->pluck('branch.name')
                    ->filter()
                    ->unique()
                    ->sort()
                    ->values()
                    ->implode(', ');

                return redirect()->back()->with('error', __(
                    ':count active employee(s) have not been processed in this payroll run. Unprocessed branches: :branches. Please process all employees before submitting.',
                    [
                        'count'    => $unprocessedIds->count(),
                        'branches' => $branches ?: 'Unassigned',
                    ]
                ));
            }
            // ──────────────────────────────────────────────────────────────────────

            $payrollRun->update([
                'status'                  => 'pending_approval',
                'submitted_for_final_at'  => now(),
                'submitted_by'            => Auth::id(),
            ]);

            return redirect()->back()->with('success', __('Payroll run submitted for final approval.'));
        }

        return redirect()->back()->with('error', __('Permission Denied.'));
    }

    // ─── Approve and mark as final (company owner) ────────────────────────────
    public function approveFinal($payrollRunId)
    {
        if (Auth::user()->can('approve-payroll-runs')) {
            $payrollRun = PayrollRun::where('id', $payrollRunId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if (!$payrollRun) {
                return redirect()->back()->with('error', __('Payroll run not found.'));
            }

            if ($payrollRun->status !== 'pending_approval') {
                return redirect()->back()->with('error', __('Payroll run is not pending approval.'));
            }

            $payrollRun->update([
                'status'      => 'final',
                'approved_at' => now(),
                'approved_by' => Auth::id(),
            ]);

            return redirect()->back()->with('success', __('Payroll run approved and marked as final.'));
        }

        return redirect()->back()->with('error', __('Permission Denied.'));
    }

    public function destroyEntry($payrollEntryId)
    {
        $payrollEntry = PayrollEntry::where('id', $payrollEntryId)
            ->whereHas('payrollRun', function ($q) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            })
            ->with('payrollRun')
            ->first();

        if (! $payrollEntry) {
            return redirect()->back()->with('error', __('Payroll entry not found.'));
        }

        try {
            $payrollRun = $payrollEntry->payrollRun;
            Payslip::where('payroll_entry_id', $payrollEntry->id)->delete();
            $payrollEntry->delete();

            if ($payrollRun) {
                $payrollRun->calculateTotals();
                $payrollRun->update(['status' => 'draft']);
            }

            return redirect()->back()->with('success', __('Payroll entry deleted successfully'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to delete payroll entry'));
        }
    }

    public function export()
    {
        if (Auth::user()->can('export-payroll-runs')) {
            try {
                $payrollRuns = PayrollRun::whereIn('created_by', getCompanyAndUsersId())->get();
                $fileName    = 'payroll_runs_'.date('Y-m-d_His').'.csv';
                $headers     = [
                    'Content-Type'        => 'text/csv',
                    'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
                ];

                $callback = function () use ($payrollRuns) {
                    $file = fopen('php://output', 'w');
                    fputcsv($file, ['Title', 'Payroll Frequency', 'Pay Period Start', 'Pay Period End', 'Pay Date', 'Status', 'Notes']);
                    foreach ($payrollRuns as $run) {
                        fputcsv($file, [
                            $run->title,
                            $run->payroll_frequency,
                            \Carbon\Carbon::parse($run->pay_period_start)->format('Y-m-d'),
                            \Carbon\Carbon::parse($run->pay_period_end)->format('Y-m-d'),
                            \Carbon\Carbon::parse($run->pay_date)->format('Y-m-d'),
                            $run->status,
                            $run->notes ?? '',
                        ]);
                    }
                    fclose($file);
                };

                return response()->stream($callback, 200, $headers);
            } catch (\Exception $e) {
                return response()->json(['message' => __('Failed to export payroll runs')], 500);
            }
        } else {
            return response()->json(['message' => __('Permission Denied.')], 403);
        }
    }

    public function downloadTemplate()
    {
        $filePath = storage_path('uploads/sample/sample-payroll-run.xlsx');
        if (! file_exists($filePath)) {
            return response()->json(['error' => __('Template file not available')], 404);
        }
        return response()->download($filePath, 'sample-payroll-run.xlsx');
    }

    public function parseFile(Request $request)
    {
        if (Auth::user()->can('import-payroll-runs')) {
            $rules     = ['file' => 'required|mimes:csv,txt,xlsx,xls'];
            $validator = \Illuminate\Support\Facades\Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return response()->json(['message' => $validator->getMessageBag()->first()]);
            }

            try {
                $file          = $request->file('file');
                $spreadsheet   = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getRealPath());
                $worksheet     = $spreadsheet->getActiveSheet();
                $highestColumn = $worksheet->getHighestColumn();
                $highestRow    = $worksheet->getHighestRow();
                $headers       = [];

                for ($col = 'A'; $col <= $highestColumn; $col++) {
                    $value = $worksheet->getCell($col.'1')->getValue();
                    if ($value) $headers[] = (string) $value;
                }

                $previewData = [];
                for ($row = 2; $row <= $highestRow; $row++) {
                    $rowData  = [];
                    $colIndex = 0;
                    for ($col = 'A'; $col <= $highestColumn; $col++) {
                        if ($colIndex < count($headers)) {
                            $rowData[$headers[$colIndex]] = (string) $worksheet->getCell($col.$row)->getValue();
                        }
                        $colIndex++;
                    }
                    $previewData[] = $rowData;
                }

                return response()->json(['excelColumns' => $headers, 'previewData' => $previewData]);
            } catch (\Exception $e) {
                return response()->json(['message' => __('Failed to parse file')]);
            }
        } else {
            return response()->json(['message' => __('Permission denied.')], 403);
        }
    }

    public function fileImport(Request $request)
    {
        if (Auth::user()->can('import-payroll-runs')) {
            $rules     = ['data' => 'required|array'];
            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return redirect()->back()->with('error', $validator->getMessageBag()->first());
            }

            try {
                $data     = $request->data;
                $imported = 0;
                $skipped  = 0;

                foreach ($data as $row) {
                    try {
                        if (empty($row['title']) || empty($row['pay_period_start']) || empty($row['pay_period_end']) || empty($row['pay_date'])) {
                            $skipped++; continue;
                        }
                        if ($row['pay_period_end'] <= $row['pay_period_start']) { $skipped++; continue; }
                        if ($row['pay_date'] < $row['pay_period_end'])           { $skipped++; continue; }

                        $exists = PayrollRun::where('pay_period_start', $row['pay_period_start'])
                            ->where('pay_period_end', $row['pay_period_end'])
                            ->whereIn('created_by', getCompanyAndUsersId())
                            ->exists();

                        if ($exists) { $skipped++; continue; }

                        PayrollRun::create([
                            'title'             => $row['title'],
                            'payroll_frequency' => $row['payroll_frequency'] ?? 'monthly',
                            'pay_period_start'  => $row['pay_period_start'],
                            'pay_period_end'    => $row['pay_period_end'],
                            'pay_date'          => $this->adjustPayDate($row['pay_date']),
                            'status'            => $row['status'] ?? 'draft',
                            'notes'             => $row['notes'] ?? null,
                            'created_by'        => creatorId(),
                        ]);

                        $imported++;
                    } catch (\Exception $e) {
                        $skipped++;
                    }
                }

                return redirect()->back()->with('success',
                    __('Import completed: :added payroll runs added, :skipped payroll runs skipped', [
                        'added'   => $imported,
                        'skipped' => $skipped,
                    ])
                );
            } catch (\Exception $e) {
                return redirect()->back()->with('error', __('Failed to import'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission denied.'));
        }
    }

    private function adjustPayDate(string $date): string
    {
        $carbon = \Carbon\Carbon::parse($date);
        if ($carbon->isSaturday()) return $carbon->addDays(2)->format('Y-m-d');
        if ($carbon->isSunday())   return $carbon->addDay()->format('Y-m-d');
        return $date;
    }
}