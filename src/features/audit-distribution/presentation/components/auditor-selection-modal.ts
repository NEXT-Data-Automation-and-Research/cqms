/**
 * Auditor Selection Modal Component
 * Modal dialog for selecting auditors and configuring bulk assignment
 */

import type { Auditor } from '../../domain/types.js';
import { CounterInput } from './counter-input.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export interface AuditorSelectionModalConfig {
  auditors: Auditor[];
  otherAuditors: Auditor[];
  includeOtherAuditors: boolean;
  selectedAuditors: Set<string>;
  bulkAuditCount: number;
  selectedEmployeeCount: number;
  scheduledDate: Date | null;
  onToggleIncludeOthers: () => void;
  onAuditorSelect: (email: string, selected: boolean) => void;
  onSelectAllAuditors: () => void;
  onDeselectAllAuditors: () => void;
  onBulkAuditCountChange: (count: number) => void;
  onScheduledDateChange: (date: Date | null) => void;
  onAssign: () => void;
  onClose: () => void;
}

export class AuditorSelectionModal {
  private modalContainer: HTMLElement;
  private config: AuditorSelectionModalConfig;
  private counterInput: CounterInput | null = null;
  private isOpen: boolean = false;

  constructor(container: HTMLElement, config: AuditorSelectionModalConfig) {
    this.modalContainer = container;
    this.config = config;
    this.render();
  }

  show(): void {
    this.isOpen = true;
    this.render();
    const modal = this.modalContainer.querySelector('#auditorSelectionModal') as HTMLElement;
    const container = this.modalContainer;
    if (modal && container) {
      container.classList.remove('w-0');
      container.classList.add('w-96');
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.classList.add('opacity-100');
        modal.classList.remove('opacity-0');
      }, 10);
    }
  }

  hide(): void {
    const modal = this.modalContainer.querySelector('#auditorSelectionModal') as HTMLElement;
    const container = this.modalContainer;
    if (modal && container) {
      modal.classList.add('opacity-0');
      modal.classList.remove('opacity-100');
      setTimeout(() => {
        modal.classList.add('hidden');
        container.classList.remove('w-96');
        container.classList.add('w-0');
        this.isOpen = false;
      }, 300);
    }
  }

  private render(): void {
    const {
      auditors,
      otherAuditors,
      includeOtherAuditors,
      selectedAuditors,
      bulkAuditCount,
      selectedEmployeeCount,
      scheduledDate
    } = this.config;

    const auditorsToShow = includeOtherAuditors ? [...auditors, ...otherAuditors] : auditors;
    const canSelectAuditors = bulkAuditCount > 0;
    const totalAudits = bulkAuditCount * selectedEmployeeCount;
    const auditsPerAuditor = selectedAuditors.size > 0
      ? Math.ceil(totalAudits / selectedAuditors.size)
      : 0;

    const auditorsList = this.renderAuditorsList(auditorsToShow, selectedAuditors, auditsPerAuditor, canSelectAuditors);
    const scheduledDateValue = scheduledDate ? scheduledDate.toISOString().split('T')[0] : '';

    safeSetHTML(this.modalContainer, `
      <div 
        id="auditorSelectionModal" 
        class="h-full ${this.isOpen ? '' : 'hidden'} transition-opacity duration-300"
      >
        <div class="bg-white rounded-lg border border-gray-200 shadow h-full flex flex-col overflow-hidden">
          <!-- Header (compact) -->
          <div class="bg-gray-50 border-b border-gray-200 px-3 py-2 flex-shrink-0">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-semibold text-gray-900 m-0 truncate">Assignment Configuration</h2>
              <button
                id="closeModalBtn"
                class="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-700 flex-shrink-0"
                data-action="close-modal"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Content (compact) -->
          <div class="flex-1 overflow-y-auto px-3 py-2 min-h-0">
            <div class="flex flex-col gap-2">
              <!-- Audits + Schedule (compact single card) -->
              <div class="bg-gray-50 rounded border border-gray-200 p-2">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <label class="text-[10px] font-semibold text-gray-700 flex items-center gap-1">
                    <span class="text-red-500">*</span> Audits/employee
                  </label>
                  <div id="bulkAuditCountContainer" class="flex-shrink-0"></div>
                </div>
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <label class="text-[10px] font-semibold text-gray-700 flex-shrink-0 whitespace-nowrap">Schedule for</label>
                  <input
                    type="date"
                    id="scheduledDateInput"
                    value="${scheduledDateValue}"
                    class="w-28 min-w-0 h-6 px-2 text-[10px] border border-gray-300 rounded bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-gray-900 flex-shrink-0"
                    min="${new Date().toISOString().split('T')[0]}"
                  />
                </div>
              </div>

              <!-- Auditors (compact table like people list) -->
              <div class="bg-gray-50 rounded border border-gray-200 overflow-hidden">
                <div class="flex items-center justify-between gap-1 px-2 py-1.5 border-b border-gray-200">
                  <label class="text-[10px] font-semibold text-gray-700 flex items-center gap-1">
                    <span class="text-red-500">*</span> Auditor(s)
                  </label>
                  <button
                    id="toggleOthersBtn"
                    class="px-1.5 py-0.5 text-[10px] border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-100 font-medium"
                    data-action="toggle-others"
                  >
                    ${includeOtherAuditors ? 'Hide Others' : 'Others'}
                  </button>
                </div>
                <div class="max-h-48 overflow-auto">
                  ${auditorsList}
                </div>
              </div>
            </div>
          </div>

          <!-- Footer (compact) -->
          <div class="border-t border-gray-200 px-3 py-2 flex-shrink-0 bg-gray-50">
            ${selectedEmployeeCount > 0 || selectedAuditors.size > 0 || totalAudits > 0 ? `
              <div class="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                ${selectedEmployeeCount > 0 ? `<span class="text-[10px] text-gray-600">Emp: <strong>${selectedEmployeeCount}</strong></span>` : ''}
                ${selectedAuditors.size > 0 ? `<span class="text-[10px] text-gray-600">Aud: <strong>${selectedAuditors.size}</strong></span>` : ''}
                ${totalAudits > 0 ? `<span class="text-[10px] text-gray-600" id="totalAuditsCount">Total: <strong>${totalAudits}</strong></span>` : ''}
                ${auditsPerAuditor > 0 && selectedAuditors.size > 0 ? `<span class="text-[10px] text-gray-600">Each: <strong>${auditsPerAuditor}</strong></span>` : ''}
              </div>
            ` : ''}
            <div class="flex items-center justify-end gap-2">
              <button
                id="cancelButton"
                class="px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 font-medium"
                data-action="close-modal"
              >
                Cancel
              </button>
              <button
                id="assignButton"
                class="px-2.5 py-1.5 text-xs border border-primary rounded bg-primary text-white hover:opacity-90 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                ${!canSelectAuditors || selectedAuditors.size === 0 || selectedEmployeeCount === 0 ? 'disabled' : ''}
                data-action="assign"
              >
                Assign ${totalAudits > 0 ? `${totalAudits} ` : ''}Audit${totalAudits !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    `);

    this.initializeCounterInput();
    this.attachEventListeners();
  }

  private renderAuditorsList(
    auditors: Auditor[],
    selectedAuditors: Set<string>,
    auditsPerAuditor: number,
    canSelect: boolean
  ): string {
    if (auditors.length === 0) {
      return '<div class="text-center py-4 text-gray-500 text-[11px]">No auditors available</div>';
    }

    const allSelected = auditors.length > 0 && auditors.every(a => selectedAuditors.has(a.email));
    const rows = auditors.map(auditor => this.renderAuditorTableRow(auditor, selectedAuditors, auditsPerAuditor, canSelect)).join('');

    return `
      <table class="w-full border-collapse text-sm auditor-list-table">
        <thead>
          <tr class="bg-gray-100 border-b border-gray-200">
            <th class="text-center p-1.5 w-6">
              <input type="checkbox" id="selectAllAuditors" class="cursor-pointer accent-primary w-3.5 h-3.5" ${allSelected ? 'checked' : ''} ${!canSelect ? 'disabled' : ''} data-action="select-all-auditors" />
            </th>
            <th class="text-left p-1.5 font-semibold text-gray-700 text-[10px] min-w-0">Name</th>
            <th class="text-left p-1.5 font-semibold text-gray-700 text-[10px] w-20">Role</th>
            <th class="text-center p-1.5 font-semibold text-gray-700 text-[10px] w-12">Audits</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  private renderAuditorTableRow(
    auditor: Auditor,
    selectedAuditors: Set<string>,
    auditsPerAuditor: number,
    canSelect: boolean
  ): string {
    const isSelected = selectedAuditors.has(auditor.email);
    const auditsCell = isSelected && auditsPerAuditor > 0 ? auditsPerAuditor : '—';
    return `
      <tr
        class="border-b border-gray-200 hover:bg-gray-50/80 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : ''} ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}"
        data-email="${this.escapeHtml(auditor.email)}"
        data-action="auditor-click"
        ${canSelect ? '' : 'data-disabled="true"'}
      >
        <td class="p-1.5 text-center">
          <input
            type="checkbox"
            class="auditor-checkbox cursor-pointer accent-primary w-3.5 h-3.5"
            data-email="${this.escapeHtml(auditor.email)}"
            ${isSelected ? 'checked' : ''}
            ${!canSelect ? 'disabled' : ''}
            onclick="event.stopPropagation()"
          />
        </td>
        <td class="p-1.5 font-medium text-gray-900 text-xs truncate max-w-[8rem]" title="${this.escapeHtml(auditor.name || auditor.email)}">${this.escapeHtml(auditor.name || auditor.email)}</td>
        <td class="p-1.5 text-gray-600 text-[10px]">${this.escapeHtml(auditor.role)}</td>
        <td class="p-1.5 text-center text-[10px] font-semibold ${auditsPerAuditor > 0 && isSelected ? 'text-primary' : 'text-gray-400'}">${auditsCell}</td>
      </tr>
    `;
  }

  private initializeCounterInput(): void {
    const container = this.modalContainer.querySelector('#bulkAuditCountContainer');
    if (container) {
      this.counterInput = new CounterInput(container as HTMLElement, {
        value: this.config.bulkAuditCount,
        min: 0,
        max: 10,
        onValueChange: (value) => {
          this.config.onBulkAuditCountChange(value);
        }
      });
    }
  }

  private attachEventListeners(): void {
    // Close button
    const closeBtn = this.modalContainer.querySelector('#closeModalBtn');
    const cancelBtn = this.modalContainer.querySelector('#cancelButton');
    
    const handleClose = () => {
      this.config.onClose();
    };
    
    closeBtn?.addEventListener('click', handleClose);
    cancelBtn?.addEventListener('click', handleClose);

    // Remove click outside to close (not needed for side pane)

    // Auditor selection
    this.modalContainer.querySelectorAll('[data-action="auditor-click"]').forEach(element => {
      if (element.hasAttribute('data-listener-attached')) return;
      element.setAttribute('data-listener-attached', 'true');
      
      element.addEventListener('click', (e) => {
        const email = element.getAttribute('data-email');
        const disabled = element.getAttribute('data-disabled') === 'true';
        if (email && !disabled) {
          const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
          if (checkbox && !checkbox.disabled) {
            checkbox.checked = !checkbox.checked;
            this.config.onAuditorSelect(email, checkbox.checked);
          }
        }
      });
    });

    this.modalContainer.querySelectorAll('.auditor-checkbox').forEach(checkbox => {
      if (checkbox.hasAttribute('data-listener-attached')) return;
      checkbox.setAttribute('data-listener-attached', 'true');
      
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        const email = checkbox.getAttribute('data-email');
        const checked = (checkbox as HTMLInputElement).checked;
        if (email) {
          this.config.onAuditorSelect(email, checked);
        }
      });
    });

    // Select all auditors (header checkbox)
    const selectAllAuditors = this.modalContainer.querySelector('#selectAllAuditors');
    if (selectAllAuditors) {
      selectAllAuditors.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        if (checked) {
          this.config.onSelectAllAuditors();
        } else {
          this.config.onDeselectAllAuditors();
        }
      });
    }

    // Toggle others button
    const toggleOthersBtn = this.modalContainer.querySelector('#toggleOthersBtn');
    toggleOthersBtn?.addEventListener('click', () => {
      this.config.onToggleIncludeOthers();
    });

    // Assign button
    const assignBtn = this.modalContainer.querySelector('#assignButton');
    assignBtn?.addEventListener('click', () => {
      if (!assignBtn?.hasAttribute('disabled')) {
        this.config.onAssign();
      }
    });

    // Date input
    const dateInput = this.modalContainer.querySelector('#scheduledDateInput') as HTMLInputElement;
    dateInput?.addEventListener('change', () => {
      const date = dateInput.value ? new Date(dateInput.value) : null;
      this.config.onScheduledDateChange(date);
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  update(config: Partial<AuditorSelectionModalConfig>): void {
    this.config = { ...this.config, ...config };
    this.render();
  }
}

