/**
 * Error logging service
 * Can be extended to integrate with Sentry, LogRocket, or other error tracking services
 */

interface ErrorLogContext {
  [key: string]: unknown;
}

/**
 * Initialize error logging service
 * Call this in your app initialization (e.g., in main.tsx or App.tsx)
 */
export function initErrorLogging(): void {
  // Example: Initialize Sentry
  // if (import.meta.env.PROD) {
  //   Sentry.init({
  //     dsn: import.meta.env.VITE_SENTRY_DSN,
  //     environment: import.meta.env.MODE,
  //   });
  // }

  // Example: Initialize LogRocket
  // if (import.meta.env.PROD) {
  //   LogRocket.init(import.meta.env.VITE_LOGROCKET_APP_ID);
  // }
}

/**
 * Log error to error tracking service
 */
export function logErrorToService(error: Error, context?: ErrorLogContext): void {
  // In development, just log to console
  if (import.meta.env.DEV) {
    console.error('[Error Logging Service]', error, context);
    return;
  }

  // In production, send to error tracking service
  // Example: Sentry
  // Sentry.captureException(error, {
  //   extra: context,
  // });

  // Example: LogRocket
  // LogRocket.captureException(error, {
  //   extra: context,
  // });
}

/**
 * Set user context for error tracking
 */
export function setErrorUserContext(userId: string, email?: string): void {
  // Example: Sentry
  // Sentry.setUser({
  //   id: userId,
  //   email: email,
  // });

  // Example: LogRocket
  // LogRocket.identify(userId, {
  //   email: email,
  // });
}

/**
 * Clear user context
 */
export function clearErrorUserContext(): void {
  // Example: Sentry
  // Sentry.setUser(null);

  // Example: LogRocket
  // LogRocket.identify(null);
}

