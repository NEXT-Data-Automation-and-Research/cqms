/**
 * Filter Manager
 * Manages user filtering logic
 */

import type { User, UserFilters } from '../domain/entities.js';
import { userManagementState } from './state.js';

export class FilterManager {
  /**
   * Apply filters to users
   */
  applyFilters(users: User[], filters: UserFilters): User[] {
    return users.filter(user => {
      // Search filter
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = !searchTerm || 
        (user.name && user.name.toLowerCase().includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm)) ||
        (user.designation && user.designation.toLowerCase().includes(searchTerm)) ||
        (user.team && user.team.toLowerCase().includes(searchTerm)) ||
        (user.team_supervisor && user.team_supervisor.toLowerCase().includes(searchTerm)) ||
        (user.quality_mentor && user.quality_mentor.toLowerCase().includes(searchTerm));

      // Role filter
      const matchesRole = !filters.role || user.role === filters.role;

      // Department filter
      const matchesDepartment = !filters.department || user.department === filters.department;

      // Status filter
      const matchesStatus = !filters.status || 
        (filters.status === 'true' && user.is_active) ||
        (filters.status === 'false' && !user.is_active);

      return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
    });
  }

  private debounceTimer: number | null = null;

  /**
   * Setup filter event listeners
   */
  setupFilterListeners(): void {
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    const statusFilter = document.getElementById('statusFilter');

    const handleFilterChange = () => {
      const filters: UserFilters = {
        search: (searchInput as HTMLInputElement)?.value || '',
        role: (roleFilter as HTMLSelectElement)?.value || '',
        department: (departmentFilter as HTMLSelectElement)?.value || '',
        status: (statusFilter as HTMLSelectElement)?.value || ''
      };

      userManagementState.setFilters(filters);
    };

    // Debounced handler for search input (300ms delay)
    const handleSearchInput = () => {
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = window.setTimeout(() => {
        handleFilterChange();
        this.debounceTimer = null;
      }, 300);
    };

    // Immediate handler for select dropdowns
    searchInput?.addEventListener('input', handleSearchInput);
    roleFilter?.addEventListener('change', handleFilterChange);
    departmentFilter?.addEventListener('change', handleFilterChange);
    statusFilter?.addEventListener('change', handleFilterChange);
  }
}

