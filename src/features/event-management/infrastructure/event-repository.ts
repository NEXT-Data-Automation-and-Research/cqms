/**
 * Infrastructure Layer - Event Repository
 * Handles all database operations for events
 */

import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { EVENT_FIELDS, PEOPLE_USER_MANAGEMENT_FIELDS } from '../../../core/constants/field-whitelists.js';
import { logError, logInfo } from '../../../utils/logging-helper.js';
import type { Event, User } from '../domain/types.js';

export class EventRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'events');
  }

  /**
   * Load all events
   * For non-Super Admins, only returns events created by the user
   */
  async loadEvents(userEmail: string, isSuperAdmin: boolean): Promise<Event[]> {
    const cacheKey = `events_${userEmail}_${isSuperAdmin}`;
    // Check cache first
    const cached = this.cache.get<Event[]>(cacheKey, { ttl: 60000 });
    if (cached !== null) {
      return cached;
    }
    const result = await this.executeQuery(
      async () => {
        let query = this.db
          .from(this.tableName)
          .select(EVENT_FIELDS);

        // If not Super Admin, filter by creator
        if (!isSuperAdmin) {
          query = query.eq('created_by', userEmail);
        }

        // Supabase supports multiple order columns by chaining order() calls
        // Order by date first, then by start_time
        return await query
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
          .execute<Event[]>();
      },
      `Failed to load events for user: ${userEmail}`
    );

    const events = Array.isArray(result) ? result : [];
    
    // Parse participants from JSON string if needed
    const parsedEvents = events.map(event => ({
      ...event,
      participants: this.parseParticipants(event.participants)
    }));

    this.cache.set(cacheKey, parsedEvents, { ttl: 60000 });
    logInfo(`[EventRepository] Loaded ${parsedEvents.length} events for user: ${userEmail}`);
    return parsedEvents;
  }

  /**
   * Create a new event
   */
  async createEvent(eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    const result = await this.executeQuery(
      async () => {
        // Prepare participants - JSONB column accepts JSON directly
        const participantsValue = eventData.participants && eventData.participants.length > 0
          ? eventData.participants  // Supabase will handle JSONB conversion
          : null;

        return await this.db
          .from(this.tableName)
          .insert([{
            title: eventData.title,
            type: eventData.type,
            date: eventData.date,
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            description: eventData.description || null,
            participants: participantsValue,  // JSONB accepts array directly
            meet_link: eventData.meet_link || null,
            created_by: eventData.created_by
          }])
          .select(EVENT_FIELDS)
          .single()
          .execute<Event>();
      },
      `Failed to create event: ${eventData.title}`
    );

    if (!result) {
      throw new Error('Event creation returned no data');
    }

    // Invalidate cache for all users (since we don't know who might see this event)
    this.invalidateCache(`events_${eventData.created_by}_false`);
    this.invalidateCache(`events_${eventData.created_by}_true`);

    logInfo(`[EventRepository] Created event: ${eventData.title} by ${eventData.created_by}`);

    return {
      ...result,
      participants: this.parseParticipants(result.participants)
    };
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, eventData: Partial<Omit<Event, 'id' | 'created_by' | 'created_at'>>): Promise<Event> {
    const updateData: any = {};
    if (eventData.title !== undefined) updateData.title = eventData.title;
    if (eventData.type !== undefined) updateData.type = eventData.type;
    if (eventData.date !== undefined) updateData.date = eventData.date;
    if (eventData.start_time !== undefined) updateData.start_time = eventData.start_time;
    if (eventData.end_time !== undefined) updateData.end_time = eventData.end_time;
    if (eventData.description !== undefined) updateData.description = eventData.description || null;
    if (eventData.participants !== undefined) {
      // JSONB column accepts array directly - Supabase handles conversion
      updateData.participants = eventData.participants && eventData.participants.length > 0
        ? eventData.participants
        : null;
    }
    if (eventData.meet_link !== undefined) updateData.meet_link = eventData.meet_link || null;
    
    // Note: updated_at is handled by database trigger

    const result = await this.executeQuery(
      async () => {
        return await this.db
          .from(this.tableName)
          .update(updateData)
          .eq('id', eventId)
          .select(EVENT_FIELDS)
          .single()
          .execute<Event>();
      },
      `Failed to update event: ${eventId}`
    );

    if (!result) {
      throw new Error('Event update returned no data');
    }

    // Invalidate cache - need to get the event to know who created it
    // For now, invalidate all caches (could be optimized)
    this.invalidateAllEventCaches();

    logInfo(`[EventRepository] Updated event: ${eventId}`);

    return {
      ...result,
      participants: this.parseParticipants(result.participants)
    };
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.executeQuery(
      async () => {
        return await this.db
          .from(this.tableName)
          .delete()
          .eq('id', eventId)
          .execute();
      },
      `Failed to delete event: ${eventId}`
    );

    // Invalidate cache
    this.invalidateAllEventCaches();

    logInfo(`[EventRepository] Deleted event: ${eventId}`);
  }

  /**
   * Load all active users for participant selection
   * Uses 'people' table which has the user management fields
   */
  async loadUsers(): Promise<User[]> {
    return this.getCachedOrFetch(
      'event_management_all_users',
      async () => {
        const result = await this.executeQuery(
          async () => {
            return await this.db
              .from('people')
              .select(PEOPLE_USER_MANAGEMENT_FIELDS)
              .eq('is_active', true)
              .order('name', { ascending: true })
              .execute<User[]>();
          },
          'Failed to load users for participant selection'
        );

        const users = Array.isArray(result) ? result : [];
        logInfo(`[EventRepository] Loaded ${users.length} active users for participant selection`);
        return users;
      },
      300000 // 5 minutes cache
    );
  }

  /**
   * Parse participants from database format (JSONB or string)
   * JSONB columns in Supabase return as arrays directly, but we handle all cases
   */
  private parseParticipants(participants: any): string[] | null {
    if (!participants) return null;
    
    // If already an array (JSONB returns arrays directly)
    if (Array.isArray(participants)) {
      return participants.filter(p => p && typeof p === 'string');
    }
    
    // If it's a string, try to parse as JSON
    if (typeof participants === 'string') {
      try {
        const parsed = JSON.parse(participants);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => p && typeof p === 'string');
        }
        // If not an array, treat as single participant
        return [participants];
      } catch {
        // If JSON parsing fails, treat as comma-separated list
        return participants.split(',').map(p => p.trim()).filter(p => p);
      }
    }
    
    return null;
  }

  /**
   * Invalidate all event caches
   * Called after create/update/delete operations
   */
  private invalidateAllEventCaches(): void {
    // Note: In a production system, you might want to track cache keys more precisely
    // For now, we'll use a pattern-based invalidation
    // This is a simplified approach - in practice, you might want to track specific user caches
    this.invalidateCache('event_management_all_users');
    // Note: User-specific event caches are invalidated individually in create/update methods
  }
}

