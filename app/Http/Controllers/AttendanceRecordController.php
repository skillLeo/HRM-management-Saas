<?php

namespace App\Http\Controllers;

use App\Models\AttendancePolicy;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\IpRestriction;
use App\Models\LeaveApplication;
use App\Models\Shift;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class AttendanceRecordController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-attendance-records')) {
            $query = AttendanceRecord::with(['employee', 'shift', 'attendancePolicy', 'creator'])
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-attendance-records')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-attendance-records')) {
                        $q->where('created_by', Auth::id())->orWhere('employee_id', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                });

            // Handle search
            if ($request->has('search') && ! empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->whereHas('employee', function ($subQ) use ($request) {
                        $subQ->where('name', 'like', '%'.$request->search.'%');
                    });
                });
            }

            // Handle employee filter
            if ($request->has('employee_id') && ! empty($request->employee_id) && $request->employee_id !== 'all') {
                $query->where('employee_id', $request->employee_id);
            }

            // Handle status filter
            if ($request->has('status') && ! empty($request->status) && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Handle date range filter
            if ($request->has('date_from') && ! empty($request->date_from)) {
                $query->where('date', '>=', $request->date_from);
            }
            if ($request->has('date_to') && ! empty($request->date_to)) {
                $query->where('date', '<=', $request->date_to);
            }

            // Handle sorting
            if ($request->has('sort_field') && ! empty($request->sort_field)) {
                $sortField = $request->sort_field;
                $sortDirection = $request->sort_direction ?? 'asc';
                
                if ($sortField === 'date') {
                    $query->orderBy('date', $sortDirection);
                } else {
                    $query->orderBy('id', 'desc');
                }
            } else {
                $query->orderBy('id', 'desc');
            }

            $attendanceRecords = $query->paginate($request->per_page ?? 10);

            // Add leave type information for on_leave records
            $attendanceRecords->getCollection()->transform(function ($record) {
                if ($record->status === 'on_leave') {
                    $leaveApplication = LeaveApplication::where('employee_id', $record->employee_id)
                        ->whereDate('start_date', '<=', $record->date)
                        ->whereDate('end_date', '>=', $record->date)
                        ->where('status', 'approved')
                        ->with('leaveType')
                        ->first();

                    $record->leave_type = $leaveApplication?->leaveType;
                }

                return $record;
            });

            // Get employees for filter dropdown
            $employees = User::where('type', 'employee')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->get(['id', 'name']);

            return Inertia::render('hr/attendance-records/index', [
                'attendanceRecords' => $attendanceRecords,
                'employees' => $this->getFilteredEmployees(),
                'hasSampleFile' => file_exists(storage_path('uploads/sample/sample-attendance-record.xlsx')),
                'filters' => $request->all(['search', 'employee_id', 'status', 'date_from', 'date_to', 'sort_field', 'sort_direction', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    private function getFilteredEmployees()
    {
        // Get employees for filter dropdown (compatible with getFilteredEmployees logic)
        $employeeQuery = Employee::whereIn('created_by', getCompanyAndUsersId());

        if (Auth::user()->can('manage-own-attendance-records') && ! Auth::user()->can('manage-any-attendance-records')) {
            $employeeQuery->where(function ($q) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
            });
        }

        $employees = User::emp()
            ->with('employee')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->whereIn('id', $employeeQuery->pluck('user_id'))
            ->select('id', 'name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'employee_id' => $user->employee->employee_id ?? '',
                ];
            });

        return $employees;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'clock_in' => 'nullable|date_format:H:i',
            'clock_out' => 'nullable|date_format:H:i',
            'is_holiday' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        // Get employee with shift and policy
        $employee = Employee::where('user_id', $validated['employee_id'])->first();

        // Get working days from settings
        $globalSettings = settings();
        $workingDaysIndices = json_decode($globalSettings['working_days'] ?? '[]', true);

        if (empty($workingDaysIndices)) {
            return redirect()->back()->with('error', __('Please configure working days first.'));
        }

        $dateIndex = Carbon::parse($validated['date'])->dayOfWeek;
        if (! in_array($dateIndex, $workingDaysIndices)) {
            return redirect()->back()->with('error', __('Cannot create attendance record for non-working day.'));
        }

        // Check if employee has approved leave for this date
        $hasApprovedLeave = LeaveApplication::where('employee_id', $validated['employee_id'])
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $validated['date'])
            ->whereDate('end_date', '>=', $validated['date'])
            ->exists();

        if ($hasApprovedLeave) {
            return redirect()->back()->with('error', __('Employee has approved leave for this date. Cannot create attendance record.'));
        }

        // Check if record already exists
        $exists = AttendanceRecord::where('employee_id', $validated['employee_id'])
            ->where('date', $validated['date'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', __('Attendance record already exists for this employee and date.'));
        }

        // Use employee's assigned shift and policy, or get defaults
        $shift = $employee && $employee->shift_id ?
            Shift::find($employee->shift_id) :
            Shift::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

        $policy = $employee && $employee->attendance_policy_id ?
            AttendancePolicy::find($employee->attendance_policy_id) :
            AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

        $validated['shift_id'] = $shift?->id;
        $validated['attendance_policy_id'] = $policy?->id;
        $validated['created_by'] = creatorId();
        $validated['is_holiday'] = $validated['is_holiday'] ?? false;
        $validated['break_hours'] = $validated['break_hours'] ?? 0;

        // Set weekend flag
        $validated['is_weekend'] = Carbon::parse($validated['date'])->isWeekend();

        $record = AttendanceRecord::create($validated);

        // Process complete attendance calculation
        $record->fresh(); // Reload to get relationships
        $record->processAttendance();

        return redirect()->back()->with('success', __('Attendance record created successfully.'));
    }

    public function update(Request $request, $attendanceRecordId)
    {

        $attendanceRecord = AttendanceRecord::where('id', $attendanceRecordId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        // Get working days from settings
        $globalSettings = settings();
        $workingDaysIndices = json_decode($globalSettings['working_days'] ?? '[]', true);

        if (empty($workingDaysIndices)) {
            return redirect()->back()->with('error', __('Please configure working days first.'));
        }

        $dateIndex = Carbon::parse($request->date)->dayOfWeek;
        if (! in_array($dateIndex, $workingDaysIndices)) {
            return redirect()->back()->with('error', __('Cannot create attendance record for non-working day.'));
        }

        // Check if employee has approved leave for this date
        $hasApprovedLeave = LeaveApplication::where('employee_id', $request->employee_id)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $request->date)
            ->whereDate('end_date', '>=', $request->date)
            ->exists();

        if ($hasApprovedLeave) {
            return redirect()->back()->with('error', __('Employee has approved leave for this date. Cannot create attendance record.'));
        }

        if ($attendanceRecord) {
            try {
                $validated = $request->validate([
                    'employee_id' => 'required|exists:users,id',
                    'date' => 'required|date',
                    'clock_in' => 'nullable|date_format:H:i',
                    'clock_out' => 'nullable|date_format:H:i',
                    'break_hours' => 'nullable|numeric|min:0',
                    'is_holiday' => 'boolean',
                    'status' => 'required|in:present,absent,half_day,on_leave,holiday',
                    'notes' => 'nullable|string',
                ]);

                // Check if employee or date changed and if duplicate exists
                if ($attendanceRecord->employee_id != $validated['employee_id'] || $attendanceRecord->date != $validated['date']) {
                    $exists = AttendanceRecord::where('employee_id', $validated['employee_id'])
                        ->where('date', $validated['date'])
                        ->where('id', '!=', $attendanceRecordId)
                        ->exists();

                    if ($exists) {
                        return redirect()->back()->with('error', __('Attendance record already exists for this employee and date.'));
                    }
                }

                // Get employee with shift and policy
                $employee = \App\Models\Employee::where('user_id', $validated['employee_id'])->first();

                // Use employee's assigned shift and policy, or get defaults
                $shift = $employee && $employee->shift_id ?
                    Shift::find($employee->shift_id) :
                    Shift::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

                $policy = $employee && $employee->attendance_policy_id ?
                    AttendancePolicy::find($employee->attendance_policy_id) :
                    AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

                $validated['shift_id'] = $shift?->id;
                $validated['attendance_policy_id'] = $policy?->id;

                // Set weekend flag
                $validated['is_weekend'] = Carbon::parse($validated['date'])->isWeekend();

                $attendanceRecord->update($validated);

                // Process complete attendance calculation
                $attendanceRecord->fresh(); // Reload to get relationships
                $attendanceRecord->processAttendance();

                return redirect()->back()->with('success', __('Attendance record updated successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update attendance record'));
            }
        } else {
            return redirect()->back()->with('error', __('Attendance record Not Found.'));
        }
    }

    public function destroy($attendanceRecordId)
    {
        $attendanceRecord = AttendanceRecord::where('id', $attendanceRecordId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($attendanceRecord) {
            try {
                $attendanceRecord->delete();

                return redirect()->back()->with('success', __('Attendance record deleted successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete attendance record'));
            }
        } else {
            return redirect()->back()->with('error', __('Attendance record Not Found.'));
        }
    }

    public function clockIn(Request $request)
    {
        if (Auth::user()->can('clock-in-out')) {
            try {
                $validated = $request->validate([
                    'employee_id' => 'required|exists:users,id',
                ]);

                $settings = settings();
                if (! empty($settings['ipRestrictionEnabled']) && $settings['ipRestrictionEnabled'] == 1) {
                    $loginUserIp = request()->ip();
                    $ip = IpRestriction::whereIn('created_by', getCompanyAndUsersId())->where('ip_address', $loginUserIp)->first();
                    if (empty($ip) || is_null($ip)) {
                        return redirect()->back()->with('error', __('This IP Address Is Not Allowed For Clock In & Clock Out.'));
                    }
                }

                $today = Carbon::today();
                $now = Carbon::now();

                // Get working days from settings
                $globalSettings = settings();
                $workingDaysIndices = json_decode($globalSettings['working_days'] ?? '[]', true);

                if (empty($workingDaysIndices)) {
                    return redirect()->back()->with('error', __('Please configure working days first.'));
                }

                $dateIndex = Carbon::parse($today)->dayOfWeek;
                if (! in_array($dateIndex, $workingDaysIndices)) {
                    return redirect()->back()->with('error', __('Cannot create attendance record for non-working day.'));
                }

                // Check if employee has approved leave for this date
                $hasApprovedLeave = LeaveApplication::where('employee_id', $validated['employee_id'])
                    ->where('status', 'approved')
                    ->whereDate('start_date', '<=', $today)
                    ->whereDate('end_date', '>=', $today)
                    ->exists();

                if ($hasApprovedLeave) {
                    return redirect()->back()->with('error', __('Employee has approved leave for this date. Cannot create attendance record.'));
                }

                // Check if already clocked in today
                $existingRecord = AttendanceRecord::where('employee_id', $validated['employee_id'])
                    ->where('date', $today)
                    ->first();

                if ($existingRecord && $existingRecord->clock_in) {
                    return redirect()->back()->with('error', __('Already clocked in today.'));
                }

                // Get employee with shift and policy
                $employee = \App\Models\Employee::where('user_id', $validated['employee_id'])->first();

                if (! $employee) {
                    return redirect()->back()->with('error', __('Employee profile not found.'));
                }

                // Use employee's assigned shift and policy, or get defaults
                $shift = $employee->shift_id ?
                    Shift::find($employee->shift_id) :
                    Shift::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

                $policy = $employee->attendance_policy_id ?
                    AttendancePolicy::find($employee->attendance_policy_id) :
                    AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

                if (! $shift || ! $policy) {
                    return redirect()->back()->with('error', __('No active shift or attendance policy found. Please contact HR.'));
                }

                if ($existingRecord) {
                    $existingRecord->update([
                        'clock_in' => $now->format('H:i:s'),
                        'shift_id' => $shift->id,
                        'attendance_policy_id' => $policy->id,
                        'status' => 'present',
                    ]);
                    $record = $existingRecord;
                } else {
                    $record = AttendanceRecord::create([
                        'employee_id' => $validated['employee_id'],
                        'date' => $today,
                        'clock_in' => $now->format('H:i:s'),
                        'shift_id' => $shift->id,
                        'attendance_policy_id' => $policy->id,
                        'is_weekend' => $today->isWeekend(),
                        'status' => 'present',
                        'created_by' => creatorId(),
                    ]);
                }

                // Check for late arrival if methods exist
                if (method_exists($record, 'checkLateArrival')) {
                    $record->checkLateArrival();
                    $record->save();
                }

                return redirect()->back()->with('success', __('Clocked in successfully.'));
            } catch (\Exception $e) {
                \Log::error('Clock in failed: '.$e->getMessage());

                return redirect()->back()->with('error', __('Failed to clock in. Please try again.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function clockOut(Request $request)
    {
        if (Auth::user()->can('clock-in-out')) {
            try {
                $validated = $request->validate([
                    'employee_id' => 'required|exists:users,id',
                ]);

                $today = Carbon::today();
                $now = Carbon::now();

                $record = AttendanceRecord::where('employee_id', $validated['employee_id'])
                    ->where('date', $today)
                    ->first();

                if (! $record || ! $record->clock_in) {
                    return redirect()->back()->with('error', __('Must clock in first.'));
                }

                if ($record->clock_out) {
                    return redirect()->back()->with('error', __('Already clocked out today.'));
                }

                $record->update([
                    'clock_out' => $now->format('H:i:s'),
                ]);

                // Process complete attendance calculation if method exists
                if (method_exists($record, 'processAttendance')) {
                    $record->processAttendance();
                }

                return redirect()->back()->with('success', __('Clocked out successfully.'));
            } catch (\Exception $e) {
                \Log::error('Clock out failed: '.$e->getMessage());

                return redirect()->back()->with('error', __('Failed to clock out. Please try again.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

    }

    public function getTodayAttendance(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:users,id',
        ]);

        $today = Carbon::today();
        $attendance = AttendanceRecord::where('employee_id', $validated['employee_id'])
            ->where('date', $today)
            ->first();

        return Inertia::render('employee-dashboard', [
            'attendance' => $attendance,
        ]);
    }

    public function export()
    {
        if (Auth::user()->can('export-attendance-record')) {
            try {
                $attendanceRecords = AttendanceRecord::with(['employee', 'shift', 'attendancePolicy'])
                    ->where(function ($q) {
                        if (Auth::user()->can('manage-any-attendance-records')) {
                            $q->whereIn('created_by', getCompanyAndUsersId());
                        } elseif (Auth::user()->can('manage-own-attendance-records')) {
                            $q->where('created_by', Auth::id())->orWhere('employee_id', Auth::id());
                        } else {
                            $q->whereRaw('1 = 0');
                        }
                    })->orderBy('date', 'desc')->get();

                $fileName = 'attendance_records_'.date('Y-m-d_His').'.csv';
                $headers = [
                    'Content-Type' => 'text/csv',
                    'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
                ];

                $callback = function () use ($attendanceRecords) {
                    $file = fopen('php://output', 'w');
                    fputcsv($file, [
                        'Employee',
                        'Date',
                        'Shift',
                        'Attedance Policy',
                        'Clock In',
                        'Clock Out',
                        'Break Hours',
                        'Total Hours',
                        'Overtime Hours',
                        'Status',
                        'Is Late',
                        'Is Early Departure',
                        'Notes'
                    ]);

                    foreach ($attendanceRecords as $record) {
                        fputcsv($file, [
                            $record->employee->name ?? '',
                            $record->date ? date('Y-m-d', strtotime($record->date)) : '',
                            $record->shift->name ?? '',
                            $record->attendancePolicy->name ?? '',
                            $record->clock_in ?? '',
                            $record->clock_out ?? '',
                            $record->break_hours ?? '',
                            $record->total_hours ?? '',
                            $record->overtime_hours ?? '',
                            $record->status ?? '',
                            $record->is_late ? 'Yes' : 'No',
                            $record->is_early_departure ? 'Yes' : 'No',
                            $record->notes ?? ''
                        ]);
                    }
                    fclose($file);
                };

                return response()->stream($callback, 200, $headers);
            } catch (\Exception $e) {
                return response()->json(['message' => __('Failed to export attendance records: :message', ['message' => $e->getMessage()])], 500);
            }
        } else {
            return response()->json(['message' => __('Permission Denied.')], 403);
        }
    }

    public function downloadTemplate()
    {
        $filePath = storage_path('uploads/sample/sample-attendance-record.xlsx');
        if (! file_exists($filePath)) {
            return response()->json(['error' => __('Template file not available')], 404);
        }

        return response()->download($filePath, 'sample-attendance-record.xlsx');
    }

    public function parseFile(Request $request)
    {
        if (Auth::user()->can('import-attendance-record')) {
            $rules = ['file' => 'required|mimes:csv,txt,xlsx,xls'];
            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return response()->json(['message' => $validator->getMessageBag()->first()]);
            }

            try {
                $file = $request->file('file');
                $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getRealPath());
                $worksheet = $spreadsheet->getActiveSheet();
                $highestColumn = $worksheet->getHighestColumn();
                $highestRow = $worksheet->getHighestRow();
                $headers = [];

                for ($col = 'A'; $col <= $highestColumn; $col++) {
                    $value = $worksheet->getCell($col.'1')->getValue();
                    if ($value) {
                        $headers[] = (string) $value;
                    }
                }

                $previewData = [];
                for ($row = 2; $row <= $highestRow; $row++) {
                    $rowData = [];
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
                return response()->json(['message' => __('Failed to parse file: :error', ['error' => $e->getMessage()])]);
            }
        } else {
            return response()->json(['message' => __('Permission denied.')], 403);
        }
    }

    public function fileImport(Request $request)
    {
        if (Auth::user()->can('import-attendance-record')) {
            $rules = ['data' => 'required|array'];
            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return redirect()->back()->with('error', $validator->getMessageBag()->first());
            }

            try {
                $data = $request->data;
                $imported = 0;
                $skipped = 0;

                foreach ($data as $row) {
                    try {
                        if (empty($row['employee']) || empty($row['date'])) {
                            $skipped++;
                            continue;
                        }

                        $employee = User::where('name', $row['employee'])
                            ->whereIn('created_by', getCompanyAndUsersId())
                            ->where('type', 'employee')
                            ->first();

                        if (! $employee) {
                            $skipped++;
                            continue;
                        }

                        // Check if attendance record already exists for this employee and date
                        $exists = AttendanceRecord::where('employee_id', $employee->id)
                            ->whereDate('date', $row['date'])
                            ->exists();

                        if ($exists) {
                            $skipped++;
                            continue;
                        }

                        // Get employee with shift and policy
                        $employeeModel = Employee::where('user_id', $employee->id)->first();

                        $shift = $employeeModel && $employeeModel->shift_id ?
                            Shift::find($employeeModel->shift_id) :
                            Shift::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

                        $policy = $employeeModel && $employeeModel->attendance_policy_id ?
                            AttendancePolicy::find($employeeModel->attendance_policy_id) :
                            AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())->where('status', 'active')->first();

                        if (! $shift || ! $policy) {
                            $skipped++;
                            continue;
                        }

                        $record = AttendanceRecord::create([
                            'employee_id' => $employee->id,
                            'date' => $row['date'],
                            'shift_id' => $shift->id,
                            'attendance_policy_id' => $policy->id,
                            'clock_in' => $row['clock_in'] ?? null,
                            'clock_out' => $row['clock_out'] ?? null,
                            'created_by' => creatorId(),
                        ]);

                        // Process attendance calculation
                        if (method_exists($record, 'processAttendance')) {
                            $record->processAttendance();
                        }
                        $imported++;
                    } catch (\Exception $e) {
                        $skipped++;
                    }
                }

                return redirect()->back()->with('success', __('Import completed: :added attendance records added, :skipped attendance records skipped', ['added' => $imported, 'skipped' => $skipped]));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', __('Failed to import: :error', ['error' => $e->getMessage()]));
            }
        } else {
            return redirect()->back()->with('error', __('Permission denied.'));
        }
    }
}
