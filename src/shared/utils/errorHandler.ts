/**
 * Error handling utilities for API errors and network issues
 */

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ApiRateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'ApiRateLimitError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Parse error from various sources (Supabase, fetch, etc.)
 */
export function parseError(error: unknown): ApiError {
  // Handle Error objects
  if (error instanceof Error) {
    // Check for Supabase errors
    if ('code' in error && 'message' in error) {
      return {
        message: error.message,
        code: (error as { code?: string }).code,
        status: (error as { status?: number }).status,
      };
    }

    // Check for network errors
    if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('fetch')) {
      return {
        message: 'Network connection failed. Please check your internet connection.',
        code: 'NETWORK_ERROR',
      };
    }

    return {
      message: error.message || 'An unexpected error occurred',
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return { message: error };
  }

  // Handle objects with error structure
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    return {
      message: (err.message as string) || (err.error as string) || 'An unexpected error occurred',
      code: err.code as string,
      status: err.status as number,
      details: err.details,
    };
  }

  return {
    message: 'An unexpected error occurred',
  };
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const parsed = parseError(error);

  // Handle specific error codes
  if (parsed.code) {
    switch (parsed.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'PGRST116':
        return 'The requested data was not found.';
      case '23505': // Unique constraint violation
        return 'This record already exists.';
      case '23503': // Foreign key violation
        return 'Cannot delete this record because it is in use.';
      case '42501': // Insufficient privilege
        return 'You do not have permission to perform this action.';
      default:
        if (parsed.code.startsWith('PGRST')) {
          return 'A database error occurred. Please try again.';
        }
    }
  }

  // Handle HTTP status codes
  if (parsed.status) {
    switch (parsed.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'You are not authorized. Please sign in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This record already exists.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        if (parsed.status >= 500) {
          return 'Server error. Please try again later.';
        }
        if (parsed.status >= 400) {
          return 'Request failed. Please try again.';
        }
    }
  }

  // Return the parsed message or default
  return parsed.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const parsed = parseError(error);

  // Network errors are retryable
  if (parsed.code === 'NETWORK_ERROR') {
    return true;
  }

  // Server errors (5xx) are retryable
  if (parsed.status && parsed.status >= 500) {
    return true;
  }

  // Rate limit errors are retryable
  if (parsed.status === 429) {
    return true;
  }

  // Timeout errors are retryable
  if (parsed.message.toLowerCase().includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Log error (can be extended to send to error tracking service)
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const parsed = parseError(error);

  // In development, log to console
  if (import.meta.env.DEV) {
    console.error('Error:', parsed, context);
  }

  // In production, send to error tracking service
  // Import and use error logging service
  // Example:
  // import { logErrorToService } from '@/infrastructure/services/errorLoggingService';
  // if (error instanceof Error) {
  //   logErrorToService(error, context);
  // }
}

