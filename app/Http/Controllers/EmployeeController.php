<?php

namespace App\Http\Controllers;

use App\Models\AttendancePolicy;
use App\Models\Branch;
use App\Models\Candidate;
use App\Models\Department;
use App\Models\Designation;
use App\Models\DocumentType;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\ExperienceCertificateTemplate;
use App\Models\JoiningLetterTemplate;
use App\Models\NocTemplate;
use App\Models\Shift;
use App\Models\Termination;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class EmployeeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-employees')) {
            $authUser = Auth::user();
            $query = User::with(['employee.branch', 'employee.department', 'employee.designation'])
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-employees')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-employees')) {
                        $q->where('created_by', Auth::id())->orWhere('id', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })
                ->where('type', 'employee');

            if ($request->has('search') && !empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', '%' . $request->search . '%')
                        ->orWhere('email', 'like', '%' . $request->search . '%')
                        ->orWhereHas('employee', function ($eq) use ($request) {
                            $eq->where('employee_id', 'like', '%' . $request->search . '%')
                                ->orWhere('phone', 'like', '%' . $request->search . '%');
                        });
                });
            }

            if ($request->has('department') && !empty($request->department) && $request->department !== 'all') {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('department_id', $request->department);
                });
            }

            if ($request->has('branch') && !empty($request->branch) && $request->branch !== 'all') {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('branch_id', $request->branch);
                });
            }

            if ($request->has('designation') && !empty($request->designation) && $request->designation !== 'all') {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('designation_id', $request->designation);
                });
            }

            if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('employee_status', $request->status);
                });
            }

            $sortField = $request->get('sort_field', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');

            $allowedSortFields = ['name', 'created_at', 'id'];
            if (!in_array($sortField, $allowedSortFields)) {
                $sortField = 'created_at';
            }

            if (!in_array($sortDirection, ['asc', 'desc'])) {
                $sortDirection = 'desc';
            }

            $query->orderBy($sortField, $sortDirection);

            $employees = $query->paginate($request->per_page ?? 10);

            $employees->getCollection()->transform(function ($employee) {
                $employee->avatar = check_file($employee->avatar) ? get_file($employee->avatar) : get_file('avatars/avatar.png');
                return $employee;
            });

            $branches = Branch::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name']);

            $departments = Department::with('branch')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name', 'branch_id']);

            $designations = Designation::with('department')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name', 'department_id']);

            $planLimits = null;
            if (isSaas()) {
                if ($authUser->type === 'company' && $authUser->plan) {
                    $currentUserCount = User::where('type', 'employee')->whereIn('created_by', getCompanyAndUsersId())->count();
                    $planLimits = [
                        'current_users' => $currentUserCount,
                        'max_users' => $authUser->plan->max_employees,
                        'can_create' => $currentUserCount < $authUser->plan->max_employees,
                    ];
                } elseif ($authUser->type !== 'superadmin' && $authUser->created_by) {
                    $companyUser = User::find($authUser->created_by);
                    if ($companyUser && $companyUser->type === 'company' && $companyUser->plan) {
                        $currentUserCount = User::where('type', 'employee')->whereIn('created_by', getCompanyAndUsersId())->count();
                        $planLimits = [
                            'current_users' => $currentUserCount,
                            'max_users' => $companyUser->plan->max_employees,
                            'can_create' => $currentUserCount < $companyUser->plan->max_employees,
                        ];
                    }
                }
            }

            return Inertia::render('hr/employees/index', [
                'employees' => $employees,
                'branches' => $branches,
                'planLimits' => $planLimits,
                'departments' => $departments,
                'designations' => $designations,
                'hasSampleFile' => file_exists(storage_path('uploads/sample/sample-employee.xlsx')),
                'filters' => $request->all(['search', 'department', 'branch', 'designation', 'status', 'sort_field', 'sort_direction', 'per_page', 'view']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        if (Auth::user()->can('create-employees')) {
            $branches = Branch::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name']);

            $departments = Department::with('branch')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name', 'branch_id']);

            $designations = Designation::with('department')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name', 'department_id']);

            $documentTypes = DocumentType::whereIn('created_by', getCompanyAndUsersId())
                ->get(['id', 'name', 'is_required']);

            $shifts = Shift::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name', 'start_time', 'end_time']);

            $attendancePolicies = AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name']);

            return Inertia::render('hr/employees/create', [
                'branches' => $branches,
                'departments' => $departments,
                'designations' => $designations,
                'documentTypes' => $documentTypes,
                'shifts' => $shifts,
                'attendancePolicies' => $attendancePolicies,
                'generatedEmployeeId' => Employee::generateEmployeeId(),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        if (Auth::user()->can('create-employees')) {
            try {
                $validator = Validator::make($request->all(), [
                    // Basic Information
                    'title' => 'nullable|string|max:20',
                    'first_name' => 'required|string|max:100',
                    'middle_name' => 'nullable|string|max:100',
                    'last_name' => 'required|string|max:100',
                    'nationality' => 'nullable|string|max:100',
                    'marital_status' => 'nullable|string|max:50',
                    'nrc' => ['nullable', 'string', 'regex:/^\d{6}\/\d{2}\/\d{1}$/'],
                    'tpin' => 'nullable|string|max:50',
                    'biometric_emp_id' => 'nullable|string|max:255|unique:employees,biometric_emp_id',
                    'email' => 'required|email|max:255|unique:users,email',
                    'password' => 'required|string|min:8',
                    'phone' => 'required|string|max:20',
                    'date_of_birth' => 'required|date|before:' . now()->subYears(18)->format('Y-m-d'),
                    'gender' => 'required|in:male,female',
                    'profile_image' => 'nullable',
                    'shift_id' => 'nullable|exists:shifts,id',
                    'attendance_policy_id' => 'nullable|exists:attendance_policies,id',

                    // Employment Details
                    'branch_id' => 'nullable|exists:branches,id',
                    'department_id' => 'nullable|exists:departments,id',
                    'designation_id' => 'nullable|exists:designations,id',
                    'date_of_joining' => 'nullable|date',
                    'employment_type' => 'nullable|string|max:50',
                    'employee_status' => 'nullable|string|max:50',
                    'napsa_number' => 'nullable|string|max:50',
                    'nhima_number' => 'nullable|string|max:50',
                    'salary' => 'nullable|numeric|min:0',

                    // Contact Information
                    'address_line_1' => 'required|string|max:255',
                    'city' => 'required|string|max:100',
                    'state' => 'required|string|max:100',
                    'country' => 'required|string|max:100',
                    'postal_code' => 'nullable|string|max:20',
                    'emergency_contact_name' => 'required|string|max:255',
                    'emergency_contact_relationship' => 'required|string|max:100',
                    'emergency_contact_number' => 'required|string|max:20',

                    // Banking Information
                    'payment_method' => 'nullable|string|in:Cash,Mobile Money,EFT',
                    'bank_name' => 'nullable|string|max:255',
                    'account_holder_name' => 'nullable|string|max:255',
                    'account_number' => 'nullable|string|max:50',
                    'bank_identifier_code' => 'nullable|string|max:50',
                    'bank_branch' => 'nullable|string|max:255',

                    // Documents
                    'documents' => 'nullable|array',
                    'documents.*.document_type_id' => 'required|exists:document_types,id',
                    'documents.*.file_path' => 'required|string',
                    'documents.*.expiry_date' => 'nullable|date',
                ]);

                if ($validator->fails()) {
                    return redirect()->back()->withErrors($validator)->withInput();
                }

                // Build full name
                $fullName = trim(
                    ($request->first_name ?? '') . ' ' .
                    ($request->middle_name ? $request->middle_name . ' ' : '') .
                    ($request->last_name ?? '')
                );

                // Create User
                $user = new User;
                $user->name = $fullName;
                $user->email = $request->email;
                $user->password = Hash::make($request->password);
                $user->type = 'employee';
                $user->lang = 'en';
                $user->created_by = creatorId();

                if ($request->has('profile_image')) {
                    $user->avatar = $request->profile_image;
                }
                $user->save();

                // Assign Employee role
                if (isSaaS()) {
                    $employeeRole = Role::where('created_by', createdBy())->where('name', 'employee')->first();
                } else {
                    $employeeRole = Role::where('name', 'employee')->first();
                }
                if ($employeeRole) {
                    $user->assignRole($employeeRole);
                }

                // Create Employee
                $employee = new Employee;
                $employee->user_id = $user->id;
                $employee->employee_id = Employee::generateEmployeeId();
                $employee->created_by = creatorId();

                // Basic Info
                $employee->biometric_emp_id = $request->biometric_emp_id;
                $employee->title = $request->title;
                $employee->first_name = $request->first_name;
                $employee->middle_name = $request->middle_name;
                $employee->last_name = $request->last_name;
                $employee->nationality = $request->nationality;
                $employee->marital_status = $request->marital_status;
                $employee->nrc = $request->nrc;
                $employee->tpin = $request->tpin;
                $employee->phone = $request->phone;
                $employee->date_of_birth = $request->date_of_birth;
                $employee->gender = $request->gender;

                // Employment Details
                $employee->branch_id = $request->branch_id;
                $employee->department_id = $request->department_id;
                $employee->designation_id = $request->designation_id;
                $employee->shift_id = $request->shift_id;
                $employee->attendance_policy_id = $request->attendance_policy_id;
                $employee->date_of_joining = $request->date_of_joining;
                $employee->employment_type = $request->employment_type;
                $employee->employee_status = $request->employee_status ?? 'active';
                $employee->napsa_number = $request->napsa_number;
                $employee->nhima_number = $request->nhima_number;
                $employee->base_salary = $request->salary;

                // Contact Information
                $employee->address_line_1 = $request->address_line_1;
                $employee->address_line_2 = $request->address_line_2;
                $employee->city = $request->city;
                $employee->state = $request->state;
                $employee->country = $request->country;
                $employee->postal_code = $request->postal_code;
                $employee->emergency_contact_name = $request->emergency_contact_name;
                $employee->emergency_contact_relationship = $request->emergency_contact_relationship;
                $employee->emergency_contact_number = $request->emergency_contact_number;

                // Banking Information
                $employee->payment_method = $request->payment_method;
                $employee->bank_name = $request->bank_name;
                $employee->account_holder_name = $request->account_holder_name;
                $employee->account_number = $request->account_number;
                $employee->bank_identifier_code = $request->bank_identifier_code;
                $employee->bank_branch = $request->bank_branch;

                // Statutory Exemptions
                $employee->exempt_from_napsa = $request->boolean('exempt_from_napsa');
                $employee->exempt_from_nhima = $request->boolean('exempt_from_nhima');
                $employee->exempt_from_sdl = $request->boolean('exempt_from_sdl');

                $employee->save();

                // Documents
                if ($request->has('documents') && is_array($request->documents)) {
                    foreach ($request->documents as $document) {
                        if (isset($document['file_path']) && !empty($document['file_path'])) {
                            EmployeeDocument::create([
                                'employee_id' => $employee->user_id,
                                'document_type_id' => $document['document_type_id'],
                                'file_path' => $document['file_path'],
                                'expiry_date' => $document['expiry_date'] ?? null,
                                'verification_status' => 'pending',
                                'created_by' => creatorId(),
                            ]);
                        }
                    }
                }

                if ($request->has('candidate_id')) {
                    $candidate = Candidate::find($request->candidate_id);
                    if ($candidate) {
                        $candidate->update(['is_employee' => true]);
                    }
                    return redirect()->route('hr.recruitment.candidates.index')->with('success', __('Candidate converted to employee successfully'));
                }

                return redirect()->route('hr.employees.index')->with('success', __('Employee created successfully'));
            } catch (\Exception $e) {
                \Log::error('Employee creation failed: ' . $e->getMessage());
                \Log::error('Stack trace: ' . $e->getTraceAsString());
                return redirect()->back()->with('error', __('Failed to create employee: :message', ['message' => $e->getMessage()]))->withInput();
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Employee $employee)
    {
        if (Auth::user()->can('view-employees')) {
            $companyUserIds = getCompanyAndUsersId();
            if (!in_array($employee->created_by, $companyUserIds)) {
                return redirect()->back()->with('error', __('You do not have permission to view this employee'));
            }

            $user = User::with(['employee.branch', 'employee.department', 'employee.designation', 'employee.shift', 'employee.attendancePolicy', 'employee.documents.documentType'])
                ->where('id', $employee->user_id)
                ->first();

            $user->avatar = check_file($user->avatar) ? get_file($user->avatar) : get_file('avatars/avatar.png');

            return Inertia::render('hr/employees/show', [
                'employee' => $user,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Employee $employee)
    {
        if (Auth::user()->can('edit-employees')) {
            $companyUserIds = getCompanyAndUsersId();
            if (!in_array($employee->created_by, $companyUserIds)) {
                return redirect()->back()->with('error', __('You do not have permission to edit this employee'));
            }

            $user = User::with(['employee.branch', 'employee.department', 'employee.designation', 'employee.documents.documentType'])
                ->where('id', $employee->user_id)
                ->first();

            $user->avatar = check_file($user->avatar) ? get_file($user->avatar) : get_file('avatars/avatar.png');

            $branches = Branch::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name']);

            $departments = Department::with('branch')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name', 'branch_id']);

            $designations = Designation::with('department')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name', 'department_id']);

            $documentTypes = DocumentType::whereIn('created_by', getCompanyAndUsersId())
                ->get(['id', 'name', 'is_required']);

            $shifts = Shift::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name', 'start_time', 'end_time']);

            $attendancePolicies = AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())
                ->where('status', 'active')
                ->get(['id', 'name']);

            return Inertia::render('hr/employees/edit', [
                'employee' => $user,
                'branches' => $branches,
                'departments' => $departments,
                'designations' => $designations,
                'documentTypes' => $documentTypes,
                'shifts' => $shifts,
                'attendancePolicies' => $attendancePolicies,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Employee $employee)
    {
        if (Auth::user()->can('edit-employees')) {
            $companyUserIds = getCompanyAndUsersId();
            if (!in_array($employee->created_by, $companyUserIds)) {
                return redirect()->back()->with('error', __('You do not have permission to update this employee'));
            }

            try {
                $validator = Validator::make($request->all(), [
                    // Basic Information
                    'title' => 'nullable|string|max:20',
                    'first_name' => 'required|string|max:100',
                    'middle_name' => 'nullable|string|max:100',
                    'last_name' => 'required|string|max:100',
                    'nationality' => 'nullable|string|max:100',
                    'marital_status' => 'nullable|string|max:50',
                    'nrc' => ['nullable', 'string', 'regex:/^\d{6}\/\d{2}\/\d{1}$/'],
                    'tpin' => 'nullable|string|max:50',
                    'biometric_emp_id' => 'nullable|string|max:255|unique:employees,biometric_emp_id,' . $employee->id,
                    'email' => 'required|email|max:255|unique:users,email,' . $employee->user_id,
                    'password' => 'nullable|string|min:8',
                    'phone' => 'required|string|max:20',
                    'date_of_birth' => 'required|date|before:' . now()->subYears(18)->format('Y-m-d'),
                    'gender' => 'required|in:male,female',
                    'profile_image' => 'nullable',
                    'shift_id' => 'nullable|exists:shifts,id',
                    'attendance_policy_id' => 'nullable|exists:attendance_policies,id',

                    // Employment Details
                    'branch_id' => 'nullable|exists:branches,id',
                    'department_id' => 'nullable|exists:departments,id',
                    'designation_id' => 'nullable|exists:designations,id',
                    'date_of_joining' => 'nullable|date',
                    'employment_type' => 'nullable|string|max:50',
                    'employee_status' => 'nullable|string|max:50',
                    'napsa_number' => 'nullable|string|max:50',
                    'nhima_number' => 'nullable|string|max:50',
                    'salary' => 'nullable|numeric|min:0',

                    // Contact Information
                    'address_line_1' => 'required|string|max:255',
                    'city' => 'required|string|max:100',
                    'state' => 'required|string|max:100',
                    'country' => 'required|string|max:100',
                    'postal_code' => 'nullable|string|max:20',
                    'emergency_contact_name' => 'required|string|max:255',
                    'emergency_contact_relationship' => 'required|string|max:100',
                    'emergency_contact_number' => 'required|string|max:20',

                    // Banking Information
                    'payment_method' => 'nullable|string|in:Cash,Mobile Money,EFT',
                    'bank_name' => 'nullable|string|max:255',
                    'account_holder_name' => 'nullable|string|max:255',
                    'account_number' => 'nullable|string|max:50',
                    'bank_identifier_code' => 'nullable|string|max:50',
                    'bank_branch' => 'nullable|string|max:255',

                    // Documents
                    'documents' => 'nullable|array',
                    'documents.*.document_type_id' => 'required|exists:document_types,id',
                    'documents.*.file_path' => 'nullable|string',
                    'documents.*.expiry_date' => 'nullable|date',
                ]);

                if ($validator->fails()) {
                    return redirect()->back()->withErrors($validator)->withInput();
                }

                // Build full name
                $fullName = trim(
                    ($request->first_name ?? '') . ' ' .
                    ($request->middle_name ? $request->middle_name . ' ' : '') .
                    ($request->last_name ?? '')
                );

                // Update User
                $user = $employee->user;
                $user->name = $fullName;
                $user->email = $request->email;

                if ($request->filled('password')) {
                    $user->password = Hash::make($request->password);
                }

                if ($request->has('profile_image')) {
                    $user->avatar = $request->profile_image;
                }
                $user->save();

                // Update Employee - Basic Info
                $employee->biometric_emp_id = $request->biometric_emp_id;
                $employee->title = $request->title;
                $employee->first_name = $request->first_name;
                $employee->middle_name = $request->middle_name;
                $employee->last_name = $request->last_name;
                $employee->nationality = $request->nationality;
                $employee->marital_status = $request->marital_status;
                $employee->nrc = $request->nrc;
                $employee->tpin = $request->tpin;
                $employee->phone = $request->phone;
                $employee->date_of_birth = $request->date_of_birth;
                $employee->gender = $request->gender;

                // Update Employee - Employment Details
                $employee->branch_id = $request->branch_id;
                $employee->department_id = $request->department_id;
                $employee->designation_id = $request->designation_id;
                $employee->shift_id = $request->shift_id;
                $employee->attendance_policy_id = $request->attendance_policy_id;
                $employee->date_of_joining = $request->date_of_joining;
                $employee->employment_type = $request->employment_type;
                $employee->employee_status = $request->employee_status;
                $employee->napsa_number = $request->napsa_number;
                $employee->nhima_number = $request->nhima_number;
                $employee->base_salary = $request->salary;

                // Update Employee - Contact Information
                $employee->address_line_1 = $request->address_line_1;
                $employee->address_line_2 = $request->address_line_2;
                $employee->city = $request->city;
                $employee->state = $request->state;
                $employee->country = $request->country;
                $employee->postal_code = $request->postal_code;
                $employee->emergency_contact_name = $request->emergency_contact_name;
                $employee->emergency_contact_relationship = $request->emergency_contact_relationship;
                $employee->emergency_contact_number = $request->emergency_contact_number;

                // Update Employee - Banking Information
                $employee->payment_method = $request->payment_method;
                $employee->bank_name = $request->bank_name;
                $employee->account_holder_name = $request->account_holder_name;
                $employee->account_number = $request->account_number;
                $employee->bank_identifier_code = $request->bank_identifier_code;
                $employee->bank_branch = $request->bank_branch;

                // Update Employee - Statutory Exemptions
                $employee->exempt_from_napsa = $request->boolean('exempt_from_napsa');
                $employee->exempt_from_nhima = $request->boolean('exempt_from_nhima');
                $employee->exempt_from_sdl = $request->boolean('exempt_from_sdl');

                $employee->save();

                // Documents
                if ($request->has('documents') && is_array($request->documents)) {
                    foreach ($request->documents as $document) {
                        if (isset($document['file_path']) && !empty($document['file_path'])) {
                            EmployeeDocument::create([
                                'employee_id' => $employee->user_id,
                                'document_type_id' => $document['document_type_id'],
                                'file_path' => $document['file_path'],
                                'expiry_date' => $document['expiry_date'] ?? null,
                                'verification_status' => 'pending',
                                'created_by' => creatorId(),
                            ]);
                        }
                    }
                }

                return redirect()->route('hr.employees.index')->with('success', __('Employee updated successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update employee'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * Payroll entries and payslips linked to this employee are preserved:
     * the FK is SET NULL so the records survive and history remains intact.
     * The employee_name snapshot stored at payroll-processing time keeps
     * the name readable in reports even after the user record is gone.
     */
    public function destroy($userId)
    {
        if (Auth::user()->can('delete-employees')) {
            try {
                $user = User::with('employee')->where('id', $userId)->whereIn('created_by', getCompanyAndUsersId())->first();

                if (!$user || !$user->employee) {
                    return redirect()->back()->with('error', __('Employee not found'));
                }

                $employee = $user->employee;

                // Remove employee documents (these are not historical financial records)
                EmployeeDocument::where('employee_id', $employee->id)->delete();

                // Delete the employee profile row
                $employee->delete();

                // Remove avatar from storage
                if ($user->avatar) {
                    Storage::disk('public')->delete($user->avatar);
                }

                // Delete the user account — payroll_entries.employee_id and
                // payslips.employee_id will be set to NULL automatically by the
                // database FK (SET NULL), preserving all payroll history.
                $user->delete();

                return redirect()->route('hr.employees.index')->with('success', __('Employee deleted successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', __('Failed to delete employee: :message', ['message' => $e->getMessage()]));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Update employee status.
     */
    public function toggleStatus(Employee $employee)
    {
        if (Auth::user()->can('edit-employees')) {
            $companyUserIds = getCompanyAndUsersId();
            if (!in_array($employee->created_by, $companyUserIds)) {
                return redirect()->back()->with('error', __('You do not have permission to update this employee'));
            }

            try {
                $user = $employee->user;
                $newStatus = $user->status === 'active' ? 'inactive' : 'active';
                $user->update(['status' => $newStatus]);

                return redirect()->back()->with('success', __('Employee status updated successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update employee status'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Change employee password.
     */
    public function changePassword(Request $request, Employee $employee)
    {
        if (Auth::user()->can('edit-employees')) {
            $companyUserIds = getCompanyAndUsersId();
            if (!in_array($employee->created_by, $companyUserIds)) {
                return redirect()->back()->with('error', __('You do not have permission to change this employee password'));
            }

            try {
                $validated = $request->validate([
                    'password' => 'required|string|min:8|confirmed',
                ]);

                $user = $employee->user;
                $user->password = Hash::make($validated['password']);
                $user->save();

                return redirect()->back()->with('success', __('Employee password changed successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to change employee password'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Delete employee document.
     */
    public function deleteDocument($userId, $documentId)
    {
        $user = User::with('employee')->find($userId);

        if (!$user || !$user->employee) {
            return redirect()->back()->with('error', __('Employee not found'));
        }

        $companyUserIds = getCompanyAndUsersId();
        if (!in_array($user->created_by, $companyUserIds)) {
            return redirect()->back()->with('error', __('You do not have permission to access this employee'));
        }

        $document = EmployeeDocument::where('id', $documentId)
            ->where('employee_id', $userId)
            ->first();

        if (!$document) {
            return redirect()->back()->with('error', __('Document not found'));
        }

        try {
            $document->delete();
            return redirect()->back()->with('success', __('Document deleted successfully'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to delete document'));
        }
    }

    /**
     * Approve employee document.
     */
    public function approveDocument($userId, $documentId)
    {
        $user = User::with('employee')->find($userId);
        if (!$user || !$user->employee) {
            return redirect()->back()->with('error', __('Employee not found'));
        }

        $document = EmployeeDocument::where('id', $documentId)
            ->where('employee_id', $userId)
            ->first();

        if (!$document) {
            return redirect()->back()->with('error', __('Document not found'));
        }

        try {
            $document->update(['verification_status' => 'verified']);
            return redirect()->back()->with('success', __('Document approved successfully'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to approve document'));
        }
    }

    /**
     * Reject employee document.
     */
    public function rejectDocument($userId, $documentId)
    {
        $user = User::with('employee')->find($userId);
        if (!$user || !$user->employee) {
            return redirect()->back()->with('error', __('Employee not found'));
        }

        $document = EmployeeDocument::where('id', $documentId)
            ->where('employee_id', $userId)
            ->first();

        if (!$document) {
            return redirect()->back()->with('error', __('Document not found'));
        }

        try {
            $document->update(['verification_status' => 'rejected']);
            return redirect()->back()->with('success', __('Document rejected successfully'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to reject document'));
        }
    }

    /**
     * Download employee document.
     */
    public function downloadDocument($userId, $documentId)
    {
        $user = User::with('employee')->find($userId);
        if (!$user || !$user->employee) {
            return redirect()->back()->with('error', __('Employee not found'));
        }

        $companyUserIds = getCompanyAndUsersId();
        if (!in_array($user->created_by, $companyUserIds)) {
            return redirect()->back()->with('error', __('You do not have permission to access this employee'));
        }

        $document = EmployeeDocument::where('id', $documentId)
            ->where('employee_id', $userId)
            ->first();

        if (!$document) {
            return redirect()->back()->with('error', __('Document not found'));
        }

        if (!$document->file_path) {
            return redirect()->back()->with('error', __('Document file not found'));
        }

        $filePath = getStorageFilePath($document->file_path);

        if (!file_exists($filePath)) {
            return redirect()->back()->with('error', __('Document file not found'));
        }

        return response()->download($filePath);
    }

    /**
     * Download joining letter.
     */
    public function downloadJoiningLetter($employeeId, $format = 'pdf')
    {
        if (!Auth::user()->can('download-joining-letter')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $user = User::with(['employee.branch', 'employee.department', 'employee.designation'])
            ->where('id', $employeeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$user || !$user->employee) {
            return redirect()->back()->with('error', __('Employee not found'));
        }

        $getCompanyId = getCompanyId(Auth::user()->id);
        $template = JoiningLetterTemplate::getTemplate(Auth::user()->lang ?? 'en', $getCompanyId);
        if (!$template) {
            return redirect()->back()->with('error', __('Template not found'));
        }

        $employee = $user->employee;
        $companyName = Auth::user()->name ?? 'Company Name';
        $variables = $template->variables ? json_decode($template->variables, true) : ['date', 'company_name', 'employee_name', 'designation', 'joining_date', 'salary', 'department'];

        $placeholders = [];
        foreach ($variables as $variable) {
            switch ($variable) {
                case 'date':
                    $placeholders['{date}'] = now()->format('F d, Y');
                    break;
                case 'company_name':
                    $placeholders['{company_name}'] = $companyName;
                    break;
                case 'employee_name':
                    $placeholders['{employee_name}'] = $user->name;
                    break;
                case 'designation':
                    $placeholders['{designation}'] = $employee->designation->name ?? '';
                    break;
                case 'joining_date':
                    $placeholders['{joining_date}'] = $employee->date_of_joining ? date('F d, Y', strtotime($employee->date_of_joining)) : '';
                    break;
                case 'salary':
                    $placeholders['{salary}'] = $employee->base_salary ?? '';
                    break;
                case 'department':
                    $placeholders['{department}'] = $employee->department->name ?? '';
                    break;
                case 'leaving_date':
                    $placeholders['{leaving_date}'] = now()->format('F d, Y');
                    break;
            }
        }

        $content = str_replace(array_keys($placeholders), array_values($placeholders), $template->content);
        $content = html_entity_decode($content, ENT_QUOTES, 'UTF-8');
        $content = str_replace('\\n', '<br>', $content);
        $type = 'joining_letter';

        return view('employees.certificates.joining-letter', compact('content', 'user', 'type', 'companyName', 'format'));
    }

    /**
     * Download experience certificate.
     */
    public function downloadExperienceCertificate($employeeId, $format = 'pdf')
    {
        if (!Auth::user()->can('download-experience-certificate')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $user = User::with(['employee.branch', 'employee.department', 'employee.designation'])
            ->where('id', $employeeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$user || !$user->employee) {
            return redirect()->back()->with('error', __('Employee not found'));
        }

        $termination = Termination::where('employee_id', $user->id)->where('status', 'completed')->first();
        if (!$termination) {
            return redirect()->back()->with('error', __('Experience certificate can only be generated for employees who have been terminated.'));
        }

        $getCompanyId = getCompanyId(Auth::user()->id);
        $template = ExperienceCertificateTemplate::getTemplate(Auth::user()->lang ?? 'en', $getCompanyId);
        if (!$template) {
            return redirect()->back()->with('error', __('Template not found'));
        }

        $employee = $user->employee;
        $companyName = Auth::user()->name ?? 'Company Name';
        $variables = $template->variables ? json_decode($template->variables, true) : ['date', 'company_name', 'employee_name', 'designation', 'joining_date', 'leaving_date'];

        $placeholders = [];
        foreach ($variables as $variable) {
            switch ($variable) {
                case 'date':
                    $placeholders['{date}'] = now()->format('F d, Y');
                    break;
                case 'company_name':
                    $placeholders['{company_name}'] = $companyName;
                    break;
                case 'employee_name':
                    $placeholders['{employee_name}'] = $user->name;
                    break;
                case 'designation':
                    $placeholders['{designation}'] = $employee->designation->name ?? '';
                    break;
                case 'joining_date':
                    $placeholders['{joining_date}'] = $employee->date_of_joining ? date('F d, Y', strtotime($employee->date_of_joining)) : '';
                    break;
                case 'leaving_date':
                    $placeholders['{leaving_date}'] = $termination->termination_date?->format('F d, Y') ?? now()->format('F d, Y');
                    break;
                case 'salary':
                    $placeholders['{salary}'] = $employee->base_salary ?? '';
                    break;
                case 'department':
                    $placeholders['{department}'] = $employee->department->name ?? '';
                    break;
            }
        }

        $content = str_replace(array_keys($placeholders), array_values($placeholders), $template->content);
        $content = html_entity_decode($content, ENT_QUOTES, 'UTF-8');
        $content = str_replace('\\n', '<br>', $content);
        $type = 'experience_certificate';

        return view('employees.certificates.experience-certificate', compact('content', 'user', 'type', 'companyName', 'format'));
    }

    /**
     * Download NOC certificate.
     */
    public function downloadNocCertificate($employeeId, $format = 'pdf')
    {
        if (!Auth::user()->can('download-noc-certificate')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $user = User::with(['employee.branch', 'employee.department', 'employee.designation'])
            ->where('id', $employeeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$user || !$user->employee) {
            return redirect()->back()->with('error', __('Employee not found'));
        }

        $getCompanyId = getCompanyId(Auth::user()->id);
        $template = NocTemplate::getTemplate(Auth::user()->lang ?? 'en', $getCompanyId);
        if (!$template) {
            return redirect()->back()->with('error', __('Template not found'));
        }

        $employee = $user->employee;
        $companyName = Auth::user()->name ?? 'Company Name';
        $variables = $template->variables ? json_decode($template->variables, true) : ['date', 'company_name', 'employee_name', 'designation'];

        $placeholders = [];
        foreach ($variables as $variable) {
            switch ($variable) {
                case 'date':
                    $placeholders['{date}'] = now()->format('F d, Y');
                    break;
                case 'company_name':
                    $placeholders['{company_name}'] = $companyName;
                    break;
                case 'employee_name':
                    $placeholders['{employee_name}'] = $user->name;
                    break;
                case 'designation':
                    $placeholders['{designation}'] = $employee->designation->name ?? '';
                    break;
            }
        }

        $content = str_replace(array_keys($placeholders), array_values($placeholders), $template->content);
        $content = html_entity_decode($content, ENT_QUOTES, 'UTF-8');
        $content = str_replace('\\n', '<br>', $content);
        $type = 'noc_certificate';

        return view('employees.certificates.noc-certificate', compact('content', 'user', 'type', 'companyName', 'format'));
    }

    /**
     * Export employees to CSV.
     */
    public function export()
    {
        if (Auth::user()->can('export-employee')) {
            try {
                $employees = User::with(['employee.branch', 'employee.department', 'employee.designation', 'employee.shift', 'employee.attendancePolicy'])
                    ->where('type', 'employee')
                    ->where(function ($q) {
                        if (Auth::user()->can('manage-any-employees')) {
                            $q->whereIn('created_by', getCompanyAndUsersId());
                        } elseif (Auth::user()->can('manage-own-employees')) {
                            $q->where('created_by', Auth::id())->orWhere('id', Auth::id());
                        } else {
                            $q->whereRaw('1 = 0');
                        }
                    })->get();

                $fileName = 'employees_' . date('Y-m-d_His') . '.csv';
                $headers = [
                    'Content-Type' => 'text/csv',
                    'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                ];

                $callback = function () use ($employees) {
                    $file = fopen('php://output', 'w');
                    fputcsv($file, [
                        'Name', 'Email', 'Biometric Employee Id', 'Phone',
                        'Department', 'Designation', 'Branch', 'Date of Joining',
                        'Date of Birth', 'Gender', 'Shift', 'Basic Salary',
                        'Attendance Policy', 'Employment Type', 'Employment Status',
                        'City', 'State', 'Country', 'Postal Code', 'Address',
                        'Payment Method', 'Bank Name', 'Account Number', 'Bank Identifier Code', 'Bank Branch',
                    ]);

                    foreach ($employees as $user) {
                        $employee = $user->employee;
                        if ($employee) {
                            fputcsv($file, [
                                $user->name,
                                $user->email,
                                $employee->biometric_emp_id ?? '',
                                $employee->phone ?? '',
                                $employee->department->name ?? '',
                                $employee->designation->name ?? '',
                                $employee->branch->name ?? '',
                                $employee->date_of_joining ?? '',
                                $employee->date_of_birth ?? '',
                                $employee->gender ?? '',
                                $employee->shift->name ?? '',
                                $employee->base_salary ?? '',
                                $employee->attendancePolicy->name ?? '',
                                $employee->employment_type ?? '',
                                $employee->employee_status ?? 'active',
                                $employee->city ?? '',
                                $employee->state ?? '',
                                $employee->country ?? '',
                                $employee->postal_code ?? '',
                                $employee->address_line_1 ?? '',
                                $employee->payment_method ?? '',
                                $employee->bank_name ?? '',
                                $employee->account_number ?? '',
                                $employee->bank_identifier_code ?? '',
                                $employee->bank_branch ?? '',
                            ]);
                        }
                    }
                    fclose($file);
                };

                return response()->stream($callback, 200, $headers);
            } catch (\Exception $e) {
                return response()->json(['message' => __('Failed to export employees: :message', ['message' => $e->getMessage()])], 500);
            }
        } else {
            return response()->json(['message' => __('Permission Denied.')], 403);
        }
    }

    /**
     * Download template for employee import.
     */
    public function downloadTemplate()
    {
        $filePath = storage_path('uploads/sample/sample-employee.xlsx');
        if (!file_exists($filePath)) {
            return response()->json(['error' => __('Template file not available')], 404);
        }
        return response()->download($filePath, 'sample-employee.xlsx');
    }

    /**
     * Parse uploaded file for import preview.
     */
    public function parseFile(Request $request)
    {
        if (Auth::user()->can('import-employee')) {
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
                    $value = $worksheet->getCell($col . '1')->getValue();
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
                            $rowData[$headers[$colIndex]] = (string) $worksheet->getCell($col . $row)->getValue();
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

    /**
     * Import employees from uploaded file.
     */
    public function fileImport(Request $request)
    {
        if (Auth::user()->can('import-employee')) {
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
                        if (empty($row['name']) || empty($row['email'])) {
                            $skipped++;
                            continue;
                        }

                        if (User::where('email', $row['email'])->exists()) {
                            $skipped++;
                            continue;
                        }

                        $password = null;
                        if (!empty($row['password'])) {
                            $password = Hash::make($row['password']);
                        }

                        // Find or get first branch
                        $branchId = null;
                        if (!empty($row['branch'])) {
                            $branch = Branch::whereIn('created_by', getCompanyAndUsersId())->where('name', $row['branch'])->first();
                            if ($branch) {
                                $branchId = $branch->id;
                            } else {
                                $firstBranch = Branch::whereIn('created_by', getCompanyAndUsersId())->first();
                                $branchId = $firstBranch ? $firstBranch->id : null;
                            }
                        }

                        // Find or get first department
                        $departmentId = null;
                        if (!empty($row['department'])) {
                            $department = Department::whereIn('created_by', getCompanyAndUsersId())->where('name', $row['department'])->first();
                            if ($department) {
                                $departmentId = $department->id;
                            } elseif ($branchId) {
                                $firstDepartment = Department::whereIn('created_by', getCompanyAndUsersId())->where('branch_id', $branchId)->first();
                                $departmentId = $firstDepartment ? $firstDepartment->id : null;
                            }
                        }

                        // Find or get first designation
                        $designationId = null;
                        if (!empty($row['designation'])) {
                            $designation = Designation::whereIn('created_by', getCompanyAndUsersId())->where('name', $row['designation'])->first();
                            if ($designation) {
                                $designationId = $designation->id;
                            } elseif ($departmentId) {
                                $firstDesignation = Designation::whereIn('created_by', getCompanyAndUsersId())->where('department_id', $departmentId)->first();
                                $designationId = $firstDesignation ? $firstDesignation->id : null;
                            }
                        }

                        // Find or get first shift
                        $shiftId = null;
                        if (!empty($row['shift'])) {
                            $shift = Shift::whereIn('created_by', getCompanyAndUsersId())->where('name', $row['shift'])->first();
                            if ($shift) {
                                $shiftId = $shift->id;
                            } else {
                                $firstShift = Shift::whereIn('created_by', getCompanyAndUsersId())->first();
                                $shiftId = $firstShift ? $firstShift->id : null;
                            }
                        }

                        // Find or get first attendance policy
                        $attendancePolicyId = null;
                        if (!empty($row['attendance_policy'])) {
                            $attendancePolicy = AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())->where('name', $row['attendance_policy'])->first();
                            if ($attendancePolicy) {
                                $attendancePolicyId = $attendancePolicy->id;
                            } else {
                                $firstPolicy = AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())->first();
                                $attendancePolicyId = $firstPolicy ? $firstPolicy->id : null;
                            }
                        }

                        // Create user
                        $user = User::create([
                            'name' => $row['name'],
                            'email' => $row['email'],
                            'password' => $password,
                            'type' => 'employee',
                            'lang' => 'en',
                            'created_by' => creatorId(),
                        ]);

                        // Assign role
                        if (isSaaS()) {
                            $employeeRole = Role::whereIn('created_by', getCompanyAndUsersId())->where('name', 'employee')->first();
                        } else {
                            $employeeRole = Role::where('name', 'employee')->first();
                        }

                        if ($employeeRole) {
                            $user->assignRole($employeeRole);
                        }

                        // Create employee record
                        Employee::create([
                            'user_id' => $user->id,
                            'employee_id' => Employee::generateEmployeeId(),
                            'biometric_emp_id' => $row['biometric_emp_id'] ?? null,
                            'phone' => $row['phone'] ?? '',
                            'date_of_birth' => !empty($row['date_of_birth']) ? $row['date_of_birth'] : null,
                            'gender' => $row['gender'] ?? 'male',
                            'branch_id' => $branchId,
                            'department_id' => $departmentId,
                            'designation_id' => $designationId,
                            'base_salary' => $row['base_salary'] ?? null,
                            'shift_id' => $shiftId,
                            'attendance_policy_id' => $attendancePolicyId,
                            'date_of_joining' => !empty($row['date_of_joining']) ? $row['date_of_joining'] : now(),
                            'employment_type' => $row['employment_type'] ?? 'full-time',
                            'employee_status' => $row['employee_status'] ?? 'active',
                            'city' => $row['city'] ?? '',
                            'state' => $row['state'] ?? '',
                            'country' => $row['country'] ?? '',
                            'postal_code' => $row['postal_code'] ?? '',
                            'address_line_1' => $row['address'] ?? '',
                            'payment_method' => $row['payment_method'] ?? null,
                            'bank_name' => $row['bank_name'] ?? '',
                            'account_number' => $row['account_number'] ?? '',
                            'bank_identifier_code' => $row['bank_identifier_code'] ?? '',
                            'bank_branch' => $row['bank_branch'] ?? '',
                            'created_by' => creatorId(),
                        ]);

                        $imported++;
                    } catch (\Exception $e) {
                        \Log::error('Import row failed: ' . $e->getMessage());
                        $skipped++;
                    }
                }

                return redirect()->back()->with('success', __('Import completed: :added employees added, :skipped employees skipped', ['added' => $imported, 'skipped' => $skipped]));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', __('Failed to import: :error', ['error' => $e->getMessage()]));
            }
        } else {
            return redirect()->back()->with('error', __('Permission denied.'));
        }
    }
}