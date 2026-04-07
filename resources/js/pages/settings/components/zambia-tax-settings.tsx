import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useState } from 'react';

interface ZambiaTaxSettingsProps {
  settings: Record<string, string>;
}

// ✅ Field moved OUTSIDE to prevent remount on every keystroke
interface FieldProps {
  label: string;
  fieldKey: string;
  hint?: string;
  readOnly?: boolean;
  value: string;
  error?: string;
  onChange: (key: string, value: string) => void;
}

const Field = ({ label, fieldKey, hint, readOnly = false, value, error, onChange }: FieldProps) => (
  <div className="space-y-1">
    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</Label>
    <Input
      type="number"
      step="0.01"
      readOnly={readOnly}
      value={value}
      onChange={(e) => !readOnly && onChange(fieldKey, e.target.value)}
      className={`${error ? 'border-red-500 focus-visible:ring-red-500' : ''} ${readOnly ? 'bg-muted cursor-not-allowed' : ''}`}
    />
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && (
      <p className="text-xs text-red-500 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" /> {error}
      </p>
    )}
  </div>
);

export default function ZambiaTaxSettings({ settings }: ZambiaTaxSettingsProps) {
  const { t } = useTranslation();

  const [form, setForm] = useState({
    zambia_paye_slab_1_min:  settings.zambia_paye_slab_1_min  ?? '0',
    zambia_paye_slab_1_max:  settings.zambia_paye_slab_1_max  ?? '5100',
    zambia_paye_slab_1_rate: settings.zambia_paye_slab_1_rate ?? '0',
    zambia_paye_slab_2_min:  settings.zambia_paye_slab_2_min  ?? '5100.01',
    zambia_paye_slab_2_max:  settings.zambia_paye_slab_2_max  ?? '7100',
    zambia_paye_slab_2_rate: settings.zambia_paye_slab_2_rate ?? '25',
    zambia_paye_slab_3_min:  settings.zambia_paye_slab_3_min  ?? '7100.01',
    zambia_paye_slab_3_max:  settings.zambia_paye_slab_3_max  ?? '9200',
    zambia_paye_slab_3_rate: settings.zambia_paye_slab_3_rate ?? '30',
    zambia_paye_slab_4_min:  settings.zambia_paye_slab_4_min  ?? '9201.01',
    zambia_paye_slab_4_max:  settings.zambia_paye_slab_4_max  ?? '999999999',
    zambia_paye_slab_4_rate: settings.zambia_paye_slab_4_rate ?? '35',
    zambia_napsa_employee_rate: settings.zambia_napsa_employee_rate ?? '5',
    zambia_napsa_employer_rate: settings.zambia_napsa_employer_rate ?? '5',
    zambia_napsa_monthly_cap:   settings.zambia_napsa_monthly_cap   ?? '1073.20',
    zambia_nhima_employee_rate: settings.zambia_nhima_employee_rate ?? '1',
    zambia_nhima_employer_rate: settings.zambia_nhima_employer_rate ?? '1',
    zambia_sdl_rate: settings.zambia_sdl_rate ?? '0.5',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (key: string, value: string) => {
    setSaved(false);
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaved(false);
    router.post(route('settings.zambia-tax.update'), form, {
      onSuccess: (page: any) => {
        setIsSubmitting(false);
        setSaved(true);
        if (page.props.flash?.success) {
          toast.success(t(page.props.flash.success));
        } else {
          toast.success(t('Zambia tax settings saved successfully'));
        }
      },
      onError: (errs: any) => {
        setIsSubmitting(false);
        setErrors(errs);
        toast.error(t('Please correct the errors in the form'));
      },
    });
  };

  const slabs = [
    {
      label: t('Slab 1'), badge: '0%',
      badgeColor: 'bg-green-50 text-green-700 ring-green-600/20',
      minKey: 'zambia_paye_slab_1_min', maxKey: 'zambia_paye_slab_1_max', rateKey: 'zambia_paye_slab_1_rate',
      hint: t('Tax-free band — ZMW 0 to 5,100'),
    },
    {
      label: t('Slab 2'), badge: '25%',
      badgeColor: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
      minKey: 'zambia_paye_slab_2_min', maxKey: 'zambia_paye_slab_2_max', rateKey: 'zambia_paye_slab_2_rate',
      hint: t('Low rate band — ZMW 5,100.01 to 7,100'),
    },
    {
      label: t('Slab 3'), badge: '30%',
      badgeColor: 'bg-orange-50 text-orange-700 ring-orange-600/20',
      minKey: 'zambia_paye_slab_3_min', maxKey: 'zambia_paye_slab_3_max', rateKey: 'zambia_paye_slab_3_rate',
      hint: t('Mid rate band — ZMW 7,100.01 to 9,200'),
    },
    {
      label: t('Slab 4'), badge: '35%',
      badgeColor: 'bg-red-50 text-red-700 ring-red-600/20',
      minKey: 'zambia_paye_slab_4_min', maxKey: 'zambia_paye_slab_4_max', rateKey: 'zambia_paye_slab_4_rate',
      hint: t('Top rate band — ZMW 9,201.01 and above'),
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">{t('Zambia Revenue Authority (ZRA) — Official Tax Rates')}</p>
          <p className="text-xs mt-0.5 text-blue-600 dark:text-blue-300">
            {t('All values are per month in ZMW. Changes take effect on the next payroll run.')}
          </p>
        </div>
      </div>

      {/* PAYE Tax Slabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{t('PAYE Tax Slabs (Monthly ZMW)')}</CardTitle>
            <span className="text-xs text-muted-foreground">{t('Progressive income tax — ZRA official bands')}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-0 divide-y divide-border">
          {slabs.map((slab, index) => (
            <div key={slab.rateKey} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{slab.label}</span>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${slab.badgeColor}`}>
                  {slab.badge}
                </span>
                <span className="text-xs text-muted-foreground">— {slab.hint}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field
                  label={t('Min (ZMW)')}
                  fieldKey={slab.minKey}
                  value={form[slab.minKey as keyof typeof form]}
                  error={errors[slab.minKey]}
                  onChange={handleChange}
                  readOnly={index === 0}
                />
                <Field
                  label={index === 3 ? t('Max (ZMW) — leave as 999999999') : t('Max (ZMW)')}
                  fieldKey={slab.maxKey}
                  value={form[slab.maxKey as keyof typeof form]}
                  error={errors[slab.maxKey]}
                  onChange={handleChange}
                  readOnly={index === 3}
                />
                <Field
                  label={t('Rate (%)')}
                  fieldKey={slab.rateKey}
                  value={form[slab.rateKey as keyof typeof form]}
                  error={errors[slab.rateKey]}
                  onChange={handleChange}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* NAPSA */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{t('NAPSA Settings')}</CardTitle>
            <span className="text-xs text-muted-foreground">{t('National Pension Scheme Authority')}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label={t('Employee Rate (%)')}
              fieldKey="zambia_napsa_employee_rate"
              value={form.zambia_napsa_employee_rate}
              error={errors.zambia_napsa_employee_rate}
              onChange={handleChange}
              hint={t('Default: 5% of basic salary')}
            />
            <Field
              label={t('Employer Rate (%)')}
              fieldKey="zambia_napsa_employer_rate"
              value={form.zambia_napsa_employer_rate}
              error={errors.zambia_napsa_employer_rate}
              onChange={handleChange}
              hint={t('Default: 5% of basic salary')}
            />
            <Field
              label={t('Monthly Contribution Cap (ZMW)')}
              fieldKey="zambia_napsa_monthly_cap"
              value={form.zambia_napsa_monthly_cap}
              error={errors.zambia_napsa_monthly_cap}
              onChange={handleChange}
              hint={t('NAPSA stops at this salary ceiling')}
            />
          </div>
          <div className="mt-4 p-3 rounded-md bg-muted/40 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {t('Total NAPSA contribution = 10% (5% employee + 5% employer). The cap limits the maximum contribution per month.')}
          </div>
        </CardContent>
      </Card>

      {/* NHIMA */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{t('NHIMA Settings')}</CardTitle>
            <span className="text-xs text-muted-foreground">{t('National Health Insurance Management Authority')}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label={t('Employee Rate (%)')}
              fieldKey="zambia_nhima_employee_rate"
              value={form.zambia_nhima_employee_rate}
              error={errors.zambia_nhima_employee_rate}
              onChange={handleChange}
              hint={t('Default: 1% of basic salary')}
            />
            <Field
              label={t('Employer Rate (%)')}
              fieldKey="zambia_nhima_employer_rate"
              value={form.zambia_nhima_employer_rate}
              error={errors.zambia_nhima_employer_rate}
              onChange={handleChange}
              hint={t('Default: 1% of basic salary')}
            />
          </div>
          <div className="mt-4 p-3 rounded-md bg-muted/40 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {t('Total NHIMA = 2% (1% employee + 1% employer). Calculated on basic salary. No monthly cap applies.')}
          </div>
        </CardContent>
      </Card>

      {/* SDL */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{t('SDL Settings')}</CardTitle>
            <span className="text-xs text-muted-foreground">{t('Skills Development Levy')}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label={t('Employer Rate (% of total payroll)')}
              fieldKey="zambia_sdl_rate"
              value={form.zambia_sdl_rate}
              error={errors.zambia_sdl_rate}
              onChange={handleChange}
              hint={t('Calculated on total payroll — not per employee')}
            />
            <div className="flex items-center">
              <div className="p-3 rounded-md bg-muted/40 text-xs text-muted-foreground flex items-start gap-2 w-full">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {t('SDL is paid by employer only. Employees do not contribute. Default: 0.5%. Employees marked as SDL exempt will be excluded.')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              {t('Settings saved successfully')}
            </span>
          )}
          {Object.keys(errors).length > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              {t('Please fix the errors above')}
            </span>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting} className="min-w-40">
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('Saving...')}
            </span>
          ) : (
            t('Save Zambia Tax Settings')
          )}
        </Button>
      </div>

    </form>
  );
}