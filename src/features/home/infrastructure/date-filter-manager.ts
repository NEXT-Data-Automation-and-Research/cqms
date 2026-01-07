/**
 * Date Filter Manager
 * Handles week and date range filtering for the dashboard
 */

import type { DateFilter, PeriodDates } from './types.js';

export class DateFilterManager {
  private dateFilter: DateFilter = { start: null, end: null };
  private currentWeek: number | null = null;
  private currentWeekYear: number | null = null;
  private useWeekFilter: boolean = true;

  getDateFilter(): DateFilter {
    return { ...this.dateFilter };
  }

  setDateFilter(filter: DateFilter): void {
    this.dateFilter = { ...filter };
  }

  getCurrentWeek(): number | null {
    return this.currentWeek;
  }

  getCurrentWeekYear(): number | null {
    return this.currentWeekYear;
  }

  getUseWeekFilter(): boolean {
    return this.useWeekFilter;
  }

  setUseWeekFilter(useWeek: boolean): void {
    this.useWeekFilter = useWeek;
  }

  initializeWeekFilter(): void {
    const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
    if (window.getDhakaWeekNumber) {
      this.currentWeek = window.getDhakaWeekNumber(today);
    }
    this.currentWeekYear = today.getFullYear();
    this.updateWeekDisplay();
  }

  updateWeekDisplay(): void {
    const weekTextEl = document.getElementById('weekText');
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    const weekDisplay = document.getElementById('weekDisplay');
    
    if (this.currentWeek === null) {
      const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
      this.currentWeek = window.getDhakaWeekNumber ? window.getDhakaWeekNumber(today) : 1;
      this.currentWeekYear = today.getFullYear();
    }
    
    if (weekTextEl) {
      if (this.useWeekFilter && this.currentWeek !== null) {
        weekTextEl.textContent = `Week ${this.currentWeek}`;
      } else {
        weekTextEl.textContent = `Week ${this.currentWeek || '-'}`;
      }
    }
    
    if (prevWeekBtn) {
      prevWeekBtn.removeAttribute('disabled');
      (prevWeekBtn as HTMLButtonElement).disabled = false;
      prevWeekBtn.style.opacity = '1';
      prevWeekBtn.style.cursor = 'pointer';
      prevWeekBtn.style.pointerEvents = 'auto';
    }
    
    if (nextWeekBtn) {
      nextWeekBtn.removeAttribute('disabled');
      (nextWeekBtn as HTMLButtonElement).disabled = false;
      nextWeekBtn.style.opacity = '1';
      nextWeekBtn.style.cursor = 'pointer';
      nextWeekBtn.style.pointerEvents = 'auto';
    }
    
    if (weekDisplay) {
      if (this.useWeekFilter) {
        weekDisplay.style.backgroundColor = '#1a733e';
        weekDisplay.style.color = 'white';
        weekDisplay.style.borderColor = '#1a733e';
        weekDisplay.style.cursor = 'default';
        weekDisplay.style.pointerEvents = 'auto';
      } else {
        weekDisplay.style.backgroundColor = '#f3f4f6';
        weekDisplay.style.color = '#6b7280';
        weekDisplay.style.borderColor = '#e5e7eb';
        weekDisplay.style.cursor = 'pointer';
        weekDisplay.style.pointerEvents = 'auto';
      }
    }
  }

  navigateWeek(direction: number): void {
    if (this.currentWeek === null || this.currentWeekYear === null) {
      const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
      this.currentWeek = window.getDhakaWeekNumber ? window.getDhakaWeekNumber(today) : 1;
      this.currentWeekYear = today.getFullYear();
    }
    
    if (this.currentWeek !== null) {
      this.currentWeek += direction;
      
      if (this.currentWeek > 52) {
        this.currentWeek = 1;
        if (this.currentWeekYear !== null) this.currentWeekYear += 1;
      } else if (this.currentWeek < 1) {
        this.currentWeek = 52;
        if (this.currentWeekYear !== null) this.currentWeekYear -= 1;
      }
    }
    
    this.useWeekFilter = true;
    this.dateFilter.start = null;
    this.dateFilter.end = null;
    const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
    const dateBtnTextEl = document.getElementById('dateBtnText');
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (dateBtnTextEl) dateBtnTextEl.textContent = 'Date Range';
    
    const quickDateButtons = document.querySelectorAll('.quick-date-btn');
    quickDateButtons.forEach(btn => btn.classList.remove('active'));
    
    this.updateWeekDisplay();
  }

  switchToWeekView(): void {
    if (this.currentWeek === null) {
      const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
      this.currentWeek = window.getDhakaWeekNumber ? window.getDhakaWeekNumber(today) : 1;
      this.currentWeekYear = today.getFullYear();
    }
    
    this.useWeekFilter = true;
    this.dateFilter.start = null;
    this.dateFilter.end = null;
    const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
    const dateBtnTextEl = document.getElementById('dateBtnText');
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (dateBtnTextEl) dateBtnTextEl.textContent = 'Date Range';
    
    const quickDateButtons = document.querySelectorAll('.quick-date-btn');
    quickDateButtons.forEach(btn => btn.classList.remove('active'));
    
    this.updateWeekDisplay();
  }

  initializeDateFilter(): void {
    const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
    const firstDay = window.getDhakaFirstDayOfMonth ? window.getDhakaFirstDayOfMonth(today) : new Date();
    const lastDay = window.getDhakaLastDayOfMonth ? window.getDhakaLastDayOfMonth(today) : new Date();
    
    this.dateFilter.start = firstDay;
    this.dateFilter.end = lastDay;
    this.useWeekFilter = false;
    
    const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
    if (startDateInput && window.formatDhakaDateForInput) startDateInput.value = window.formatDhakaDateForInput(firstDay);
    if (endDateInput && window.formatDhakaDateForInput) endDateInput.value = window.formatDhakaDateForInput(lastDay);
    
    this.updateDateButtonText();
    
    const quickDateButtons = document.querySelectorAll('.quick-date-btn');
    quickDateButtons.forEach(btn => btn.classList.remove('active'));
    const thisMonthBtn = document.getElementById('thisMonthBtn');
    if (thisMonthBtn) {
      thisMonthBtn.classList.add('active');
    }
    
    this.initializeWeekFilter();
  }

  updateDateButtonText(): void {
    const dateBtnText = document.getElementById('dateBtnText');
    if (!dateBtnText) return;
    
    if (this.dateFilter.start && this.dateFilter.end) {
      const start = this.dateFilter.start instanceof Date ? this.dateFilter.start : (window.parseDhakaDate && window.formatDhakaDateForInput ? window.parseDhakaDate(window.formatDhakaDateForInput(this.dateFilter.start)) : this.dateFilter.start);
      const end = this.dateFilter.end instanceof Date ? this.dateFilter.end : (window.parseDhakaDate && window.formatDhakaDateForInput ? window.parseDhakaDate(window.formatDhakaDateForInput(this.dateFilter.end)) : this.dateFilter.end);
      const startStr = window.formatDhakaDate ? window.formatDhakaDate(start, { month: 'short', day: 'numeric' }) : start.toLocaleDateString();
      const endStr = window.formatDhakaDate ? window.formatDhakaDate(end, { month: 'short', day: 'numeric' }) : end.toLocaleDateString();
      dateBtnText.textContent = `${startStr} - ${endStr}`;
    } else {
      dateBtnText.textContent = 'Date Range';
    }
  }

  getCurrentPeriodDates(): PeriodDates {
    if (this.dateFilter.start || this.dateFilter.end) {
      return {
        start: this.dateFilter.start ? (this.dateFilter.start instanceof Date ? this.dateFilter.start : (window.getDhakaStartOfDay && window.parseDhakaDate && window.formatDhakaDateForInput ? window.getDhakaStartOfDay(window.parseDhakaDate(window.formatDhakaDateForInput(this.dateFilter.start))) : new Date(this.dateFilter.start))) : new Date(0),
        end: this.dateFilter.end ? (this.dateFilter.end instanceof Date ? this.dateFilter.end : (window.getDhakaEndOfDay && window.parseDhakaDate && window.formatDhakaDateForInput ? window.getDhakaEndOfDay(window.parseDhakaDate(window.formatDhakaDateForInput(this.dateFilter.end))) : new Date(this.dateFilter.end))) : (window.getDhakaNow ? window.getDhakaNow() : new Date())
      };
    } else if (this.useWeekFilter && this.currentWeek !== null && this.currentWeekYear !== null) {
      return window.getDhakaWeekDates ? window.getDhakaWeekDates(this.currentWeek, this.currentWeekYear) : { start: new Date(), end: new Date() };
    } else {
      const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
      return window.getDhakaWeekDates && window.getDhakaWeekNumber ? window.getDhakaWeekDates(window.getDhakaWeekNumber(today), today.getFullYear()) : { start: new Date(), end: new Date() };
    }
  }

  isDateInRange(date: string | Date, filterStart: Date | null, filterEnd: Date | null): boolean {
    if (!filterStart && !filterEnd) {
      const period = this.getCurrentPeriodDates();
      filterStart = period.start;
      filterEnd = period.end;
    }
    
    if (!filterStart && !filterEnd) return true;
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    if (filterStart) {
      const start = new Date(filterStart);
      start.setHours(0, 0, 0, 0);
      if (checkDate < start) return false;
    }
    
    if (filterEnd) {
      const end = new Date(filterEnd);
      end.setHours(23, 59, 59, 999);
      if (checkDate > end) return false;
    }
    
    return true;
  }

  applyDateFilter(onRefresh?: () => void): void {
    const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
    
    if (startDateInput && startDateInput.value) {
      const startDate = window.getDhakaStartOfDay ? window.getDhakaStartOfDay(window.parseDhakaDate ? window.parseDhakaDate(startDateInput.value) : new Date(startDateInput.value)) : new Date(startDateInput.value);
      this.dateFilter.start = startDate;
    } else {
      this.dateFilter.start = null;
    }
    
    if (endDateInput && endDateInput.value) {
      const endDate = window.getDhakaEndOfDay ? window.getDhakaEndOfDay(window.parseDhakaDate ? window.parseDhakaDate(endDateInput.value) : new Date(endDateInput.value)) : new Date(endDateInput.value);
      this.dateFilter.end = endDate;
    } else {
      this.dateFilter.end = null;
    }
    
    if (this.dateFilter.start || this.dateFilter.end) {
      this.updateDateButtonText();
      this.useWeekFilter = false;
      const quickDateButtons = document.querySelectorAll('.quick-date-btn');
      quickDateButtons.forEach(btn => btn.classList.remove('active'));
    } else {
      this.updateDateButtonText();
      this.useWeekFilter = true;
    }
    
    this.updateWeekDisplay();
    
    const dateDropdown = document.getElementById('dateDropdown');
    if (dateDropdown) dateDropdown.classList.remove('active');
    
    if (onRefresh) onRefresh();
  }

  clearDateFilter(onRefresh?: () => void): void {
    this.dateFilter.start = null;
    this.dateFilter.end = null;
    const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    this.updateDateButtonText();
    const dateDropdown = document.getElementById('dateDropdown');
    if (dateDropdown) dateDropdown.classList.remove('active');
    this.useWeekFilter = true;
    this.updateWeekDisplay();
    
    if (onRefresh) onRefresh();
  }
}

