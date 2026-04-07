// C:\xampp\htdocs\codecanyon-TLu4dAkq-hrm-saas-hr-and-payroll-tool (1)\main-file\resources\js\pages\settings\index.tsx
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { useEffect, useRef, useState } from 'react';
import {
  Settings as SettingsIcon, DollarSign, FileText, Mail,
  CreditCard, HardDrive, Shield, Bot, Cookie, Search,
  Palette, Clock, Fingerprint, Network, Briefcase, FileCheck
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import SystemSettings from './components/system-settings';
import { usePage } from '@inertiajs/react';
import CurrencySettings from './components/currency-settings';
import BrandSettings from './components/brand-settings';
import EmailSettings from './components/email-settings';
import PaymentSettings from './components/payment-settings';
import StorageSettings from './components/storage-settings';
import RecaptchaSettings from './components/recaptcha-settings';
import ChatGptSettings from './components/chatgpt-settings';
import CookieSettings from './components/cookie-settings';
import SeoSettings from './components/seo-settings';
import CacheSettings from './components/cache-settings';
import WebhookSettings from './components/webhook-settings';
import GoogleCalendarSettings from './components/google-calendar-settings';
import WorkingDaysSettings from './components/working-days-settings';
import ZektoSettings from './components/zekto-settings';
import IpRestrictionSettings from './components/ip-restriction-settings';
import NocSettings from './components/noc-settings';
import ExperienceCertificateSettings from './components/experience-certificate-settings';
import JoiningLetterSettings from './components/joining-letter-settings';
import ZambiaTaxSettings from './components/zambia-tax-settings';
import { Toaster } from '@/components/ui/toaster';
import { useTranslation } from 'react-i18next';
import { useLayout } from '@/contexts/LayoutContext';

export default function Settings() {
  const { t } = useTranslation();
  const { position } = useLayout();

  const {
    systemSettings = {},
    cacheSize = '0.00',
    timezones = {},
    dateFormats = {},
    timeFormats = {},
    paymentSettings = {},
    webhooks = [],
    auth = {},
    globalSettings = {},
    zektoSettings = {},
    nocTemplates = [],
    joiningLetterTemplates = [],
    experienceCertificateTemplates = [],
    languages = [],
    zambiaTaxSettings = {},
  } = usePage().props as any;

  const isSaas = globalSettings?.is_saas;
  const [activeSection, setActiveSection] = useState('system-settings');

  const allSidebarNavItems: (NavItem & { permission?: string })[] = [
    {
      title: t('System Settings'),
      href: '#system-settings',
      icon: <SettingsIcon className="h-4 w-4 mr-2" />,
      permission: 'manage-system-settings'
    },
    {
      title: t('Brand Settings'),
      href: '#brand-settings',
      icon: <Palette className="h-4 w-4 mr-2" />,
      permission: 'manage-brand-settings'
    },
    {
      title: t('Currency Settings'),
      href: '#currency-settings',
      icon: <DollarSign className="h-4 w-4 mr-2" />,
      permission: 'manage-currency-settings'
    },
    {
      title: t('Email Settings'),
      href: '#email-settings',
      icon: <Mail className="h-4 w-4 mr-2" />,
      permission: 'manage-email-settings'
    },
    {
      title: t('Working Days Settings'),
      href: '#working-days-settings',
      icon: <Clock className="h-4 w-4 mr-2" />,
      permission: 'manage-working-days-settings'
    },
    {
      title: t('IP Restriction Settings'),
      href: '#ip-restriction-settings',
      icon: <Network className="h-4 w-4 mr-2" />,
      permission: 'manage-ip-restriction-settings'
    },
    {
      title: t('Zekto Settings'),
      href: '#zekto-settings',
      icon: <Fingerprint className="h-4 w-4 mr-2" />,
      permission: 'manage-biomatric-attedance-settings'
    },
    {
      title: t('NOC Settings'),
      href: '#noc-settings',
      icon: <FileText className="h-4 w-4 mr-2" />,
      permission: 'manage-noc'
    },
    {
      title: t('Experience Certificate Settings'),
      href: '#experience-certificate-settings',
      icon: <Briefcase className="h-4 w-4 mr-2" />,
      permission: 'manage-experience-certificate'
    },
    {
      title: t('Joining Letter Settings'),
      href: '#joining-letter-settings',
      icon: <FileCheck className="h-4 w-4 mr-2" />,
      permission: 'manage-joining-letter'
    },
    {
      title: t('Zambia Tax Settings'),
      href: '#zambia-tax-settings',
      icon: <DollarSign className="h-4 w-4 mr-2" />,
      permission: 'manage-zambia-tax-settings'
    },
    {
      title: t('Payment Settings'),
      href: '#payment-settings',
      icon: <CreditCard className="h-4 w-4 mr-2" />,
      permission: 'manage-payment-settings'
    },
    {
      title: t('Storage Settings'),
      href: '#storage-settings',
      icon: <HardDrive className="h-4 w-4 mr-2" />,
      permission: 'manage-storage-settings'
    },
    {
      title: t('ReCaptcha Settings'),
      href: '#recaptcha-settings',
      icon: <Shield className="h-4 w-4 mr-2" />,
      permission: 'manage-recaptcha-settings'
    },
    {
      title: t('Chat GPT Settings'),
      href: '#chatgpt-settings',
      icon: <Bot className="h-4 w-4 mr-2" />,
      permission: 'manage-chatgpt-settings'
    },
    {
      title: t('Cookie Settings'),
      href: '#cookie-settings',
      icon: <Cookie className="h-4 w-4 mr-2" />,
      permission: 'manage-cookie-settings'
    },
    {
      title: t('SEO Settings'),
      href: '#seo-settings',
      icon: <Search className="h-4 w-4 mr-2" />,
      permission: 'manage-seo-settings'
    },
    {
      title: t('Cache Settings'),
      href: '#cache-settings',
      icon: <HardDrive className="h-4 w-4 mr-2" />,
      permission: 'manage-cache-settings'
    },
  ];

  const sidebarNavItems = allSidebarNavItems.filter(item => {
    if (item.permission === 'manage-working-days-settings' && auth.user?.type === 'superadmin') return false;
    if (item.permission === 'manage-biomatric-attedance-settings' && auth.user?.type === 'superadmin') return false;
    if (item.permission === 'manage-ip-restriction-settings' && auth.user?.type === 'superadmin') return false;
    if (item.permission === 'manage-noc' && auth.user?.type === 'superadmin') return false;
    if (item.permission === 'manage-experience-certificate' && auth.user?.type === 'superadmin') return false;
    if (item.permission === 'manage-joining-letter' && auth.user?.type === 'superadmin') return false;
    if (item.permission === 'manage-zambia-tax-settings' && auth.user?.type === 'superadmin') return false;

    if (!item.permission || (auth.permissions && auth.permissions.includes(item.permission))) return true;

    if (auth.user && auth.user.type === 'company') {
      const allowedPermissions = [
        'manage-system-settings', 'manage-email-settings', 'manage-currency-settings',
        'manage-brand-settings', 'manage-webhook-settings', 'manage-working-days-settings',
        'manage-biomatric-attedance-settings', 'manage-ip-restriction-settings',
        'manage-zambia-tax-settings',
        'settings'
      ];
      if (!isSaas) {
        allowedPermissions.push(
          'manage-storage-settings', 'manage-recaptcha-settings', 'manage-chatgpt-settings',
          'manage-cookie-settings', 'manage-seo-settings', 'manage-cache-settings'
        );
      }
      return allowedPermissions.includes(item.permission ?? '');
    }
    return false;
  });

  // ─── Refs ────────────────────────────────────────────────────────────────
  const systemSettingsRef                = useRef<HTMLDivElement>(null);
  const brandSettingsRef                 = useRef<HTMLDivElement>(null);
  const currencySettingsRef              = useRef<HTMLDivElement>(null);
  const workingDaysSettingsRef           = useRef<HTMLDivElement>(null);
  const emailSettingsRef                 = useRef<HTMLDivElement>(null);
  const paymentSettingsRef               = useRef<HTMLDivElement>(null);
  const storageSettingsRef               = useRef<HTMLDivElement>(null);
  const recaptchaSettingsRef             = useRef<HTMLDivElement>(null);
  const chatgptSettingsRef               = useRef<HTMLDivElement>(null);
  const cookieSettingsRef                = useRef<HTMLDivElement>(null);
  const seoSettingsRef                   = useRef<HTMLDivElement>(null);
  const cacheSettingsRef                 = useRef<HTMLDivElement>(null);
  const webhookSettingsRef               = useRef<HTMLDivElement>(null);
  const googleCalendarSettingsRef        = useRef<HTMLDivElement>(null);
  const googleWalletSettingsRef          = useRef<HTMLDivElement>(null);
  const zektoSettingsRef                 = useRef<HTMLDivElement>(null);
  const ipRestrictionSettingsRef         = useRef<HTMLDivElement>(null);
  const nocSettingsRef                   = useRef<HTMLDivElement>(null);
  const experienceCertificateSettingsRef = useRef<HTMLDivElement>(null);
  const joiningLetterSettingsRef         = useRef<HTMLDivElement>(null);
  const zambiaTaxSettingsRef             = useRef<HTMLDivElement>(null);

  // ─── Scroll tracking ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      const pos = (ref: React.RefObject<HTMLDivElement>) => ref.current?.offsetTop || 0;

      const zambiaTaxPos               = pos(zambiaTaxSettingsRef);
      const joiningLetterPos           = pos(joiningLetterSettingsRef);
      const experienceCertificatePos   = pos(experienceCertificateSettingsRef);
      const nocPos                     = pos(nocSettingsRef);
      const zektoPos                   = pos(zektoSettingsRef);
      const ipRestrictionPos           = pos(ipRestrictionSettingsRef);
      const cachePos                   = pos(cacheSettingsRef);
      const seoPos                     = pos(seoSettingsRef);
      const cookiePos                  = pos(cookieSettingsRef);
      const chatgptPos                 = pos(chatgptSettingsRef);
      const recaptchaPos               = pos(recaptchaSettingsRef);
      const storagePos                 = pos(storageSettingsRef);
      const paymentPos                 = pos(paymentSettingsRef);
      const workingDaysPos             = pos(workingDaysSettingsRef);
      const emailPos                   = pos(emailSettingsRef);
      const currencyPos                = pos(currencySettingsRef);
      const brandPos                   = pos(brandSettingsRef);

      if (scrollPosition >= zambiaTaxPos && zambiaTaxPos > 0) {
        setActiveSection('zambia-tax-settings');
      } else if (scrollPosition >= joiningLetterPos) {
        setActiveSection('joining-letter-settings');
      } else if (scrollPosition >= experienceCertificatePos) {
        setActiveSection('experience-certificate-settings');
      } else if (scrollPosition >= nocPos) {
        setActiveSection('noc-settings');
      } else if (scrollPosition >= zektoPos) {
        setActiveSection('zekto-settings');
      } else if (scrollPosition >= ipRestrictionPos) {
        setActiveSection('ip-restriction-settings');
      } else if (scrollPosition >= cachePos) {
        setActiveSection('cache-settings');
      } else if (scrollPosition >= seoPos) {
        setActiveSection('seo-settings');
      } else if (scrollPosition >= cookiePos) {
        setActiveSection('cookie-settings');
      } else if (scrollPosition >= chatgptPos) {
        setActiveSection('chatgpt-settings');
      } else if (scrollPosition >= recaptchaPos) {
        setActiveSection('recaptcha-settings');
      } else if (scrollPosition >= storagePos) {
        setActiveSection('storage-settings');
      } else if (scrollPosition >= paymentPos) {
        setActiveSection('payment-settings');
      } else if (scrollPosition >= workingDaysPos) {
        setActiveSection('working-days-settings');
      } else if (scrollPosition >= emailPos) {
        setActiveSection('email-settings');
      } else if (scrollPosition >= currencyPos) {
        setActiveSection('currency-settings');
      } else if (scrollPosition >= brandPos) {
        setActiveSection('brand-settings');
      } else {
        setActiveSection('system-settings');
      }
    };

    window.addEventListener('scroll', handleScroll);

    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setActiveSection(hash);
      }
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    const id = href.replace('#', '');
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  return (
    <PageTemplate
      title={t('Settings')}
      url="/settings"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Settings') }
      ]}
    >
      <div className="flex flex-col md:flex-row gap-8" dir={position === 'right' ? 'rtl' : 'ltr'}>

        {/* Sidebar */}
        <div className="md:w-64 flex-shrink-0">
          <div className="sticky top-20">
            <ScrollArea className="h-[calc(100vh-5rem)]">
              <div className={`space-y-1 ${position === 'rtl' ? 'pl-4' : 'pr-4'}`}>
                {sidebarNavItems.map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className={cn('w-full justify-start', {
                      'bg-muted font-medium': activeSection === item.href.replace('#', ''),
                    })}
                    onClick={() => handleNavClick(item.href)}
                  >
                    {item.icon}
                    {item.title}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">

          {/* System Settings */}
          {(auth.permissions?.includes('manage-system-settings') || auth.user?.type === 'superadmin' || auth.user?.type === 'company') && (
            <section id="system-settings" ref={systemSettingsRef} className="mb-8">
              <SystemSettings
                settings={systemSettings}
                timezones={timezones}
                dateFormats={dateFormats}
                timeFormats={timeFormats}
                isCompanyUser={auth.user?.type === 'company'}
              />
            </section>
          )}

          {/* Brand Settings */}
          {(auth.permissions?.includes('manage-brand-settings') || auth.user?.type === 'superadmin') && (
            <section id="brand-settings" ref={brandSettingsRef} className="mb-8">
              <BrandSettings settings={systemSettings} />
            </section>
          )}

          {/* Currency Settings */}
          {(auth.permissions?.includes('manage-currency-settings') || auth.user?.type === 'superadmin' || auth.user?.type === 'company') && (
            <section id="currency-settings" ref={currencySettingsRef} className="mb-8">
              <CurrencySettings />
            </section>
          )}

          {/* Email Settings */}
          {(auth.permissions?.includes('manage-email-settings') || auth.user?.type === 'superadmin') && (
            <section id="email-settings" ref={emailSettingsRef} className="mb-8">
              <EmailSettings />
            </section>
          )}

          {/* Working Days Settings */}
          {auth.user?.type !== 'superadmin' && (auth.permissions?.includes('manage-working-days-settings') || auth.user?.type === 'company') && (
            <section id="working-days-settings" ref={workingDaysSettingsRef} className="mb-8">
              <WorkingDaysSettings settings={systemSettings} />
            </section>
          )}

          {/* IP Restriction Settings */}
          {auth.user?.type === 'company' && auth.permissions?.includes('manage-ip-restriction-settings') && (
            <section id="ip-restriction-settings" ref={ipRestrictionSettingsRef} className="mb-8">
              <IpRestrictionSettings />
            </section>
          )}

          {/* Zekto Settings */}
          {auth.user?.type === 'company' && auth.permissions?.includes('manage-biomatric-attedance-settings') && (
            <section id="zekto-settings" ref={zektoSettingsRef} className="mb-8">
              <ZektoSettings settings={zektoSettings} />
            </section>
          )}

          {/* NOC Settings */}
          {auth.user?.type === 'company' && auth.permissions?.includes('manage-noc') && (
            <section id="noc-settings" ref={nocSettingsRef} className="mb-8">
              <NocSettings templates={nocTemplates} />
            </section>
          )}

          {/* Experience Certificate Settings */}
          {auth.user?.type === 'company' && auth.permissions?.includes('manage-experience-certificate') && (
            <section id="experience-certificate-settings" ref={experienceCertificateSettingsRef} className="mb-8">
              <ExperienceCertificateSettings templates={experienceCertificateTemplates} />
            </section>
          )}

          {/* Joining Letter Settings */}
          {auth.user?.type === 'company' && auth.permissions?.includes('manage-joining-letter') && (
            <section id="joining-letter-settings" ref={joiningLetterSettingsRef} className="mb-8">
              <JoiningLetterSettings templates={joiningLetterTemplates} />
            </section>
          )}

          {/* Zambia Tax Settings */}
          {(auth.user?.type === 'company' || auth.permissions?.includes('manage-zambia-tax-settings')) && (
            <section id="zambia-tax-settings" ref={zambiaTaxSettingsRef} className="mb-8">
              <ZambiaTaxSettings settings={zambiaTaxSettings} />
            </section>
          )}

          {/* Payment Settings */}
          {(auth.permissions?.includes('manage-payment-settings') || auth.user?.type === 'superadmin') && (
            <section id="payment-settings" ref={paymentSettingsRef} className="mb-8">
              <PaymentSettings settings={paymentSettings} />
            </section>
          )}

          {/* Storage Settings */}
          {(auth.permissions?.includes('manage-settings') && (auth.user?.type === 'superadmin' || (auth.user?.type === 'company' && !isSaas))) && (
            <section id="storage-settings" ref={storageSettingsRef} className="mb-8">
              <StorageSettings settings={systemSettings} />
            </section>
          )}

          {/* ReCaptcha Settings */}
          {(auth.permissions?.includes('manage-recaptcha-settings') || auth.user?.type === 'superadmin' || (auth.user?.type === 'company' && !isSaas)) && (
            <section id="recaptcha-settings" ref={recaptchaSettingsRef} className="mb-8">
              <RecaptchaSettings settings={systemSettings} />
            </section>
          )}

          {/* Chat GPT Settings */}
          {(auth.permissions?.includes('manage-chatgpt-settings') || auth.user?.type === 'superadmin' || (auth.user?.type === 'company' && !isSaas)) && (
            <section id="chatgpt-settings" ref={chatgptSettingsRef} className="mb-8">
              <ChatGptSettings settings={systemSettings} />
            </section>
          )}

          {/* Cookie Settings */}
          {(auth.permissions?.includes('manage-cookie-settings') || auth.user?.type === 'superadmin' || (auth.user?.type === 'company' && !isSaas)) && (
            <section id="cookie-settings" ref={cookieSettingsRef} className="mb-8">
              <CookieSettings settings={systemSettings} />
            </section>
          )}

          {/* SEO Settings */}
          {(auth.permissions?.includes('manage-seo-settings') || auth.user?.type === 'superadmin' || (auth.user?.type === 'company' && !isSaas)) && (
            <section id="seo-settings" ref={seoSettingsRef} className="mb-8">
              <SeoSettings settings={systemSettings} />
            </section>
          )}

          {/* Cache Settings */}
          {(auth.permissions?.includes('manage-cache-settings') || auth.user?.type === 'superadmin' || (auth.user?.type === 'company' && !isSaas)) && (
            <section id="cache-settings" ref={cacheSettingsRef} className="mb-8">
              <CacheSettings cacheSize={cacheSize} />
            </section>
          )}

        </div>
      </div>
      <Toaster />
    </PageTemplate>
  );
}