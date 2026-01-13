/**
 * Events Loader Module
 * Handles loading calendar events from the database
 */

import type { Event, User } from '../types.js';
import { logError } from '../../../../utils/logging-helper.js';
import { getAuthenticatedSupabase } from '../../../../utils/authenticated-supabase.js';

export class EventsLoader {
  async loadUpcomingEvents(currentUser: User): Promise<Event[]> {
    try {
      const supabase = await getAuthenticatedSupabase();
      const currentUserEmail = (currentUser.email || '').toLowerCase().trim();
      const isSuperAdmin = currentUser.role === 'Super Admin';

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);

      let query = supabase
        .from('events')
        .select('id, title, description, date, start_time, end_time, type, created_by, participants, created_at, updated_at')
        .gte('date', todayStr);

    if (!isSuperAdmin) {
      const { data: allEvents, error: allError } = await query;
      
      if (allError) {
        logError('Error loading events:', allError);
        return [];
      }

      const createdEvents = (allEvents || []).filter((event: Event) => {
        const createdBy = (event.created_by || '').toLowerCase().trim();
        return createdBy === currentUserEmail;
      });

      const participantEvents = (allEvents || []).filter((event: Event) => {
        if (!event.participants) return false;
        
        let participantEmails: string[] = [];
        if (Array.isArray(event.participants)) {
          participantEmails = event.participants;
        } else if (typeof event.participants === 'string') {
          try {
            const parsed = JSON.parse(event.participants);
            participantEmails = Array.isArray(parsed) ? parsed : [event.participants];
          } catch {
            participantEmails = event.participants.split(',').map((e: string) => e.trim()).filter((e: string) => e);
          }
        }
        
        return participantEmails.some((email: string) => email.toLowerCase().trim() === currentUserEmail);
      });

      const combinedEvents = [...createdEvents, ...participantEvents];
      const uniqueEvents = combinedEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      );

      const upcomingEvents = uniqueEvents.filter(event => {
        const eventDate = new Date(event.date || '');
        const eventDateStr = eventDate.toISOString().split('T')[0];
        
        if (eventDateStr === todayStr) {
          if (!event.start_time) return true;
          return event.start_time > currentTime;
        }
        return eventDateStr > todayStr;
      });

      return upcomingEvents;
    }

    const { data, error } = await query
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(20);

    if (error) {
      logError('Error loading events:', error);
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return [];
      }
      return [];
    }

    const events = data || [];
    
    const upcomingEvents = events.filter((event: Event) => {
      const eventDate = new Date(event.date || '');
      const eventDateStr = eventDate.toISOString().split('T')[0];
      
      if (eventDateStr === todayStr) {
        if (!event.start_time) return true;
        return event.start_time > currentTime;
      }
      return eventDateStr > todayStr;
    });

    return upcomingEvents;
    } catch (error) {
      logError('Error loading events:', error);
      return [];
    }
  }
}

