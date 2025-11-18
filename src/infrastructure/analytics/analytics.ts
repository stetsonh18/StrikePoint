/**
 * Analytics Service
 * 
 * Privacy-compliant analytics tracking for user actions and feature usage.
 * Supports multiple analytics providers (Sentry, Google Analytics, etc.)
 */

import * as Sentry from '@sentry/react';
import { env } from '@/shared/utils/envValidation';

type AnalyticsProvider = 'sentry' | 'ga4' | 'plausible' | 'custom';

interface AnalyticsEvent {
  name: string;
  category: string;
  action?: string;
  label?: string;
  value?: number;
  properties?: Record<string, unknown>;
}

interface AnalyticsConfig {
  enabled: boolean;
  providers: AnalyticsProvider[];
  respectDoNotTrack: boolean;
}

/**
 * Load Google Analytics 4 script
 */
function loadGoogleAnalytics(measurementId: string) {
  if (typeof window === 'undefined' || (window as any).gtag) {
    return; // Already loaded
  }
  
  // Create script tag
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);
  
  // Initialize gtag
  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}', {
      send_page_view: false // We'll send page views manually
    });
  `;
  document.head.appendChild(script2);
}

/**
 * Load Plausible script
 */
function loadPlausible(domain: string) {
  if (typeof window === 'undefined' || (window as any).plausible) {
    return; // Already loaded
  }
  
  const script = document.createElement('script');
  script.defer = true;
  script.setAttribute('data-domain', domain);
  script.src = 'https://plausible.io/js/script.js';
  document.head.appendChild(script);
}

// Default configuration
const config: AnalyticsConfig = {
  enabled: env.isProduction || !!import.meta.env.VITE_ANALYTICS_ENABLED,
  providers: (() => {
    const providers: AnalyticsProvider[] = ['sentry']; // Always include Sentry
    
    // Add Google Analytics if configured
    if (import.meta.env.VITE_GA4_MEASUREMENT_ID) {
      providers.push('ga4');
      // Load GA4 script
      if (typeof window !== 'undefined') {
        loadGoogleAnalytics(import.meta.env.VITE_GA4_MEASUREMENT_ID);
      }
    }
    
    // Add Plausible if configured
    if (import.meta.env.VITE_PLAUSIBLE_DOMAIN) {
      providers.push('plausible');
      // Load Plausible script
      if (typeof window !== 'undefined') {
        loadPlausible(import.meta.env.VITE_PLAUSIBLE_DOMAIN);
      }
    }
    
    return providers;
  })(),
  respectDoNotTrack: true, // Respect browser Do Not Track setting
};

/**
 * Check if analytics should be disabled (Do Not Track)
 */
function shouldDisableAnalytics(): boolean {
  if (!config.respectDoNotTrack) return false;
  
  // Check Do Not Track header
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') {
    return true;
  }
  
  // Check localStorage preference
  try {
    const preference = localStorage.getItem('analytics-disabled');
    if (preference === 'true') {
      return true;
    }
  } catch {
    // Ignore localStorage errors
  }
  
  return false;
}

/**
 * Track page view
 */
export function trackPageView(path: string, title?: string) {
  if (!config.enabled || shouldDisableAnalytics()) return;
  
  const event: AnalyticsEvent = {
    name: 'page_view',
    category: 'navigation',
    properties: {
      path,
      title: title || document.title,
    },
  };
  
  sendToProviders(event);
}

/**
 * Track custom event
 */
export function trackEvent(
  name: string,
  category: string,
  properties?: Record<string, unknown>
) {
  if (!config.enabled || shouldDisableAnalytics()) return;
  
  const event: AnalyticsEvent = {
    name,
    category,
    properties,
  };
  
  sendToProviders(event);
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(featureName: string, properties?: Record<string, unknown>) {
  trackEvent('feature_used', 'features', {
    feature: featureName,
    ...properties,
  });
}

/**
 * Track user action (button clicks, form submissions, etc.)
 */
export function trackUserAction(
  action: string,
  category: string = 'user_action',
  properties?: Record<string, unknown>
) {
  trackEvent(action, category, properties);
}

/**
 * Track conversion (signup, purchase, etc.)
 */
export function trackConversion(
  conversionName: string,
  value?: number,
  properties?: Record<string, unknown>
) {
  trackEvent('conversion', 'conversions', {
    conversion_name: conversionName,
    value,
    ...properties,
  });
}

/**
 * Track error event (complement to Sentry error tracking)
 */
export function trackError(
  errorName: string,
  errorMessage: string,
  properties?: Record<string, unknown>
) {
  trackEvent('error', 'errors', {
    error_name: errorName,
    error_message: errorMessage,
    ...properties,
  });
}

/**
 * Send event to all configured providers
 */
function sendToProviders(event: AnalyticsEvent) {
  config.providers.forEach(provider => {
    try {
      switch (provider) {
        case 'sentry':
          sendToSentry(event);
          break;
        case 'ga4':
          sendToGoogleAnalytics(event);
          break;
        case 'plausible':
          sendToPlausible(event);
          break;
        case 'custom':
          // Custom provider hook - can be extended
          break;
      }
    } catch (error) {
      if (env.isDevelopment) {
        console.warn(`[Analytics] Failed to send to ${provider}:`, error);
      }
    }
  });
}

/**
 * Send to Sentry
 */
function sendToSentry(event: AnalyticsEvent) {
  // Add breadcrumb for navigation
  if (event.name === 'page_view') {
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${event.properties?.path}`,
      level: 'info',
      data: event.properties,
    });
  }
  
  // Track as custom event
  Sentry.metrics.increment('analytics.event', 1, {
    tags: {
      event_name: event.name,
      category: event.category,
    },
  });
  
  // Add breadcrumb for user actions
  if (event.category === 'user_action' || event.category === 'features') {
    Sentry.addBreadcrumb({
      category: event.category,
      message: event.name,
      level: 'info',
      data: event.properties,
    });
  }
}

/**
 * Send to Google Analytics 4
 */
function sendToGoogleAnalytics(event: AnalyticsEvent) {
  if (typeof window === 'undefined' || !(window as any).gtag) {
    return;
  }
  
  const gtag = (window as any).gtag;
  
  if (event.name === 'page_view') {
    gtag('event', 'page_view', {
      page_path: event.properties?.path,
      page_title: event.properties?.title,
    });
  } else {
    gtag('event', event.name, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
      ...event.properties,
    });
  }
}

/**
 * Send to Plausible
 */
function sendToPlausible(event: AnalyticsEvent) {
  if (typeof window === 'undefined' || !(window as any).plausible) {
    return;
  }
  
  const plausible = (window as any).plausible;
  
  if (event.name === 'page_view') {
    plausible('pageview', { url: event.properties?.path });
  } else {
    plausible(event.name, {
      props: {
        category: event.category,
        ...event.properties,
      },
    });
  }
}

/**
 * Initialize analytics
 */
export function initAnalytics(providers?: AnalyticsProvider[]) {
  if (providers) {
    config.providers = providers;
  }
  
  // Track initial page view
  if (typeof window !== 'undefined') {
    trackPageView(window.location.pathname, document.title);
    
    // Track page views on navigation (for SPAs)
    let lastPath = window.location.pathname;
    const observer = new MutationObserver(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        lastPath = currentPath;
        trackPageView(currentPath, document.title);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
  
  if (env.isDevelopment) {
    console.log('[Analytics] Initialized with providers:', config.providers);
  }
}

/**
 * Set user properties for analytics
 */
export function setUserProperties(properties: Record<string, unknown>) {
  if (!config.enabled || shouldDisableAnalytics()) return;
  
  // Set in Sentry
  Sentry.setContext('user_properties', properties);
  
  // Set in Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('set', 'user_properties', properties);
  }
}

/**
 * Identify user for analytics
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!config.enabled || shouldDisableAnalytics()) return;
  
  // Identify in Sentry (already done in auth store, but can add traits)
  if (traits) {
    Sentry.setContext('user_traits', traits);
  }
  
  // Identify in Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', 'user_id', userId);
    if (traits) {
      (window as any).gtag('set', 'user_properties', traits);
    }
  }
}

/**
 * Disable analytics (user preference)
 */
export function disableAnalytics() {
  try {
    localStorage.setItem('analytics-disabled', 'true');
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Enable analytics (user preference)
 */
export function enableAnalytics() {
  try {
    localStorage.removeItem('analytics-disabled');
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return config.enabled && !shouldDisableAnalytics();
}

