/**
 * User Management State
 * Centralized state management for user management feature
 */

import type { User, UserStatistics, UserFilters, Channel, IntercomAdmin } from '../domain/entities.js';

export interface UserManagementState {
  allUsers: User[];
  filteredUsers: User[];
  statistics: UserStatistics | null;
  filters: UserFilters;
  selectedUsers: Set<string>;
  channels: Channel[];
  intercomAdmins: IntercomAdmin[];
  isLoading: boolean;
  error: string | null;
}

class UserManagementStateManager {
  private state: UserManagementState = {
    allUsers: [],
    filteredUsers: [],
    statistics: null,
    filters: {
      search: '',
      role: '',
      department: '',
      status: ''
    },
    selectedUsers: new Set(),
    channels: [],
    intercomAdmins: [],
    isLoading: false,
    error: null
  };

  private listeners: Set<() => void> = new Set();

  /**
   * Get current state
   */
  getState(): UserManagementState {
    return { ...this.state };
  }

  /**
   * Set all users
   */
  setAllUsers(users: User[]): void {
    this.state.allUsers = users;
    this.notifyListeners();
  }

  /**
   * Set filtered users
   */
  setFilteredUsers(users: User[]): void {
    // Check if filtered users actually changed to prevent unnecessary updates
    const currentEmails = this.state.filteredUsers.map(u => u.email).sort().join(',');
    const newEmails = users.map(u => u.email).sort().join(',');
    
    if (currentEmails !== newEmails || this.state.filteredUsers.length !== users.length) {
      this.state.filteredUsers = users;
      this.notifyListeners();
    }
  }

  /**
   * Set statistics
   */
  setStatistics(statistics: UserStatistics): void {
    this.state.statistics = statistics;
    this.notifyListeners();
  }

  /**
   * Set filters
   */
  setFilters(filters: Partial<UserFilters>): void {
    this.state.filters = { ...this.state.filters, ...filters };
    this.notifyListeners();
  }

  /**
   * Toggle user selection
   */
  toggleUserSelection(email: string, selected: boolean): void {
    if (selected) {
      this.state.selectedUsers.add(email);
    } else {
      this.state.selectedUsers.delete(email);
    }
    this.notifyListeners();
  }

  /**
   * Select all filtered users
   */
  selectAllFilteredUsers(): void {
    this.state.filteredUsers.forEach(user => {
      if (user.email) {
        this.state.selectedUsers.add(user.email);
      }
    });
    this.notifyListeners();
  }

  /**
   * Deselect all filtered users
   */
  deselectAllFilteredUsers(): void {
    const filteredEmails = new Set(this.state.filteredUsers.map(u => u.email).filter(Boolean));
    this.state.selectedUsers.forEach(email => {
      if (filteredEmails.has(email)) {
        this.state.selectedUsers.delete(email);
      }
    });
    this.notifyListeners();
  }

  /**
   * Clear all selections
   */
  clearSelections(): void {
    this.state.selectedUsers.clear();
    this.notifyListeners();
  }

  /**
   * Set channels
   */
  setChannels(channels: Channel[]): void {
    this.state.channels = channels;
    this.notifyListeners();
  }

  /**
   * Set Intercom admins
   */
  setIntercomAdmins(admins: IntercomAdmin[]): void {
    this.state.intercomAdmins = admins;
    this.notifyListeners();
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.state.isLoading = loading;
    this.notifyListeners();
  }

  /**
   * Set error
   */
  setError(error: string | null): void {
    this.state.error = error;
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const userManagementState = new UserManagementStateManager();

