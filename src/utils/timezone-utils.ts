/**
 * Timezone Utilities
 * Provides Dhaka timezone date manipulation functions
 */

/**
 * Get current date/time in Dhaka timezone
 */
export function getDhakaNow(): Date {
  // Dhaka is UTC+6
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const dhakaTime = new Date(utc + (6 * 3600000)); // UTC+6
  return dhakaTime;
}

/**
 * Get week number for a date in Dhaka timezone
 */
export function getDhakaWeekNumber(date: Date): number {
  const dhakaDate = getDhakaNow();
  const oneJan = new Date(dhakaDate.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((dhakaDate.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
}

/**
 * Get week dates for a given week number and year
 */
export function getDhakaWeekDates(weekNumber: number, year: number): { start: Date; end: Date } {
  const oneJan = new Date(year, 0, 1);
  const daysOffset = (weekNumber - 1) * 7;
  const startDate = new Date(oneJan);
  startDate.setDate(oneJan.getDate() + daysOffset - oneJan.getDay());
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  return { start: startDate, end: endDate };
}

/**
 * Get start of day in Dhaka timezone
 */
export function getDhakaStartOfDay(date?: Date): Date {
  const targetDate = date || getDhakaNow();
  const dhakaDate = new Date(targetDate);
  dhakaDate.setHours(0, 0, 0, 0);
  return dhakaDate;
}

/**
 * Get end of day in Dhaka timezone
 */
export function getDhakaEndOfDay(date?: Date): Date {
  const targetDate = date || getDhakaNow();
  const dhakaDate = new Date(targetDate);
  dhakaDate.setHours(23, 59, 59, 999);
  return dhakaDate;
}

/**
 * Get first day of month in Dhaka timezone
 */
export function getDhakaFirstDayOfMonth(date: Date): Date {
  const dhakaDate = new Date(date);
  dhakaDate.setDate(1);
  dhakaDate.setHours(0, 0, 0, 0);
  return dhakaDate;
}

/**
 * Get last day of month in Dhaka timezone
 */
export function getDhakaLastDayOfMonth(date: Date): Date {
  const dhakaDate = new Date(date);
  dhakaDate.setMonth(dhakaDate.getMonth() + 1);
  dhakaDate.setDate(0);
  dhakaDate.setHours(23, 59, 59, 999);
  return dhakaDate;
}

/**
 * Format date for input field (YYYY-MM-DD)
 */
export function formatDhakaDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display
 */
export function formatDhakaDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  return date.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Parse date string to Date object
 */
export function parseDhakaDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Convert Dhaka date to UTC ISO string
 */
export function dhakaDateToUTCISO(date: Date): string {
  // Convert Dhaka time (UTC+6) to UTC
  const utcTime = date.getTime() - (6 * 3600000);
  return new Date(utcTime).toISOString();
}

/**
 * Convert UTC string to Dhaka time
 */
export function toDhakaTime(utcString: string): Date {
  const utcDate = new Date(utcString);
  // Add 6 hours to convert UTC to Dhaka time
  const dhakaTime = new Date(utcDate.getTime() + (6 * 3600000));
  return dhakaTime;
}

// Export functions to window object for global access
if (typeof window !== 'undefined') {
  (window as any).getDhakaNow = getDhakaNow;
  (window as any).getDhakaWeekNumber = getDhakaWeekNumber;
  (window as any).getDhakaWeekDates = getDhakaWeekDates;
  (window as any).getDhakaStartOfDay = getDhakaStartOfDay;
  (window as any).getDhakaEndOfDay = getDhakaEndOfDay;
  (window as any).getDhakaFirstDayOfMonth = getDhakaFirstDayOfMonth;
  (window as any).getDhakaLastDayOfMonth = getDhakaLastDayOfMonth;
  (window as any).formatDhakaDateForInput = formatDhakaDateForInput;
  (window as any).formatDhakaDate = formatDhakaDate;
  (window as any).parseDhakaDate = parseDhakaDate;
  (window as any).dhakaDateToUTCISO = dhakaDateToUTCISO;
  (window as any).toDhakaTime = toDhakaTime;
}
