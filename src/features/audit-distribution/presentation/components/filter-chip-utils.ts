/**
 * Filter Chip Utilities
 * Helper functions for filter chip generation and management
 */

import type { Employee, FilterOptions } from '../../domain/types.js';

export interface FilterChip {
  key: string;
  label: string;
  value: string;
  type: 'filter' | 'groupBy';
}

export function getActiveFilterChips(filters: FilterOptions, employees: Employee[]): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.groupBy && filters.groupBy !== 'none') {
    const groupByLabels: Record<string, string> = {
      'channel': 'Channel',
      'team': 'Team',
      'quality_mentor': 'Quality Mentor',
      'team_supervisor': 'Team Supervisor',
      'department': 'Department',
      'country': 'Country'
    };
    chips.push({
      key: 'groupBy',
      label: 'Group By',
      value: groupByLabels[filters.groupBy] || filters.groupBy,
      type: 'groupBy'
    });
  }

  if (filters.channel && filters.channel.trim() !== '') {
    chips.push({ key: 'channel', label: 'Channel', value: filters.channel.trim(), type: 'filter' });
  }
  if (filters.team && filters.team.trim() !== '') {
    chips.push({ key: 'team', label: 'Team', value: filters.team.trim(), type: 'filter' });
  }
  if (filters.department && filters.department.trim() !== '') {
    chips.push({ key: 'department', label: 'Department', value: filters.department.trim(), type: 'filter' });
  }
  if (filters.country && filters.country.trim() !== '') {
    chips.push({ key: 'country', label: 'Country', value: filters.country.trim(), type: 'filter' });
  }
  if (filters.qualitySupervisor) {
    const emp = employees.find(e => e.email === filters.qualitySupervisor);
    chips.push({
      key: 'qualitySupervisor',
      label: 'Quality Mentor',
      value: emp?.name || filters.qualitySupervisor,
      type: 'filter'
    });
  }
  if (filters.teamSupervisor) {
    const emp = employees.find(e => e.email === filters.teamSupervisor);
    chips.push({
      key: 'teamSupervisor',
      label: 'Team Supervisor',
      value: emp?.name || filters.teamSupervisor,
      type: 'filter'
    });
  }

  return chips;
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

