import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, DollarSign, Download, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function PayrollRunShow() {
    const { t } = useTranslation();
    const { payrollRun, auth } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentEntry, setCurrentEntry] = useState<any>(null);

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Payroll Management'), href: route('hr.payroll-runs.index') },
        { title: t('Payroll Runs'), href: route('hr.payroll-runs.index') },
        { title: payrollRun.title },
    ];

    const pageActions = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="mr-2 h-4 w-4" />,
            variant: 'outline',
            onClick: () => router.get(route('hr.payroll-runs.index')),
        },
    ];

    if (payrollRun.status === 'completed') {
        pageActions.unshift({
            label: t('Generate Payslips'),
            icon: <Download className="mr-2 h-4 w-4" />,
            variant: 'default',
            onClick: () => handleGeneratePayslips(),
        });
    }

    const handleGeneratePayslips = () => {
        toast.loading(t('Generating payslips...'));
        router.post(route('hr.payslips.bulk-generate'), { payroll_run_id: payrollRun.id }, {
            onSuccess: (page) => {
                toast.dismiss();
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                    setTimeout(() => router.get(route('hr.payslips.index')), 1000);
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                }
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(typeof errors === 'string' ? errors : 'Failed to generate payslips');
            },
        });
    };

    const handleAction = (action: string, entry: any) => {
        if (action === 'delete') {
            setCurrentEntry(entry);
            setIsDeleteModalOpen(true);
        }
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting payroll entry...'));
        router.delete(route('hr.payroll-entries.destroy', currentEntry.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                toast.dismiss();
                if (page.props.flash.success) toast.success(t(page.props.flash.success));
                else if (page.props.flash.error) toast.error(t(page.props.flash.error));
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(typeof errors === 'string' ? t(errors) : t('Failed to delete payroll entry'));
            },
        });
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            draft: 'bg-gray-50 text-gray-700 ring-gray-600/20',
            processing: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
            completed: 'bg-green-50 text-green-700 ring-green-600/20',
            cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
        };
        return colors[status] || colors.draft;
    };

    // Helper to extract Zambia deduction amount by type
    const getDeduction = (breakdown: any[], type: string): number => {
        if (!Array.isArray(breakdown)) return 0;
        const item = breakdown.find((d: any) => d?.type === type);
        return item?.amount || 0;
    };

    return (
        <PageTemplate title={payrollRun.title} url={`/hr/payroll-runs/${payrollRun.id}`} actions={pageActions} breadcrumbs={breadcrumbs}>

            {/* Summary cards */}
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400">{t('Total Employees')}</CardTitle>
                        <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{payrollRun.employee_count}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400">{t('Gross Pay')}</CardTitle>
                        <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-green-600">{window.appSettings?.formatCurrency(payrollRun.total_gross_pay)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400">{t('Total Deductions')}</CardTitle>
                        <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-red-600">{window.appSettings?.formatCurrency(payrollRun.total_deductions)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400">{t('Net Pay')}</CardTitle>
                        <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-blue-600">{window.appSettings?.formatCurrency(payrollRun.total_net_pay)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Payroll Run Details */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Payroll Run Details')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400">{t('Pay Period')}</label>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                                {window.appSettings?.formatDateTimeSimple(payrollRun.pay_period_start, false) || new Date(payrollRun.pay_period_start).toLocaleDateString()} —{' '}
                                {window.appSettings?.formatDateTimeSimple(payrollRun.pay_period_end, false) || new Date(payrollRun.pay_period_end).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400">{t('Pay Date')}</label>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                                {window.appSettings?.formatDateTimeSimple(payrollRun.pay_date, false) || new Date(payrollRun.pay_date).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400">{t('Payroll Frequency')}</label>
                            <p className="mt-1">
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">
                                    {payrollRun.payroll_frequency === 'weekly' ? t('Weekly') : payrollRun.payroll_frequency === 'biweekly' ? t('Bi-Weekly') : t('Monthly')}
                                </span>
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400">{t('Status')}</label>
                            <p className="mt-1">
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(payrollRun.status)}`}>
                                    {t(payrollRun.status.charAt(0).toUpperCase() + payrollRun.status.slice(1))}
                                </span>
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400">{t('Created At')}</label>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                                {window.appSettings?.formatDateTimeSimple(payrollRun.created_at, false) || new Date(payrollRun.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    {payrollRun.notes && (
                        <div className="mt-4">
                            <label className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400">{t('Notes')}</label>
                            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{payrollRun.notes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Employee Payroll Entries */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Employee Payroll Entries')}</CardTitle>
                    <div className="mt-2 space-y-2 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                            {t('Gross Pay Formula')} : <span className="font-mono">Total Earnings (Basic + Allowances) - Unpaid Leave + Overtime</span>
                        </p>
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                            {t('Net Salary Formula')} : <span className="font-mono">Gross Pay - PAYE - NAPSA - NHIMA</span>
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <CrudTable
                            columns={[
                                {
                                    key: 'employee',
                                    label: t('Employee'),
                                    render: (_: any, row: any) => row.employee?.name || '-',
                                },
                                {
                                    key: 'basic_salary',
                                    label: t('Basic Salary'),
                                    render: (v: number) => <span className="font-mono text-gray-900">{window.appSettings?.formatCurrency(v)}</span>,
                                },
                                {
                                    key: 'gross_pay',
                                    label: t('Gross Pay'),
                                    render: (v: number) => <span className="font-mono text-green-600">{window.appSettings?.formatCurrency(v)}</span>,
                                },
                                {
                                    key: 'deductions_breakdown',
                                    label: t('PAYE Tax'),
                                    render: (v: any[]) => (
                                        <span className="font-mono text-red-600">{window.appSettings?.formatCurrency(getDeduction(v, 'zambia_paye'))}</span>
                                    ),
                                },
                                {
                                    key: 'deductions_breakdown',
                                    label: t('NAPSA'),
                                    render: (v: any[]) => (
                                        <span className="font-mono text-red-600">{window.appSettings?.formatCurrency(getDeduction(v, 'zambia_napsa_employee'))}</span>
                                    ),
                                },
                                {
                                    key: 'deductions_breakdown',
                                    label: t('NHIMA'),
                                    render: (v: any[]) => (
                                        <span className="font-mono text-red-600">{window.appSettings?.formatCurrency(getDeduction(v, 'zambia_nhima_employee'))}</span>
                                    ),
                                },
                                {
                                    key: 'total_deductions',
                                    label: t('Total Deductions'),
                                    render: (v: number) => <span className="font-mono text-red-600">{window.appSettings?.formatCurrency(v)}</span>,
                                },
                                {
                                    key: 'net_pay',
                                    label: t('Net Pay'),
                                    render: (v: number) => <span className="font-mono font-bold text-blue-600">{window.appSettings?.formatCurrency(v)}</span>,
                                },
                                {
                                    key: 'working_days',
                                    label: t('Working Days'),
                                    render: (v: number) => v || 0,
                                },
                                {
                                    key: 'present_days',
                                    label: t('Present Days'),
                                    render: (v: number) => v || 0,
                                },
                                {
                                    key: 'overtime_amount',
                                    label: t('Overtime'),
                                    render: (v: number) => <span className="font-mono text-green-600">{window.appSettings?.formatCurrency(v || 0)}</span>,
                                },
                                {
                                    key: 'unpaid_leave_deduction',
                                    label: t('Leave Deduction'),
                                    render: (v: number) => <span className="font-mono text-red-600">{window.appSettings?.formatCurrency(v || 0)}</span>,
                                },
                            ]}
                            data={payrollRun.payroll_entries || []}
                            from={1}
                            onAction={handleAction}
                            permissions={permissions}
                            entityPermissions={{ delete: 'delete-payroll-entries' }}
                            actions={[
                                {
                                    label: t('Delete'),
                                    icon: 'Trash2',
                                    action: 'delete',
                                    className: 'text-red-500',
                                    requiredPermission: 'delete-payroll-entries',
                                },
                            ]}
                            showActions={true}
                        />
                    </div>
                </CardContent>
            </Card>

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentEntry?.employee?.name || ''}
                entityName="payroll entry"
            />
        </PageTemplate>
    );
}