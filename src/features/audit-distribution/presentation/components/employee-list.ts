/**
 * Employee List Component
 * Displays list of employees with selection and grouping
 */

import type { Employee, EmployeeAuditStats } from '../../domain/types.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export interface EmployeeListConfig {
  employees: Employee[];
  selectedEmployees: Set<string>;
  auditStats: Map<string, EmployeeAuditStats>;
  groupBy?: 'none' | 'channel' | 'team' | 'quality_mentor' | 'team_supervisor' | 'department' | 'country';
  /** When true, render as compact table (like Assigned Audits list) */
  compact?: boolean;
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
      safeSetHTML(this.container, `
        <div class="text-center py-12 px-4">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </div>
          <p class="text-base font-bold text-gray-900 mb-2">No employees found</p>
          <p class="text-sm text-gray-600">Try adjusting your filters to see more results</p>
        </div>
      `);
      return;
    }

    if (this.config.compact) {
      this.renderCompactTable(employees, selectedEmployees, auditStats);
    } else if (groupBy === 'none') {
      this.renderFlatList(employees, selectedEmployees, auditStats);
    } else {
      this.renderGroupedList(employees, selectedEmployees, auditStats, groupBy);
    }
  }

  private renderCompactTable(
    employees: Employee[],
    selectedEmployees: Set<string>,
    auditStats: Map<string, EmployeeAuditStats>
  ): void {
    const sortedEmployees = [...employees].sort((a, b) => {
      const statsA = auditStats.get(a.email) || { assigned: 0, completed: 0 };
      const statsB = auditStats.get(b.email) || { assigned: 0, completed: 0 };
      if (statsA.assigned !== statsB.assigned) return statsA.assigned - statsB.assigned;
      return (a.name || '').localeCompare(b.name || '');
    });
    const allSelected = sortedEmployees.length > 0 && sortedEmployees.every(emp => selectedEmployees.has(emp.email));
    const rows = sortedEmployees.map(emp => this.renderCompactTableRow(emp, selectedEmployees, auditStats)).join('');

    safeSetHTML(this.container, `
      <div class="rounded-xl bg-gray-50/50 border border-gray-200 p-4">
        <div class="overflow-x-auto overflow-y-visible">
          <table class="w-full border-collapse text-sm employee-list-table">
            <thead>
              <tr class="bg-gray-100 border-b border-gray-200">
                <th class="text-center p-2 w-4"><input type="checkbox" id="selectAllEmployees" class="cursor-pointer accent-primary w-4 h-4" ${allSelected ? 'checked' : ''} data-action="select-all" /></th>
                <th class="text-left p-2 font-semibold text-gray-700 min-w-[8rem]">Name</th>
                <th class="text-left p-2 font-semibold text-gray-700 min-w-[10rem]">Email</th>
                <th class="text-left p-2 font-semibold text-gray-700 min-w-[6rem]">Channel</th>
                <th class="text-left p-2 font-semibold text-gray-700 min-w-[6rem]">Team</th>
                <th class="text-left p-2 font-semibold text-gray-700 min-w-[6rem]">Department</th>
                <th class="text-left p-2 font-semibold text-gray-700 min-w-[5rem]">Role</th>
                <th class="text-center p-2 font-semibold text-gray-700 w-16">Assigned</th>
                <th class="text-center p-2 font-semibold text-gray-700 w-16">Completed</th>
              </tr>
            </thead>
            <tbody>
              ${sortedEmployees.length === 0 ? `<tr><td colspan="9" class="text-center py-6 text-gray-500">No employees found</td></tr>` : rows}
            </tbody>
          </table>
        </div>
      </div>
    `);
    this.attachImageErrorHandlers();
    this.attachEventListeners();
    this.attachCompactTableListeners();
  }

  private renderCompactTableRow(
    employee: Employee,
    selectedEmployees: Set<string>,
    auditStats: Map<string, EmployeeAuditStats>
  ): string {
    const isSelected = selectedEmployees.has(employee.email);
    const stats = auditStats.get(employee.email) || { assigned: 0, completed: 0 };
    return `
      <tr class="border-b border-gray-200 hover:bg-gray-50/80 transition-colors" data-email="${this.escapeHtml(employee.email)}" data-action="employee-select">
        <td class="p-2 text-center">
          <input type="checkbox" class="employee-checkbox cursor-pointer accent-primary w-4 h-4" data-email="${this.escapeHtml(employee.email)}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation()" />
        </td>
        <td class="p-2 font-medium text-gray-900 whitespace-nowrap">${this.escapeHtml(employee.name || '')}</td>
        <td class="p-2 text-gray-700 text-xs truncate max-w-[12rem]" title="${this.escapeHtml(employee.email || '')}">${this.escapeHtml(employee.email || '')}</td>
        <td class="p-2 text-gray-600 text-xs">${this.escapeHtml(employee.channel || '—')}</td>
        <td class="p-2 text-gray-600 text-xs">${this.escapeHtml(employee.team || '—')}</td>
        <td class="p-2 text-gray-600 text-xs">${this.escapeHtml(employee.department || '—')}</td>
        <td class="p-2 text-gray-600 text-xs">${this.escapeHtml(employee.designation || '—')}</td>
        <td class="p-2 text-center text-xs font-semibold text-primary">${stats.assigned}</td>
        <td class="p-2 text-center text-xs font-semibold ${stats.completed > 0 ? 'text-green-600' : 'text-gray-400'}">${stats.completed}</td>
      </tr>
    `;
  }

  private attachCompactTableListeners(): void {
    const selectAll = this.container.querySelector('#selectAllEmployees');
    if (selectAll) {
      selectAll.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        this.config.employees.forEach(emp => {
          this.config.onEmployeeSelect(emp.email, checked);
        });
      });
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

    safeSetHTML(this.container, `
      <div class="bg-white rounded border border-gray-200 divide-y divide-gray-200">
        ${items}
      </div>
    `);

    // Attach image error handlers (onerror is stripped by DOMPurify for security)
    this.attachImageErrorHandlers();
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
        <div class="bg-white rounded border border-gray-200 mb-3 overflow-hidden">
          <div class="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-200" onclick="this.dispatchEvent(new CustomEvent('toggleGroup', { detail: '${groupName}' }))">
            <div class="flex items-center gap-3 flex-1">
              <div class="relative">
                <input
                  type="checkbox"
                  class="w-4 h-4 cursor-pointer accent-primary rounded border-2 border-gray-300 checked:bg-primary checked:border-primary transition-all"
                  ${allSelected ? 'checked' : ''}
                  data-action="toggle-group-selection"
                  data-group-name="${this.escapeHtml(groupName)}"
                />
              </div>
              <h3 class="text-sm font-semibold text-gray-900 m-0">${this.escapeHtml(groupName)}</h3>
              <span class="bg-primary text-white px-2.5 py-1 rounded text-xs font-semibold">${sortedEmployees.length}</span>
            </div>
            <svg class="w-5 h-5 text-gray-600 transition-transform flex-shrink-0 group-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div class="group-content hidden divide-y divide-gray-200" data-group="${this.escapeHtml(groupName)}">
            ${items}
          </div>
        </div>
      `;
    }).join('');

    safeSetHTML(this.container, `
      <div class="flex flex-col w-full">
        ${groupElements}
      </div>
    `);

    // Attach image error handlers (onerror is stripped by DOMPurify for security)
    this.attachImageErrorHandlers();
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
        class="employee-item px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0"
        data-email="${this.escapeHtml(employee.email)}"
        data-action="employee-select"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 flex-1 min-w-0">
            <!-- Checkbox -->
            <input
              type="checkbox"
              class="employee-checkbox w-4 h-4 cursor-pointer accent-primary rounded border-2 border-gray-300 checked:bg-primary checked:border-primary transition-all flex-shrink-0"
              data-email="${this.escapeHtml(employee.email)}"
              ${isSelected ? 'checked' : ''}
              onclick="event.stopPropagation()"
            />
            
            <!-- Avatar -->
            <div class="w-8 h-8 rounded bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 overflow-hidden">
              ${employee.avatar_url && employee.avatar_url.trim() !== '' && employee.avatar_url !== 'null' && employee.avatar_url !== 'undefined'
                ? `<img src="${this.escapeHtml(employee.avatar_url)}" alt="${this.escapeHtml(employee.name)}" class="w-full h-full object-cover" referrerPolicy="no-referrer" />`
                : ''
              }
              <div class="${employee.avatar_url && employee.avatar_url.trim() !== '' && employee.avatar_url !== 'null' && employee.avatar_url !== 'undefined' ? 'hidden' : 'flex'} items-center justify-center w-full h-full">
                ${initials}
              </div>
            </div>
            
            <!-- Employee Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 mb-0.5">
                <h4 class="text-xs font-semibold text-gray-900 truncate m-0">
                  ${this.escapeHtml(employee.name || 'Unknown')}
                </h4>
                ${hasPendingAudits ? `
                  <span class="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" title="Has pending audits"></span>
                ` : allCompleted ? `
                  <span class="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" title="All audits completed"></span>
                ` : ''}
              </div>
              <p class="text-[10px] text-gray-600 flex items-center gap-1 flex-wrap m-0">
                ${employee.channel ? `
                  <span class="font-medium text-gray-700">${this.escapeHtml(employee.channel)}</span>
                ` : ''}
                ${employee.channel && employee.team ? `
                  <span class="text-gray-300">•</span>
                ` : ''}
                ${employee.team ? `
                  <span>${this.escapeHtml(employee.team)}</span>
                ` : ''}
                ${(employee.channel || employee.team) && employee.department ? `
                  <span class="text-gray-300">•</span>
                ` : ''}
                ${employee.department ? `
                  <span>${this.escapeHtml(employee.department)}</span>
                ` : ''}
              </p>
            </div>
          </div>
          
          <!-- Stats -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="flex items-center gap-2">
              <div class="text-right">
                <div class="text-xs font-semibold text-primary">${stats.assigned}</div>
                <div class="text-[10px] text-gray-500">Assigned</div>
              </div>
              <div class="text-right">
                <div class="text-xs font-semibold ${stats.completed > 0 ? 'text-green-600' : 'text-gray-400'}">${stats.completed}</div>
                <div class="text-[10px] text-gray-500">Completed</div>
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
    // ✅ SECURITY: Set up event listeners for employee item clicks to toggle selection (prevents XSS)
    this.container.querySelectorAll('[data-action="employee-select"]').forEach(element => {
      if (element.hasAttribute('data-listener-attached')) return;
      element.setAttribute('data-listener-attached', 'true');
      
      element.addEventListener('click', (e) => {
        // Don't trigger if clicking on the checkbox (it handles its own click)
        if ((e.target as HTMLElement).closest('.employee-checkbox')) {
          return;
        }
        
        const email = element.getAttribute('data-email');
        if (email) {
          // Toggle selection
          const checkbox = element.querySelector('.employee-checkbox') as HTMLInputElement;
          if (checkbox) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new CustomEvent('employeeSelect', { detail: { email, checked: checkbox.checked } }));
          }
        }
      });
    });
    
    // ✅ SECURITY: Set up event listeners for employee checkboxes (prevents XSS)
    this.container.querySelectorAll('.employee-checkbox').forEach(checkbox => {
      if (checkbox.hasAttribute('data-listener-attached')) return;
      checkbox.setAttribute('data-listener-attached', 'true');
      
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        const email = checkbox.getAttribute('data-email');
        const checked = (checkbox as HTMLInputElement).checked;
        if (email) {
          checkbox.dispatchEvent(new CustomEvent('employeeSelect', { detail: { email, checked } }));
        }
      });
    });
    
    // Keep existing event listeners for CustomEvents
    const employeeSelects = this.container.querySelectorAll('[data-email]');
    employeeSelects.forEach(el => {
      el.addEventListener('employeeSelect', ((e: CustomEvent) => {
        const { email, checked } = e.detail;
        this.config.onEmployeeSelect(email, checked);
      }) as EventListener);
    });

    // ✅ SECURITY: Set up event listeners for toggle group (prevents XSS)
    this.container.querySelectorAll('[data-action="toggle-group"]').forEach(el => {
      if (el.hasAttribute('data-listener-attached')) return;
      el.setAttribute('data-listener-attached', 'true');
      
      el.addEventListener('click', (e) => {
        const groupName = el.getAttribute('data-group-name');
        if (groupName) {
          el.dispatchEvent(new CustomEvent('toggleGroup', { detail: groupName }));
        }
      });
    });
    
    // ✅ SECURITY: Set up event listeners for toggle group selection (prevents XSS)
    this.container.querySelectorAll('[data-action="toggle-group-selection"]').forEach(checkbox => {
      if (checkbox.hasAttribute('data-listener-attached')) return;
      checkbox.setAttribute('data-listener-attached', 'true');
      
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        const groupName = checkbox.getAttribute('data-group-name');
        const checked = (checkbox as HTMLInputElement).checked;
        if (groupName) {
          checkbox.dispatchEvent(new CustomEvent('toggleGroupSelection', { detail: { group: groupName, checked } }));
        }
      });
    });
    
    // Keep existing event listeners for CustomEvents
    const toggleGroups = this.container.querySelectorAll('[data-action="toggle-group"]');
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

  /**
   * Attach error handlers to images (onerror is stripped by DOMPurify for security)
   */
  private attachImageErrorHandlers(): void {
    this.container.querySelectorAll('img').forEach(img => {
      if (img.hasAttribute('data-error-handler-attached')) return;
      img.setAttribute('data-error-handler-attached', 'true');
      
      img.addEventListener('error', function() {
        // Hide the image and show the fallback (initials)
        this.style.display = 'none';
        const fallback = this.nextElementSibling as HTMLElement;
        if (fallback) {
          fallback.style.display = 'flex';
        }
      });
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

