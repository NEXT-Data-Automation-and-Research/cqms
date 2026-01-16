/**
 * Presentation Layer - Calendar Renderer
 * Handles calendar view rendering
 */

import type { EventStateManager } from '../application/event-state.js';
import type { Event } from '../domain/types.js';
import { escapeHtml } from '../../../utils/html-sanitizer.js';

export class CalendarRenderer {
  constructor(private stateManager: EventStateManager) {}

  /**
   * Render calendar
   */
  render(): void {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthYearEl = document.getElementById('calendarMonthYear');
    
    if (!calendarGrid) return;
    
    const state = this.stateManager.getState();
    
    // Update month/year display
    if (monthYearEl) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      monthYearEl.textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;
    }
    
    // Get calendar events
    const calendarEvents = this.getCalendarEvents(state);
    
    // Build calendar grid
    const calendarHTML = this.buildCalendarGrid(state, calendarEvents);
    calendarGrid.innerHTML = calendarHTML;
    
    // Attach event listeners after rendering
    this.attachEventListeners(calendarGrid);
  }

  /**
   * Attach event listeners to calendar elements
   */
  private attachEventListeners(container: HTMLElement): void {
    // View event
    container.querySelectorAll('[data-action="view-event"]').forEach(element => {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        const eventId = element.getAttribute('data-event-id');
        if (eventId && (window as any).eventHandlers) {
          (window as any).eventHandlers.viewEvent(eventId);
        }
      });
    });

    // Show day events
    container.querySelectorAll('[data-action="show-day-events"]').forEach(element => {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        const day = parseInt(element.getAttribute('data-day') || '0', 10);
        const month = parseInt(element.getAttribute('data-month') || '0', 10);
        const year = parseInt(element.getAttribute('data-year') || '0', 10);
        if (day && month !== null && year && (window as any).eventHandlers) {
          (window as any).eventHandlers.showDayEvents(day, month, year);
        }
      });
    });

    // Create event on date
    container.querySelectorAll('[data-action="create-event-on-date"]').forEach(element => {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        const dateStr = element.getAttribute('data-date');
        if (dateStr && (window as any).eventHandlers) {
          (window as any).eventHandlers.createEventOnDate(dateStr);
        }
      });
    });
  }

  /**
   * Get events for current calendar month
   */
  private getCalendarEvents(state: any): Record<number, Event[]> {
    const eventsByDate: Record<number, Event[]> = {};
    const filteredEvents = state.currentFilter === 'all' 
      ? state.events 
      : state.events.filter((e: Event) => e.type === state.currentFilter);
    
    filteredEvents.forEach((event: Event) => {
      const eventDate = new Date(event.date);
      if (eventDate.getMonth() === state.currentMonth && 
          eventDate.getFullYear() === state.currentYear) {
        const dateKey = eventDate.getDate();
        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
      }
    });
    
    return eventsByDate;
  }

  /**
   * Build calendar grid HTML
   */
  private buildCalendarGrid(state: any, eventsByDate: Record<number, Event[]>): string {
    const firstDay = new Date(state.currentYear, state.currentMonth, 1);
    const lastDay = new Date(state.currentYear, state.currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const today = new Date();
    const isCurrentMonth = today.getMonth() === state.currentMonth && 
                          today.getFullYear() === state.currentYear;
    const todayDate = isCurrentMonth ? today.getDate() : null;
    
    const prevMonth = new Date(state.currentYear, state.currentMonth, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    let calendarHTML = '';
    
    // Previous month's trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      calendarHTML += this.createCalendarDay(day, true, [], false, state);
    }
    
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === todayDate;
      const dayEvents = eventsByDate[day] || [];
      calendarHTML += this.createCalendarDay(day, false, dayEvents, isToday, state);
    }
    
    // Next month's leading days
    const totalCells = startingDayOfWeek + daysInMonth;
    const remainingCells = 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
      calendarHTML += this.createCalendarDay(day, true, [], false, state);
    }
    
    return calendarHTML;
  }

  /**
   * Create calendar day HTML
   */
  private createCalendarDay(
    day: number, 
    isOtherMonth: boolean, 
    dayEvents: Event[], 
    isToday: boolean,
    state: any
  ): string {
    const otherMonthClass = isOtherMonth ? 'other-month' : '';
    const todayClass = isToday ? 'today' : '';
    const dayNumberClass = isToday ? 'day-number' : '';
    
    const maxVisible = 3;
    const visibleEvents = dayEvents.slice(0, maxVisible);
    const moreCount = dayEvents.length - maxVisible;
    
    let eventsHTML = visibleEvents.map(event => {
      const typeColors = {
        session: 'session',
        meeting: 'meeting',
        feedback: 'feedback',
        training: 'training'
      };
      const eventTypeClass = typeColors[event.type] || 'session';
      const time = event.start_time ? event.start_time.substring(0, 5) : '';
      const title = escapeHtml(event.title);
      const displayTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
      return `<div class="calendar-event ${eventTypeClass}" data-action="view-event" data-event-id="${event.id}" title="${title}${time ? ' at ' + time : ''}">
        ${time ? `${time} ` : ''}${displayTitle}
      </div>`;
    }).join('');
    
    if (moreCount > 0) {
      const dateStr = isOtherMonth ? '' : `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      eventsHTML += `<div class="calendar-event-more" data-action="show-day-events" data-day="${day}" data-month="${state.currentMonth}" data-year="${state.currentYear}">
        +${moreCount} more
      </div>`;
    }
    
    const dateStr = isOtherMonth ? '' : `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const tabIndex = isOtherMonth ? '-1' : '0';
    const dataAction = isOtherMonth ? '' : `data-action="create-event-on-date" data-date="${dateStr}"`;
    
    return `
      <div class="calendar-day ${otherMonthClass} ${todayClass}" ${dataAction} tabindex="${tabIndex}" role="button" aria-label="Day ${day}${isToday ? ', today' : ''}">
        <div class="calendar-day-number ${dayNumberClass}">${day}</div>
        <div class="calendar-events">
          ${eventsHTML}
        </div>
      </div>
    `;
  }
}

