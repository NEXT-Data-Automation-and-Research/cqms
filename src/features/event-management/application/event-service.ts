/**
 * Application Layer - Event Service
 * Contains business logic for event management
 */

import { EventRepository } from '../infrastructure/event-repository.js';
import type { Event, User, EventFormData } from '../domain/types.js';
import { logError } from '../../../utils/logging-helper.js';

export class EventService {
  constructor(private repository: EventRepository) {}

  /**
   * Load all events for a user
   */
  async loadEvents(userEmail: string, isSuperAdmin: boolean): Promise<Event[]> {
    try {
      return await this.repository.loadEvents(userEmail, isSuperAdmin);
    } catch (error) {
      logError('Error in EventService.loadEvents:', error);
      throw error;
    }
  }

  /**
   * Load all users
   */
  async loadUsers(): Promise<User[]> {
    try {
      return await this.repository.loadUsers();
    } catch (error) {
      logError('Error in EventService.loadUsers:', error);
      throw error;
    }
  }

  /**
   * Create a new event
   */
  async createEvent(formData: EventFormData, creatorEmail: string): Promise<Event> {
    try {
      // Validate event data
      this.validateEventData(formData);

      const eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'> = {
        title: formData.title.trim(),
        type: formData.type,
        date: formData.date,
        start_time: formData.startTime,
        end_time: formData.endTime,
        description: formData.description.trim() || null,
        participants: formData.participants.length > 0 ? formData.participants : null,
        meet_link: this.processMeetLink(formData.meetLink),
        created_by: creatorEmail
      };

      return await this.repository.createEvent(eventData);
    } catch (error) {
      logError('Error in EventService.createEvent:', error);
      throw error;
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, formData: EventFormData): Promise<Event> {
    try {
      // Validate event data
      this.validateEventData(formData);

      const updateData: Partial<Omit<Event, 'id' | 'created_by' | 'created_at'>> = {
        title: formData.title.trim(),
        type: formData.type,
        date: formData.date,
        start_time: formData.startTime,
        end_time: formData.endTime,
        description: formData.description.trim() || null,
        participants: formData.participants.length > 0 ? formData.participants : null,
        meet_link: this.processMeetLink(formData.meetLink)
      };

      return await this.repository.updateEvent(eventId, updateData);
    } catch (error) {
      logError('Error in EventService.updateEvent:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.repository.deleteEvent(eventId);
    } catch (error) {
      logError('Error in EventService.deleteEvent:', error);
      throw error;
    }
  }

  /**
   * Check if user can edit/delete an event
   */
  canUserModifyEvent(event: Event, userEmail: string, isSuperAdmin: boolean): boolean {
    return isSuperAdmin || event.created_by === userEmail;
  }

  /**
   * Validate event form data
   */
  private validateEventData(formData: EventFormData): void {
    if (!formData.title || !formData.title.trim()) {
      throw new Error('Event title is required');
    }
    if (!formData.type) {
      throw new Error('Event type is required');
    }
    if (!formData.date) {
      throw new Error('Event date is required');
    }
    if (!formData.startTime) {
      throw new Error('Start time is required');
    }
    if (!formData.endTime) {
      throw new Error('End time is required');
    }
    if (formData.startTime >= formData.endTime) {
      throw new Error('End time must be after start time');
    }
  }

  /**
   * Process meet link - convert Meet ID to full URL if needed
   */
  private processMeetLink(meetLink: string | null): string | null {
    if (!meetLink || !meetLink.trim()) {
      return null;
    }

    const trimmed = meetLink.trim();

    // If already a full URL, return as is
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // Assume it's a Meet ID, convert to full URL
    const meetId = trimmed.replace(/[^a-z0-9-]/gi, '');
    if (meetId) {
      return `https://meet.google.com/${meetId}`;
    }

    return null;
  }
}

