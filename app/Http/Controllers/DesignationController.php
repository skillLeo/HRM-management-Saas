<?php

namespace App\Http\Controllers;

use App\Models\Designation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DesignationController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-designations')) {
            $query = Designation::with(['creator'])->where(function ($q) {
                if (Auth::user()->can('manage-any-designations')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-designations')) {
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

            $designations = $query->paginate($request->per_page ?? 10);

            return Inertia::render('hr/designations/index', [
                'designations' => $designations,
                'filters' => $request->all(['search', 'status', 'sort_field', 'sort_direction', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function store(Request $request)
    {
        if (Auth::user()->can('create-designations')) {
            try {
                $validated = $request->validate([
                    'name' => 'required|string|max:255',
                    'description' => 'nullable|string',
                    'status' => 'nullable|in:active,inactive',
                ]);

                $validated['created_by'] = creatorId();

                // Check if designation with same name already exists
                $exists = Designation::where('name', $validated['name'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->exists();

                if ($exists) {
                    return redirect()->back()->with('error', __('Designation with this name already exists.'));
                }

                Designation::create($validated);

                return redirect()->back()->with('success', __('Designation created successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to create designation'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function update(Request $request, $designationId)
    {
        if (Auth::user()->can('edit-designations')) {
            $designation = Designation::where('id', $designationId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if ($designation) {
                try {
                    $validated = $request->validate([
                        'name' => 'required|string|max:255',
                        'description' => 'nullable|string',
                        'status' => 'nullable|in:active,inactive',
                    ]);

                    // Check if designation with same name already exists (excluding current)
                    $exists = Designation::where('name', $validated['name'])
                        ->whereIn('created_by', getCompanyAndUsersId())
                        ->where('id', '!=', $designationId)
                        ->exists();

                    if ($exists) {
                        return redirect()->back()->with('error', __('Designation with this name already exists.'));
                    }

                    $designation->update($validated);

                    return redirect()->back()->with('success', __('Designation updated successfully'));
                } catch (\Exception $e) {
                    return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update designation'));
                }
            } else {
                return redirect()->back()->with('error', __('Designation Not Found.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function destroy($designationId)
    {
        if (Auth::user()->can('delete-designations')) {
            $designation = Designation::where('id', $designationId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if ($designation) {
                try {
                    $designation->delete();
                    return redirect()->back()->with('success', __('Designation deleted successfully'));
                } catch (\Exception $e) {
                    return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete designation'));
                }
            } else {
                return redirect()->back()->with('error', __('Designation Not Found.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function toggleStatus($designationId)
    {
        if (Auth::user()->can('toggle-status-designations')) {
            $designation = Designation::where('id', $designationId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if ($designation) {
                try {
                    $designation->status = $designation->status === 'active' ? 'inactive' : 'active';
                    $designation->save();
                    return redirect()->back()->with('success', __('Designation status updated successfully'));
                } catch (\Exception $e) {
                    return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update designation status'));
                }
            } else {
                return redirect()->back()->with('error', __('Designation Not Found.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }
}