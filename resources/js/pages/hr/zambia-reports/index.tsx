import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage } from '@inertiajs/react';
import { Download, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function ZambiaReports() {
    const { t } = useTranslation();
    const { payrollRuns, flash } = usePage().props as any;

    const [selectedRun, setSelectedRun] = useState('');
    const [historyType, setHistoryType] = useState('napsa');
    const [historyYear, setHistoryYear] = useState(new Date().getFullYear().toString());
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

    const getCsrfToken = () =>
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

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
        Object.entries(fields).forEach(([k, v]) => addField(k, v));
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        toast.success(t('Report download started'));
        setLoading(null);
    };

    const downloadRunReport = (routeName: string) => {
        if (!selectedRun) { toast.error(t('Please select a payroll run first')); return; }
        postDownload(routeName, { payroll_run_id: selectedRun });
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    const statutoryReports = [
        {
            key: 'hr.zambia-reports.paye-p11',
            title: t('PAYE P11 Report'),
            description: t('Employee TPIN, gross salary and PAYE deducted. Submit to ZRA.'),
        },
        {
            key: 'hr.zambia-reports.napsa-schedule',
            title: t('NAPSA Schedule'),
            description: t('NAPSA numbers, gross salary, employee & employer contributions.'),
        },
        {
            key: 'hr.zambia-reports.nhima-report',
            title: t('NHIMA Report'),
            description: t('NHIMA numbers, gross salary, employee & employer contributions.'),
        },
        {
            key: 'hr.zambia-reports.bank-schedule',
            title: t('Bank Payment Schedule'),
            description: t('Employee bank details and net pay amounts for bank transfer.'),
        },
        {
            key: 'hr.zambia-reports.payroll-summary',
            title: t('Payroll Summary'),
            description: t('Overall totals — gross pay, all deductions, net pay and employer cost.'),
        },
        {
            key: 'hr.zambia-reports.payroll-detailed',
            title: t('Payroll Detailed Report'),
            description: t('Full per-employee breakdown: basic, earnings, PAYE, NAPSA, NHIMA and net pay.'),
        },
        {
            key: 'hr.zambia-reports.deductions-report',
            title: t('Deductions Report'),
            description: t('Detailed and summary view of all deductions per employee.'),
        },
        {
            key: 'hr.zambia-reports.variance-report',
            title: t('Variance vs Previous Month'),
            description: t('Comparison of gross pay, net pay and PAYE against the previous payroll run.'),
        },
    ];

    const DownloadBtn = ({ routeKey, disabled = false }: { routeKey: string; disabled?: boolean }) => (
        <Button
            size="sm"
            variant="outline"
            disabled={disabled || loading === routeKey}
            onClick={() => disabled ? undefined : downloadRunReport(routeKey)}
            className="shrink-0 min-w-[120px]"
        >
            {loading === routeKey ? (
                <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {t('Generating...')}
                </span>
            ) : (
                <span className="flex items-center gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    {t('Download CSV')}
                </span>
            )}
        </Button>
    );

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
                                    <div className="flex gap-4 flex-wrap">
                                        <div className="space-y-1">
                                            <Label className="text-xs">{t('Contribution Type')}</Label>
                                            <select
                                                className="border border-input rounded-md px-3 py-1.5 text-sm bg-background"
                                                value={historyType}
                                                onChange={e => setHistoryType(e.target.value)}
                                            >
                                                <option value="napsa">{t('NAPSA')}</option>
                                                <option value="nhima">{t('NHIMA')}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">{t('Year')}</Label>
                                            <select
                                                className="border border-input rounded-md px-3 py-1.5 text-sm bg-background"
                                                value={historyYear}
                                                onChange={e => setHistoryYear(e.target.value)}
                                            >
                                                {years.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="min-w-[120px]"
                                    disabled={loading === 'hr.zambia-reports.contributory-history'}
                                    onClick={() => postDownload('hr.zambia-reports.contributory-history', {
                                        type: historyType,
                                        year: historyYear,
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
                                            {t('Download CSV')}
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

                    {/* Payroll Run Selector */}
                    <Card className="mb-4">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">{t('Select Payroll Run')}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground mb-2">
                                {t('All reports below will be generated for the selected payroll run.')}
                            </p>
                            <select
                                className="w-full max-w-md border border-input rounded-md px-3 py-2 text-sm bg-background"
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
                        </CardContent>
                    </Card>

                    {/* Report table-style list */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {statutoryReports.map((report, idx) => (
                                    <div key={report.key} className={`flex items-center justify-between gap-4 px-5 py-4 ${idx % 2 === 0 ? '' : 'bg-muted/30'}`}>
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium">{report.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                                            </div>
                                        </div>
                                        <DownloadBtn routeKey={report.key} disabled={!selectedRun} />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                    {t('All reports export as CSV. Open in Excel or any spreadsheet application.')}
                </p>
            </div>
        </PageTemplate>
    );
}
