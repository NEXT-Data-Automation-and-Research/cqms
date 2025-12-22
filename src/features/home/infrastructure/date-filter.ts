/**
 * Date Filter Utilities
 * Handles week and date range filtering for the home page
 */

import type { DateFilter, PeriodDates } from './types.js';

export interface DateFilterState {
  dateFilter: DateFilter;
  currentWeek: number | null;
  currentWeekYear: number | null;
  useWeekFilter: boolean;
}

export class DateFilterManager {
  private state: DateFilterState;

  constructor(state: DateFilterState) {
    this.state = state;
  }

  getWeekNumber(date: Date | null = null): number {
    if (!date && window.getDhakaNow) date = window.getDhakaNow();
    if (!date) date = new Date();
    if (window.getDhakaWeekNumber) {
      return window.getDhakaWeekNumber(date);
    }
    return 1; // Fallback
  }

  getWeekDates(weekNumber: number, year: number): { start: Date; end: Date } {
    if (window.getDhakaWeekDates) {
      return window.getDhakaWeekDates(weekNumber, year);
    }
    return { start: new Date(), end: new Date() };
  }

  initializeWeekFilter(): void {
    const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
    if (window.getDhakaWeekNumber) {
      this.state.currentWeek = window.getDhakaWeekNumber(today);
    }
    this.state.currentWeekYear = today.getFullYear();
    this.updateWeekDisplay();
  }

  updateWeekDisplay(): void {
    const weekTextEl = document.getElementById('weekText');
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    const weekDisplay = document.getElementById('weekDisplay');
    
    if (this.state.currentWeek === null) {
      const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
      this.state.currentWeek = window.getDhakaWeekNumber ? window.getDhakaWeekNumber(today) : 1;
      this.state.currentWeekYear = today.getFullYear();
    }
    
    if (weekTextEl) {
      if (this.state.useWeekFilter && this.state.currentWeek !== null) {
        weekTextEl.textContent = `Week ${this.state.currentWeek}`;
      } else {
        weekTextEl.textContent = `Week ${this.state.currentWeek || '-'}`;
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
      if (this.state.useWeekFilter) {
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

  navigateWeek(direction: number, onRefresh: () => void): void {
    if (this.state.currentWeek === null || this.state.currentWeekYear === null) {
      const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
      this.state.currentWeek = window.getDhakaWeekNumber ? window.getDhakaWeekNumber(today) : 1;
      this.state.currentWeekYear = today.getFullYear();
    }
    
    if (this.state.currentWeek !== null) {
      this.state.currentWeek += direction;
      
      if (this.state.currentWeek > 52) {
        this.state.currentWeek = 1;
        if (this.state.currentWeekYear !== null) this.state.currentWeekYear += 1;
      } else if (this.state.currentWeek < 1) {
        this.state.currentWeek = 52;
        if (this.state.currentWeekYear !== null) this.state.currentWeekYear -= 1;
      }
    }
    
    this.state.useWeekFilter = true;
    this.state.dateFilter.start = null;
    this.state.dateFilter.end = null;
    const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
    const dateBtnTextEl = document.getElementById('dateBtnText');
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (dateBtnTextEl) dateBtnTextEl.textContent = 'Date Range';
    
    const quickDateButtons = document.querySelectorAll('.quick-date-btn');
    quickDateButtons.forEach(btn => btn.classList.remove('active'));
    
    this.updateWeekDisplay();
    onRefresh();
  }

  switchToWeekView(onRefresh: () => void): void {
    if (this.state.currentWeek === null) {
      const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
      this.state.currentWeek = window.getDhakaWeekNumber ? window.getDhakaWeekNumber(today) : 1;
      this.state.currentWeekYear = today.getFullYear();
    }
    
    this.state.useWeekFilter = true;
    this.state.dateFilter.start = null;
    this.state.dateFilter.end = null;
    const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
    const dateBtnTextEl = document.getElementById('dateBtnText');
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (dateBtnTextEl) dateBtnTextEl.textContent = 'Date Range';
    
    const quickDateButtons = document.querySelectorAll('.quick-date-btn');
    quickDateButtons.forEach(btn => btn.classList.remove('active'));
    
    this.updateWeekDisplay();
    onRefresh();
  }

  initializeDateFilter(): void {
    const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
    const firstDay = window.getDhakaFirstDayOfMonth ? window.getDhakaFirstDayOfMonth(today) : new Date();
    const lastDay = window.getDhakaLastDayOfMonth ? window.getDhakaLastDayOfMonth(today) : new Date();
    
    this.state.dateFilter.start = firstDay;
    this.state.dateFilter.end = lastDay;
    this.state.useWeekFilter = false;
    
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

  formatDateForInput(date: Date): string {
    if (window.formatDhakaDateForInput) {
      return window.formatDhakaDateForInput(date);
    }
    return date.toISOString().split('T')[0];
  }

  updateDateButtonText(): void {
    const dateBtnText = document.getElementById('dateBtnText');
    if (!dateBtnText) return;
    
    if (this.state.dateFilter.start && this.state.dateFilter.end) {
      const start = this.state.dateFilter.start instanceof Date ? this.state.dateFilter.start : (window.parseDhakaDate && window.formatDhakaDateForInput ? window.parseDhakaDate(window.formatDhakaDateForInput(this.state.dateFilter.start)) : this.state.dateFilter.start);
      const end = this.state.dateFilter.end instanceof Date ? this.state.dateFilter.end : (window.parseDhakaDate && window.formatDhakaDateForInput ? window.parseDhakaDate(window.formatDhakaDateForInput(this.state.dateFilter.end)) : this.state.dateFilter.end);
      const startStr = window.formatDhakaDate ? window.formatDhakaDate(start, { month: 'short', day: 'numeric' }) : start.toLocaleDateString();
      const endStr = window.formatDhakaDate ? window.formatDhakaDate(end, { month: 'short', day: 'numeric' }) : end.toLocaleDateString();
      dateBtnText.textContent = `${startStr} - ${endStr}`;
    } else {
      dateBtnText.textContent = 'Date Range';
    }
  }

  getCurrentPeriodDates(): PeriodDates {
    if (this.state.dateFilter.start || this.state.dateFilter.end) {
      return {
        start: this.state.dateFilter.start ? (this.state.dateFilter.start instanceof Date ? this.state.dateFilter.start : (window.getDhakaStartOfDay && window.parseDhakaDate && window.formatDhakaDateForInput ? window.getDhakaStartOfDay(window.parseDhakaDate(window.formatDhakaDateForInput(this.state.dateFilter.start))) : new Date(this.state.dateFilter.start))) : new Date(0),
        end: this.state.dateFilter.end ? (this.state.dateFilter.end instanceof Date ? this.state.dateFilter.end : (window.getDhakaEndOfDay && window.parseDhakaDate && window.formatDhakaDateForInput ? window.getDhakaEndOfDay(window.parseDhakaDate(window.formatDhakaDateForInput(this.state.dateFilter.end))) : new Date(this.state.dateFilter.end))) : (window.getDhakaNow ? window.getDhakaNow() : new Date())
      };
    } else if (this.state.useWeekFilter && this.state.currentWeek !== null && this.state.currentWeekYear !== null) {
      return window.getDhakaWeekDates ? window.getDhakaWeekDates(this.state.currentWeek, this.state.currentWeekYear) : { start: new Date(), end: new Date() };
    } else {
      const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
      return window.getDhakaWeekDates && window.getDhakaWeekNumber ? window.getDhakaWeekDates(window.getDhakaWeekNumber(today), today.getFullYear()) : { start: new Date(), end: new Date() };
    }
  }

  applyDateFilter(onRefresh: () => void): void {
    const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
    
    if (startDateInput && startDateInput.value) {
      const startDate = window.getDhakaStartOfDay ? window.getDhakaStartOfDay(window.parseDhakaDate ? window.parseDhakaDate(startDateInput.value) : new Date(startDateInput.value)) : new Date(startDateInput.value);
      this.state.dateFilter.start = startDate;
    } else {
      this.state.dateFilter.start = null;
    }
    
    if (endDateInput && endDateInput.value) {
      const endDate = window.getDhakaEndOfDay ? window.getDhakaEndOfDay(window.parseDhakaDate ? window.parseDhakaDate(endDateInput.value) : new Date(endDateInput.value)) : new Date(endDateInput.value);
      this.state.dateFilter.end = endDate;
    } else {
      this.state.dateFilter.end = null;
    }
    
    if (this.state.dateFilter.start || this.state.dateFilter.end) {
      const start = this.state.dateFilter.start ? (window.formatDhakaDate ? window.formatDhakaDate(this.state.dateFilter.start instanceof Date ? this.state.dateFilter.start : (window.parseDhakaDate && window.formatDhakaDateForInput ? window.parseDhakaDate(window.formatDhakaDateForInput(this.state.dateFilter.start)) : this.state.dateFilter.start), { month: 'short', day: 'numeric' }) : this.state.dateFilter.start.toLocaleDateString()) : 'Start';
      const end = this.state.dateFilter.end ? (window.formatDhakaDate ? window.formatDhakaDate(this.state.dateFilter.end instanceof Date ? this.state.dateFilter.end : (window.parseDhakaDate && window.formatDhakaDateForInput ? window.parseDhakaDate(window.formatDhakaDateForInput(this.state.dateFilter.end)) : this.state.dateFilter.end), { month: 'short', day: 'numeric' }) : this.state.dateFilter.end.toLocaleDateString()) : 'End';
      const dateBtnText = document.getElementById('dateBtnText');
      if (dateBtnText) {
        dateBtnText.textContent = `${start} - ${end}`;
      }
      this.state.useWeekFilter = false;
      
      const quickDateButtons = document.querySelectorAll('.quick-date-btn');
      quickDateButtons.forEach(btn => btn.classList.remove('active'));
      
      this.updateWeekDisplay();
    } else {
      this.updateDateButtonText();
      this.state.useWeekFilter = true;
      this.updateWeekDisplay();
    }
    
    const dateDropdown = document.getElementById('dateDropdown');
    if (dateDropdown) dateDropdown.classList.remove('active');
    
    onRefresh();
  }

  clearDateFilter(onRefresh: () => void): void {
    this.state.dateFilter.start = null;
    this.state.dateFilter.end = null;
    const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    this.updateDateButtonText();
    const dateDropdown = document.getElementById('dateDropdown');
    if (dateDropdown) dateDropdown.classList.remove('active');
    this.state.useWeekFilter = true;
    
    const quickDateButtons = document.querySelectorAll('.quick-date-btn');
    quickDateButtons.forEach(btn => btn.classList.remove('active'));
    
    this.updateWeekDisplay();
    onRefresh();
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
}

