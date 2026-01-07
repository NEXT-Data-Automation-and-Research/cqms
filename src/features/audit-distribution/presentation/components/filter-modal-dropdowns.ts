/**
 * Filter Modal Dropdowns
 * Helper functions for creating dropdowns in the filter modal
 */

import type { Employee } from '../../domain/types.js';
import { CustomDropdown, type DropdownSection } from './custom-dropdown.js';

export function createGroupByDropdown(container: HTMLElement, selectedValue?: string): CustomDropdown {
  const sections: DropdownSection[] = [{
    options: [
      { id: 'none', label: 'None', value: 'none' },
      { id: 'channel', label: 'Channel', value: 'channel' },
      { id: 'team', label: 'Team', value: 'team' },
      { id: 'quality_mentor', label: 'Quality Mentor', value: 'quality_mentor' },
      { id: 'team_supervisor', label: 'Team Supervisor', value: 'team_supervisor' },
      { id: 'department', label: 'Department', value: 'department' },
      { id: 'country', label: 'Country', value: 'country' }
    ]
  }];
  
  return new CustomDropdown(container, {
    id: 'modalGroupBy',
    label: 'Group',
    placeholder: 'None',
    sections,
    selectedValue: selectedValue || 'none',
    onSelect: () => {}
  });
}

export function createSimpleDropdown(
  container: HTMLElement,
  id: string,
  label: string,
  placeholder: string,
  options: string[],
  selectedValue?: string
): CustomDropdown {
  const sections: DropdownSection[] = [{
    options: [
      { id: 'all', label: `All ${label}s`, value: '' },
      ...options.map(opt => ({ id: opt, label: opt, value: opt }))
    ]
  }];
  
  return new CustomDropdown(container, {
    id,
    label,
    placeholder,
    sections,
    selectedValue: selectedValue || '',
    onSelect: () => {}
  });
}

export function createSupervisorDropdown(
  container: HTMLElement,
  id: string,
  label: string,
  placeholder: string,
  supervisors: string[],
  employees: Employee[],
  selectedValue?: string
): CustomDropdown {
  const supervisorMap = new Map<string, Employee>();
  supervisors.forEach(supervisorEmail => {
    const emp = employees.find(e => e.email === supervisorEmail);
    if (emp && !supervisorMap.has(supervisorEmail)) {
      supervisorMap.set(supervisorEmail, emp);
    }
  });
  
  const sections: DropdownSection[] = [{
    options: [
      { id: 'all', label: `All ${label}s`, value: '' },
      ...supervisors.map(s => {
        const emp = supervisorMap.get(s);
        const avatarUrl = emp?.avatar_url;
        const hasAvatar = avatarUrl && avatarUrl.trim() !== '' && avatarUrl !== 'null' && avatarUrl !== 'undefined';
        const initials = emp?.name 
          ? emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          : s.substring(0, 2).toUpperCase();
        
        return {
          id: s,
          label: s,
          value: s,
          icon: hasAvatar 
            ? `<img src="${escapeHtml(avatarUrl!)}" alt="${escapeHtml(s)}" class="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" /><div class="hidden w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">${initials}</div>`
            : `<div class="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">${initials}</div>`
        };
      })
    ]
  }];
  
  return new CustomDropdown(container, {
    id,
    label,
    placeholder,
    sections,
    selectedValue: selectedValue || '',
    onSelect: () => {}
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

