export interface DateRange {
  startDate: string; // ISO date string: "YYYY-MM-DD"
  endDate: string;   // ISO date string: "YYYY-MM-DD"
}

export type TimeframeSelection =
  | { type: 'preset'; days: number | null }
  | { type: 'custom'; range: DateRange };
