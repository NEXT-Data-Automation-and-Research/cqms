/**
 * Application Layer - Event Controller
 * Main orchestrator that coordinates between layers
 */

import { getAuthenticatedSupabase } from '../../../utils/authenticated-supabase.js';
import { SupabaseClientAdapter } from '../../../infrastructure/database/supabase/supabase-client.adapter.js';
import { EventRepository } from '../infrastructure/event-repository.js';
import { EventStateManager } from './event-state.js';
import { EventService } from './event-service.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';
import type { Event, User, EventFormData } from '../domain/types.js';

export class EventController {
  private repository: EventRepository | null = null;
  private stateManager: EventStateManager;
  private service: EventService | null = null;
  private userEmail: string = '';
  private isSuperAdmin: boolean = false;

  constructor() {
    this.stateManager = new EventStateManager();
  }

  /**
   * Get or create the repository (lazy initialization with authentication)
   * ✅ SECURITY: Verifies authentication before creating repository
   */
  private async getRepository(): Promise<EventRepository> {
    if (!this.repository) {
      // ✅ SECURITY: Verify authentication first
      await getAuthenticatedSupabase(); // This will throw if not authenticated
      
      // Get base Supabase client (authentication already verified above)
      const { getSupabase } = await import('../../../utils/supabase-init.js');
      const baseClient = getSupabase();
      if (!baseClient) {
        throw new Error('Supabase client not initialized');
      }
      
      // Create adapter from base client (auth already verified)
      const db = new SupabaseClientAdapter(baseClient);
      this.repository = new EventRepository(db);
      this.service = new EventService(this.repository);
    }
    return this.repository;
  }

  /**
   * Initialize the event management feature
   */
  async initialize(): Promise<void> {
    try {
      logInfo('[EventController] Initializing event management...');
      
      // Get current user info
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      this.userEmail = userInfo.email || '';
      this.isSuperAdmin = userInfo.role === 'Super Admin';

      if (!this.userEmail) {
        throw new Error('User email not found');
      }

      // Get repository (will verify auth)
      await this.getRepository();

      // Load initial data
      await this.loadEvents();
      await this.loadUsers();

      logInfo('[EventController] Event management initialized');
    } catch (error) {
      logError('[EventController] Error initializing:', error);
      this.stateManager.setError(error instanceof Error ? error.message : 'Failed to initialize');
      throw error;
    }
  }

  /**
   * Load events
   */
  async loadEvents(): Promise<void> {
    try {
      this.stateManager.setLoading(true);
      const repository = await this.getRepository();
      const service = this.service!;
      
      const events = await service.loadEvents(this.userEmail, this.isSuperAdmin);
      this.stateManager.setEvents(events);
      this.stateManager.setError(null);
    } catch (error) {
      logError('[EventController] Error loading events:', error);
      this.stateManager.setError(error instanceof Error ? error.message : 'Failed to load events');
    } finally {
      this.stateManager.setLoading(false);
    }
  }

  /**
   * Load users
   */
  async loadUsers(): Promise<void> {
    try {
      const repository = await this.getRepository();
      const service = this.service!;
      
      const users = await service.loadUsers();
      this.stateManager.setUsers(users);
    } catch (error) {
      logError('[EventController] Error loading users:', error);
    }
  }

  /**
   * Create event
   */
  async createEvent(formData: EventFormData): Promise<Event> {
    try {
      this.stateManager.setLoading(true);
      const service = this.service!;
      
      const event = await service.createEvent(formData, this.userEmail);
      await this.loadEvents(); // Reload events
      this.stateManager.setError(null);
      return event;
    } catch (error) {
      logError('[EventController] Error creating event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create event';
      this.stateManager.setError(errorMessage);
      throw error;
    } finally {
      this.stateManager.setLoading(false);
    }
  }

  /**
   * Update event
   */
  async updateEvent(eventId: string, formData: EventFormData): Promise<Event> {
    try {
      this.stateManager.setLoading(true);
      const service = this.service!;
      
      // Check permissions
      const event = this.stateManager.getState().events.find(e => e.id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      if (!service.canUserModifyEvent(event, this.userEmail, this.isSuperAdmin)) {
        throw new Error('You can only edit events that you created');
      }
      
      const updatedEvent = await service.updateEvent(eventId, formData);
      await this.loadEvents(); // Reload events
      this.stateManager.setError(null);
      return updatedEvent;
    } catch (error) {
      logError('[EventController] Error updating event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update event';
      this.stateManager.setError(errorMessage);
      throw error;
    } finally {
      this.stateManager.setLoading(false);
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      this.stateManager.setLoading(true);
      const service = this.service!;
      
      // Check permissions
      const event = this.stateManager.getState().events.find(e => e.id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      if (!service.canUserModifyEvent(event, this.userEmail, this.isSuperAdmin)) {
        throw new Error('You can only delete events that you created');
      }
      
      await service.deleteEvent(eventId);
      await this.loadEvents(); // Reload events
      this.stateManager.setError(null);
    } catch (error) {
      logError('[EventController] Error deleting event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
      this.stateManager.setError(errorMessage);
      throw error;
    } finally {
      this.stateManager.setLoading(false);
    }
  }

  /**
   * Get state manager
   */
  getStateManager(): EventStateManager {
    return this.stateManager;
  }

  /**
   * Get current user email
   */
  getUserEmail(): string {
    return this.userEmail;
  }

  /**
   * Check if user is Super Admin
   */
  isUserSuperAdmin(): boolean {
    return this.isSuperAdmin;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    // Cleanup if needed
  }
}

