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
  public participantManager: ParticipantManager; // Made public for access

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
    
    // M4: Read filter from URL on init
    const urlParams = new URLSearchParams(window.location.search);
    const filterFromUrl = urlParams.get('filter');
    if (filterFromUrl && ['all', 'session', 'meeting', 'feedback', 'training'].includes(filterFromUrl)) {
      this.stateManager.setFilter(filterFromUrl as any);
    }
    
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        if (type) {
          this.stateManager.setFilter(type as any);
          this.renderer.render();
          
          // M4: Update URL with filter
          const url = new URL(window.location.href);
          if (type === 'all') {
            url.searchParams.delete('filter');
          } else {
            url.searchParams.set('filter', type);
          }
          window.history.replaceState({}, '', url);
        }
      });
    });

    // M4: Subscribe to state changes to sync URL
    this.stateManager.subscribe(() => {
      const filter = this.stateManager.getState().currentFilter;
      const url = new URL(window.location.href);
      if (filter === 'all') {
        url.searchParams.delete('filter');
      } else {
        url.searchParams.set('filter', filter);
      }
      // Only update if different to avoid loops
      if (url.search !== window.location.search) {
        window.history.replaceState({}, '', url);
      }
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

    // M6: Add keyboard support to calendar navigation
    prevMonthBtn?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.stateManager.navigateMonth(-1);
        this.renderer.render();
      }
    });
    prevMonthBtn?.setAttribute('tabindex', '0');
    prevMonthBtn?.setAttribute('role', 'button');

    nextMonthBtn?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.stateManager.navigateMonth(1);
        this.renderer.render();
      }
    });
    nextMonthBtn?.setAttribute('tabindex', '0');
    nextMonthBtn?.setAttribute('role', 'button');

    todayBtn?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.stateManager.goToToday();
        this.renderer.render();
      }
    });
    todayBtn?.setAttribute('tabindex', '0');
    todayBtn?.setAttribute('role', 'button');
  }

  /**
   * Set up create button
   */
  private setupCreateButton(): void {
    const createBtn = document.getElementById('createEventBtn');
    createBtn?.addEventListener('click', () => {
      this.modalManager.openCreateModal();
    });

    // M7: Setup empty state button (event delegation)
    this.setupEmptyStateButton();
  }

  /**
   * Setup empty state button (M7: Replace onclick with event listener)
   */
  private setupEmptyStateButton(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.empty-state-create-btn')) {
        e.preventDefault();
        this.modalManager.openCreateModal();
      }
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
          confirmText: 'Yes, I\'m sure',
          cancelText: 'No, cancel',
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
        // Fallback to alert if confirmationDialog not available
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
      // H5: Show list modal with all events for the day
      this.showDayEventsModal(dayEvents, dateStr);
    }
  }

  /**
   * Show modal with all events for a day (H5)
   */
  private async showDayEventsModal(dayEvents: any[], dateStr: string): Promise<void> {
    const modal = document.getElementById('viewEventModal');
    const content = document.getElementById('viewEventContent');
    
    if (!modal || !content) return;

    const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

    content.innerHTML = `
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Events on ${formattedDate}</h3>
        <div class="space-y-3">
          ${dayEvents.map(event => `
            <div class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" data-action="view-event" data-event-id="${event.id}">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-semibold text-gray-900">${event.title}</h4>
                  <p class="text-xs text-gray-600 mt-1">${event.start_time || 'N/A'} - ${event.end_time || 'N/A'}</p>
                </div>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Attach event listeners
    content.querySelectorAll('[data-action="view-event"]').forEach(element => {
      element.addEventListener('click', () => {
        const eventId = element.getAttribute('data-event-id');
        if (eventId && (window as any).eventHandlers) {
          (window as any).eventHandlers.viewEvent(eventId);
        }
      });
    });

    modal.classList.remove('hidden');
  }
}

