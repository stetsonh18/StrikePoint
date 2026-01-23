export function getDateRangeForDays(lengthInDays: number): { start: string; end: string } {
  const sanitizedLength = Math.max(1, Math.floor(lengthInDays));
  const now = new Date();

  // Work in UTC to avoid timezone issues
  const end = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23, 59, 59, 999
  ));

  const start = new Date(end);
  if (sanitizedLength > 1) {
    start.setUTCDate(start.getUTCDate() - (sanitizedLength - 1));
  }
  start.setUTCHours(0, 0, 0, 0);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDateRangeForDays(lengthInDays: number): { start: string; end: string } {
  const sanitizedLength = Math.max(1, Math.floor(lengthInDays));
  const now = new Date();

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  if (sanitizedLength > 1) {
    start.setDate(start.getDate() - (sanitizedLength - 1));
  }
  start.setHours(0, 0, 0, 0);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

