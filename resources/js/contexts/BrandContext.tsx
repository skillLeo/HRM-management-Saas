import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import { getBrandSettings, type BrandSettings } from '@/pages/settings/components/brand-settings';

interface BrandContextType extends BrandSettings {
  updateBrandSettings: (settings: Partial<BrandSettings>) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);


export function BrandProvider({ children, globalSettings: initialGlobalSettings, user: initialUser }: { children: ReactNode; globalSettings?: any; user?: any }) {
  // Use live Inertia page props so brand settings update on navigation without root.render()
  let liveGlobalSettings = initialGlobalSettings;
  let liveUser = initialUser;
  try {
    const pageProps = usePage().props as any;
    liveGlobalSettings = pageProps.globalSettings || initialGlobalSettings;
    liveUser = pageProps.auth?.user || initialUser;
  } catch {
    // Outside Inertia context (e.g., tests) — use initial props
  }

  const getEffectiveSettings = (gs: any, u: any) => {
    if (gs?.is_demo) return null;
    const isPublicRoute = window.location.pathname === '/' ||
      window.location.pathname.includes('/auth/');
    if (isPublicRoute) return gs;
    if (u?.role === 'company' && u?.globalSettings) return u.globalSettings;
    return gs;
  };

  const [brandSettings, setBrandSettings] = useState<BrandSettings>(() =>
    getBrandSettings(getEffectiveSettings(liveGlobalSettings, liveUser), liveGlobalSettings)
  );

  useEffect(() => {
    const effectiveSettings = getEffectiveSettings(liveGlobalSettings, liveUser);
    const updatedSettings = getBrandSettings(effectiveSettings, liveGlobalSettings);
    setBrandSettings(updatedSettings);

    if (updatedSettings) {
      const color = updatedSettings.themeColor === 'custom' ? updatedSettings.customColor : ({
        blue: '#3b82f6', green: '#10b77f', purple: '#8b5cf6', orange: '#f97316', red: '#ef4444',
      } as Record<string, string>)[updatedSettings.themeColor] || '#3b82f6';

      document.documentElement.style.setProperty('--theme-color', color);
      document.documentElement.style.setProperty('--primary', color);

      const isDark = updatedSettings.themeMode === 'dark' ||
        (updatedSettings.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
      document.body.classList.toggle('dark', isDark);

      // Apply layout direction — must use 'ltr'/'rtl', not the internal 'left'/'right' value
      const dir = updatedSettings.layoutDirection === 'right' ? 'rtl' : 'ltr';
      document.documentElement.dir = dir;
      document.documentElement.setAttribute('dir', dir);
    }
  }, [liveGlobalSettings, liveUser]);

  const updateBrandSettings = (newSettings: Partial<BrandSettings>) => {
    setBrandSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <BrandContext.Provider value={{ ...brandSettings, updateBrandSettings }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}