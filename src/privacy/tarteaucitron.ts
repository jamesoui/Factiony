declare global {
  interface Window {
    tarteaucitron?: {
      init: (config: TarteaucitronConfig) => void;
      user: Record<string, any>;
      job?: string[];
    };
  }
}

interface TarteaucitronConfig {
  privacyUrl?: string;
  hashtag?: string;
  cookieName?: string;
  orientation?: 'top' | 'middle' | 'bottom';
  groupServices?: boolean;
  showAlertSmall?: boolean;
  cookieslist?: boolean;
  closePopup?: boolean;
  showIcon?: boolean;
  iconPosition?: 'BottomRight' | 'BottomLeft' | 'TopRight' | 'TopLeft';
  adblocker?: boolean;
  DenyAllCta?: boolean;
  AcceptAllCta?: boolean;
  highPrivacy?: boolean;
  handleBrowserDNTRequest?: boolean;
  removeCredit?: boolean;
  moreInfoLink?: boolean;
  useExternalCss?: boolean;
  useExternalJs?: boolean;
  readmoreLink?: string;
  mandatory?: boolean;
}

let isInitialized = false;

export function initCookieConsent(): void {
  if (isInitialized) {
    return;
  }

  if (typeof window === 'undefined' || !window.tarteaucitron) {
    console.warn('Tarteaucitron.js is not loaded yet. Cookie consent initialization skipped.');
    return;
  }

  try {
    window.tarteaucitron.init({
      privacyUrl: '/politique-de-confidentialite',
      hashtag: '#',
      cookieName: 'tarteaucitron',
      orientation: 'bottom',
      groupServices: false,
      showAlertSmall: false,
      cookieslist: true,
      closePopup: false,
      showIcon: true,
      iconPosition: 'BottomRight',
      adblocker: false,
      DenyAllCta: true,
      AcceptAllCta: true,
      highPrivacy: true,
      handleBrowserDNTRequest: false,
      removeCredit: true,
      moreInfoLink: true,
      useExternalCss: false,
      useExternalJs: false,
      readmoreLink: '/politique-de-confidentialite',
      mandatory: true,
    });

    const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (GA_ID && typeof GA_ID === 'string' && GA_ID.startsWith('G-')) {
      window.tarteaucitron.user.gtagUa = GA_ID;
      (window.tarteaucitron.job = window.tarteaucitron.job || []).push('gtag');
      console.log('Google Analytics GA4 service added to Tarteaucitron:', GA_ID);
    }

    isInitialized = true;
    console.log('Tarteaucitron cookie consent initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Tarteaucitron:', error);
  }
}

export function resetCookieConsent(): void {
  isInitialized = false;
}
