/**
 * Sentry Error Tracking Configuration
 * 
 * Initializes Sentry for error tracking and performance monitoring.
 * Only initializes in production or when SENTRY_DSN is provided.
 */

import * as Sentry from '@sentry/react';
import { browserTracingIntegration } from '@sentry/react';
import { env } from '@/shared/utils/envValidation';

const sentryDsn = env.sentryDsn;
const environment = env.mode || 'development';
const isProduction = env.isProduction;

/**
 * Initialize Sentry
 * Only initializes if DSN is provided
 */
export function initSentry() {
  // Don't initialize if DSN is not provided
  if (!sentryDsn) {
    if (isProduction) {
      console.warn('[Sentry] VITE_SENTRY_DSN not provided. Error tracking disabled.');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment,
      enabled: isProduction || !!sentryDsn, // Enable in production or if DSN is provided
      
      // Performance Monitoring
      integrations: [
        browserTracingIntegration({
          // Set tracing origins to track performance for these domains
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/.*\.supabase\.co/,
            /^https:\/\/.*\.supabase\.io/,
          ],
          // React Router integration
          // Note: React Router v6 instrumentation requires the router to be initialized
          // This will be set up automatically when BrowserRouter is used
        }),
      ],

      // Performance Monitoring Settings
      tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in production, 100% in dev
      
      // Session Replay (optional - can be enabled later)
      replaysSessionSampleRate: 0, // Disabled by default
      replaysOnErrorSampleRate: 0.1, // 10% of error sessions

      // Release tracking
      release: env.appVersion || undefined,

      // Filter out known non-critical errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        'atomicFindClose',
        'fb_xd_fragment',
        'bmi_SafeAddOnload',
        'EBCallBackMessageReceived',
        'conduitPage',
        // Network errors that are expected
        'NetworkError',
        'Network request failed',
        // ResizeObserver errors (common, non-critical)
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
      ],

      // Filter out known non-critical URLs
      denyUrls: [
        // Browser extensions
        /extensions\//i,
        /^chrome:\/\//i,
        /^chrome-extension:\/\//i,
        // Facebook plugins
        /connect\.facebook\.net/i,
        /static\.ak\.facebook\.com/i,
        // Other common non-app URLs
        /127\.0\.0\.1:4001/i,
      ],

      // Before sending event, can modify or filter
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (!isProduction && !env.sentryEnableDev) {
          return null;
        }

        // Add additional context
        if (event.exception) {
          event.tags = {
            ...event.tags,
            errorBoundary: hint.originalException?.name === 'ErrorBoundary',
          };
        }

        return event;
      },

      // Set user context (will be updated when user logs in)
      initialScope: {
        tags: {
          component: 'frontend',
        },
      },
    });

    if (isProduction) {
      console.log('[Sentry] Error tracking initialized');
    }
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
}

/**
 * Set user context for Sentry
 * Call this when user logs in
 */
export function setSentryUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context
 * Call this when user logs out
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category?: string, level?: Sentry.SeverityLevel, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category: category || 'default',
    level: level || 'info',
    data,
  });
}

// Re-export commonly used Sentry functions
export { Sentry };

