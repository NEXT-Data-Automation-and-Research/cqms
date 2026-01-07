/**
 * Employee Info Section Component
 */

import type { Employee } from '../../../domain/entities.js';
import { safeSetHTML, escapeHtml } from '../../../../../utils/html-sanitizer.js';

export class EmployeeInfoSection {
  private container: HTMLElement;
  private employees: Employee[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="accordion-section" data-section="employee-info">
        <div class="accordion-header" data-toggle="employee-info">
          <h3>
            <span>1</span>
            Employee Information
          </h3>
          <svg class="accordion-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="accordion-content">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Employee Name</label>
              <select id="employeeName" name="employeeName" required class="form-input w-full">
                <option value="">Select employee...</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Email</label>
              <input type="email" id="employeeEmail" name="employeeEmail" readonly class="form-input w-full bg-white/5" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-white/80 mb-2">Type</label>
                <input type="text" id="employeeType" name="employeeType" readonly class="form-input w-full bg-white/5" />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/80 mb-2">Department</label>
                <input type="text" id="employeeDepartment" name="employeeDepartment" readonly class="form-input w-full bg-white/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  private attachEventListeners(): void {
    const header = this.container.querySelector('.accordion-header');
    const select = this.container.querySelector('#employeeName') as HTMLSelectElement;
    
    if (header) {
      header.addEventListener('click', () => {
        this.toggle();
      });
    }
    
    if (select) {
      select.addEventListener('change', (e) => {
        const employeeId = (e.target as HTMLSelectElement).value;
        this.onEmployeeSelected(employeeId);
      });
    }
  }

  loadEmployees(employees: Employee[]): void {
    this.employees = employees;
    const select = this.container.querySelector('#employeeName') as HTMLSelectElement;
    if (!select) return;

    const optionsHtml = '<option value="">Select employee...</option>' +
      employees.map(emp => 
        `<option value="${escapeHtml(emp.id)}">${escapeHtml(emp.name)}</option>`
      ).join('');
    safeSetHTML(select, optionsHtml);
  }

  private onEmployeeSelected(employeeId: string): void {
    const employee = this.employees.find(emp => emp.id === employeeId);
    if (!employee) {
      this.clearFields();
      return;
    }

    (this.container.querySelector('#employeeEmail') as HTMLInputElement).value = employee.email;
    (this.container.querySelector('#employeeType') as HTMLInputElement).value = employee.type;
    (this.container.querySelector('#employeeDepartment') as HTMLInputElement).value = employee.department;

    this.container.dispatchEvent(new CustomEvent('employee-selected', {
      detail: { employee }
    }));
  }

  private clearFields(): void {
    (this.container.querySelector('#employeeEmail') as HTMLInputElement).value = '';
    (this.container.querySelector('#employeeType') as HTMLInputElement).value = '';
    (this.container.querySelector('#employeeDepartment') as HTMLInputElement).value = '';
  }

  toggle(): void {
    const section = this.container.querySelector('.accordion-section') as HTMLElement;
    if (section) {
      section.classList.toggle('expanded');
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

