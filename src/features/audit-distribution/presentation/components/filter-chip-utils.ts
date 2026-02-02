/**
 * Filter Chip Utilities
 * Helper functions for filter chip generation and management
 */

import type { Employee, FilterOptions } from '../../domain/types.js';
import { filterValuesToArray } from '../../domain/types.js';

export interface FilterChip {
  key: string;
  label: string;
  value: string;
  type: 'filter' | 'groupBy';
}

function chipValue(val: string | string[] | undefined): string {
  const arr = filterValuesToArray(val);
  return arr.length ? arr.join(', ') : '';
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

  const roleVal = chipValue(filters.role);
  if (roleVal) chips.push({ key: 'role', label: 'Role', value: roleVal, type: 'filter' });
  const channelVal = chipValue(filters.channel);
  if (channelVal) chips.push({ key: 'channel', label: 'Channel', value: channelVal, type: 'filter' });
  const teamVal = chipValue(filters.team);
  if (teamVal) chips.push({ key: 'team', label: 'Team', value: teamVal, type: 'filter' });
  const deptVal = chipValue(filters.department);
  if (deptVal) chips.push({ key: 'department', label: 'Department', value: deptVal, type: 'filter' });
  const countryVal = chipValue(filters.country);
  if (countryVal) chips.push({ key: 'country', label: 'Country', value: countryVal, type: 'filter' });
  if (filters.is_active && filters.is_active !== 'all') {
    chips.push({ key: 'is_active', label: 'Status', value: filters.is_active === 'active' ? 'Active' : 'Inactive', type: 'filter' });
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

