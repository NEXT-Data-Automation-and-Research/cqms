/**
 * Presentation Layer - Event Renderer
 * Handles all DOM rendering for event management
 */

import type { EventStateManager } from '../application/event-state.js';
import type { Event } from '../domain/types.js';
import { escapeHtml, safeSetHTML } from '../../../utils/html-sanitizer.js';
import { CalendarRenderer } from './calendar-renderer.js';

export class EventRenderer {
  private calendarRenderer: CalendarRenderer;

  constructor(private stateManager: EventStateManager) {
    this.calendarRenderer = new CalendarRenderer(stateManager);
  }

  /**
   * Main render method
   */
  render(): void {
    const state = this.stateManager.getState();
    
    if (state.currentView === 'calendar') {
      this.renderCalendar();
    } else {
      this.renderList();
    }
    
    this.updateViewToggle();
    this.updateFilterButtons();
    this.updateCreateButtonText();
    
    // Ensure participant chips are re-rendered after state changes
    if ((window as any).eventHandlers?.participantManager) {
      (window as any).eventHandlers.participantManager.renderSelectedParticipants();
    }
  }

  /**
   * Render list view
   */
  private renderList(): void {
    const eventsList = document.getElementById('eventsList');
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (!eventsList || !loadingIndicator) return;

    const state = this.stateManager.getState();

    // Show loading state when loading
    if (state.isLoading) {
      this.showLoading();
      return;
    }

    // Hide loading and show events list
    this.hideLoading();

    const filteredEvents = this.stateManager.getFilteredEvents();
    const sortedEvents = this.sortEvents(filteredEvents);

    if (sortedEvents.length === 0) {
      safeSetHTML(eventsList, this.renderEmptyState());
      return;
    }

    safeSetHTML(eventsList, sortedEvents.map(event => this.renderEventItem(event)).join(''));
    
    // Attach event listeners after rendering
    this.attachEventListeners(eventsList);
  }

  /**
   * Attach event listeners to rendered event items
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

    // Edit event
    container.querySelectorAll('[data-action="edit-event"]').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const eventId = button.getAttribute('data-event-id');
        if (eventId && (window as any).eventHandlers) {
          (window as any).eventHandlers.editEvent(eventId);
        }
      });
    });

    // Delete event
    container.querySelectorAll('[data-action="delete-event"]').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const eventId = button.getAttribute('data-event-id');
        if (eventId && (window as any).eventHandlers) {
          (window as any).eventHandlers.deleteEvent(eventId);
        }
      });
    });
  }

  /**
   * Render loading state skeleton (M1)
   */
  /**
   * Show loading indicator
   */
  private showLoading(): void {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const eventsList = document.getElementById('eventsList');
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    if (eventsList) eventsList.style.display = 'none';
  }

  /**
   * Hide loading indicator
   */
  private hideLoading(): void {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const eventsList = document.getElementById('eventsList');
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (eventsList) eventsList.style.display = 'block';
  }

  /**
   * Render calendar view
   */
  private renderCalendar(): void {
    const state = this.stateManager.getState();
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarLoadingIndicator = document.getElementById('calendarLoadingIndicator');
    const calendarView = document.getElementById('calendarView');
    
    // Show loading state when loading
    if (state.isLoading) {
      if (calendarLoadingIndicator && calendarView && !calendarView.classList.contains('hidden')) {
        calendarLoadingIndicator.style.display = 'flex';
      }
      if (calendarGrid) {
        calendarGrid.style.display = 'none';
        calendarGrid.classList.remove('calendar-grid');
      }
      return;
    }
    
    // Hide loading and show calendar
    if (calendarLoadingIndicator) {
      calendarLoadingIndicator.style.display = 'none';
    }
    if (calendarGrid) {
      calendarGrid.style.display = 'grid';
      calendarGrid.classList.add('calendar-grid');
    }
    
    this.calendarRenderer.render();
  }

  /**
   * Render single event item
   */
  private renderEventItem(event: Event): string {
    // L2: Improved color contrast for badges
    const typeColors = {
      session: 'bg-blue-600 text-white',
      meeting: 'bg-purple-600 text-white',
      feedback: 'bg-green-600 text-white',
      training: 'bg-orange-600 text-white'
    };
    
    const typeLabels = {
      session: 'Session',
      meeting: 'Meeting',
      feedback: 'Feedback Session',
      training: 'Training Session'
    };

    const participants = event.participants || [];
    const participantCount = participants.length;
    const state = this.stateManager.getState();
    
    // Get user email - try multiple sources
    let userEmail = '';
    let isSuperAdmin = false;
    
    if ((window as any).eventController) {
      userEmail = (window as any).eventController.getUserEmail() || '';
      isSuperAdmin = (window as any).eventController.isUserSuperAdmin() || false;
    }
    
    // Fallback to localStorage if controller not available
    if (!userEmail) {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        userEmail = userInfo.email || '';
        isSuperAdmin = userInfo.role === 'Super Admin';
      } catch (e) {
        // Ignore
      }
    }
    
    const canModify = event.created_by === userEmail || isSuperAdmin;

    return `
      <div class="event-item" data-action="view-event" data-event-id="${event.id}">
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="text-sm font-semibold text-gray-900 event-item-title">${escapeHtml(event.title)}</h3>
              <span class="px-2 py-0.5 rounded text-xs font-semibold event-item-badge ${typeColors[event.type] || 'bg-gray-100 text-gray-800'}">
                ${typeLabels[event.type] || event.type}
              </span>
            </div>
            ${event.description ? `<p class="text-xs text-gray-600 mb-2 event-item-description">${escapeHtml(event.description)}</p>` : ''}
            <div class="flex items-center gap-4 text-xs text-gray-500 flex-wrap event-item-meta">
              <span class="flex items-center gap-1 event-item-meta-item">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                ${this.formatDate(event.date)}
              </span>
              <span class="flex items-center gap-1 event-item-meta-item">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                ${event.start_time || 'N/A'} - ${event.end_time || 'N/A'}
              </span>
              ${participantCount > 0 ? `
                <span class="flex items-center gap-1 event-item-meta-item">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                  ${participantCount} participant${participantCount !== 1 ? 's' : ''}
                </span>
              ` : ''}
            </div>
          </div>
          <div class="flex items-center gap-2 event-item-actions" data-action="stop-propagation" onclick="event.stopPropagation()">
            ${event.meet_link ? `
              <a href="${escapeHtml(event.meet_link)}" target="_blank" rel="noopener noreferrer" class="join-meet-link px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-2 no-underline" title="Join Google Meet">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                <span>Join</span>
              </a>
            ` : ''}
            ${canModify ? `
              <button type="button" data-action="edit-event" data-event-id="${event.id}" class="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors" title="Edit event" aria-label="Edit event">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button type="button" data-action="delete-event" data-event-id="${event.id}" class="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors" title="Delete event" aria-label="Delete event">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  private renderEmptyState(): string {
    const state = this.stateManager.getState();
    const buttonTexts = {
      'all': 'Create Event',
      'session': 'Create Session',
      'meeting': 'Create Meeting',
      'feedback': 'Create Feedback Session',
      'training': 'Create Training Session'
    };
    const emptyStateMessages = {
      'all': 'No events scheduled',
      'session': 'No sessions scheduled',
      'meeting': 'No meetings scheduled',
      'feedback': 'No feedback session scheduled',
      'training': 'No training session scheduled'
    };
    
    const buttonText = buttonTexts[state.currentFilter] || 'Create Event';
    const message = emptyStateMessages[state.currentFilter] || 'No events scheduled';
    
    return `
      <div class="px-4 py-12 text-center">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <p class="text-sm font-semibold text-gray-700 mb-1">${message}</p>
        <p class="text-xs text-gray-500 mb-4">Create your first event to get started</p>
        <button type="button" class="empty-state-create-btn" aria-label="${buttonText}">
          ${buttonText}
        </button>
      </div>
    `;
  }

  /**
   * Sort events by date and time
   */
  private sortEvents(events: Event[]): Event[] {
    return [...events].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.start_time || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.start_time || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * Format date
   */
  private formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Update view toggle buttons
   */
  private updateViewToggle(): void {
    const state = this.stateManager.getState();
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const listView = document.getElementById('listView');
    const calendarView = document.getElementById('calendarView');

    if (state.currentView === 'list') {
      listView?.classList.remove('hidden');
      calendarView?.classList.add('hidden');
      listViewBtn?.classList.add('active');
      listViewBtn?.setAttribute('aria-pressed', 'true');
      calendarViewBtn?.classList.remove('active');
      calendarViewBtn?.setAttribute('aria-pressed', 'false');
    } else {
      listView?.classList.add('hidden');
      calendarView?.classList.remove('hidden');
      calendarViewBtn?.classList.add('active');
      calendarViewBtn?.setAttribute('aria-pressed', 'true');
      listViewBtn?.classList.remove('active');
      listViewBtn?.setAttribute('aria-pressed', 'false');
    }
  }

  /**
   * Update filter buttons
   */
  private updateFilterButtons(): void {
    const state = this.stateManager.getState();
    const filterButtons = document.querySelectorAll('.event-type-filter');
    
    filterButtons.forEach(btn => {
      const type = btn.getAttribute('data-type');
      if (type === state.currentFilter) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  /**
   * Update create button text based on filter
   */
  private updateCreateButtonText(): void {
    const state = this.stateManager.getState();
    const buttonText = document.getElementById('createEventBtnText');
    if (!buttonText) return;
    
    const buttonTexts = {
      'all': 'Create Event',
      'session': 'Create Session',
      'meeting': 'Create Meeting',
      'feedback': 'Create Feedback Session',
      'training': 'Create Training Session'
    };
    
    buttonText.textContent = buttonTexts[state.currentFilter] || 'Create Event';
  }
}

