interface CustomDateRange {
  startDate: string; // ISO format: "YYYY-MM-DD"
  endDate: string;   // ISO format: "YYYY-MM-DD"
}

const STORAGE_KEY = 'analytics_custom_date_range';

export const DateRangeStorage = {
  save: (range: CustomDateRange): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(range));
  },

  load: (): CustomDateRange | null => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  clear: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
