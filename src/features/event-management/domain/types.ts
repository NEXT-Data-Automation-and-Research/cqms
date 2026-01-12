/**
 * Domain Layer - Event Management Types
 * Pure TypeScript types with no external dependencies
 */

export type EventType = 'session' | 'meeting' | 'feedback' | 'training';

export interface Event {
  id: string;
  title: string;
  type: EventType;
  date: string;
  start_time: string;
  end_time: string;
  description: string | null;
  participants: string[] | null;
  meet_link: string | null;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface User {
  email: string;
  name: string;
  role?: string;
  department?: string;
  channel?: string;
  team?: string;
  team_supervisor?: string;
  quality_mentor?: string;
  country?: string;
}

export interface EventFormData {
  title: string;
  type: EventType;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  participants: string[];
  meetLink: string | null;
}

export interface CalendarDay {
  day: number;
  isOtherMonth: boolean;
  isToday: boolean;
  events: Event[];
}

export type ViewMode = 'list' | 'calendar';
export type EventFilter = 'all' | EventType;

