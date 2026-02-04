export const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;

  const tarteaucitron = (window as any).tarteaucitron;
  if (!tarteaucitron) return false;

  if (tarteaucitron.state && tarteaucitron.state.gtag === true) {
    return true;
  }

  if (tarteaucitron.services && tarteaucitron.services.gtag && tarteaucitron.services.gtag.cookies) {
    const cookies = tarteaucitron.services.gtag.cookies;
    for (const cookie of cookies) {
      if (document.cookie.indexOf(cookie) !== -1) {
        return true;
      }
    }
  }

  const cookieMatch = document.cookie.match(/tarteaucitron=([^;]+)/);
  if (cookieMatch) {
    try {
      const cookieValue = decodeURIComponent(cookieMatch[1]);
      if (cookieValue.includes('gtag=true')) {
        return true;
      }
    } catch (e) {
      console.error('Error parsing tarteaucitron cookie:', e);
    }
  }

  return false;
}

function isGaReady(): boolean {
  return (
    typeof GA_ID === 'string' &&
    GA_ID.startsWith('G-') &&
    typeof (window as any).gtag === 'function' &&
    hasAnalyticsConsent()
  );
}

if (import.meta.env.DEV) {
  console.log('[GA] GA_ID present:', Boolean(GA_ID && GA_ID.startsWith('G-')));
}

export function trackPageView(path: string): void {
  if (!isGaReady()) {
    if (import.meta.env.DEV) {
      console.log('[GA] page_view blocked - no consent or GA not ready');
    }
    return;
  }

  (window as any).gtag('config', GA_ID, {
    page_path: path,
    anonymize_ip: true
  });

  if (import.meta.env.DEV) {
    console.log('[GA] page_view', path);
  }
}

export function trackEvent(name: string, params: Record<string, any> = {}): void {
  if (!isGaReady()) {
    if (import.meta.env.DEV) {
      console.log('[GA] event blocked - no consent or GA not ready');
    }
    return;
  }

  const {
    email,
    username,
    user_email,
    user_id,
    avatar_url,
    password,
    ...safeParams
  } = params as any;

  (window as any).gtag('event', name, safeParams);

  if (import.meta.env.DEV) {
    console.log('[GA] event', name, safeParams);
  }
}
