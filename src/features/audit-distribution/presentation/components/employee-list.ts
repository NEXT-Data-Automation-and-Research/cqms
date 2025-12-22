/**
 * Employee List Component
 * Displays list of employees with selection and grouping
 */

import type { Employee, EmployeeAuditStats } from '../../domain/types.js';

export interface EmployeeListConfig {
  employees: Employee[];
  selectedEmployees: Set<string>;
  auditStats: Map<string, EmployeeAuditStats>;
  groupBy?: 'none' | 'channel' | 'team' | 'quality_mentor' | 'team_supervisor' | 'department' | 'country';
  onEmployeeSelect: (email: string, selected: boolean) => void;
  onEmployeeClick?: (email: string) => void;
}

export class EmployeeList {
  private container: HTMLElement;
  private config: EmployeeListConfig;

  constructor(container: HTMLElement, config: EmployeeListConfig) {
    this.container = container;
    this.config = config;
    this.render();
  }

  private render(): void {
    const { employees, selectedEmployees, auditStats, groupBy = 'none' } = this.config;

    if (employees.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-12 px-4">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <svg class="w-8 h-8 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </div>
          <p class="text-base font-bold text-white mb-2">No employees found</p>
          <p class="text-sm text-white/60">Try adjusting your filters to see more results</p>
        </div>
      `;
      return;
    }

    if (groupBy === 'none') {
      this.renderFlatList(employees, selectedEmployees, auditStats);
    } else {
      this.renderGroupedList(employees, selectedEmployees, auditStats, groupBy);
    }
  }

  private renderFlatList(
    employees: Employee[],
    selectedEmployees: Set<string>,
    auditStats: Map<string, EmployeeAuditStats>
  ): void {
    const sortedEmployees = [...employees].sort((a, b) => {
      const statsA = auditStats.get(a.email) || { assigned: 0, completed: 0 };
      const statsB = auditStats.get(b.email) || { assigned: 0, completed: 0 };
      if (statsA.assigned !== statsB.assigned) {
        return statsA.assigned - statsB.assigned;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    const items = sortedEmployees.map(emp => this.renderEmployeeItem(emp, selectedEmployees, auditStats)).join('');

    this.container.innerHTML = `
      <div class="flex flex-col w-full gap-2.5">
        ${items}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderGroupedList(
    employees: Employee[],
    selectedEmployees: Set<string>,
    auditStats: Map<string, EmployeeAuditStats>,
    groupBy: string
  ): void {
    const groups = new Map<string, Employee[]>();

    employees.forEach(emp => {
      const groupKey = (emp[groupBy as keyof Employee] as string) || 'Unassigned';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(emp);
    });

    const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    const groupElements = sortedGroups.map(([groupName, groupEmployees]) => {
      const sortedEmployees = [...groupEmployees].sort((a, b) => {
        const statsA = auditStats.get(a.email) || { assigned: 0, completed: 0 };
        const statsB = auditStats.get(b.email) || { assigned: 0, completed: 0 };
        if (statsA.assigned !== statsB.assigned) {
          return statsA.assigned - statsB.assigned;
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      const allSelected = sortedEmployees.every(emp => selectedEmployees.has(emp.email));
      const items = sortedEmployees.map(emp => this.renderEmployeeItem(emp, selectedEmployees, auditStats)).join('');

      return `
        <div class="border border-white/10 rounded-xl overflow-hidden mb-3 bg-white/5 backdrop-blur-sm">
          <div class="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 flex items-center justify-between cursor-pointer hover:from-primary/15 hover:via-primary/10 transition-all border-b border-white/10" onclick="this.dispatchEvent(new CustomEvent('toggleGroup', { detail: '${groupName}' }))">
            <div class="flex items-center gap-3 flex-1">
              <div class="relative">
                <input
                  type="checkbox"
                  class="w-4 h-4 cursor-pointer accent-primary rounded border-2 border-white/30 bg-white/10 checked:bg-primary checked:border-primary transition-all"
                  ${allSelected ? 'checked' : ''}
                  onclick="event.stopPropagation(); this.dispatchEvent(new CustomEvent('toggleGroupSelection', { detail: { group: '${groupName}', checked: this.checked } }))"
                />
                ${allSelected ? `
                  <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                ` : ''}
              </div>
              <h3 class="text-sm font-bold text-white m-0">${this.escapeHtml(groupName)}</h3>
              <span class="bg-primary text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">${sortedEmployees.length}</span>
            </div>
            <svg class="w-5 h-5 text-white/60 transition-transform flex-shrink-0 group-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div class="group-content bg-white/5 hidden p-2" data-group="${this.escapeHtml(groupName)}">
            <div class="flex flex-col gap-2">
              ${items}
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="flex flex-col w-full gap-2">
        ${groupElements}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderEmployeeItem(
    employee: Employee,
    selectedEmployees: Set<string>,
    auditStats: Map<string, EmployeeAuditStats>
  ): string {
    const isSelected = selectedEmployees.has(employee.email);
    const stats = auditStats.get(employee.email) || { assigned: 0, completed: 0 };
    const initials = employee.name
      ? employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';

    // Channel icon
    const channelIcon = this.getChannelIcon(employee.channel || '');
    
    // Status indicator
    const hasPendingAudits = stats.assigned > stats.completed;
    const allCompleted = stats.assigned > 0 && stats.assigned === stats.completed;

    return `
      <div
        class="employee-item group flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
          isSelected 
            ? 'bg-primary/15 border-primary/40 shadow-sm shadow-primary/20' 
            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/30'
        }"
        data-email="${this.escapeHtml(employee.email)}"
        onclick="this.dispatchEvent(new CustomEvent('employeeClick', { detail: '${this.escapeHtml(employee.email)}' }))"
      >
        <!-- Checkbox -->
        <div class="relative flex-shrink-0">
          <input
            type="checkbox"
            class="employee-checkbox w-5 h-5 cursor-pointer accent-primary flex-shrink-0 rounded border-2 border-white/30 bg-white/10 checked:bg-primary checked:border-primary transition-all"
            data-email="${this.escapeHtml(employee.email)}"
            ${isSelected ? 'checked' : ''}
            onclick="event.stopPropagation(); this.dispatchEvent(new CustomEvent('employeeSelect', { detail: { email: '${this.escapeHtml(employee.email)}', checked: this.checked } }))"
          />
          ${isSelected ? `
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" class="text-primary">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          ` : ''}
        </div>

        <!-- Avatar -->
        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-md ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent' : ''}">
          ${initials}
        </div>

        <!-- Employee Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-sm font-bold text-white m-0 truncate">${this.escapeHtml(employee.name || 'Unknown')}</p>
            ${hasPendingAudits ? `
              <span class="w-2 h-2 rounded-full bg-warning animate-pulse flex-shrink-0" title="Has pending audits"></span>
            ` : allCompleted ? `
              <span class="w-2 h-2 rounded-full bg-success flex-shrink-0" title="All audits completed"></span>
            ` : ''}
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            ${channelIcon ? `
              <div class="flex items-center gap-1 text-xs text-white/70">
                ${channelIcon}
                <span class="font-medium">${this.escapeHtml(employee.channel || '-')}</span>
              </div>
            ` : ''}
            ${employee.team ? `
              <span class="text-xs text-white/60">•</span>
              <span class="text-xs text-white/70 font-medium">${this.escapeHtml(employee.team)}</span>
            ` : ''}
            ${employee.designation ? `
              <span class="text-xs text-white/60">•</span>
              <span class="text-xs text-white/70 font-medium">${this.escapeHtml(employee.designation)}</span>
            ` : ''}
          </div>
        </div>

        <!-- Stats -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="flex flex-col items-end gap-1">
              <div class="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-white/60">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
                <span class="text-xs text-white/60 font-medium">Assigned</span>
                <span class="text-xs font-bold text-primary min-w-[1.5rem] text-right">${stats.assigned}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-white/60">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span class="text-xs text-white/60 font-medium">Completed</span>
                <span class="text-xs font-bold ${stats.completed > 0 ? 'text-success' : 'text-white/50'} min-w-[1.5rem] text-right">${stats.completed}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getChannelIcon(channel: string): string {
    const channelLower = channel.toLowerCase();
    if (channelLower.includes('email')) {
      return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      `;
    } else if (channelLower.includes('chat')) {
      return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      `;
    } else if (channelLower.includes('phone')) {
      return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      `;
    }
    return '';
  }

  private attachEventListeners(): void {
    const employeeSelects = this.container.querySelectorAll('[data-email]');
    employeeSelects.forEach(el => {
      el.addEventListener('employeeSelect', ((e: CustomEvent) => {
        const { email, checked } = e.detail;
        this.config.onEmployeeSelect(email, checked);
      }) as EventListener);
    });

    const employeeClicks = this.container.querySelectorAll('.employee-item');
    employeeClicks.forEach(el => {
      el.addEventListener('employeeClick', ((e: CustomEvent) => {
        const email = e.detail;
        if (this.config.onEmployeeClick) {
          this.config.onEmployeeClick(email);
        }
      }) as EventListener);
    });

    const toggleGroups = this.container.querySelectorAll('[onclick*="toggleGroup"]');
    toggleGroups.forEach(el => {
      el.addEventListener('toggleGroup', ((e: CustomEvent) => {
        const groupName = e.detail;
        const content = this.container.querySelector(`[data-group="${groupName}"]`);
        const icon = el.querySelector('.group-toggle-icon') as HTMLElement;
        if (content) {
          const isHidden = content.classList.contains('hidden');
          content.classList.toggle('hidden');
          if (icon) {
            icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
          }
        }
      }) as EventListener);
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  update(config: Partial<EmployeeListConfig>): void {
    this.config = { ...this.config, ...config };
    this.render();
  }
}

