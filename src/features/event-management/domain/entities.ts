/**
 * Domain Layer - Event Management Entities
 * Domain entities and interfaces
 */

import type { Event, User, EventType, ViewMode, EventFilter } from './types.js';

export interface EventEntity extends Event {}

export interface UserEntity extends User {}

export interface EventState {
  events: Event[];
  users: User[];
  currentFilter: EventFilter;
  currentView: ViewMode;
  currentMonth: number;
  currentYear: number;
  selectedParticipants: User[];
  editingEventId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface QuickAddGroup {
  type: 'channel' | 'team' | 'supervisor' | 'quality_mentor' | 'country' | 'role';
  value: string;
  memberCount: number;
}

export { Event, User, EventType, ViewMode, EventFilter };

