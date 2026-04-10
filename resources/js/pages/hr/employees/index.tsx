 // pages/hr/employees/index.tsx
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { ImportModal } from '@/components/ImportModal';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { useInitials } from '@/hooks/use-initials';
import { hasPermission } from '@/utils/authorization';
import { router, usePage } from '@inertiajs/react';
import { ChevronDown, Edit, Eye, FileDown, FileText, FileUp, Key, Lock, MoreHorizontal, Plus, Trash2, Unlock } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Employees() {
    const { t } = useTranslation();
    const {
        auth,
        employees,
        branches,
        planLimits,
        departments,
        designations,
        hasSampleFile,
        globalSettings,
        filters: pageFilters = {},
    } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    // State
    const [activeView, setActiveView] = useState(pageFilters.view || 'list');
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedDepartment, setSelectedDepartment] = useState(pageFilters.department || 'all');
    const [selectedBranch, setSelectedBranch] = useState(pageFilters.branch || 'all');
    const [selectedDesignation, setSelectedDesignation] = useState(pageFilters.designation || 'all');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [showFilters, setShowFilters] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);

    // Check if any filters are active
    const hasActiveFilters = () => {
        return (
            selectedDepartment !== 'all' || selectedBranch !== 'all' || selectedDesignation !== 'all' || selectedStatus !== 'all' || searchTerm !== ''
        );
    };

    // Count active filters
    const activeFilterCount = () => {
        return (
            (selectedDepartment !== 'all' ? 1 : 0) +
            (selectedBranch !== 'all' ? 1 : 0) +
            (selectedDesignation !== 'all' ? 1 : 0) +
            (selectedStatus !== 'all' ? 1 : 0) +
            (searchTerm ? 1 : 0)
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(
            route('hr.employees.index'),
            {
                page: 1,
                search: searchTerm || undefined,
                department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
                branch: selectedBranch !== 'all' ? selectedBranch : undefined,
                designation: selectedDesignation !== 'all' ? selectedDesignation : undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                per_page: pageFilters.per_page,
                view: activeView,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

        router.get(
            route('hr.employees.index'),
            {
                sort_field: field,
                sort_direction: direction,
                page: 1,
                search: searchTerm || undefined,
                department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
                branch: selectedBranch !== 'all' ? selectedBranch : undefined,
                designation: selectedDesignation !== 'all' ? selectedDesignation : undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                per_page: pageFilters.per_page,
                view: activeView,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);

        switch (action) {
            case 'view':
                router.get(route('hr.employees.show', item.employee?.id || item.id));
                break;
            case 'edit':
                router.get(route('hr.employees.edit', item.employee?.id || item.id));
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                handleToggleStatus(item);
                break;
            case 'change-password':
                setIsPasswordModalOpen(true);
                break;
        }
    };

    const handleAddNew = () => {
        router.get(route('hr.employees.create'));
    };

    const handleDeleteConfirm = () => {
        if (!globalSettings?.is_demo) {
            toast.loading(t('Deleting employee...'));
        }

        router.delete(route('hr.employees.destroy', currentItem.employee?.id || currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (!globalSettings?.is_demo) {
                    toast.dismiss();
                }
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                }
            },
            onError: (errors) => {
                if (!globalSettings?.is_demo) {
                    toast.dismiss();
                }
                if (typeof errors === 'string') {
                    toast.error(t(errors));
                } else {
                    toast.error(t('Failed to delete employee: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            },
        });
    };

    const handleToggleStatus = (employee: any) => {
        const currentStatus = employee.status || 'inactive';
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        if (!globalSettings?.is_demo) {
            toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} employee...`);
        }

        router.put(
            route('hr.employees.toggle-status', employee.employee?.id || employee.id),
            {},
            {
                onSuccess: (page) => {
                    if (!globalSettings?.is_demo) {
                        toast.dismiss();
                    }
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                    } else if (page.props.flash.error) {
                        toast.error(t(page.props.flash.error));
                    }
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) {
                        toast.dismiss();
                    }
                    if (typeof errors === 'string') {
                        toast.error(t(errors));
                    } else {
                        toast.error(t('Failed to update employee status: {{errors}}', { errors: Object.values(errors).join(', ') }));
                    }
                },
            },
        );
    };

    const handlePasswordChange = (formData: any) => {
        if (!globalSettings?.is_demo) {
            toast.loading(t('Changing password...'));
        }

        router.put(route('hr.employees.change-password', currentItem.employee?.id || currentItem.id), formData, {
            onSuccess: (page) => {
                setIsPasswordModalOpen(false);
                if (!globalSettings?.is_demo) {
                    toast.dismiss();
                }
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                }
            },
            onError: (errors) => {
                if (!globalSettings?.is_demo) {
                    toast.dismiss();
                }
                if (typeof errors === 'string') {
                    toast.error(t(errors));
                } else {
                    toast.error(t('Failed to change password: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            },
        });
    };

    const handlePageChange = (url: string) => {
        const pageNum = new URL(url).searchParams.get('page') || '1';
        router.get(
            route('hr.employees.index'),
            {
                page: pageNum,
                view: activeView,
                search: searchTerm || undefined,
                department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
                branch: selectedBranch !== 'all' ? selectedBranch : undefined,
                designation: selectedDesignation !== 'all' ? selectedDesignation : undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                per_page: pageFilters.per_page,
                sort_field: pageFilters.sort_field,
                sort_direction: pageFilters.sort_direction,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedDepartment('all');
        setSelectedBranch('all');
        setSelectedDesignation('all');
        setSelectedStatus('all');
        setShowFilters(false);

        router.get(
            route('hr.employees.index'),
            {
                page: 1,
                per_page: pageFilters.per_page,
                view: activeView,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleExport = async () => {
        try {
            const response = await fetch(route('hr.employees.export'), {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                toast.error(t(data.message || 'Failed to export employees'));
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            toast.error(t('Failed to export employees'));
        }
    };

    // Helper: POST form download for employee reports
    const downloadEmployeeReport = (routeName: string, extraFields: Record<string, string> = {}) => {
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = route(routeName);
        form.target = '_blank';
        const addField = (n: string, v: string) => {
            const input = document.createElement('input');
            input.type = 'hidden'; input.name = n; input.value = v;
            form.appendChild(input);
        };
        addField('_token', csrfToken);
        Object.entries(extraFields).forEach(([k, v]) => addField(k, v));
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        toast.success(t('Report download started'));
    };

    const [reportStatusFilter, setReportStatusFilter] = useState('all');

    // Define page actions
    const pageActions = [];

    // Add Export button
    if (hasPermission(permissions, 'export-employee')) {
        pageActions.push({
            label: t('Export'),
            icon: <FileDown className="mr-2 h-4 w-4" />,
            variant: 'outline',
            onClick: handleExport,
        });
    }

    // Add Import button
    if (hasPermission(permissions, 'import-employee')) {
        pageActions.push({
            label: t('Import'),
            icon: <FileUp className="mr-2 h-4 w-4" />,
            variant: 'outline',
            onClick: () => setIsImportModalOpen(true),
        });
    }

    // Add the "Add New Employee" button if user has permission
    if (hasPermission(permissions, 'create-employees')) {
        const canCreate = !planLimits || planLimits.can_create;
        pageActions.push({
            label:
                planLimits && !canCreate
                    ? t('Employee Create Limit Reached ({{current}}/{{max}})', { current: planLimits.current_users, max: planLimits.max_users })
                    : t('Add Employee'),
            icon: <Plus className="mr-2 h-4 w-4" />,
            variant: canCreate ? 'default' : 'outline',
            onClick: canCreate
                ? () => handleAddNew()
                : () =>
                      toast.error(
                          t('Employee limit exceeded. Your plan allows maximum {{max}} users. Please upgrade your plan.', {
                              max: planLimits.max_users,
                          }),
                      ),
            disabled: !canCreate,
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('HR Management'), href: route('hr.employees.index') },
        { title: t('Employees') },
    ];

    // Define table columns
    const columns = [
        {
            key: 'name',
            label: t('Name'),
            sortable: true,
            render: (value: any, row: any) => {
                return (
                    <div className="flex items-center gap-3">
                        <div className="bg-primary flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-white">
                            {row.avatar ? <img src={row.avatar} alt={row.name} className="h-full w-full object-cover" /> : getInitials(row.name)}
                        </div>
                        <div>
                            <div className="font-medium">{row.name}</div>
                            <div className="text-muted-foreground text-sm">{row.email}</div>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'employee_id',
            label: t('Employee ID'),
            sortable: false,
            render: (value: any, row: any) => {
                const empId = row.employee?.employee_id;
                if (!empId) return '-';
                return (
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20 ring-inset dark:bg-blue-900/20 dark:text-blue-400">
                        {empId}
                    </span>
                );
            },
        },
        {
            key: 'department',
            label: t('Department'),
            render: (value: any, row: any) => {
                return row.employee?.department?.name || '-';
            },
        },
        {
            key: 'designation',
            label: t('Designation'),
            render: (value: any, row: any) => {
                return row.employee?.designation?.name || '-';
            },
        },
        {
            key: 'employee_status',
            label: t('Employee Status'),
            render: (value: any, row: any) => {
                const status = row.employee?.employee_status || 'active';
                return (
                    <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            status === 'active'
                                ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20 ring-inset'
                                : status === 'inactive'
                                  ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20 ring-inset'
                                  : status === 'probation'
                                    ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20 ring-inset'
                                    : status === 'terminated'
                                      ? 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20 ring-inset'
                                      : status === 'suspended'
                                        ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 ring-inset'
                                        : 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20 ring-inset'
                        }`}
                    >
                        {status === 'active' && t('Active')}
                        {status === 'inactive' && t('Inactive')}
                        {status === 'probation' && t('Probation')}
                        {status === 'terminated' && t('Terminated')}
                        {status === 'suspended' && t('Suspended')}
                    </span>
                );
            },
        },
        {
            key: 'date_of_joining',
            label: t('Joined'),
            sortable: false,
            render: (value: any, row: any) => {
                const joinDate = row.employee?.date_of_joining;
                return joinDate ? window.appSettings?.formatDateTimeSimple(joinDate, false) || new Date(joinDate).toLocaleDateString() : '-';
            },
        },
    ];

    // Define table actions
    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-employees',
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-employees',
        },
        {
            label: t('Change Password'),
            icon: 'Key',
            action: 'change-password',
            className: 'text-green-500',
            requiredPermission: 'edit-employees',
        },
        {
            label: t('Toggle Status'),
            icon: 'Lock',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'edit-employees',
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-employees',
        },
    ];

    // Prepare filter options
    const branchOptions = [
        { value: 'all', label: t('All Branches') },
        ...(branches || []).map((branch: any) => ({
            value: branch.id.toString(),
            label: branch.name,
        })),
    ];

    const departmentOptions = [
        { value: 'all', label: t('All Departments') },
        ...(departments || []).map((department: any) => ({
            value: department.id.toString(),
            label: department.name,
        })),
    ];

    const designationOptions = [
        { value: 'all', label: t('All Designations') },
        ...(designations || []).map((designation: any) => ({
            value: designation.id.toString(),
            label: designation.name,
        })),
    ];

    const statusOptions = [
        { value: 'all', label: t('All Statuses') },
        { value: 'active', label: t('Active') },
        { value: 'inactive', label: t('Inactive') },
        { value: 'probation', label: t('Probation') },
        { value: 'terminated', label: t('Terminated') },
        { value: 'suspended', label: t('Suspended') },
    ];

    const getStatusClass = (status: string | undefined) => {
        switch (status) {
            case 'active':
                return 'bg-green-50 text-green-700 ring-1 ring-green-600/20 ring-inset';
            case 'inactive':
                return 'bg-red-50 text-red-700 ring-1 ring-red-600/20 ring-inset';
            case 'probation':
                return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20 ring-inset';
            case 'terminated':
                return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20 ring-inset';
            case 'suspended':
                return 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 ring-inset';
            default:
                return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20 ring-inset';
        }
    };

    return (
        <PageTemplate title={t('Employees')} url="/hr/employees" actions={pageActions} breadcrumbs={breadcrumbs} noPadding>
            {/* Employee Reports — accessible from this list */}
            {hasPermission(permissions, 'manage-employees') && (
                <div className="mb-4 flex items-center justify-end gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <FileText className="h-4 w-4" />
                                {t('Employee Reports')}
                                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuItem
                                onClick={() => downloadEmployeeReport('hr.zambia-reports.employee-list')}
                                className="cursor-pointer"
                            >
                                <FileDown className="mr-2 h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">{t('Employee List Report')}</p>
                                    <p className="text-xs text-muted-foreground">{t('Names, DOJ, TPIN, NAPSA, NHIMA')}</p>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5">
                                <p className="text-xs text-muted-foreground mb-1">{t('Employee Status Report — Filter by:')}</p>
                                <select
                                    className="w-full border border-input rounded px-2 py-1 text-xs bg-background mb-1.5"
                                    value={reportStatusFilter}
                                    onChange={e => setReportStatusFilter(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <option value="all">{t('All Statuses')}</option>
                                    <option value="active">{t('Active')}</option>
                                    <option value="inactive">{t('Inactive')}</option>
                                    <option value="terminated">{t('Terminated')}</option>
                                    <option value="suspended">{t('Suspended')}</option>
                                    <option value="probation">{t('Probation')}</option>
                                </select>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-xs h-7"
                                    onClick={() => downloadEmployeeReport('hr.zambia-reports.employee-status', { status: reportStatusFilter })}
                                >
                                    <FileDown className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Download Status Report')}
                                </Button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            {/* Search and filters section */}
            <div className="mb-4 rounded-lg bg-white p-4 shadow dark:bg-gray-900">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'branch',
                            label: t('Branch'),
                            type: 'select',
                            value: selectedBranch,
                            onChange: setSelectedBranch,
                            options: branchOptions,
                            searchable: true,
                        },
                        {
                            name: 'department',
                            label: t('Department'),
                            type: 'select',
                            value: selectedDepartment,
                            onChange: setSelectedDepartment,
                            options: departmentOptions,
                            searchable: true,
                        },
                        {
                            name: 'designation',
                            label: t('Designation'),
                            type: 'select',
                            value: selectedDesignation,
                            onChange: setSelectedDesignation,
                            options: designationOptions,
                            searchable: true,
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: statusOptions,
                        },
                    ]}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                    onApplyFilters={applyFilters}
                    currentPerPage={pageFilters.per_page?.toString() || '10'}
                    onPerPageChange={(value) => {
                        router.get(
                            route('hr.employees.index'),
                            {
                                page: 1,
                                per_page: parseInt(value),
                                search: searchTerm || undefined,
                                department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
                                branch: selectedBranch !== 'all' ? selectedBranch : undefined,
                                designation: selectedDesignation !== 'all' ? selectedDesignation : undefined,
                                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                view: activeView,
                            },
                            { preserveState: true, preserveScroll: true },
                        );
                    }}
                    showViewToggle={true}
                    activeView={activeView}
                    onViewChange={(view) => {
                        setActiveView(view);
                        router.get(
                            route('hr.employees.index'),
                            {
                                page: 1,
                                view,
                                search: searchTerm || undefined,
                                department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
                                branch: selectedBranch !== 'all' ? selectedBranch : undefined,
                                designation: selectedDesignation !== 'all' ? selectedDesignation : undefined,
                                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                per_page: pageFilters.per_page,
                            },
                            { preserveState: true, preserveScroll: true },
                        );
                    }}
                />
            </div>

            {/* Content section */}
            {activeView === 'list' ? (
                <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-900">
                    <CrudTable
                        columns={columns}
                        actions={actions}
                        data={employees?.data || []}
                        from={employees?.from || 1}
                        onAction={handleAction}
                        sortField={pageFilters.sort_field}
                        sortDirection={pageFilters.sort_direction}
                        onSort={handleSort}
                        permissions={permissions}
                        entityPermissions={{
                            view: 'view-employees',
                            create: 'create-employees',
                            edit: 'edit-employees',
                            delete: 'delete-employees',
                        }}
                    />

                    {/* Pagination section */}
                    <Pagination
                        from={employees?.from || 0}
                        to={employees?.to || 0}
                        total={employees?.total || 0}
                        links={employees?.links}
                        entityName={t('employees')}
                        onPageChange={handlePageChange}
                    />
                </div>
            ) : (
                <div>
                    {/* Grid View */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {employees?.data?.map((employee: any) => (
                            <Card
                                key={employee.id}
                                className="rounded-lg border border-gray-300 bg-white shadow dark:border-gray-700 dark:bg-gray-900"
                            >
                                {/* Header */}
                                <div className="p-6">
                                    <div className="mb-4 flex items-start justify-between">
                                        <div className="flex items-start space-x-4">
                                            <div className="bg-primary flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-white">
                                                {employee.avatar ? (
                                                    <img src={employee.avatar} alt={employee.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    getInitials(employee.name)
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">{employee.name}</h3>
                                                <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">{employee.email}</p>
                                                <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                                                    {employee.employee?.employee_id || '-'}
                                                </p>
                                                <div className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusClass(employee.employee?.employee_status)}`}>
                                                    {employee.employee?.employee_status === 'active' && t('Active')}
                                                    {employee.employee?.employee_status === 'inactive' && t('Inactive')}
                                                    {employee.employee?.employee_status === 'probation' && t('Probation')}
                                                    {employee.employee?.employee_status === 'terminated' && t('Terminated')}
                                                    {employee.employee?.employee_status === 'suspended' && t('Suspended')}
                                                    {!employee.employee?.employee_status && t('Active')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="z-50 w-48" sideOffset={5}>
                                                {hasPermission(permissions, 'view-employees') && (
                                                    <DropdownMenuItem onClick={() => handleAction('view', employee)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        <span>{t('View Employee')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'edit-employees') && (
                                                    <DropdownMenuItem onClick={() => handleAction('change-password', employee)}>
                                                        <Key className="mr-2 h-4 w-4" />
                                                        <span>{t('Change Password')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'edit-employees') && (
                                                    <DropdownMenuItem onClick={() => handleAction('toggle-status', employee)}>
                                                        {employee.status === 'active' ? (
                                                            <Lock className="mr-2 h-4 w-4" />
                                                        ) : (
                                                            <Unlock className="mr-2 h-4 w-4" />
                                                        )}
                                                        <span>{employee.status === 'active' ? t('Deactivate') : t('Activate')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                {hasPermission(permissions, 'edit-employees') && (
                                                    <DropdownMenuItem onClick={() => handleAction('edit', employee)} className="text-amber-600">
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        <span>{t('Edit')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'delete-employees') && (
                                                    <DropdownMenuItem onClick={() => handleAction('delete', employee)} className="text-rose-600">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>{t('Delete')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Department & Designation info */}
                                    <div className="mb-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
                                        <div className="mb-1 text-sm">
                                            <span className="font-medium">{t('Department')}:</span> {employee.employee?.department?.name || '-'}
                                        </div>
                                        <div className="text-sm">
                                            <span className="font-medium">{t('Designation')}:</span> {employee.employee?.designation?.name || '-'}
                                        </div>
                                    </div>

                                    {/* Joined date */}
                                    <div className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-medium text-gray-600 dark:text-gray-300">{t('Joining Date')} : </span>{' '}
                                        {employee.employee?.date_of_joining
                                            ? window.appSettings?.formatDateTimeSimple(employee.employee.date_of_joining, false) ||
                                              new Date(employee.employee.date_of_joining).toLocaleDateString()
                                            : '-'}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-2">
                                        {hasPermission(permissions, 'edit-employees') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAction('edit', employee)}
                                                className="h-9 flex-1 border-gray-300 text-sm dark:border-gray-600 dark:text-gray-200"
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                {t('Edit')}
                                            </Button>
                                        )}

                                        {hasPermission(permissions, 'view-employees') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAction('view', employee)}
                                                className="h-9 flex-1 border-gray-300 text-sm dark:border-gray-600 dark:text-gray-200"
                                            >
                                                <Eye className="mr-2 h-4 w-4" />
                                                {t('View')}
                                            </Button>
                                        )}

                                        {hasPermission(permissions, 'delete-employees') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAction('delete', employee)}
                                                className="h-9 flex-1 border-gray-300 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {t('Delete')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination for grid view */}
                    <div className="mt-6 overflow-hidden rounded-lg bg-white shadow dark:bg-gray-900">
                        <Pagination
                            from={employees?.from || 0}
                            to={employees?.to || 0}
                            total={employees?.total || 0}
                            links={employees?.links}
                            entityName={t('employees')}
                            onPageChange={handlePageChange}
                        />
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName="employee"
            />

            {/* Change Password Modal */}
            <CrudFormModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onSubmit={handlePasswordChange}
                formConfig={{
                    fields: [
                        {
                            name: 'password',
                            label: t('New Password'),
                            type: 'password',
                            required: true,
                        },
                        {
                            name: 'password_confirmation',
                            label: t('Confirm Password'),
                            type: 'password',
                            required: true,
                        },
                    ],
                    modalSize: 'md',
                }}
                initialData={{}}
                title={t('Change Employee Password')}
                mode="edit"
            />

            {/* Import Modal */}
            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title={t('Import Employees from CSV/Excel')}
                importRoute="hr.employees.import"
                parseRoute="hr.employees.parse"
                sampleRoute={hasSampleFile ? 'hr.employees.download.template' : undefined}
                importNotes={t(
                    'Ensure that the values entered for Department, Designation, Branch , Shift , Attedance Policy , Employement Type , Employement Status match the existing records in your system.',
                )}
                modalSize="xl"
                databaseFields={[
                    { key: 'name', required: true },
                    { key: 'email', required: true },
                    { key: 'password', required: true },
                    { key: 'employee_id' },
                    { key: 'biometric_emp_id' },
                    { key: 'phone', required: true },
                    { key: 'department' },
                    { key: 'designation' },
                    { key: 'branch' },
                    { key: 'base_salary', required: true },
                    { key: 'date_of_joining', required: true },
                    { key: 'date_of_birth', required: true },
                    { key: 'gender', required: true },
                    { key: 'shift' },
                    { key: 'attendance_policy' },
                    { key: 'employment_type' },
                    { key: 'employee_status' },
                    { key: 'city', required: true },
                    { key: 'state', required: true },
                    { key: 'country', required: true },
                    { key: 'postal_code', required: true },
                    { key: 'address', required: true },
                    { key: 'bank_name', required: true },
                    { key: 'account_number', required: true },
                    { key: 'bank_identifier_code', required: true },
                    { key: 'bank_branch', required: true },
                ]}
            />
        </PageTemplate>
    );
} 
