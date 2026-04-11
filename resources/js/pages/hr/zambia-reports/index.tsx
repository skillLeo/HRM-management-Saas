import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage } from '@inertiajs/react';
import { Download, FileText, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportFormat = 'csv' | 'excel' | 'pdf';

interface SelectOption { id: number; name: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCsrfToken = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

// ─── Compact filter select ────────────────────────────────────────────────────

function FilterSelect({
    label, value, onChange, options, placeholder = '— All —',
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: SelectOption[];
    placeholder?: string;
}) {
    return (
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <select
                className="border border-input rounded-md px-2.5 py-1.5 text-sm bg-background min-w-[140px]"
                value={value}
                onChange={e => onChange(e.target.value)}
            >
                <option value="">{placeholder}</option>
                {options.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                ))}
            </select>
        </div>
    );
}

// ─── Format toggle ────────────────────────────────────────────────────────────

function FormatToggle({ value, onChange }: { value: ExportFormat; onChange: (f: ExportFormat) => void }) {
    const formats: { key: ExportFormat; label: string }[] = [
        { key: 'csv',   label: 'CSV'   },
        { key: 'excel', label: 'Excel' },
        { key: 'pdf',   label: 'PDF'   },
    ];
    return (
        <div className="flex items-center gap-1 rounded-md border border-input bg-muted/30 p-0.5">
            {formats.map(f => (
                <button
                    key={f.key}
                    onClick={() => onChange(f.key)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        value === f.key
                            ? 'bg-background shadow text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {f.label}
                </button>
            ))}
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ZambiaReports() {
    const { t } = useTranslation();
    const { payrollRuns, branches = [], departments = [], designations = [], flash } = usePage().props as any;

    // ── Payroll run reports state ───────────────────────────────────────────
    const [selectedRun,      setSelectedRun]      = useState('');
    const [runFormat,        setRunFormat]         = useState<ExportFormat>('csv');
    const [runBranch,        setRunBranch]         = useState('');
    const [runDept,          setRunDept]           = useState('');
    const [runDesig,         setRunDesig]          = useState('');
    const [showRunFilters,   setShowRunFilters]    = useState(false);

    // ── Contributory history state ──────────────────────────────────────────
    const [historyType,   setHistoryType]   = useState('napsa');
    const [historyYear,   setHistoryYear]   = useState(new Date().getFullYear().toString());
    const [historyBranch, setHistoryBranch] = useState('');
    const [historyDept,   setHistoryDept]   = useState('');
    const [historyFormat, setHistoryFormat] = useState<ExportFormat>('csv');

    // ── Employee reports state ──────────────────────────────────────────────
    const [empFormat, setEmpFormat]   = useState<ExportFormat>('csv');
    const [empBranch, setEmpBranch]   = useState('');
    const [empDept,   setEmpDept]     = useState('');
    const [empDesig,  setEmpDesig]    = useState('');
    const [empStatus, setEmpStatus]   = useState('all');
    const [showEmpFilters, setShowEmpFilters] = useState(false);

    // ── Loading state ───────────────────────────────────────────────────────
    const [loading, setLoading] = useState<string | null>(null);

    useEffect(() => {
        if (flash?.error) toast.error(t(flash.error));
        if (flash?.success) toast.success(t(flash.success));
    }, [flash]);

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Payroll Management'), href: '#' },
        { title: t('Zambia Compliance Reports') },
    ];

    // ── Download helpers ────────────────────────────────────────────────────

    const postDownload = (routeName: string, fields: Record<string, string> = {}) => {
        setLoading(routeName);
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = route(routeName);
        form.target = '_blank';
        const addField = (n: string, v: string) => {
            const i = document.createElement('input');
            i.type = 'hidden'; i.name = n; i.value = v;
            form.appendChild(i);
        };
        addField('_token', getCsrfToken());
        Object.entries(fields).forEach(([k, v]) => { if (v) addField(k, v); });
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        toast.success(t('Report download started'));
        setTimeout(() => setLoading(null), 1500);
    };

    /** Download a payroll-run report with current run filters applied. */
    const downloadRunReport = (routeKey: string) => {
        if (!selectedRun) { toast.error(t('Please select a payroll run first')); return; }
        postDownload(routeKey, {
            payroll_run_id: selectedRun,
            format:         runFormat,
            branch_id:      runBranch,
            department_id:  runDept,
            designation_id: runDesig,
        });
    };

    /** Download an employee report with current employee filters applied. */
    const downloadEmpReport = (routeKey: string) => {
        postDownload(routeKey, {
            format:         empFormat,
            branch_id:      empBranch,
            department_id:  empDept,
            designation_id: empDesig,
            status:         empStatus,
        });
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    // ── Report definitions ──────────────────────────────────────────────────

    const statutoryReports = [
        {
            key:         'hr.zambia-reports.paye-p11',
            title:       t('PAYE P11 Report'),
            description: t('Employee TPIN, gross salary and PAYE deducted. Submit to ZRA.'),
        },
        {
            key:         'hr.zambia-reports.napsa-schedule',
            title:       t('NAPSA Schedule'),
            description: t('NAPSA numbers, gross salary, employee & employer contributions.'),
        },
        {
            key:         'hr.zambia-reports.nhima-report',
            title:       t('NHIMA Report'),
            description: t('NHIMA numbers, gross salary, employee & employer contributions.'),
        },
        {
            key:         'hr.zambia-reports.bank-schedule',
            title:       t('Bank Payment Schedule'),
            description: t('Employee bank details and net pay amounts for bank transfer.'),
        },
        {
            key:         'hr.zambia-reports.payroll-summary',
            title:       t('Payroll Summary'),
            description: t('Overall totals — gross pay, all deductions, net pay and employer cost.'),
        },
        {
            key:         'hr.zambia-reports.payroll-detailed',
            title:       t('Payroll Detailed Report'),
            description: t('Full per-employee breakdown: basic, earnings, PAYE, NAPSA, NHIMA and net pay.'),
        },
        {
            key:         'hr.zambia-reports.payroll-entries',
            title:       t('Employee Payroll Entries'),
            description: t('Per-employee payroll figures including attendance, overtime and deductions.'),
        },
        {
            key:         'hr.zambia-reports.deductions-report',
            title:       t('Deductions Report'),
            description: t('Detailed and summary view of all deductions per employee.'),
        },
        {
            key:         'hr.zambia-reports.variance-report',
            title:       t('Variance vs Previous Month'),
            description: t('Comparison of gross pay, net pay and PAYE against the previous payroll run.'),
        },
    ];

    const employeeReports = [
        {
            key:         'hr.zambia-reports.employee-list',
            title:       t('Employee List'),
            description: t('Name, DOJ, TPIN, NAPSA No, NHIMA No and contact details for all employees.'),
        },
        {
            key:         'hr.zambia-reports.employee-status',
            title:       t('Employee Status Report'),
            description: t('Employees grouped by status (active, terminated, suspended, etc.).'),
        },
    ];

    // ── Download button ─────────────────────────────────────────────────────

    const DownloadBtn = ({
        routeKey, disabled = false, onDownload,
    }: { routeKey: string; disabled?: boolean; onDownload: () => void }) => (
        <Button
            size="sm"
            variant="outline"
            disabled={disabled || loading === routeKey}
            onClick={() => !disabled && onDownload()}
            className="shrink-0 min-w-[110px]"
        >
            {loading === routeKey ? (
                <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {t('Generating...')}
                </span>
            ) : (
                <span className="flex items-center gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    {t('Download')}
                </span>
            )}
        </Button>
    );

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <PageTemplate
            title={t('Zambia Compliance Reports')}
            url="/hr/zambia-reports"
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="p-6 space-y-8">

                {/* ── NAPSA / NHIMA Contributory History ──────────────────── */}
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        {t('NAPSA / NHIMA Contributory History')}
                    </h2>
                    <Card>
                        <CardContent className="pt-5 pb-4">
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-muted-foreground mb-3">
                                        {t('Monthly contribution history for every employee across all completed payroll runs for the selected year.')}
                                    </p>
                                    <div className="flex flex-wrap gap-3 items-end">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">{t('Contribution Type')}</Label>
                                            <select
                                                className="border border-input rounded-md px-2.5 py-1.5 text-sm bg-background"
                                                value={historyType}
                                                onChange={e => setHistoryType(e.target.value)}
                                            >
                                                <option value="napsa">{t('NAPSA')}</option>
                                                <option value="nhima">{t('NHIMA')}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">{t('Year')}</Label>
                                            <select
                                                className="border border-input rounded-md px-2.5 py-1.5 text-sm bg-background"
                                                value={historyYear}
                                                onChange={e => setHistoryYear(e.target.value)}
                                            >
                                                {years.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {branches.length > 0 && (
                                            <FilterSelect label={t('Branch')} value={historyBranch} onChange={setHistoryBranch} options={branches} />
                                        )}
                                        {departments.length > 0 && (
                                            <FilterSelect label={t('Department')} value={historyDept} onChange={setHistoryDept} options={departments} />
                                        )}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">{t('Format')}</Label>
                                            <FormatToggle value={historyFormat} onChange={setHistoryFormat} />
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="min-w-[110px]"
                                    disabled={loading === 'hr.zambia-reports.contributory-history'}
                                    onClick={() => postDownload('hr.zambia-reports.contributory-history', {
                                        type:          historyType,
                                        year:          historyYear,
                                        format:        historyFormat,
                                        branch_id:     historyBranch,
                                        department_id: historyDept,
                                    })}
                                >
                                    {loading === 'hr.zambia-reports.contributory-history' ? (
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            {t('Generating...')}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5">
                                            <Download className="h-3.5 w-3.5" />
                                            {t('Download')}
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Payroll Run Reports ──────────────────────────────────── */}
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        {t('Payroll Run Reports')}
                    </h2>

                    {/* Config card: run selector + filters + format */}
                    <Card className="mb-4">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">{t('Report Options')}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-4">
                            {/* Payroll Run Selector */}
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">{t('Payroll Run')}</Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    {t('All reports below will be generated for the selected payroll run.')}
                                </p>
                                <select
                                    className="w-full max-w-lg border border-input rounded-md px-3 py-2 text-sm bg-background"
                                    value={selectedRun}
                                    onChange={e => setSelectedRun(e.target.value)}
                                >
                                    <option value="">{t('— Select a payroll run —')}</option>
                                    {(payrollRuns || []).map((run: any) => (
                                        <option key={run.id} value={run.id}>
                                            {run.title} — {new Date(run.pay_period_start).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Format + Filter toggle row */}
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t('Export Format')}</Label>
                                    <FormatToggle value={runFormat} onChange={setRunFormat} />
                                </div>
                                {(branches.length > 0 || departments.length > 0 || designations.length > 0) && (
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">&nbsp;</Label>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1.5"
                                            onClick={() => setShowRunFilters(v => !v)}
                                        >
                                            <Filter className="h-3.5 w-3.5" />
                                            {t('Filters')}
                                            {(runBranch || runDept || runDesig) && (
                                                <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Filter row (collapsible) */}
                            {showRunFilters && (
                                <div className="flex flex-wrap gap-3 pt-1 border-t border-border">
                                    {branches.length > 0 && (
                                        <FilterSelect label={t('Branch')} value={runBranch} onChange={setRunBranch} options={branches} />
                                    )}
                                    {departments.length > 0 && (
                                        <FilterSelect label={t('Department')} value={runDept} onChange={setRunDept} options={departments} />
                                    )}
                                    {designations.length > 0 && (
                                        <FilterSelect label={t('Designation')} value={runDesig} onChange={setRunDesig} options={designations} />
                                    )}
                                    {(runBranch || runDept || runDesig) && (
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">&nbsp;</Label>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs text-muted-foreground"
                                                onClick={() => { setRunBranch(''); setRunDept(''); setRunDesig(''); }}
                                            >
                                                {t('Clear filters')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Report list */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {statutoryReports.map((report, idx) => (
                                    <div
                                        key={report.key}
                                        className={`flex items-center justify-between gap-4 px-5 py-4 ${idx % 2 === 0 ? '' : 'bg-muted/30'}`}
                                    >
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium">{report.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                                            </div>
                                        </div>
                                        <DownloadBtn
                                            routeKey={report.key}
                                            disabled={!selectedRun}
                                            onDownload={() => downloadRunReport(report.key)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Employee Reports ─────────────────────────────────────── */}
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        {t('Employee Reports')}
                    </h2>

                    <Card className="mb-4">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">{t('Report Options')}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                            {/* Format + Filter toggle */}
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t('Export Format')}</Label>
                                    <FormatToggle value={empFormat} onChange={setEmpFormat} />
                                </div>
                                {(branches.length > 0 || departments.length > 0 || designations.length > 0) && (
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">&nbsp;</Label>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1.5"
                                            onClick={() => setShowEmpFilters(v => !v)}
                                        >
                                            <Filter className="h-3.5 w-3.5" />
                                            {t('Filters')}
                                            {(empBranch || empDept || empDesig || empStatus !== 'all') && (
                                                <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Filter row */}
                            {showEmpFilters && (
                                <div className="flex flex-wrap gap-3 pt-1 border-t border-border">
                                    {branches.length > 0 && (
                                        <FilterSelect label={t('Branch')} value={empBranch} onChange={setEmpBranch} options={branches} />
                                    )}
                                    {departments.length > 0 && (
                                        <FilterSelect label={t('Department')} value={empDept} onChange={setEmpDept} options={departments} />
                                    )}
                                    {designations.length > 0 && (
                                        <FilterSelect label={t('Designation')} value={empDesig} onChange={setEmpDesig} options={designations} />
                                    )}
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">{t('Status (Employee Status Report)')}</Label>
                                        <select
                                            className="border border-input rounded-md px-2.5 py-1.5 text-sm bg-background"
                                            value={empStatus}
                                            onChange={e => setEmpStatus(e.target.value)}
                                        >
                                            <option value="all">{t('All Statuses')}</option>
                                            <option value="active">{t('Active')}</option>
                                            <option value="inactive">{t('Inactive')}</option>
                                            <option value="probation">{t('Probation')}</option>
                                            <option value="suspended">{t('Suspended')}</option>
                                            <option value="terminated">{t('Terminated')}</option>
                                        </select>
                                    </div>
                                    {(empBranch || empDept || empDesig || empStatus !== 'all') && (
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">&nbsp;</Label>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs text-muted-foreground"
                                                onClick={() => { setEmpBranch(''); setEmpDept(''); setEmpDesig(''); setEmpStatus('all'); }}
                                            >
                                                {t('Clear filters')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {employeeReports.map((report, idx) => (
                                    <div
                                        key={report.key}
                                        className={`flex items-center justify-between gap-4 px-5 py-4 ${idx % 2 === 0 ? '' : 'bg-muted/30'}`}
                                    >
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium">{report.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                                            </div>
                                        </div>
                                        <DownloadBtn
                                            routeKey={report.key}
                                            onDownload={() => downloadEmpReport(report.key)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                    {t('Reports export as CSV, Excel (.xlsx), or PDF. Use the format selector above each section.')}
                </p>
            </div>
        </PageTemplate>
    );
}
