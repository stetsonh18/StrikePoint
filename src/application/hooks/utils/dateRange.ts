export function getDateRangeForDays(lengthInDays: number): { start: string; end: string } {
  const sanitizedLength = Math.max(1, Math.floor(lengthInDays));
  const end = new Date();
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

