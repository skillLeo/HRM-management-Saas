// pages/hr/employee-salaries/index.tsx
import { useState } from 'react';
import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComponentEntry {
  id: string;
  amount: string;
}

interface SalaryComponent {
  id: number;
  name: string;
  type: 'earning' | 'deduction';
  calculation_type: 'fixed' | 'percentage';
  default_amount: number | null;
  percentage_of_basic: number | null;
  status?: 'active' | 'inactive';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function componentDefaultLabel(comp: SalaryComponent): string {
  if (comp.calculation_type === 'percentage') {
    return `${comp.percentage_of_basic ?? 0}% of basic`;
  }
  return window.appSettings?.formatCurrency(comp.default_amount ?? 0) ?? String(comp.default_amount ?? 0);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EmployeeSalaries() {
  const { t } = useTranslation();
  const { auth, employeeSalaries, employees, salaryComponents, filters: pageFilters = {} } =
    usePage().props as any;
  const permissions = auth?.permissions || [];

  // ── Filter state ─────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || 'all');
  const [selectedIsActive, setSelectedIsActive] = useState(pageFilters.is_active || 'all');
  const [showFilters, setShowFilters] = useState(false);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  // ── Form state ────────────────────────────────────────────────────────────
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formBasicSalary, setFormBasicSalary] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const [formComponents, setFormComponents] = useState<ComponentEntry[]>([]);

  // ── Derived: available components ─────────────────────────────────────────
  const allComponents: SalaryComponent[] = salaryComponents || [];

  const activeComponents = allComponents.filter(
    (sc) => !sc.status || sc.status === 'active'
  );

  const availableComponents = activeComponents.filter(
    (sc) => !formComponents.some((c) => String(c.id) === String(sc.id))
  );

  // ── Filter helpers ────────────────────────────────────────────────────────
  const hasActiveFilters = () =>
    searchTerm !== '' || selectedEmployee !== 'all' || selectedIsActive !== 'all';
  const activeFilterCount = () =>
    (searchTerm ? 1 : 0) + (selectedEmployee !== 'all' ? 1 : 0) + (selectedIsActive !== 'all' ? 1 : 0);

  const applyFilters = () => {
    router.get(
      route('hr.employee-salaries.index'),
      {
        page: 1,
        search: searchTerm || undefined,
        employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
        is_active: selectedIsActive !== 'all' ? selectedIsActive : undefined,
        per_page: pageFilters.per_page,
      },
      { preserveState: true, preserveScroll: true }
    );
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); applyFilters(); };

  const handleSort = (field: string) => {
    const direction =
      pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    router.get(
      route('hr.employee-salaries.index'),
      {
        sort_field: field, sort_direction: direction, page: 1,
        search: searchTerm || undefined,
        employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
        is_active: selectedIsActive !== 'all' ? selectedIsActive : undefined,
        per_page: pageFilters.per_page,
      },
      { preserveState: true, preserveScroll: true }
    );
  };

  const handleResetFilters = () => {
    setSearchTerm(''); setSelectedEmployee('all'); setSelectedIsActive('all');
    setShowFilters(false);
    router.get(
      route('hr.employee-salaries.index'),
      { page: 1, per_page: pageFilters.per_page },
      { preserveState: true, preserveScroll: true }
    );
  };

  // ── Open form ─────────────────────────────────────────────────────────────

  const openForm = (mode: 'create' | 'edit' | 'view', item: any = null) => {
    setFormMode(mode);
    setCurrentItem(item);

    if (item) {
      setFormEmployeeId(String(item.employee_id ?? ''));
      setFormBasicSalary(String(item.basic_salary ?? ''));
      setFormIsActive(item.is_active ?? true);
      setFormNotes(item.notes ?? '');

      const raw: any[] = item.components ?? [];
      if (raw.length === 0) {
        setFormComponents([]);
      } else if (typeof raw[0] === 'object' && raw[0] !== null && 'id' in raw[0]) {
        setFormComponents(raw.map((c: any) => ({
          id: String(c.id),
          amount: c.amount !== null && c.amount !== undefined ? String(c.amount) : '',
        })));
      } else {
        setFormComponents(raw.map((id: any) => ({ id: String(id), amount: '' })));
      }
    } else {
      setFormEmployeeId('');
      setFormBasicSalary('');
      setFormIsActive(true);
      setFormNotes('');
      setFormComponents([]);
    }

    setIsFormModalOpen(true);
  };

  // ── Component management ──────────────────────────────────────────────────

  const addComponent = (id: string) => {
    if (!id) return;
    setFormComponents(prev => {
      if (prev.some(c => String(c.id) === String(id))) return prev;
      return [...prev, { id: String(id), amount: '' }];
    });
  };

  const removeComponent = (id: string) => {
    setFormComponents(prev => prev.filter(c => c.id !== id));
  };

  const updateComponentAmount = (id: string, amount: string) => {
    setFormComponents(prev =>
      prev.map(c => c.id === id ? { ...c, amount } : c)
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      employee_id: formEmployeeId,
      basic_salary: formBasicSalary,
      is_active: formIsActive,
      notes: formNotes,
      components: formComponents.map(c => ({
        id: c.id,
        amount: c.amount !== '' ? c.amount : null,
      })),
    };

    if (formMode === 'create') {
      toast.loading(t('Creating employee salary...'));
      router.post(route('hr.employee-salaries.store'), payload, {
        onSuccess: page => {
          setIsFormModalOpen(false);
          toast.dismiss();
          if (page.props.flash?.success) toast.success(t(page.props.flash.success));
          else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
        },
        onError: errors => {
          toast.dismiss();
          toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
        },
      });
    } else if (formMode === 'edit') {
      toast.loading(t('Updating employee salary...'));
      router.put(route('hr.employee-salaries.update', currentItem.id), payload, {
        onSuccess: page => {
          setIsFormModalOpen(false);
          toast.dismiss();
          if (page.props.flash?.success) toast.success(t(page.props.flash.success));
          else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
        },
        onError: errors => {
          toast.dismiss();
          toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
        },
      });
    }
  };

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);
    if (action === 'view')               openForm('view', item);
    else if (action === 'edit')          openForm('edit', item);
    else if (action === 'delete')        setIsDeleteModalOpen(true);
    else if (action === 'toggle-status') handleToggleStatus(item);
    else if (action === 'show-payroll')  handleShowPayroll(item);
  };

  const handleDeleteConfirm = () => {
    toast.loading(t('Deleting employee salary...'));
    router.delete(route('hr.employee-salaries.destroy', currentItem.id), {
      onSuccess: page => {
        setIsDeleteModalOpen(false);
        toast.dismiss();
        if (page.props.flash?.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
      },
      onError: () => { toast.dismiss(); toast.error(t('Failed to delete employee salary')); },
    });
  };

  const handleToggleStatus = (salary: any) => {
    toast.loading(salary.is_active ? t('Deactivating...') : t('Activating...'));
    router.put(route('hr.employee-salaries.toggle-status', salary.id), {}, {
      onSuccess: page => {
        toast.dismiss();
        if (page.props.flash?.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
      },
      onError: () => { toast.dismiss(); toast.error(t('Failed to update status')); },
    });
  };

  const handleShowPayroll = (salary: any) => {
    router.get(route('hr.employee-salaries.show-payroll', salary.id), {}, {
      onError: () => toast.error(t('Failed to load payroll calculation')),
    });
  };

  // ── Table config ──────────────────────────────────────────────────────────

  const columns = [
    {
      key: 'employee',
      label: t('Employee'),
      render: (_: any, row: any) => row.employee?.name || '-',
    },
    {
      key: 'basic_salary',
      label: t('Basic Salary'),
      render: (v: number) => (
        <span className="font-mono text-green-600">
          {window.appSettings?.formatCurrency(v || 0)}
        </span>
      ),
    },
    {
      key: 'components',
      label: t('Components'),
      render: (_: any, row: any) => {
        const names: string[] = row.component_names || [];
        const types: string[] = row.component_types || [];
        if (names.length === 0) return <span className="text-gray-500">Basic only</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {names.map((name, i) => (
              <span
                key={i}
                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                  types[i] === 'earning'
                    ? 'bg-green-50 text-green-700 ring-green-700/10'
                    : 'bg-red-50 text-red-700 ring-red-700/10'
                }`}
              >
                {name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'is_active',
      label: t('Status'),
      render: (v: boolean) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
          v ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'
        }`}>
          {v ? t('Active') : t('Inactive')}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: t('Created At'),
      sortable: true,
      render: (v: string) =>
        window.appSettings?.formatDateTimeSimple(v, false) || new Date(v).toLocaleDateString(),
    },
  ];

  const actions = [
    { label: t('View'),          icon: 'Eye',       action: 'view',          className: 'text-blue-500',  requiredPermission: 'view-employee-salaries' },
    { label: t('Edit'),          icon: 'Edit',      action: 'edit',          className: 'text-amber-500', requiredPermission: 'edit-employee-salaries' },
    { label: t('Toggle Status'), icon: 'Lock',      action: 'toggle-status', className: 'text-amber-500', requiredPermission: 'edit-employee-salaries' },
    { label: t('Show Payroll'),  icon: 'BarChart3', action: 'show-payroll',  className: 'text-blue-500',  requiredPermission: 'view-employee-salaries' },
    { label: t('Delete'),        icon: 'Trash2',    action: 'delete',        className: 'text-red-500',   requiredPermission: 'delete-employee-salaries' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageTemplate
      title={t('Employee Salaries')}
      url="/hr/employee-salaries"
      actions={[]}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Payroll Management'), href: route('hr.employee-salaries.index') },
        { title: t('Employee Salaries') },
      ]}
      noPadding
    >
      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 p-4">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'employee_id', label: t('Employee'), type: 'select',
              value: selectedEmployee, onChange: setSelectedEmployee, searchable: true,
              options: [
                { value: 'all', label: t('All Employees'), disabled: true },
                ...(employees || []).map((e: any) => ({ value: e.id.toString(), label: e.name })),
              ],
            },
            {
              name: 'is_active', label: t('Status'), type: 'select',
              value: selectedIsActive, onChange: setSelectedIsActive,
              options: [
                { value: 'all', label: t('All Status'), disabled: true },
                { value: 'active', label: t('Active') },
                { value: 'inactive', label: t('Inactive') },
              ],
            },
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
          onApplyFilters={applyFilters}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={value => {
            router.get(route('hr.employee-salaries.index'), {
              page: 1, per_page: parseInt(value),
              search: searchTerm || undefined,
              employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
              is_active: selectedIsActive !== 'all' ? selectedIsActive : undefined,
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={employeeSalaries?.data || []}
          from={employeeSalaries?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-employee-salaries',
            create: 'create-employee-salaries',
            edit: 'edit-employee-salaries',
            delete: 'delete-employee-salaries',
          }}
        />
        <Pagination
          from={employeeSalaries?.from || 0}
          to={employeeSalaries?.to || 0}
          total={employeeSalaries?.total || 0}
          links={employeeSalaries?.links}
          entityName={t('employee salaries')}
          onPageChange={url => router.get(url)}
        />
      </div>

      {/* ── Salary Form Modal ──────────────────────────────────────────────── */}
      <Dialog open={isFormModalOpen} onOpenChange={open => !open && setIsFormModalOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? t('Setup Employee Salary') :
               formMode === 'edit'   ? t('Edit Employee Salary')  :
                                       t('View Employee Salary')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-5">

            {/* Employee */}
            <div className="space-y-1">
              <Label>{t('Employee')} <span className="text-red-500">*</span></Label>
              {formMode === 'create' ? (
                <Select value={formEmployeeId} onValueChange={setFormEmployeeId} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select employee')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(employees || []).map((e: any) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={currentItem?.employee?.name || ''} disabled />
              )}
            </div>

            {/* Basic Salary */}
            <div className="space-y-1">
              <Label>{t('Basic Salary')} <span className="text-red-500">*</span></Label>
              <Input
                type="number" min={0} step="0.01"
                value={formBasicSalary}
                onChange={e => setFormBasicSalary(e.target.value)}
                placeholder={t('Enter basic salary amount')}
                disabled={formMode === 'view'}
                required
              />
            </div>

            {/* Salary Components */}
            <div className="space-y-3">
              <div>
                <Label>{t('Salary Components')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('Leave amount blank to use the default. Enter a number to override for this employee only.')}
                </p>
              </div>

              {/* Added components list */}
              {formComponents.length > 0 && (
                <div className="space-y-2">
                  {formComponents.map(entry => {
                    const comp = allComponents.find(
                      (sc) => String(sc.id) === String(entry.id)
                    );
                    const label    = comp?.name ?? `Component #${entry.id}`;
                    const ctype    = comp?.type ?? 'earning';
                    const defLabel = comp ? componentDefaultLabel(comp) : '—';
                    const isInactive = comp?.status === 'inactive';

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2"
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`shrink-0 inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                              ctype === 'earning'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {ctype === 'earning' ? t('Earning') : t('Deduction')}
                            </span>
                            <span className="text-sm font-medium truncate">{label}</span>
                            {isInactive && (
                              <span className="text-xs text-gray-400 italic">({t('inactive')})</span>
                            )}
                          </div>
                          <div className="mt-1.5">
                            <Input
                              type="number" min={0} step="0.01"
                              value={entry.amount}
                              onChange={e => updateComponentAmount(entry.id, e.target.value)}
                              placeholder={`${t('Default')}: ${defLabel}`}
                              disabled={formMode === 'view'}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        {formMode !== 'view' && (
                          <button
                            type="button"
                            onClick={() => removeComponent(entry.id)}
                            className="shrink-0 text-gray-400 hover:text-red-500 transition-colors mt-0.5"
                            title={t('Remove')}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Native <select> — works inside Dialog without any portal/z-index issues */}
              {formMode !== 'view' && (
                activeComponents.length === 0 ? (
                  <p className="text-xs text-amber-600">
                    {t('No active salary components defined. Add components in Salary Components settings first.')}
                  </p>
                ) : availableComponents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    {t('All available components have been added.')}
                  </p>
                ) : (
                  <select
                    value=""
                    onChange={e => {
                      if (e.target.value) {
                        addComponent(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                  >
                    <option value="">{t('— Select a component to add —')}</option>
                    {(() => {
                      const earnings   = availableComponents.filter(sc => sc.type === 'earning');
                      const deductions = availableComponents.filter(sc => sc.type === 'deduction');
                      const bothExist  = earnings.length > 0 && deductions.length > 0;
                      const renderOptions = (list: SalaryComponent[]) =>
                        list.map(sc => (
                          <option key={sc.id} value={String(sc.id)}>
                            {sc.type === 'earning' ? '▲' : '▼'} {sc.name} ({componentDefaultLabel(sc)})
                          </option>
                        ));
                      if (bothExist) {
                        return (
                          <>
                            <optgroup label={t('── Earnings')}>
                              {renderOptions(earnings)}
                            </optgroup>
                            <optgroup label={t('── Deductions')}>
                              {renderOptions(deductions)}
                            </optgroup>
                          </>
                        );
                      }
                      return renderOptions(availableComponents);
                    })()}
                  </select>
                )
              )}
            </div>

            {/* Is Active */}
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={formIsActive}
                onChange={e => setFormIsActive(e.target.checked)}
                disabled={formMode === 'view'}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active">{t('Is Active')}</Label>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label>{t('Notes')}</Label>
              <textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                disabled={formMode === 'view'}
                placeholder={t('Select components to be applied to this salary')}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {formMode !== 'view' && (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
                  {t('Cancel')}
                </Button>
                <Button type="submit">
                  {formMode === 'create' ? t('Create') : t('Save')}
                </Button>
              </DialogFooter>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.employee?.name} - Basic Salary` || ''}
        entityName="employee salary"
      />
    </PageTemplate>
  );
}