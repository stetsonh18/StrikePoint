/**
 * Date utility functions for handling date-only strings without timezone conversion
 * Since our database stores dates as DATE type (YYYY-MM-DD), we need to handle them
 * as local dates, not UTC dates
 */

/**
 * Format a date string (YYYY-MM-DD) to a localized date string
 * Treats the date as a local date, not UTC
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  
  // If it's already in YYYY-MM-DD format, parse it as local date
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  
  // Fallback for other date formats
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string to a short format (MM/DD/YYYY)
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }
  
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert a Date object to YYYY-MM-DD string (local timezone)
 */
export function dateToDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string (YYYY-MM-DD) to a Date object in local timezone
 * This ensures the date is treated as local, not UTC
 */
export function parseLocalDate(dateStr: string): Date {
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  }
  return new Date(dateStr);
}

