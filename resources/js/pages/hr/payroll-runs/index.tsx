import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Play, FileDown, FileUp, Send, CheckCircle, Unlock } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { ImportModal } from '@/components/ImportModal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_MONTHS = [
  { value: '01', label: 'January' },  { value: '02', label: 'February' },
  { value: '03', label: 'March' },    { value: '04', label: 'April' },
  { value: '05', label: 'May' },      { value: '06', label: 'June' },
  { value: '07', label: 'July' },     { value: '08', label: 'August' },
  { value: '09', label: 'September' },{ value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getMonthRange = (year: string, month: string) => {
  const start = `${year}-${month}-01`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const end = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
  return { start, end };
};

const adjustPayDate = (dateStr: string): string => {
  if (!dateStr) return dateStr;
  const date = new Date(dateStr);
  const day = date.getDay();
  if (day === 6) date.setDate(date.getDate() + 2);
  if (day === 0) date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
};

const isWeekend = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayrollRuns() {
  const { t } = useTranslation();
  const {
    auth, payrollRuns, hasSampleFile,
    filters: pageFilters = {}, globalSettings, lastCompleted,
    branches = [], departments = [], designations = [],
  } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]       = useState(pageFilters.search || '');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
  const [dateFrom, setDateFrom]           = useState(pageFilters.date_from || '');
  const [dateTo, setDateTo]               = useState(pageFilters.date_to || '');
  const [showFilters, setShowFilters]     = useState(false);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [isFormModalOpen, setIsFormModalOpen]       = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen]   = useState(false);
  const [isImportModalOpen, setIsImportModalOpen]   = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [currentItem, setCurrentItem]               = useState<any>(null);
  const [formMode, setFormMode]                     = useState<'create' | 'edit' | 'view'>('create');

  // ── Form fields ─────────────────────────────────────────────────────────────
  const [formTitle, setFormTitle]           = useState('');
  const [formFrequency, setFormFrequency]   = useState('monthly');
  const [formPeriodStart, setFormPeriodStart] = useState('');
  const [formPeriodEnd, setFormPeriodEnd]   = useState('');
  const [formPayDate, setFormPayDate]       = useState('');
  const [formNotes, setFormNotes]           = useState('');
  const [payMonth, setPayMonth]             = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [payYear, setPayYear]               = useState(currentYear.toString());
  const [payDateWarning, setPayDateWarning] = useState('');

  // ── Process modal filters ───────────────────────────────────────────────────
  const [processFilterBranch, setProcessFilterBranch]           = useState('');
  const [processFilterDepartment, setProcessFilterDepartment]   = useState('');
  const [processFilterDesignation, setProcessFilterDesignation] = useState('');

  // ── Month filtering logic ───────────────────────────────────────────────────

  /**
   * Build a Set of "YYYY-MM" strings for all existing monthly payroll runs
   * so we can grey them out / hide them in the month picker.
   */
  const usedMonthKeys = new Set<string>(
    (payrollRuns?.data || [])
      .filter((r: any) => r.payroll_frequency === 'monthly')
      .map((r: any) => {
        const d = new Date(r.pay_period_start);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      })
  );

  /**
   * The earliest month that is still allowed to be created.
   * If there is a lastCompleted run, nothing before (or equal to) its end
   * month may be created — only the NEXT month onward.
   */
  const minAllowedMonthDate: Date | null = lastCompleted
    ? (() => {
        const d = new Date(lastCompleted.pay_period_end);
        // First day of the month AFTER lastCompleted's pay_period_end month
        return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      })()
    : null;

  /**
   * Returns only the months available for selection in a given year,
   * filtering out:
   *   1. Months before the minimum allowed date (already completed)
   *   2. Months that already have a payroll run (even on the current page)
   */
  const getAvailableMonths = (year: string) => {
    return ALL_MONTHS.filter(m => {
      const monthDate = new Date(parseInt(year), parseInt(m.value) - 1, 1);

      // Block months before the next-allowed month
      if (minAllowedMonthDate && monthDate < minAllowedMonthDate) return false;

      // Block months that already have a payroll run
      const key = `${year}-${m.value}`;
      if (usedMonthKeys.has(key)) return false;

      return true;
    });
  };

  // ── Next suggested period ───────────────────────────────────────────────────
  const getNextPeriod = () => {
    if (!lastCompleted) return null;
    const endDate = new Date(lastCompleted.pay_period_end);
    const freq = lastCompleted.payroll_frequency;
    let nextStart: Date, nextEnd: Date;

    if (freq === 'monthly') {
      nextStart = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);
      nextEnd   = new Date(endDate.getFullYear(), endDate.getMonth() + 2, 0);
    } else if (freq === 'biweekly') {
      nextStart = new Date(endDate); nextStart.setDate(nextStart.getDate() + 1);
      nextEnd   = new Date(nextStart); nextEnd.setDate(nextEnd.getDate() + 13);
    } else {
      nextStart = new Date(endDate); nextStart.setDate(nextStart.getDate() + 1);
      nextEnd   = new Date(nextStart); nextEnd.setDate(nextEnd.getDate() + 6);
    }

    return {
      frequency:   freq,
      periodStart: nextStart.toISOString().split('T')[0],
      periodEnd:   nextEnd.toISOString().split('T')[0],
      month:       (nextStart.getMonth() + 1).toString().padStart(2, '0'),
      year:        nextStart.getFullYear().toString(),
    };
  };

  // ── Form modal open effect ──────────────────────────────────────────────────
  useEffect(() => {
    if (isFormModalOpen) {
      if (currentItem && formMode === 'edit') {
        const startDate = currentItem.pay_period_start ? new Date(currentItem.pay_period_start) : null;
        setFormTitle(currentItem.title || '');
        setFormFrequency(currentItem.payroll_frequency || 'monthly');
        setFormPeriodStart(currentItem.pay_period_start?.split('T')[0] || '');
        setFormPeriodEnd(currentItem.pay_period_end?.split('T')[0] || '');
        setFormPayDate(currentItem.pay_date?.split('T')[0] || '');
        setFormNotes(currentItem.notes || '');
        setPayMonth(startDate ? (startDate.getMonth() + 1).toString().padStart(2, '0') : '01');
        setPayYear(startDate ? startDate.getFullYear().toString() : currentYear.toString());
        setPayDateWarning('');
      } else {
        // Create mode — auto-suggest next period
        setFormTitle(''); setFormNotes(''); setFormPayDate(''); setPayDateWarning('');
        const next = getNextPeriod();
        if (next) {
          setFormFrequency(next.frequency);
          setFormPeriodStart(next.periodStart);
          setFormPeriodEnd(next.periodEnd);
          setPayMonth(next.month);
          setPayYear(next.year);
        } else {
          setFormFrequency('monthly');
          const m = (new Date().getMonth() + 1).toString().padStart(2, '0');
          const y = currentYear.toString();
          // Find the first available month for the current year
          const available = getAvailableMonths(y);
          const selectedM = available.length > 0 ? available[0].value : m;
          setPayMonth(selectedM);
          setPayYear(y);
          const { start, end } = getMonthRange(y, selectedM);
          setFormPeriodStart(start);
          setFormPeriodEnd(end);
        }
      }
    }
  }, [isFormModalOpen]);

  useEffect(() => {
    if (isProcessModalOpen) {
      setProcessFilterBranch('');
      setProcessFilterDepartment('');
      setProcessFilterDesignation('');
    }
  }, [isProcessModalOpen]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleMonthYearChange = (month: string, year: string) => {
    const { start, end } = getMonthRange(year, month);
    setFormPeriodStart(start);
    setFormPeriodEnd(end);
  };

  const handlePayDateChange = (val: string) => {
    if (isWeekend(val)) {
      const adjusted = adjustPayDate(val);
      setFormPayDate(adjusted);
      setPayDateWarning(`Pay date fell on a weekend — automatically moved to ${adjusted} (Monday)`);
    } else {
      setFormPayDate(val);
      setPayDateWarning('');
    }
  };

  /**
   * When the user changes the year in the monthly picker, we need to:
   * 1. Update the year state
   * 2. Check if the currently selected month is still available in the new year
   * 3. If not, snap to the first available month (or keep if still valid)
   */
  const handleYearChange = (newYear: string) => {
    setPayYear(newYear);
    const available = getAvailableMonths(newYear);
    const currentMonthStillValid = available.some(m => m.value === payMonth);
    const selectedMonth = currentMonthStillValid
      ? payMonth
      : (available[0]?.value || payMonth);
    setPayMonth(selectedMonth);
    handleMonthYearChange(selectedMonth, newYear);
  };

  /**
   * When the user changes the month in the monthly picker.
   */
  const handleMonthChange = (newMonth: string) => {
    setPayMonth(newMonth);
    handleMonthYearChange(newMonth, payYear);
  };

  const hasActiveFilters = () => searchTerm !== '' || selectedStatus !== 'all' || dateFrom !== '' || dateTo !== '';
  const activeFilterCount = () =>
    (searchTerm ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); applyFilters(); };

  const applyFilters = () => {
    router.get(route('hr.payroll-runs.index'), {
      page: 1,
      search: searchTerm || undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      per_page: pageFilters.per_page,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    router.get(route('hr.payroll-runs.index'), {
      sort_field: field, sort_direction: direction, page: 1,
      search: searchTerm || undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      per_page: pageFilters.per_page,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);
    switch (action) {
      case 'view':              router.get(route('hr.payroll-runs.show', item.id)); break;
      case 'edit':              setFormMode('edit'); setIsFormModalOpen(true); break;
      case 'delete':            setIsDeleteModalOpen(true); break;
      case 'process':           setIsProcessModalOpen(true); break;
      case 'unlock':            handleUnlock(item); break;
      case 'submit-final':      handleSubmitFinal(item); break;
      case 'approve-final':     handleApproveFinal(item); break;
      case 'generate-payslips': handleGeneratePayslips(item); break;
    }
  };

  const handleAddNew = () => { setCurrentItem(null); setFormMode('create'); setIsFormModalOpen(true); };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = {
      title: formTitle,
      payroll_frequency: formFrequency,
      pay_period_start: formPeriodStart,
      pay_period_end: formPeriodEnd,
      pay_date: formPayDate,
      notes: formNotes,
    };

    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Creating payroll run...'));
      router.post(route('hr.payroll-runs.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) toast.success(t(page.props.flash.success));
          else if (page.props.flash.error) toast.error(t(page.props.flash.error));
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          toast.error(typeof errors === 'string' ? errors : `Failed to create payroll run: ${Object.values(errors).join(', ')}`);
        },
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating payroll run...'));
      router.put(route('hr.payroll-runs.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) toast.success(t(page.props.flash.success));
          else if (page.props.flash.error) toast.error(t(page.props.flash.error));
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          toast.error(typeof errors === 'string' ? errors : `Failed to update payroll run: ${Object.values(errors).join(', ')}`);
        },
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting payroll run...'));
    router.delete(route('hr.payroll-runs.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash.error) toast.error(t(page.props.flash.error));
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(typeof errors === 'string' ? errors : `Failed to delete payroll run: ${Object.values(errors).join(', ')}`);
      },
    });
  };

  const handleProcessConfirm = () => {
    if (!currentItem) return;
    setIsProcessModalOpen(false);
    if (!globalSettings?.is_demo) toast.loading(t('Processing payroll...'));

    const payload: Record<string, any> = {};
    if (processFilterBranch)      payload.branch_id      = processFilterBranch;
    if (processFilterDepartment)  payload.department_id  = processFilterDepartment;
    if (processFilterDesignation) payload.designation_id = processFilterDesignation;

    router.put(route('hr.payroll-runs.process', currentItem.id), payload, {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash.error) toast.error(t(page.props.flash.error));
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(typeof errors === 'string' ? errors : `Failed to process payroll: ${Object.values(errors).join(', ')}`);
      },
    });
  };

  const handleUnlock = (item: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Unlocking payroll run...'));
    router.put(route('hr.payroll-runs.unlock', item.id), {}, {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash.error) toast.error(t(page.props.flash.error));
      },
      onError: () => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(t('Failed to unlock payroll run'));
      },
    });
  };

  const handleSubmitFinal = (item: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Submitting for approval...'));
    router.put(route('hr.payroll-runs.submit-final', item.id), {}, {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash.error) toast.error(t(page.props.flash.error));
      },
      onError: () => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(t('Failed to submit for approval'));
      },
    });
  };

  const handleApproveFinal = (item: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Approving payroll run...'));
    router.put(route('hr.payroll-runs.approve-final', item.id), {}, {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash.error) toast.error(t(page.props.flash.error));
      },
      onError: () => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(t('Failed to approve payroll run'));
      },
    });
  };

  const handleGeneratePayslips = (payrollRun: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Generating payslips...'));
    router.post(route('hr.payslips.bulk-generate'), { payroll_run_id: payrollRun.id }, {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
          setTimeout(() => router.get(route('hr.payslips.index')), 1000);
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(typeof errors === 'string' ? errors : 'Failed to generate payslips');
      },
    });
  };

  const handleResetFilters = () => {
    setSearchTerm(''); setSelectedStatus('all'); setDateFrom(''); setDateTo(''); setShowFilters(false);
    router.get(route('hr.payroll-runs.index'), { page: 1, per_page: pageFilters.per_page }, { preserveState: true, preserveScroll: true });
  };

  const handleExport = async () => {
    try {
      const response = await fetch(route('hr.payroll-runs.export'), {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(t(data.message || 'Failed to export payroll runs'));
        return;
      }
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `payroll_runs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error(t('Failed to export payroll runs'));
    }
  };

  // ── Page actions ────────────────────────────────────────────────────────────
  const pageActions: any[] = [];
  if (hasPermission(permissions, 'export-payroll-runs'))
    pageActions.push({ label: t('Export'), icon: <FileDown className="h-4 w-4 mr-2" />, variant: 'outline', onClick: handleExport });
  if (hasPermission(permissions, 'import-payroll-runs'))
    pageActions.push({ label: t('Import'), icon: <FileUp className="h-4 w-4 mr-2" />, variant: 'outline', onClick: () => setIsImportModalOpen(true) });
  if (hasPermission(permissions, 'create-payroll-runs'))
    pageActions.push({ label: t('Add Payroll Run'), icon: <Plus className="h-4 w-4 mr-2" />, variant: 'default', onClick: () => handleAddNew() });

  const breadcrumbs = [
    { title: t('Dashboard'),          href: route('dashboard') },
    { title: t('Payroll Management'), href: route('hr.payroll-runs.index') },
    { title: t('Payroll Runs') },
  ];

  // ── Table columns ───────────────────────────────────────────────────────────
  const columns = [
    { key: 'title', label: t('Title'), sortable: true },
    {
      key: 'payroll_frequency', label: t('Frequency'),
      render: (value: string) => (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
          {value === 'weekly' ? t('Weekly') : value === 'biweekly' ? t('Bi-Weekly') : t('Monthly')}
        </span>
      ),
    },
    {
      key: 'pay_period', label: t('Pay Period'),
      render: (value: any, row: any) => (
        <div className="text-sm">
          <div>{window.appSettings?.formatDateTimeSimple(row.pay_period_start, false) || new Date(row.pay_period_start).toLocaleDateString()}</div>
          <div className="text-gray-500">to {window.appSettings?.formatDateTimeSimple(row.pay_period_end, false) || new Date(row.pay_period_end).toLocaleDateString()}</div>
        </div>
      ),
    },
    {
      key: 'pay_date', label: t('Pay Date'), sortable: true,
      render: (value: string) => window.appSettings?.formatDateTimeSimple(value, false) || new Date(value).toLocaleDateString(),
    },
    {
      key: 'employee_count', label: t('Employees'),
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'total_gross_pay', label: t('Gross Pay'),
      render: (value: number) => <span className="font-mono text-green-600">{window.appSettings?.formatCurrency(value)}</span>,
    },
    {
      key: 'total_net_pay', label: t('Net Pay'),
      render: (value: number) => <span className="font-mono text-blue-600">{window.appSettings?.formatCurrency(value)}</span>,
    },
    {
      key: 'status', label: t('Status'),
      render: (value: string) => {
        const statusColors: Record<string, string> = {
          draft:            'bg-gray-50 text-gray-700 ring-gray-600/20',
          processing:       'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          completed:        'bg-green-50 text-green-700 ring-green-600/20',
          pending_approval: 'bg-orange-50 text-orange-700 ring-orange-600/20',
          final:            'bg-blue-50 text-blue-700 ring-blue-600/20',
          cancelled:        'bg-red-50 text-red-700 ring-red-600/20',
        };
        const label = value === 'pending_approval'
          ? 'Pending Approval'
          : value.charAt(0).toUpperCase() + value.slice(1);
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value] || statusColors.draft}`}>
            {t(label)}
          </span>
        );
      },
    },
  ];

  // ── Row actions ─────────────────────────────────────────────────────────────
  const actions = [
    { label: t('View Details'),        icon: 'Eye',         action: 'view',              className: 'text-blue-500',   requiredPermission: 'view-payroll-runs' },
    { label: t('Edit'),                icon: 'Edit',        action: 'edit',              className: 'text-amber-500',  requiredPermission: 'edit-payroll-runs',     condition: (item: any) => item.status === 'draft' },
    { label: t('Process'),             icon: 'Play',        action: 'process',           className: 'text-green-500',  requiredPermission: 'process-payroll-runs',  condition: (item: any) => item.status === 'draft' || item.status === 'processing' },
    { label: t('Submit for Approval'), icon: 'Send',        action: 'submit-final',      className: 'text-orange-500', requiredPermission: 'process-payroll-runs',  condition: (item: any) => item.status === 'completed' },
    { label: t('Approve Final'),       icon: 'CheckCircle', action: 'approve-final',     className: 'text-blue-600',   requiredPermission: 'approve-payroll-runs',  condition: (item: any) => item.status === 'pending_approval' },
    { label: t('Unlock'),              icon: 'Unlock',      action: 'unlock',            className: 'text-purple-500', requiredPermission: 'edit-payroll-runs',     condition: (item: any) => ['completed', 'pending_approval', 'final'].includes(item.status) },
    { label: t('Generate Payslips'),   icon: 'FileText',    action: 'generate-payslips', className: 'text-purple-500', requiredPermission: 'create-payslips',       condition: (item: any) => item.status === 'completed' || item.status === 'final' },
    { label: t('Delete'),              icon: 'Trash2',      action: 'delete',            className: 'text-red-500',    requiredPermission: 'delete-payroll-runs',   condition: (item: any) => item.status === 'draft' },
  ];

  const statusOptions = [
    { value: 'all',              label: t('All Statuses'),    disabled: true },
    { value: 'draft',            label: t('Draft') },
    { value: 'processing',       label: t('Processing') },
    { value: 'completed',        label: t('Completed') },
    { value: 'pending_approval', label: t('Pending Approval') },
    { value: 'final',            label: t('Final') },
    { value: 'cancelled',        label: t('Cancelled') },
  ];

  const selectClass = 'w-full border border-input rounded-md px-3 py-2 text-sm bg-background';

  // ── Derived: available months for current payYear ───────────────────────────
  const availableMonthsForYear = getAvailableMonths(payYear);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <PageTemplate title={t('Payroll Runs')} url="/hr/payroll-runs" actions={pageActions} breadcrumbs={breadcrumbs} noPadding>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 p-4">
        <SearchAndFilterBar
          searchTerm={searchTerm} onSearchChange={setSearchTerm} onSearch={handleSearch}
          filters={[
            { name: 'status', label: t('Status'), type: 'select', value: selectedStatus, onChange: setSelectedStatus, options: statusOptions },
            { name: 'date_from', label: t('Period From'), type: 'date', value: dateFrom, onChange: setDateFrom },
            { name: 'date_to', label: t('Period To'), type: 'date', value: dateTo, onChange: setDateTo },
          ]}
          showFilters={showFilters} setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters} activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters} onApplyFilters={applyFilters}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) =>
            router.get(route('hr.payroll-runs.index'), {
              page: 1, per_page: parseInt(value),
              search: searchTerm || undefined,
              status: selectedStatus !== 'all' ? selectedStatus : undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            }, { preserveState: true, preserveScroll: true })
          }
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns} actions={actions} data={payrollRuns?.data || []} from={payrollRuns?.from || 1}
          onAction={handleAction} sortField={pageFilters.sort_field} sortDirection={pageFilters.sort_direction}
          onSort={handleSort} permissions={permissions}
          entityPermissions={{ view: 'view-payroll-runs', create: 'create-payroll-runs', edit: 'edit-payroll-runs', delete: 'delete-payroll-runs' }}
        />
        <Pagination
          from={payrollRuns?.from || 0} to={payrollRuns?.to || 0} total={payrollRuns?.total || 0}
          links={payrollRuns?.links} entityName={t('payroll runs')}
          onPageChange={(url) => router.get(url)}
        />
      </div>

      {/* ── Process Payroll Modal ──────────────────────────────────────────── */}
      {isProcessModalOpen && currentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">{t('Process Payroll Run')}</h2>
              <button onClick={() => setIsProcessModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-muted-foreground bg-muted/40 rounded px-3 py-2">
                <span className="font-medium text-foreground">{currentItem.title}</span>
                <span className="mx-2">·</span>
                {currentItem.pay_period_start?.split('T')[0]} {t('to')} {currentItem.pay_period_end?.split('T')[0]}
              </div>
              <div className="text-xs text-blue-700 bg-blue-50 rounded px-3 py-2 border border-blue-200">
                ℹ️ {t('Filters are optional. Leave all blank to process all active employees.')}
              </div>
              <div className="space-y-1">
                <Label>{t('Branch')} <span className="text-muted-foreground text-xs">({t('optional')})</span></Label>
                <select className={selectClass} value={processFilterBranch} onChange={e => setProcessFilterBranch(e.target.value)}>
                  <option value="">{t('All Branches')}</option>
                  {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t('Department')} <span className="text-muted-foreground text-xs">({t('optional')})</span></Label>
                <select className={selectClass} value={processFilterDepartment} onChange={e => setProcessFilterDepartment(e.target.value)}>
                  <option value="">{t('All Departments')}</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t('Designation')} <span className="text-muted-foreground text-xs">({t('optional')})</span></Label>
                <select className={selectClass} value={processFilterDesignation} onChange={e => setProcessFilterDesignation(e.target.value)}>
                  <option value="">{t('All Designations')}</option>
                  {designations.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              {(processFilterBranch || processFilterDepartment || processFilterDesignation) && (
                <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2 border border-amber-200">
                  ⚠️ {t('Only employees matching the selected filters will be processed.')}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button type="button" onClick={() => setIsProcessModalOpen(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50">{t('Cancel')}</button>
              <button type="button" onClick={handleProcessConfirm} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 flex items-center gap-2">
                <Play className="h-4 w-4" />{t('Process Payroll')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ────────────────────────────────────────────── */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">
                {formMode === 'create' ? t('Add New Payroll Run') : t('Edit Payroll Run')}
              </h2>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <Label>{t('Title')} *</Label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
              </div>

              {/* Frequency */}
              <div className="space-y-1">
                <Label>{t('Payroll Frequency')} *</Label>
                <select
                  className={selectClass}
                  value={formFrequency}
                  onChange={e => {
                    setFormFrequency(e.target.value);
                    if (e.target.value === 'monthly') handleMonthYearChange(payMonth, payYear);
                  }}
                  required
                >
                  <option value="weekly">{t('Weekly')}</option>
                  <option value="biweekly">{t('Bi-Weekly')}</option>
                  <option value="monthly">{t('Monthly')}</option>
                </select>
              </div>

              {/* Period — Monthly uses month/year pickers; others use date inputs */}
              {formFrequency === 'monthly' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Month picker — only shows available months */}
                    <div className="space-y-1">
                      <Label>{t('Month')} *</Label>
                      <select
                        className={selectClass}
                        value={payMonth}
                        onChange={e => handleMonthChange(e.target.value)}
                      >
                        {availableMonthsForYear.length === 0 ? (
                          <option value="" disabled>{t('No months available')}</option>
                        ) : (
                          availableMonthsForYear.map(m => (
                            <option key={m.value} value={m.value}>{t(m.label)}</option>
                          ))
                        )}
                      </select>
                      {availableMonthsForYear.length === 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          {t('All months for this year already have payroll runs.')}
                        </p>
                      )}
                    </div>

                    {/* Year picker */}
                    <div className="space-y-1">
                      <Label>{t('Year')} *</Label>
                      <select
                        className={selectClass}
                        value={payYear}
                        onChange={e => handleYearChange(e.target.value)}
                      >
                        {YEARS.map(y => (
                          <option key={y} value={y.toString()}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Show computed period dates as read-only info */}
                  {formPeriodStart && (
                    <div className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
                      {t('Pay period')}: <span className="font-medium">{formPeriodStart}</span> {t('to')} <span className="font-medium">{formPeriodEnd}</span>
                    </div>
                  )}

                  {/* Info: months that are already taken */}
                  {minAllowedMonthDate && formMode === 'create' && (
                    <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2 border border-amber-200">
                      ⚠️ {t('Months up to and including')} <span className="font-semibold">{lastCompleted?.title}</span> {t('are already completed and cannot be recreated.')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>{t('Pay Period Start')} *</Label>
                    <Input type="date" value={formPeriodStart} onChange={e => setFormPeriodStart(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('Pay Period End')} *</Label>
                    <Input type="date" value={formPeriodEnd} onChange={e => setFormPeriodEnd(e.target.value)} required />
                  </div>
                </div>
              )}

              {/* Pay Date */}
              <div className="space-y-1">
                <Label>{t('Pay Date')} *</Label>
                <Input type="date" value={formPayDate} onChange={e => handlePayDateChange(e.target.value)} required />
                {payDateWarning && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">{payDateWarning}</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label>{t('Notes')}</Label>
                <textarea
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background min-h-[80px]"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                />
              </div>

              {/* Last completed hint */}
              {formMode === 'create' && lastCompleted && (
                <div className="text-xs text-blue-700 bg-blue-50 rounded px-3 py-2 border border-blue-200">
                  ℹ️ {t('Period auto-suggested based on last completed run')}: <span className="font-semibold">{lastCompleted.title}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={formFrequency === 'monthly' && availableMonthsForYear.length === 0}
                  className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formMode === 'create' ? t('Create') : t('Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.title || ''}
        entityName="payroll run"
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={t('Import Payroll Runs from CSV/Excel')}
        importRoute="hr.payroll-runs.import"
        parseRoute="hr.payroll-runs.parse"
        sampleRoute={hasSampleFile ? 'hr.payroll-runs.download.template' : undefined}
        importNotes={t('Ensure date formats are correct (YYYY-MM-DD). Payroll frequency must be weekly, biweekly, or monthly.')}
        modalSize="xl"
        databaseFields={[
          { key: 'title', required: true },
          { key: 'payroll_frequency', required: true },
          { key: 'pay_period_start', required: true },
          { key: 'pay_period_end', required: true },
          { key: 'pay_date', required: true },
          { key: 'notes' },
        ]}
      />
    </PageTemplate>
  );
}