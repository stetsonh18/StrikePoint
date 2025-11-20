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
  // Handle ValidationError specifically
  if (error instanceof ValidationError) {
    return {
      message: error.message,
      code: 'VALIDATION_ERROR',
      details: { field: error.field },
    };
  }

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
export function getUserFriendlyErrorMessage(error: unknown, context?: string): string {
  const parsed = parseError(error);
  const action = context || 'operation';

  // Handle specific error codes
  if (parsed.code) {
    switch (parsed.code) {
      case 'VALIDATION_ERROR':
        return parsed.message || 'The data you entered is invalid. Please check your input and try again.';
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'PGRST116':
        return 'The requested data was not found. It may have been deleted or moved.';
      case '23505': // Unique constraint violation
        return 'This record already exists. Please use a different value or update the existing record.';
      case '23503': // Foreign key violation
        return 'Cannot delete this record because it is still in use. Please remove all related records first.';
      case '42501': // Insufficient privilege
        return 'You do not have permission to perform this action. Please contact your administrator if you believe this is an error.';
      case '23502': // Not null violation
        return 'Required information is missing. Please fill in all required fields and try again.';
      case '22P02': // Invalid input syntax
        return 'Invalid data format. Please check your input and try again.';
      case '23514': // Check constraint violation
        return 'The data you entered does not meet the requirements. Please check your input and try again.';
      default:
        if (parsed.code.startsWith('PGRST')) {
          return 'A database error occurred. Please try again. If the problem persists, contact support.';
        }
    }
  }

  // Handle HTTP status codes
  if (parsed.status) {
    switch (parsed.status) {
      case 400:
        return `Invalid request. ${parsed.message.includes('validation') ? 'Please check your input and try again.' : 'Please verify your data and try again.'}`;
      case 401:
        return 'Your session has expired. Please sign in again to continue.';
      case 403:
        return 'You do not have permission to perform this action. If you believe this is an error, please contact support.';
      case 404:
        return 'The requested resource was not found. It may have been deleted or moved.';
      case 409:
        return 'This record already exists. Please use a different value or update the existing record.';
      case 422:
        return `Validation failed. ${parsed.message || 'Please check your input and ensure all required fields are filled correctly.'}`;
      case 429:
        return 'Too many requests. Please wait a moment and try again. If you continue to see this message, please contact support.';
      case 500:
        return 'A server error occurred. Our team has been notified. Please try again in a few moments.';
      case 502:
        return 'The server is temporarily unavailable. Please try again in a few moments.';
      case 503:
        return 'Service is temporarily unavailable due to maintenance. Please try again later.';
      case 504:
        return 'The request took too long to process. Please try again.';
      default:
        if (parsed.status >= 500) {
          return 'A server error occurred. Please try again later. If the problem persists, contact support.';
        }
        if (parsed.status >= 400) {
          return `Request failed. ${parsed.message || 'Please try again or contact support if the problem continues.'}`;
        }
    }
  }

  // Handle common error messages
  const lowerMessage = parsed.message.toLowerCase();
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return 'Network connection failed. Please check your internet connection and try again.';
  }
  if (lowerMessage.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }
  if (lowerMessage.includes('cors')) {
    return 'A connection error occurred. Please refresh the page and try again.';
  }
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
    return 'Your session has expired. Please sign in again.';
  }

  // Return the parsed message or default with context
  if (parsed.message && parsed.message !== 'An unexpected error occurred') {
    // Make technical messages more user-friendly
    const friendlyMessage = parsed.message
      .replace(/PGRST\d+/g, 'database')
      .replace(/violates.*constraint/gi, 'does not meet requirements')
      .replace(/duplicate key/gi, 'already exists');
    return friendlyMessage;
  }

  return `An unexpected error occurred while ${action}. Please try again. If the problem persists, contact support.`;
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
export function logErrorWithContext(...args: any[]): void {
  const error = args[0];
  const context = args[1];
  const parsed = parseError(error);
  const errorObj = error instanceof Error ? error : new Error(parsed.message);

  // Use centralized logger (dynamic import to avoid circular dependencies)
  import('./logger').then(({ logger }) => {
    logger.error('Error occurred', errorObj, context);
  }).catch(() => {
    // Fallback to console if logger import fails
    console.error('Error:', parsed, context);
  });
}

