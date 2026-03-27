import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
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

    const downloadReport = (routeName: string, label: string) => {
        if (!selectedRun) {
            toast.error(t('Please select a payroll run first'));
            return;
        }

        setLoading(routeName);

        // Use a hidden form POST — bypasses CSRF and fetch blob issues in Inertia apps
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = route(routeName);
        form.target = '_blank'; // open in new tab so page doesn't reload

        // CSRF token
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = '_token';
        csrfInput.value = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
        form.appendChild(csrfInput);

        // Payroll run ID
        const runInput = document.createElement('input');
        runInput.type = 'hidden';
        runInput.name = 'payroll_run_id';
        runInput.value = selectedRun;
        form.appendChild(runInput);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        toast.success(t('Report download started'));
        setLoading(null);
    };

    const reports = [
        {
            key: 'hr.zambia-reports.paye-p11',
            title: t('PAYE P11 Report'),
            description: t('Employee TPIN, gross salary and PAYE deducted for the month. Submit to ZRA.'),
            filename: 'PAYE_P11',
            color: 'border-l-blue-500',
        },
        {
            key: 'hr.zambia-reports.napsa-schedule',
            title: t('NAPSA Schedule'),
            description: t('Employee NAPSA numbers, gross salary, employee and employer contributions. Submit to NAPSA office.'),
            filename: 'NAPSA_Schedule',
            color: 'border-l-green-500',
        },
        {
            key: 'hr.zambia-reports.nhima-report',
            title: t('NHIMA Report'),
            description: t('Employee NHIMA numbers, gross salary, employee and employer contributions. Submit to NHIMA office.'),
            filename: 'NHIMA_Report',
            color: 'border-l-purple-500',
        },
        {
            key: 'hr.zambia-reports.bank-schedule',
            title: t('Bank Payment Schedule'),
            description: t('Employee bank details and net pay amounts. Send to your bank to process salary payments.'),
            filename: 'Bank_Schedule',
            color: 'border-l-orange-500',
        },
        {
            key: 'hr.zambia-reports.payroll-summary',
            title: t('Payroll Summary'),
            description: t('Overall totals — gross pay, all deductions, net pay, and total employer cost for the month.'),
            filename: 'Payroll_Summary',
            color: 'border-l-red-500',
        },
    ];

    return (
        <PageTemplate
            title={t('Zambia Compliance Reports')}
            url="/hr/zambia-reports"
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="p-6 space-y-6">

                {/* Payroll Run Selector */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t('Select Payroll Run')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-md space-y-1">
                            <Label className="text-sm text-muted-foreground">
                                {t('All reports below will be generated for the selected payroll run')}
                            </Label>
                            <select
                                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
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
                    </CardContent>
                </Card>

                {/* Report Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reports.map(report => (
                        <Card key={report.key} className={`border-l-4 ${report.color}`}>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold text-sm">{report.title}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {report.description}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!selectedRun || loading === report.key}
                                        onClick={() => downloadReport(report.key, report.filename)}
                                        className="shrink-0"
                                    >
                                        {loading === report.key ? (
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
                    ))}
                </div>

                {/* Info note */}
                <p className="text-xs text-muted-foreground text-center">
                    {t('All reports export as CSV. Select the payroll run above then click Download CSV next to each report.')}
                </p>
            </div>
        </PageTemplate>
    );
}