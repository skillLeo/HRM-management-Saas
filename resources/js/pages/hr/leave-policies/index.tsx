// pages/hr/leave-policies/index.tsx
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Leave Policy Form Modal ──────────────────────────────────────────────────

function LeavePolicyFormModal({
  isOpen, onClose, onSubmit, leaveTypes, initialData, mode, title
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  leaveTypes: any[];
  initialData: any;
  mode: 'create' | 'edit' | 'view';
  title: string;
}) {
  const { t } = useTranslation();
  const isView = mode === 'view';

  const [form, setForm] = useState({
    name: '',
    description: '',
    leave_type_id: '',
    allocation_type: 'accrual',
    accrual_type: 'yearly',
    accrual_rate: '',
    fixed_days: '',
    fixed_days_unit: 'days',
    carry_forward_limit: '0',
    min_days_per_application: '1',
    max_days_per_application: '30',
    requires_approval: true,
    status: 'active',
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          name: initialData.name || '',
          description: initialData.description || '',
          leave_type_id: initialData.leave_type_id?.toString() || '',
          allocation_type: initialData.allocation_type || 'accrual',
          accrual_type: initialData.accrual_type || 'yearly',
          accrual_rate: initialData.accrual_rate?.toString() || '',
          fixed_days: initialData.fixed_days?.toString() || '',
          fixed_days_unit: initialData.fixed_days_unit || 'days',
          carry_forward_limit: initialData.carry_forward_limit?.toString() || '0',
          min_days_per_application: initialData.min_days_per_application?.toString() || '1',
          max_days_per_application: initialData.max_days_per_application?.toString() || '30',
          requires_approval: initialData.requires_approval !== undefined ? initialData.requires_approval : true,
          status: initialData.status || 'active',
        });
      } else {
        setForm({
          name: '', description: '', leave_type_id: '',
          allocation_type: 'accrual', accrual_type: 'yearly', accrual_rate: '',
          fixed_days: '', fixed_days_unit: 'days',
          carry_forward_limit: '0', min_days_per_application: '1', max_days_per_application: '30',
          requires_approval: true, status: 'active',
        });
      }
    }
  }, [isOpen, initialData]);

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      accrual_rate: form.allocation_type === 'accrual' ? parseFloat(form.accrual_rate) || 0 : null,
      fixed_days: form.allocation_type === 'fixed' ? parseFloat(form.fixed_days) || null : null,
      fixed_days_unit: form.allocation_type === 'fixed' ? form.fixed_days_unit : null,
      accrual_type: form.allocation_type === 'accrual' ? form.accrual_type : null,
      carry_forward_limit: parseInt(form.carry_forward_limit) || 0,
      min_days_per_application: parseInt(form.min_days_per_application) || 1,
      max_days_per_application: parseInt(form.max_days_per_application) || 1,
      requires_approval: form.requires_approval,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Policy Name */}
          <div className="space-y-1">
            <Label>{t('Policy Name')} <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              required disabled={isView} placeholder={t('e.g. Annual Leave Policy')} />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>{t('Description')}</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)}
              disabled={isView} rows={2} />
          </div>

          {/* Leave Type */}
          <div className="space-y-1">
            <Label>{t('Leave Type')} <span className="text-red-500">*</span></Label>
            <Select value={form.leave_type_id} onValueChange={v => set('leave_type_id', v)} disabled={isView}>
              <SelectTrigger><SelectValue placeholder={t('Select Leave Type')} /></SelectTrigger>
              <SelectContent>
                {(leaveTypes || []).map((lt: any) => (
                  <SelectItem key={lt.id} value={lt.id.toString()}>{lt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Allocation Type — the key new field */}
          <div className="space-y-2">
            <Label>{t('Allocation Type')} <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'accrual', label: t('Accrual'), desc: t('Leave accrues over time (monthly or yearly)') },
                { value: 'fixed', label: t('Fixed'),   desc: t('Set number of days/weeks per financial year') },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isView}
                  onClick={() => !isView && set('allocation_type', opt.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    form.allocation_type === opt.value
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  } ${isView ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="font-semibold text-sm">{opt.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Accrual fields — shown only when allocation_type = accrual */}
          {form.allocation_type === 'accrual' && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg border">
              <div className="space-y-1">
                <Label>{t('Accrual Type')} <span className="text-red-500">*</span></Label>
                <Select value={form.accrual_type} onValueChange={v => set('accrual_type', v)} disabled={isView}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yearly">{t('Yearly')}</SelectItem>
                    <SelectItem value="monthly">{t('Monthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('Accrual Rate (Days)')} <span className="text-red-500">*</span></Label>
                <Input type="number" min="0" step="0.5" value={form.accrual_rate}
                  onChange={e => set('accrual_rate', e.target.value)}
                  required={form.allocation_type === 'accrual'} disabled={isView}
                  placeholder="e.g. 1.75" />
              </div>
            </div>
          )}

          {/* Fixed fields — shown only when allocation_type = fixed */}
          {form.allocation_type === 'fixed' && (
            <div className="p-3 bg-gray-50 rounded-lg border">
              <Label className="block mb-2">
                {t('Entitlement per Financial Year')} <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input type="number" min="0.5" step="0.5" value={form.fixed_days}
                  onChange={e => set('fixed_days', e.target.value)}
                  required={form.allocation_type === 'fixed'} disabled={isView}
                  placeholder="e.g. 14" className="flex-1" />
                <Select value={form.fixed_days_unit} onValueChange={v => set('fixed_days_unit', v)} disabled={isView}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">{t('Days')}</SelectItem>
                    <SelectItem value="weeks">{t('Weeks')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t('e.g. 14 weeks for Maternity Leave, 10 days for Sick Leave')}
              </p>
            </div>
          )}

          {/* Carry Forward */}
          <div className="space-y-1">
            <Label>{t('Carry Forward Limit (Days)')} <span className="text-red-500">*</span></Label>
            <Input type="number" min="0" value={form.carry_forward_limit}
              onChange={e => set('carry_forward_limit', e.target.value)}
              required disabled={isView} />
          </div>

          {/* Min / Max days */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t('Min Days Per Application')} <span className="text-red-500">*</span></Label>
              <Input type="number" min="1" value={form.min_days_per_application}
                onChange={e => set('min_days_per_application', e.target.value)}
                required disabled={isView} />
            </div>
            <div className="space-y-1">
              <Label>{t('Max Days Per Application')} <span className="text-red-500">*</span></Label>
              <Input type="number" min="1" value={form.max_days_per_application}
                onChange={e => set('max_days_per_application', e.target.value)}
                required disabled={isView} />
            </div>
          </div>

          {/* Requires Approval + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t('Requires Approval')}</Label>
              <Select value={form.requires_approval ? 'yes' : 'no'}
                onValueChange={v => set('requires_approval', v === 'yes')} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t('Yes')}</SelectItem>
                  <SelectItem value="no">{t('No')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('Status')}</Label>
              <Select value={form.status} onValueChange={v => set('status', v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('Active')}</SelectItem>
                  <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isView && (
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button>
              <Button type="submit">{mode === 'create' ? t('Create') : t('Update')}</Button>
            </DialogFooter>
          )}
          {isView && (
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t('Close')}</Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeavePolicies() {
  const { t } = useTranslation();
  const { auth, leavePolicies, leaveTypes, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedLeaveType, setSelectedLeaveType] = useState(pageFilters.leave_type_id || 'all');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  const hasActiveFilters = () => searchTerm !== '' || selectedLeaveType !== 'all' || selectedStatus !== 'all';
  const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedLeaveType !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); applyFilters(); };

  const applyFilters = () => {
    router.get(route('hr.leave-policies.index'), {
      page: 1,
      search: searchTerm || undefined,
      leave_type_id: selectedLeaveType !== 'all' ? selectedLeaveType : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    router.get(route('hr.leave-policies.index'), {
      sort_field: field, sort_direction: direction, page: 1,
      search: searchTerm || undefined,
      leave_type_id: selectedLeaveType !== 'all' ? selectedLeaveType : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);
    switch (action) {
      case 'view':   setFormMode('view');  setIsFormModalOpen(true); break;
      case 'edit':   setFormMode('edit');  setIsFormModalOpen(true); break;
      case 'delete': setIsDeleteModalOpen(true); break;
      case 'toggle-status': handleToggleStatus(item); break;
    }
  };

  const handleAddNew = () => { setCurrentItem(null); setFormMode('create'); setIsFormModalOpen(true); };

  const handleFormSubmit = (formData: any) => {
    const isCreate = formMode === 'create';
    if (!globalSettings?.is_demo) toast.loading(t(isCreate ? 'Creating leave policy...' : 'Updating leave policy...'));

    const action = isCreate
      ? router.post(route('hr.leave-policies.store'), formData, opts())
      : router.put(route('hr.leave-policies.update', currentItem.id), formData, opts());

    function opts() {
      return {
        onSuccess: (page: any) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) toast.success(t(page.props.flash.success));
          else if (page.props.flash.error) toast.error(t(page.props.flash.error));
        },
        onError: (errors: any) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
        }
      };
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting leave policy...'));
    router.delete(route('hr.leave-policies.destroy', currentItem.id), {
      onSuccess: (page: any) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash.error) toast.error(t(page.props.flash.error));
      },
      onError: (errors: any) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
      }
    });
  };

  const handleToggleStatus = (leavePolicy: any) => {
    const newStatus = leavePolicy.status === 'active' ? 'inactive' : 'active';
    if (!globalSettings?.is_demo) toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} leave policy...`);
    router.put(route('hr.leave-policies.toggle-status', leavePolicy.id), {}, {
      onSuccess: (page: any) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash.error) toast.error(t(page.props.flash.error));
      },
      onError: (errors: any) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
      }
    });
  };

  const handleResetFilters = () => {
    setSearchTerm(''); setSelectedLeaveType('all'); setSelectedStatus('all'); setShowFilters(false);
    router.get(route('hr.leave-policies.index'), { page: 1, per_page: pageFilters.per_page },
      { preserveState: true, preserveScroll: true });
  };

  const pageActions = [];
  if (hasPermission(permissions, 'create-leave-policies')) {
    pageActions.push({
      label: t('Add Leave Policy'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Leave Management'), href: route('hr.leave-policies.index') },
    { title: t('Leave Policies') }
  ];

  const columns = [
    { key: 'name', label: t('Policy Name'), sortable: true },
    {
      key: 'leave_type',
      label: t('Leave Type'),
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.leave_type?.color }} />
          <span>{row.leave_type?.name || '-'}</span>
        </div>
      )
    },
    {
      key: 'allocation',
      label: t('Allocation'),
      render: (_: any, row: any) => {
        if (row.allocation_type === 'fixed') {
          return (
            <span className="font-mono">
              {row.fixed_days} {row.fixed_days_unit === 'weeks' ? t('weeks') : t('days')}/{t('year')}
            </span>
          );
        }
        return (
          <span className="font-mono">
            {row.accrual_rate} {t('days')}/{row.accrual_type}
          </span>
        );
      }
    },
    {
      key: 'carry_forward_limit',
      label: t('Carry Forward'),
      render: (value: number) => <span className="font-mono">{value} {t('days')}</span>
    },
    {
      key: 'requires_approval',
      label: t('Approval'),
      render: (value: boolean) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value
          ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
          : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'}`}>
          {value ? t('Required') : t('Not Required')}
        </span>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'active'
          ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
          : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'}`}>
          {value === 'active' ? t('Active') : t('Inactive')}
        </span>
      )
    },
    {
      key: 'created_at',
      label: t('Created At'),
      sortable: true,
      render: (value: string) => window.appSettings?.formatDateTimeSimple(value, false) || new Date(value).toLocaleDateString()
    }
  ];

  const actions = [
    { label: t('View'),          icon: 'Eye',   action: 'view',          className: 'text-blue-500',  requiredPermission: 'view-leave-policies' },
    { label: t('Edit'),          icon: 'Edit',  action: 'edit',          className: 'text-amber-500', requiredPermission: 'edit-leave-policies' },
    { label: t('Toggle Status'), icon: 'Lock',  action: 'toggle-status', className: 'text-amber-500', requiredPermission: 'edit-leave-policies' },
    { label: t('Delete'),        icon: 'Trash2',action: 'delete',        className: 'text-red-500',   requiredPermission: 'delete-leave-policies' }
  ];

  const leaveTypeOptions = [
    { value: 'all', label: t('All Leave Types'), disabled: true },
    ...(leaveTypes || []).map((type: any) => ({ value: type.id.toString(), label: type.name }))
  ];

  const statusOptions = [
    { value: 'all', label: t('All Statuses'), disabled: true },
    { value: 'active', label: t('Active') },
    { value: 'inactive', label: t('Inactive') }
  ];

  return (
    <PageTemplate title={t('Leave Policies')} url="/hr/leave-policies" actions={pageActions} breadcrumbs={breadcrumbs} noPadding>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 p-4">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            { name: 'leave_type_id', label: t('Leave Type'), type: 'select', value: selectedLeaveType, onChange: setSelectedLeaveType, options: leaveTypeOptions, searchable: true },
            { name: 'status', label: t('Status'), type: 'select', value: selectedStatus, onChange: setSelectedStatus, options: statusOptions }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
          onApplyFilters={applyFilters}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            router.get(route('hr.leave-policies.index'), {
              page: 1, per_page: parseInt(value),
              search: searchTerm || undefined,
              leave_type_id: selectedLeaveType !== 'all' ? selectedLeaveType : undefined,
              status: selectedStatus !== 'all' ? selectedStatus : undefined
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns} actions={actions} data={leavePolicies?.data || []}
          from={leavePolicies?.from || 1} onAction={handleAction}
          sortField={pageFilters.sort_field} sortDirection={pageFilters.sort_direction}
          onSort={handleSort} permissions={permissions}
          entityPermissions={{ view: 'view-leave-policies', create: 'create-leave-policies', edit: 'edit-leave-policies', delete: 'delete-leave-policies' }}
        />
        <Pagination
          from={leavePolicies?.from || 0} to={leavePolicies?.to || 0}
          total={leavePolicies?.total || 0} links={leavePolicies?.links}
          entityName={t('leave policies')} onPageChange={(url) => router.get(url)}
        />
      </div>

      <LeavePolicyFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        leaveTypes={leaveTypes || []}
        initialData={currentItem}
        mode={formMode}
        title={formMode === 'create' ? t('Add New Leave Policy') : formMode === 'edit' ? t('Edit Leave Policy') : t('View Leave Policy')}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="leave policy"
      />
    </PageTemplate>
  );
}
