/**
 * Centralized logging utility
 * Replaces console.log/error/warn with a configurable logger
 * In production, sends errors to Sentry for tracking
 */

import * as Sentry from '@sentry/react';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

import { env } from './envValidation';

class Logger {
  private isDevelopment = env.isDevelopment;
  private isProduction = env.isProduction;

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Log info messages
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || '');
    }
    // In production, could send to analytics/monitoring service
  }

  /**
   * Log warning messages
   * Sends warnings to Sentry in production
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || '');
    
    // Send warnings to Sentry in production
    if (this.isProduction) {
      try {
        Sentry.captureMessage(message, {
          level: 'warning',
          tags: {
            logger: true,
          },
          extra: context,
        });
      } catch (sentryError) {
        // Silently fail if Sentry is not initialized
        if (this.isDevelopment) {
          console.warn('[Logger] Failed to send warning to Sentry:', sentryError);
        }
      }
    }
  }

  /**
   * Log error messages
   * Always logs errors, even in production
   * Sends errors to Sentry in production
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : error;

    console.error(`[ERROR] ${message}`, errorDetails || '', context || '');
    
    // Send to Sentry if available
    try {
      if (error instanceof Error) {
        const tags: Record<string, string | boolean> = {
          logger: true,
        };
        if (context?.type) {
          tags.errorType = String(context.type);
        }
        
        Sentry.captureException(error, {
          tags,
          extra: {
            message,
            ...(context || {}),
          },
        });
      } else if (error) {
        // Non-Error objects - capture as message with context
        const tags: Record<string, string | boolean> = {
          logger: true,
        };
        if (context?.type) {
          tags.errorType = String(context.type);
        }
        
        Sentry.captureMessage(message, {
          level: 'error',
          tags,
          extra: {
            error,
            ...(context || {}),
          },
        });
      } else {
        // Just a message with context
        const tags: Record<string, string | boolean> = {
          logger: true,
        };
        if (context?.type) {
          tags.errorType = String(context.type);
        }
        
        Sentry.captureMessage(message, {
          level: 'error',
          tags,
          extra: context || {},
        });
      }
    } catch (sentryError) {
      // Silently fail if Sentry is not initialized
      // This prevents Sentry errors from breaking the app
      if (this.isDevelopment) {
        console.warn('[Logger] Failed to send error to Sentry:', sentryError);
      }
    }
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, data?: unknown): void {
    switch (level) {
      case 'debug':
        this.debug(message, data as LogContext);
        break;
      case 'info':
        this.info(message, data as LogContext);
        break;
      case 'warn':
        this.warn(message, data as LogContext);
        break;
      case 'error':
        this.error(message, data as Error, data as LogContext);
        break;
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { LogLevel, LogContext };

