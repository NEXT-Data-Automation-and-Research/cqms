/**
 * Presentation Layer - Event Event Handlers
 * Handles all user interactions and events
 */

import type { EventController } from '../application/event-controller.js';
import type { EventStateManager } from '../application/event-state.js';
import type { EventRenderer } from './event-renderer.js';
import { logError, logInfo } from '../../../utils/logging-helper.js';
import { EventModalManager } from './event-modal-manager.js';
import { ParticipantManager } from './participant-manager.js';

export class EventEventHandlers {
  private modalManager: EventModalManager;
  private participantManager: ParticipantManager;

  constructor(
    private controller: EventController,
    private stateManager: EventStateManager,
    private renderer: EventRenderer
  ) {
    this.modalManager = new EventModalManager(controller, stateManager, renderer);
    this.participantManager = new ParticipantManager(stateManager);
  }

  /**
   * Set up all event listeners
   */
  setup(): void {
    this.setupFilterButtons();
    this.setupViewToggle();
    this.setupCalendarNavigation();
    this.setupCreateButton();
    this.modalManager.setup();
    this.participantManager.setup();
  }

  /**
   * Set up filter buttons
   */
  private setupFilterButtons(): void {
    const filterButtons = document.querySelectorAll('.event-type-filter');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        if (type) {
          this.stateManager.setFilter(type as any);
          this.renderer.render();
        }
      });
    });
  }

  /**
   * Set up view toggle buttons
   */
  private setupViewToggle(): void {
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');

    listViewBtn?.addEventListener('click', () => {
      this.stateManager.setView('list');
      this.renderer.render();
    });

    calendarViewBtn?.addEventListener('click', () => {
      this.stateManager.setView('calendar');
      this.renderer.render();
    });
  }

  /**
   * Set up calendar navigation
   */
  private setupCalendarNavigation(): void {
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const todayBtn = document.getElementById('todayBtn');

    prevMonthBtn?.addEventListener('click', () => {
      this.stateManager.navigateMonth(-1);
      this.renderer.render();
    });

    nextMonthBtn?.addEventListener('click', () => {
      this.stateManager.navigateMonth(1);
      this.renderer.render();
    });

    todayBtn?.addEventListener('click', () => {
      this.stateManager.goToToday();
      this.renderer.render();
    });
  }

  /**
   * Set up create button
   */
  private setupCreateButton(): void {
    const createBtn = document.getElementById('createEventBtn');
    createBtn?.addEventListener('click', () => {
      this.modalManager.openCreateModal();
    });
  }

  /**
   * View event (called from rendered HTML)
   */
  async viewEvent(eventId: string): Promise<void> {
    await this.modalManager.viewEvent(eventId);
  }

  /**
   * Edit event (called from rendered HTML)
   */
  async editEvent(eventId: string): Promise<void> {
    await this.modalManager.editEvent(eventId);
  }

  /**
   * Delete event (called from rendered HTML)
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      const state = this.stateManager.getState();
      const event = state.events.find(e => e.id === eventId);
      
      if (!event) {
        throw new Error('Event not found');
      }

      // Use confirmation dialog if available
      let confirmed = false;
      if ((window as any).confirmationDialog) {
        confirmed = await (window as any).confirmationDialog.show({
          title: 'Delete Event',
          message: 'Are you sure you want to delete this event? This action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          type: 'error'
        });
      } else {
        confirmed = window.confirm('Are you sure you want to delete this event? This action cannot be undone.');
      }

      if (confirmed) {
        await this.controller.deleteEvent(eventId);
        this.renderer.render();
      }
    } catch (error) {
      logError('[EventEventHandlers] Error deleting event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
      if ((window as any).confirmationDialog) {
        await (window as any).confirmationDialog.show({
          title: 'Error',
          message: errorMessage,
          confirmText: 'OK',
          cancelText: '',
          type: 'error'
        });
      } else {
        alert(errorMessage);
      }
    }
  }

  /**
   * Remove participant (called from HTML)
   */
  removeParticipant(email: string): void {
    this.participantManager.removeParticipant(email);
  }

  /**
   * Add group members (called from HTML)
   */
  addGroupMembers(field: string, value: string): void {
    this.modalManager.addGroupMembers(field, value);
  }

  /**
   * Create event on specific date (from calendar)
   */
  createEventOnDate(dateStr: string): void {
    this.modalManager.openCreateModal(null, dateStr);
  }

  /**
   * Show day events (from calendar)
   */
  showDayEvents(day: number, month: number, year: number): void {
    const state = this.stateManager.getState();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const targetDate = new Date(year, month, day);
    
    const dayEvents = state.events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === targetDate.toDateString();
    });

    if (dayEvents.length === 0) {
      this.createEventOnDate(dateStr);
    } else if (dayEvents.length === 1) {
      this.viewEvent(dayEvents[0].id);
    } else {
      // Show first event for now (could show list modal)
      this.viewEvent(dayEvents[0].id);
    }
  }
}

