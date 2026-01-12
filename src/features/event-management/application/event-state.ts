/**
 * Application Layer - Event State Management
 * Manages the state of the event management feature
 */

import type { EventState, Event, User, EventFilter, ViewMode } from '../domain/entities.js';

export class EventStateManager {
  private state: EventState = {
    events: [],
    users: [],
    currentFilter: 'all',
    currentView: 'list',
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedParticipants: [],
    editingEventId: null,
    isLoading: false,
    error: null
  };

  private listeners: Set<(state: EventState) => void> = new Set();

  /**
   * Get current state
   */
  getState(): EventState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: EventState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Set events
   */
  setEvents(events: Event[]): void {
    this.state.events = events;
    this.notify();
  }

  /**
   * Set users
   */
  setUsers(users: User[]): void {
    this.state.users = users;
    this.notify();
  }

  /**
   * Set current filter
   */
  setFilter(filter: EventFilter): void {
    this.state.currentFilter = filter;
    this.notify();
  }

  /**
   * Set current view
   */
  setView(view: ViewMode): void {
    this.state.currentView = view;
    this.notify();
  }

  /**
   * Set calendar month/year
   */
  setCalendarDate(month: number, year: number): void {
    this.state.currentMonth = month;
    this.state.currentYear = year;
    this.notify();
  }

  /**
   * Navigate calendar month
   */
  navigateMonth(direction: number): void {
    let newMonth = this.state.currentMonth + direction;
    let newYear = this.state.currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }

    this.setCalendarDate(newMonth, newYear);
  }

  /**
   * Go to today's date
   */
  goToToday(): void {
    const today = new Date();
    this.setCalendarDate(today.getMonth(), today.getFullYear());
  }

  /**
   * Set selected participants
   */
  setSelectedParticipants(participants: User[]): void {
    this.state.selectedParticipants = participants;
    this.notify();
  }

  /**
   * Add participant
   */
  addParticipant(participant: User): void {
    if (!this.state.selectedParticipants.some(p => p.email === participant.email)) {
      this.state.selectedParticipants = [...this.state.selectedParticipants, participant];
      this.notify();
    }
  }

  /**
   * Remove participant
   */
  removeParticipant(email: string): void {
    this.state.selectedParticipants = this.state.selectedParticipants.filter(p => p.email !== email);
    this.notify();
  }

  /**
   * Clear selected participants
   */
  clearParticipants(): void {
    this.state.selectedParticipants = [];
    this.notify();
  }

  /**
   * Set editing event ID
   */
  setEditingEventId(eventId: string | null): void {
    this.state.editingEventId = eventId;
    this.notify();
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.state.isLoading = loading;
    this.notify();
  }

  /**
   * Set error
   */
  setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }

  /**
   * Get filtered events
   */
  getFilteredEvents(): Event[] {
    if (this.state.currentFilter === 'all') {
      return this.state.events;
    }
    return this.state.events.filter(event => event.type === this.state.currentFilter);
  }

  /**
   * Get events for calendar month
   */
  getCalendarEvents(): Event[] {
    const filtered = this.getFilteredEvents();
    return filtered.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === this.state.currentMonth &&
             eventDate.getFullYear() === this.state.currentYear;
    });
  }
}

