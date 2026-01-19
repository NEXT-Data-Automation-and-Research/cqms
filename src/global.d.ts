/**
 * Global type declarations for window object extensions
 */

interface Window {
  // Dhaka timezone utility functions
  getDhakaNow?: () => Date;
  getDhakaWeekNumber?: (date: Date) => number;
  getDhakaWeekDates?: (weekNumber: number, year: number) => { start: Date; end: Date };
  getDhakaStartOfDay?: (date?: Date) => Date;
  getDhakaEndOfDay?: (date?: Date) => Date;
  getDhakaFirstDayOfMonth?: (date: Date) => Date;
  getDhakaLastDayOfMonth?: (date: Date) => Date;
  formatDhakaDateForInput?: (date: Date) => string;
  formatDhakaDate?: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  parseDhakaDate?: (dateString: string) => Date;
  dhakaDateToUTCISO?: (date: Date) => string;
  toDhakaTime?: (utcString: string) => Date;
}
