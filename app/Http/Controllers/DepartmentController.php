<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-departments')) {

            $query = Department::with(['creator'])->where(function ($q) {
                if (Auth::user()->can('manage-any-departments')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-departments')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            // Handle search
            if ($request->has('search') && !empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', '%' . $request->search . '%')
                        ->orWhere('description', 'like', '%' . $request->search . '%');
                });
            }

            // Handle status filter
            if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Handle sorting
            $sortField = $request->get('sort_field', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');

            // Validate sort field
            $allowedSortFields = ['name', 'created_at', 'id'];
            if (!in_array($sortField, $allowedSortFields)) {
                $sortField = 'created_at';
            }

            $query->orderBy($sortField, $sortDirection);

            $departments = $query->paginate($request->per_page ?? 10);

            return Inertia::render('hr/departments/index', [
                'departments' => $departments,
                'filters' => $request->all(['search', 'status', 'sort_field', 'sort_direction', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function store(Request $request)
    {
        if (Auth::user()->can('create-departments')) {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'status' => 'nullable|in:active,inactive',
            ]);

            $validated['created_by'] = creatorId();
            $validated['status'] = $validated['status'] ?? 'active';

            // Check if department with same name already exists
            $exists = Department::where('name', $validated['name'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->exists();

            if ($exists) {
                return redirect()->back()->with('error', __('Department with this name already exists.'));
            }

            Department::create($validated);

            return redirect()->back()->with('success', __('Department created successfully.'));
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function update(Request $request, $departmentId)
    {
        if (Auth::user()->can('edit-departments')) {
            $department = Department::where('id', $departmentId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if ($department) {
                try {
                    $validated = $request->validate([
                        'name' => 'required|string|max:255',
                        'description' => 'nullable|string',
                        'status' => 'nullable|in:active,inactive',
                    ]);

                    // Check if department with same name already exists (excluding current)
                    $exists = Department::where('name', $validated['name'])
                        ->whereIn('created_by', getCompanyAndUsersId())
                        ->where('id', '!=', $departmentId)
                        ->exists();

                    if ($exists) {
                        return redirect()->back()->with('error', __('Department with this name already exists.'));
                    }

                    $department->update($validated);

                    return redirect()->back()->with('success', __('Department updated successfully'));
                } catch (\Exception $e) {
                    return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update department'));
                }
            } else {
                return redirect()->back()->with('error', __('Department Not Found.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function destroy($departmentId)
    {
        if (Auth::user()->can('delete-departments')) {
            $department = Department::where('id', $departmentId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if ($department) {
                try {
                    // Check if department has employees
                    if (class_exists('App\\Models\\Employee')) {
                        $employeeCount = \App\Models\User::where('type', 'employee')
                            ->whereHas('employee', function ($q) use ($departmentId) {
                                $q->where('department_id', $departmentId);
                            })->count();
                        if ($employeeCount > 0) {
                            return response()->json(['message' => __('Cannot delete department with assigned employees')], 400);
                        }
                    }
                    $department->delete();
                    return redirect()->back()->with('success', __('Department deleted successfully'));
                } catch (\Exception $e) {
                    return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete department'));
                }
            } else {
                return redirect()->back()->with('error', __('Department Not Found.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function toggleStatus($departmentId)
    {
        if (Auth::user()->can('toggle-status-departments')) {
            $department = Department::where('id', $departmentId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if ($department) {
                try {
                    $department->status = $department->status === 'active' ? 'inactive' : 'active';
                    $department->save();

                    return redirect()->back()->with('success', __('Department status updated successfully'));
                } catch (\Exception $e) {
                    return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update department status'));
                }
            } else {
                return redirect()->back()->with('error', __('Department Not Found.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }
}