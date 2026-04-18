import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ThemePreview } from '@/components/theme-preview';
import { useAppearance, type Appearance, type ThemeColor } from '@/hooks/use-appearance';
import { useLayout, type LayoutPosition } from '@/contexts/LayoutContext';
import { useSidebarSettings } from '@/contexts/SidebarContext';
import { useBrand } from '@/contexts/BrandContext';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Palette, Save, Upload, Check, Layout, Moon, FileText, Sidebar as SidebarIcon, X } from 'lucide-react';
import { SettingsSection } from '@/components/settings-section';
import { SidebarPreview } from '@/components/sidebar-preview';
import { useTranslation } from 'react-i18next';
import { usePage, router } from '@inertiajs/react';
import { getImagePath } from '@/utils/helpers';

// Cookie utility functions
const setCookie = (name: string, value: string, days = 365) => {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue ? decodeURIComponent(cookieValue) : null;
  }
  return null;
};

// Define the brand settings interface
export interface BrandSettings {
  logoDark: string;
  logoLight: string;
  favicon: string;
  titleText: string;
  footerText: string;
  companyMobile?: string;
  companyAddress?: string;
  themeColor: ThemeColor;
  customColor: string;
  sidebarVariant: string;
  sidebarStyle: string;
  layoutDirection: LayoutPosition;
  themeMode: Appearance;
}

// Default brand settings
export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  logoDark: 'images/logos/Afripay HR Logo_page-0004.jpg',
  logoLight: 'images/logos/Afripay HR Logo_page-0001.jpg',
  favicon: 'logo/favicon.png',
  titleText: 'AfriPay HR',
  footerText: '© 2026 AfriPay HR. A product of Aromerc & Co. Ltd',
  companyMobile: '',
  companyAddress: '',
  themeColor: 'green',
  customColor: '#3b82f6',
  sidebarVariant: 'inset',
  sidebarStyle: 'plain',
  layoutDirection: 'left',
  themeMode: 'light',
};

// Get brand settings from props or cookies/localStorage as fallback
export const getBrandSettings = (userSettings?: Record<string, string>, globalSettings?: any): BrandSettings => {
  const isDemo = globalSettings?.is_demo || false;

  // In demo mode, prioritize cookies over backend settings
  if (isDemo) {
    try {
      const themeSettings = getCookie('themeSettings');
      const sidebarSettings = getCookie('sidebarSettings');
      const layoutPosition = getCookie('layoutPosition');
      const brandSettings = getCookie('brandSettings');

      const parsedTheme = themeSettings ? JSON.parse(themeSettings) : {};
      const parsedSidebar = sidebarSettings ? JSON.parse(sidebarSettings) : {};
      const parsedBrand = brandSettings ? JSON.parse(brandSettings) : {};

      return {
        logoDark: parsedBrand.logoDark || userSettings?.logoDark || DEFAULT_BRAND_SETTINGS.logoDark,
        logoLight: parsedBrand.logoLight || userSettings?.logoLight || DEFAULT_BRAND_SETTINGS.logoLight,
        favicon: parsedBrand.favicon || userSettings?.favicon || DEFAULT_BRAND_SETTINGS.favicon,
        titleText: parsedBrand.titleText || userSettings?.titleText || DEFAULT_BRAND_SETTINGS.titleText,
        footerText: parsedBrand.footerText || userSettings?.footerText || DEFAULT_BRAND_SETTINGS.footerText,
        companyMobile: parsedBrand.companyMobile || userSettings?.companyMobile || DEFAULT_BRAND_SETTINGS.companyMobile,
        companyAddress: parsedBrand.companyAddress || userSettings?.companyAddress || DEFAULT_BRAND_SETTINGS.companyAddress,
        themeColor: parsedTheme.themeColor || DEFAULT_BRAND_SETTINGS.themeColor,
        customColor: parsedTheme.customColor || DEFAULT_BRAND_SETTINGS.customColor,
        sidebarVariant: parsedSidebar.variant || DEFAULT_BRAND_SETTINGS.sidebarVariant,
        sidebarStyle: parsedSidebar.style || DEFAULT_BRAND_SETTINGS.sidebarStyle,
        layoutDirection: layoutPosition || DEFAULT_BRAND_SETTINGS.layoutDirection,
        themeMode: parsedTheme.appearance || DEFAULT_BRAND_SETTINGS.themeMode,
      };
    } catch (error) {
      // Fall through to normal logic if cookie parsing fails
    }
  }

  // If we have settings from the backend, use those (non-demo mode)
  if (userSettings) {
    return {
      logoDark: userSettings.logoDark || DEFAULT_BRAND_SETTINGS.logoDark,
      logoLight: userSettings.logoLight || DEFAULT_BRAND_SETTINGS.logoLight,
      favicon: userSettings.favicon || DEFAULT_BRAND_SETTINGS.favicon,
      titleText: userSettings.titleText || DEFAULT_BRAND_SETTINGS.titleText,
      footerText: userSettings.footerText || DEFAULT_BRAND_SETTINGS.footerText,
      companyMobile: userSettings.companyMobile || DEFAULT_BRAND_SETTINGS.companyMobile,
      companyAddress: userSettings.companyAddress || DEFAULT_BRAND_SETTINGS.companyAddress,
      themeColor: (userSettings.themeColor as ThemeColor) || DEFAULT_BRAND_SETTINGS.themeColor,
      customColor: userSettings.customColor || DEFAULT_BRAND_SETTINGS.customColor,
      sidebarVariant: userSettings.sidebarVariant || DEFAULT_BRAND_SETTINGS.sidebarVariant,
      sidebarStyle: userSettings.sidebarStyle || DEFAULT_BRAND_SETTINGS.sidebarStyle,
      layoutDirection: (userSettings.layoutDirection as LayoutPosition) || DEFAULT_BRAND_SETTINGS.layoutDirection,
      themeMode: (userSettings.themeMode as Appearance) || DEFAULT_BRAND_SETTINGS.themeMode,
    };
  }

  // Fallback to defaults
  return DEFAULT_BRAND_SETTINGS;
};

interface LogoUploadFieldProps {
  label: string;
  currentPath: string;
  newFile?: File;
  onFileChange: (file: File) => void;
  onRemove: () => void;
  hint: string;
  bgClass?: string;
  containerHeight?: string;
}

function LogoUploadField({ label, currentPath, newFile, onFileChange, onRemove, hint, bgClass = 'bg-muted/30', containerHeight = 'h-32' }: LogoUploadFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (newFile) {
      const url = URL.createObjectURL(newFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl('');
    }
  }, [newFile]);

  const displayUrl = previewUrl || (currentPath ? getImagePath(currentPath) : '');

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none">{label}</label>
      <div className={`border-2 border-dashed rounded-lg flex items-center justify-center relative overflow-hidden ${bgClass} ${containerHeight}`}
        style={{ minHeight: containerHeight === 'h-20' ? '5rem' : '8rem' }}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt={label}
              className="max-h-full max-w-full object-contain p-2"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <button
              type="button"
              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-80 z-10"
              onClick={onRemove}
              title="Remove logo"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-1 py-4">
            <Upload className="h-6 w-6 opacity-40" />
            <span className="text-xs">{t('No image selected')}</span>
          </div>
        )}
      </div>
      {newFile && (
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <Check className="h-3 w-3" />
          <span>{newFile.name} — {t('ready to save')}</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp,image/x-icon"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileChange(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-input rounded-md bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        {displayUrl ? t('Change Image') : t('Upload Image')}
      </button>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

interface BrandSettingsProps {
  settings?: Record<string, string>;
}

export default function BrandSettings({ settings }: BrandSettingsProps) {
  const { t } = useTranslation();
  const { props } = usePage();
  const currentGlobalSettings = (props as any).globalSettings;
  const auth = (props as any).auth;
  const userRole = auth?.user?.type || auth?.user?.role;
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(() => getBrandSettings(currentGlobalSettings || settings, currentGlobalSettings));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'logos' | 'text' | 'theme'>('logos');
  const [logoFiles, setLogoFiles] = useState<{ logoDark?: File; logoLight?: File; favicon?: File }>({});

  // Get theme hooks
  const {
    updateAppearance,
    updateThemeColor,
    updateCustomColor,
    saveThemeSettings
  } = useAppearance();

  const { updatePosition, saveLayoutPosition } = useLayout();
  const { updateVariant, updateStyle, saveSidebarSettings } = useSidebarSettings();

  // Load settings when globalSettings change (but not while saving)
  useEffect(() => {
    if (isSaving) return; // Don't reset form while saving

    const newBrandSettings = getBrandSettings(currentGlobalSettings || settings, currentGlobalSettings);
    setBrandSettings(newBrandSettings);

    // Also sync sidebar settings from cookies or localStorage
    try {
      const isDemo = currentGlobalSettings?.is_demo || false;
      let sidebarSettings = null;
      
      if (isDemo) {
        // In demo mode, get from cookies
        sidebarSettings = getCookie('sidebarSettings');
      }
      // In non-demo mode, sidebar settings come from database via props
      
      if (sidebarSettings) {
        const parsedSettings = JSON.parse(sidebarSettings);
        setBrandSettings(prev => ({
          ...prev,
          sidebarVariant: parsedSettings.variant || prev.sidebarVariant,
          sidebarStyle: parsedSettings.style || prev.sidebarStyle
        }));
      }
    } catch (error) {
      console.error('Error loading sidebar settings', error);
    }
  }, [currentGlobalSettings, settings, isSaving]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBrandSettings(prev => ({ ...prev, [name]: value }));

    // Update brand context if the input is for a logo
    if (['logoLight', 'logoDark', 'favicon'].includes(name)) {
      updateBrandSettings({ [name]: value });
    }
  };

  // Handle media picker selection
  const handleMediaSelect = (name: string, url: string) => {
    setBrandSettings(prev => ({ ...prev, [name]: url }));
    updateBrandSettings({ [name]: url });
  };

  // Import useBrand hook
  const { updateBrandSettings } = useBrand();

  // Handle theme color change
  const handleThemeColorChange = (color: ThemeColor) => {
    setBrandSettings(prev => ({ ...prev, themeColor: color }));
    updateThemeColor(color);
  };

  // Handle custom color change
  const handleCustomColorChange = (color: string) => {
    setBrandSettings(prev => ({ ...prev, customColor: color }));
    // Set as active custom color when user is editing it
    updateCustomColor(color, true);
  };

  // Handle sidebar variant change
  const handleSidebarVariantChange = (variant: string) => {
    setBrandSettings(prev => ({ ...prev, sidebarVariant: variant }));
    updateVariant(variant as any);
  };

  // Handle sidebar style change
  const handleSidebarStyleChange = (style: string) => {
    setBrandSettings(prev => ({ ...prev, sidebarStyle: style }));
    updateStyle(style);
  };

  // Handle layout direction change
  const handleLayoutDirectionChange = (direction: LayoutPosition) => {
    setBrandSettings(prev => ({ ...prev, layoutDirection: direction }));
    updatePosition(direction);
  };

  // Handle theme mode change
  const handleThemeModeChange = (mode: Appearance) => {
    setBrandSettings(prev => ({ ...prev, themeMode: mode }));
    // Only update appearance, don't let it reset the theme color
    updateAppearance(mode);
    // Immediately reapply the current theme color to prevent it from changing
    setTimeout(() => {
      updateThemeColor(brandSettings.themeColor);
      if (brandSettings.themeColor === 'custom') {
        updateCustomColor(brandSettings.customColor);
      }
    }, 0);
  };

  // Save settings
  const saveSettings = () => {
    setIsLoading(true);
    setIsSaving(true);

    // Update theme settings
    updateThemeColor(brandSettings.themeColor);
    if (brandSettings.themeColor === 'custom') {
      updateCustomColor(brandSettings.customColor);
    }
    updateAppearance(brandSettings.themeMode);
    updatePosition(brandSettings.layoutDirection);

    // Update sidebar settings
    updateVariant(brandSettings.sidebarVariant as any);
    updateStyle(brandSettings.sidebarStyle);
    
    // Save all settings to cookies in demo mode
    saveThemeSettings();
    saveSidebarSettings();
    saveLayoutPosition();

    // Update brand context
    updateBrandSettings({
      logoLight: brandSettings.logoLight,
      logoDark: brandSettings.logoDark,
      favicon: brandSettings.favicon
    });

    // Individual update functions already handled storage (cookies in demo mode, localStorage in normal mode)
    // Only save to database in normal mode

    // Build the request data — include logo File objects if selected
    const requestData: Record<string, any> = { settings: brandSettings };
    if (logoFiles.logoDark)  requestData.logoDarkFile  = logoFiles.logoDark;
    if (logoFiles.logoLight) requestData.logoLightFile = logoFiles.logoLight;
    if (logoFiles.favicon)   requestData.faviconFile   = logoFiles.favicon;

    // Save to database using Inertia (auto-converts to multipart when Files detected)
    router.post(route('settings.brand.update'), requestData, {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: (page) => {
        setIsLoading(false);
        const successMessage = (page.props as any).flash?.success;
        const errorMessage   = (page.props as any).flash?.error;

        if (successMessage) {
          toast.success(successMessage);
          // Clear uploaded file state after successful save
          setLogoFiles({});
          setTimeout(() => setIsSaving(false), 500);
        } else if (errorMessage) {
          toast.error(errorMessage);
          setIsSaving(false);
        } else {
          setTimeout(() => setIsSaving(false), 500);
        }
      },
      onError: (errors) => {
        setIsLoading(false);
        setIsSaving(false);
        const errorMessage = errors.error || Object.values(errors).join(', ') || t('Failed to save brand settings');
        toast.error(errorMessage);
      }
    });
  };

  return (
    <SettingsSection
      title={t("Brand Settings")}
      description={t("Customize your application's branding and appearance")}
      action={
        <Button onClick={saveSettings} disabled={isLoading} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? t('Saving...') : t('Save Changes')}
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex space-x-2 mb-6">
            <Button
              variant={activeSection === 'logos' ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection('logos')}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t("Logos")}
            </Button>
            <Button
              variant={activeSection === 'text' ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection('text')}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              {t("Text")}
            </Button>
            <Button
              variant={activeSection === 'theme' ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection('theme')}
              className="flex-1"
            >
              <Palette className="h-4 w-4 mr-2" />
              {t("Theme")}
            </Button>
          </div>

          {/* Logos Section */}
          {activeSection === 'logos' && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                {t('Upload your logos directly. The old file will be removed automatically when you upload a new one.')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LogoUploadField
                  label={t('Logo (Dark Background)')}
                  currentPath={brandSettings.logoDark}
                  newFile={logoFiles.logoDark}
                  bgClass="bg-slate-800"
                  containerHeight="h-32"
                  hint={t('Recommended: PNG or SVG, 300×80 px, transparent background. Used on dark sidebars.')}
                  onFileChange={(file) => {
                    setLogoFiles(prev => ({ ...prev, logoDark: file }));
                    updateBrandSettings({ logoDark: brandSettings.logoDark });
                  }}
                  onRemove={() => {
                    if (logoFiles.logoDark) {
                      setLogoFiles(prev => ({ ...prev, logoDark: undefined }));
                    } else {
                      setBrandSettings(prev => ({ ...prev, logoDark: '' }));
                      updateBrandSettings({ logoDark: '' });
                    }
                  }}
                />

                <LogoUploadField
                  label={t('Logo (Light Background)')}
                  currentPath={brandSettings.logoLight}
                  newFile={logoFiles.logoLight}
                  bgClass="bg-white"
                  containerHeight="h-32"
                  hint={t('Recommended: PNG or SVG, 300×80 px, transparent background. Used on light sidebars.')}
                  onFileChange={(file) => {
                    setLogoFiles(prev => ({ ...prev, logoLight: file }));
                    updateBrandSettings({ logoLight: brandSettings.logoLight });
                  }}
                  onRemove={() => {
                    if (logoFiles.logoLight) {
                      setLogoFiles(prev => ({ ...prev, logoLight: undefined }));
                    } else {
                      setBrandSettings(prev => ({ ...prev, logoLight: '' }));
                      updateBrandSettings({ logoLight: '' });
                    }
                  }}
                />

                <LogoUploadField
                  label={t('Favicon')}
                  currentPath={brandSettings.favicon}
                  newFile={logoFiles.favicon}
                  bgClass="bg-muted/30"
                  containerHeight="h-20"
                  hint={t('Recommended: ICO, PNG or SVG, 32×32 px or 64×64 px square. Shown in browser tabs.')}
                  onFileChange={(file) => {
                    setLogoFiles(prev => ({ ...prev, favicon: file }));
                  }}
                  onRemove={() => {
                    if (logoFiles.favicon) {
                      setLogoFiles(prev => ({ ...prev, favicon: undefined }));
                    } else {
                      setBrandSettings(prev => ({ ...prev, favicon: '' }));
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Text Section */}
          {activeSection === 'text' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="titleText">{t("Title Text")}</Label>
                  <Input
                    id="titleText"
                    name="titleText"
                    value={brandSettings.titleText}
                    onChange={handleInputChange}
                    placeholder="AfriPay HR"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("Application title displayed in the browser tab")}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="footerText">{t("Footer Text")}</Label>
                  <Input
                    id="footerText"
                    name="footerText"
                    value={brandSettings.footerText}
                    onChange={handleInputChange}
                    placeholder="© 2026 AfriPay HR. A product of Aromerc &amp; Co. Ltd"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("Text displayed in the footer")}
                  </p>
                </div>

                {userRole === 'company' && (
                  <>
                    <div className="space-y-3">
                      <Label htmlFor="companyMobile">{t("Company Mobile Number")}</Label>
                      <Input
                        id="companyMobile"
                        name="companyMobile"
                        value={brandSettings.companyMobile || ''}
                        onChange={handleInputChange}
                        placeholder="+1 234 567 8900"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("Company contact mobile number")}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="companyAddress">{t("Company Address")}</Label>
                      <textarea
                        id="companyAddress"
                        name="companyAddress"
                        value={brandSettings.companyAddress || ''}
                        onChange={(e) => setBrandSettings(prev => ({ ...prev, companyAddress: e.target.value }))}
                        placeholder="Enter company address"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("Company address")}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Theme Section */}
          {activeSection === 'theme' && (
            <div className="space-y-6">
              <div className="flex flex-col space-y-8">
                {/* Theme Color Section */}
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Palette className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="text-base font-medium">{t("Theme Color")}</h3>
                  </div>
                  <Separator className="my-2" />

                  <div className="grid grid-cols-6 gap-2">
                    {Object.entries({ blue: '#3b82f6', green: '#10b77f', purple: '#8b5cf6', orange: '#f97316', red: '#ef4444' }).map(([color, hex]) => (
                      <Button
                        key={color}
                        type="button"
                        variant={brandSettings.themeColor === color ? "default" : "outline"}
                        className="h-8 w-full p-0 relative"
                        style={{ backgroundColor: brandSettings.themeColor === color ? hex : 'transparent' }}
                        onClick={() => handleThemeColorChange(color as ThemeColor)}
                      >
                        <span
                          className="absolute inset-1 rounded-sm"
                          style={{ backgroundColor: hex }}
                        />
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant={brandSettings.themeColor === 'custom' ? "default" : "outline"}
                      className="h-8 w-full p-0 relative"
                      style={{ backgroundColor: brandSettings.themeColor === 'custom' ? brandSettings.customColor : 'transparent' }}
                      onClick={() => handleThemeColorChange('custom')}
                    >
                      <span
                        className="absolute inset-1 rounded-sm"
                        style={{ backgroundColor: settings.customColor }}
                      />
                    </Button>
                  </div>

                  {brandSettings.themeColor === 'custom' && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="customColor">{t("Custom Color")}</Label>
                      <div className="flex gap-2">
                        <div className="relative">
                          <Input
                            id="colorPicker"
                            type="color"
                            value={brandSettings.customColor}
                            onChange={(e) => handleCustomColorChange(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div
                            className="w-10 h-10 rounded border cursor-pointer"
                            style={{ backgroundColor: brandSettings.customColor }}
                          />
                        </div>
                        <Input
                          id="customColor"
                          name="customColor"
                          type="text"
                          value={brandSettings.customColor}
                          onChange={(e) => handleCustomColorChange(e.target.value)}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar Section */}
                <div className="space-y-4">
                  <div className="flex items-center">
                    <SidebarIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="text-base font-medium">{t("Sidebar")}</h3>
                  </div>
                  <Separator className="my-2" />

                  <div className="space-y-6">
                    <div>
                      <Label className="mb-2 block">{t("Sidebar Variant")}</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {['inset', 'floating', 'minimal'].map((variant) => (
                          <Button
                            key={variant}
                            type="button"
                            variant={brandSettings.sidebarVariant === variant ? "default" : "outline"}
                            className="h-10 justify-start"
                            style={{
                              backgroundColor: brandSettings.sidebarVariant === variant ?
                                (brandSettings.themeColor === 'custom' ? brandSettings.customColor : null) :
                                'transparent'
                            }}
                            onClick={() => handleSidebarVariantChange(variant)}
                          >
                            {variant.charAt(0).toUpperCase() + variant.slice(1)}
                            {brandSettings.sidebarVariant === variant && (
                              <Check className="h-4 w-4 ml-2" />
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">{t("Sidebar Style")}</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'plain', name: 'Plain' },
                          { id: 'colored', name: 'Colored' },
                          { id: 'gradient', name: 'Gradient' }
                        ].map((style) => (
                          <Button
                            key={style.id}
                            type="button"
                            variant={brandSettings.sidebarStyle === style.id ? "default" : "outline"}
                            className="h-10 justify-start"
                            style={{
                              backgroundColor: brandSettings.sidebarStyle === style.id ?
                                (brandSettings.themeColor === 'custom' ? brandSettings.customColor : null) :
                                'transparent'
                            }}
                            onClick={() => handleSidebarStyleChange(style.id)}
                          >
                            {style.name}
                            {brandSettings.sidebarStyle === style.id && (
                              <Check className="h-4 w-4 ml-2" />
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Layout Section */}
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Layout className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="text-base font-medium">{t("Layout")}</h3>
                  </div>
                  <Separator className="my-2" />

                  <div className="space-y-2">
                    <Label className="mb-2 block">{t("Layout Direction")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={brandSettings.layoutDirection === "left" ? "default" : "outline"}
                        className="h-10 justify-start"
                        style={{
                          backgroundColor: brandSettings.layoutDirection === "left" ?
                            (brandSettings.themeColor === 'custom' ? brandSettings.customColor : null) :
                            'transparent'
                        }}
                        onClick={() => handleLayoutDirectionChange("left")}
                      >
                        {t("Left-to-Right")}
                        {brandSettings.layoutDirection === "left" && (
                          <Check className="h-4 w-4 ml-2" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant={brandSettings.layoutDirection === "right" ? "default" : "outline"}
                        className="h-10 justify-start"
                        style={{
                          backgroundColor: brandSettings.layoutDirection === "right" ?
                            (brandSettings.themeColor === 'custom' ? brandSettings.customColor : null) :
                            'transparent'
                        }}
                        onClick={() => handleLayoutDirectionChange("right")}
                      >
                        {t("Right-to-Left")}
                        {brandSettings.layoutDirection === "right" && (
                          <Check className="h-4 w-4 ml-2" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Mode Section */}
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Moon className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="text-base font-medium">{t("Theme Mode")}</h3>
                  </div>
                  <Separator className="my-2" />

                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={brandSettings.themeMode === "light" ? "default" : "outline"}
                        className="h-10 justify-start"
                        style={{
                          backgroundColor: brandSettings.themeMode === "light" ?
                            (brandSettings.themeColor === 'custom' ? brandSettings.customColor : null) :
                            'transparent'
                        }}
                        onClick={() => handleThemeModeChange("light")}
                      >
                        {t("Light")}
                        {brandSettings.themeMode === "light" && (
                          <Check className="h-4 w-4 ml-2" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant={brandSettings.themeMode === "dark" ? "default" : "outline"}
                        className="h-10 justify-start"
                        style={{
                          backgroundColor: brandSettings.themeMode === "dark" ?
                            (brandSettings.themeColor === 'custom' ? brandSettings.customColor : null) :
                            'transparent'
                        }}
                        onClick={() => handleThemeModeChange("dark")}
                      >
                        {t("Dark")}
                        {brandSettings.themeMode === "dark" && (
                          <Check className="h-4 w-4 ml-2" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant={brandSettings.themeMode === "system" ? "default" : "outline"}
                        className="h-10 justify-start"
                        style={{
                          backgroundColor: brandSettings.themeMode === "system" ?
                            (brandSettings.themeColor === 'custom' ? brandSettings.customColor : null) :
                            'transparent'
                        }}
                        onClick={() => handleThemeModeChange("system")}
                      >
                        {t("System")}
                        {brandSettings.themeMode === "system" && (
                          <Check className="h-4 w-4 ml-2" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-6">
            <div className="border rounded-md p-4">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="h-4 w-4" />
                <h3 className="font-medium">{t("Live Preview")}</h3>
              </div>

              {/* Comprehensive Theme Preview */}
              <ThemePreview />

              {/* Text Preview */}
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs text-muted-foreground">{t("Footer:")} <span className="font-medium text-foreground">{brandSettings.footerText}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}