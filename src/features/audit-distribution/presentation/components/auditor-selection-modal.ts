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
        <div class="bg-white rounded-xl border border-gray-200 shadow-lg h-full flex flex-col overflow-hidden">
          <!-- Header -->
          <div class="bg-gray-50 border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-bold text-gray-900 m-0 mb-1">Assignment Configuration</h2>
                <p class="text-xs text-gray-600 m-0 font-medium">Select auditors and configure assignment</p>
              </div>
              <button
                id="closeModalBtn"
                class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-all"
                data-action="close-modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto px-4 py-4">
            <div class="flex flex-col gap-5">
              <!-- Audits Configuration & Schedule Date -->
              <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div class="flex flex-col gap-3">
                  <!-- First Row: Audits per employee -->
                  <div class="flex items-center justify-between gap-4">
                    <label class="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                      <span class="text-red-500 text-xs">*</span>
                      <span>Audits per employee</span>
                    </label>
                    <div id="bulkAuditCountContainer" class="flex-shrink-0"></div>
                  </div>
                  <!-- Second Row: Schedule Date -->
                  <div class="flex items-center gap-3 pt-2 border-t border-gray-200">
                    <label class="text-xs font-semibold text-gray-900 flex items-center gap-1.5 flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-600">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span>Schedule Date <span class="text-gray-500 font-normal">(Optional)</span></span>
                    </label>
                    <div class="flex-1 min-w-0">
                      <input
                        type="date"
                        id="scheduledDateInput"
                        value="${scheduledDateValue}"
                        class="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-gray-900"
                        min="${new Date().toISOString().split('T')[0]}"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Auditor Selection -->
              <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div class="flex items-center justify-between mb-3">
                  <label class="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                    <span class="text-red-500 text-xs">*</span>
                    <span>Select Auditor(s)</span>
                  </label>
                  <button
                    id="toggleOthersBtn"
                    class="px-2.5 py-1 text-[10px] border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 hover:border-primary transition-all font-medium flex items-center gap-1"
                    data-action="toggle-others"
                  >
                    ${includeOtherAuditors ? 'Hide Others' : 'Include Others'}
                  </button>
                </div>
                <div class="max-h-64 overflow-y-auto space-y-0">
                  ${auditorsList}
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t border-gray-200 px-6 py-4 flex-shrink-0 bg-gray-50">
            ${selectedEmployeeCount > 0 || selectedAuditors.size > 0 || totalAudits > 0 ? `
              <div class="mb-3 pb-3 border-b border-gray-200">
                <div class="inline-flex items-center gap-3 px-3 py-1.5 bg-gray-100 rounded-md border border-gray-300">
                  ${selectedEmployeeCount > 0 ? `
                    <div class="flex items-center gap-1">
                      <span class="text-[10px] font-medium text-gray-600">Employee:</span>
                      <span class="text-[10px] font-bold text-gray-900">${selectedEmployeeCount}</span>
                    </div>
                  ` : ''}
                  ${selectedAuditors.size > 0 ? `
                    <div class="flex items-center gap-1">
                      <span class="text-[10px] font-medium text-gray-600">Auditor:</span>
                      <span class="text-[10px] font-bold text-gray-900">${selectedAuditors.size}</span>
                    </div>
                  ` : ''}
                  ${totalAudits > 0 ? `
                    <div class="flex items-center gap-1">
                      <span class="text-[10px] font-medium text-gray-600">Total:</span>
                      <span class="text-[10px] font-bold text-gray-900" id="totalAuditsCount">${totalAudits}</span>
                    </div>
                  ` : ''}
                  ${auditsPerAuditor > 0 && selectedAuditors.size > 0 ? `
                    <div class="flex items-center gap-1">
                      <span class="text-[10px] font-medium text-gray-600">Per auditor:</span>
                      <span class="text-[10px] font-bold text-gray-900">${auditsPerAuditor}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}
            <div class="flex items-center justify-end gap-3">
              <button
                id="cancelButton"
                class="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-all font-medium"
                data-action="close-modal"
              >
                Cancel
              </button>
              <button
                id="assignButton"
                class="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-all font-medium disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200"
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
      return '<div class="text-center py-8 text-white/60 text-sm">No auditors available</div>';
    }

    return auditors.map(auditor => {
      const isSelected = selectedAuditors.has(auditor.email);
      const initials = auditor.name
        ? auditor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'A';

      return `
        <div
          class="flex items-center gap-2.5 px-4 py-2.5 bg-white border-b border-gray-100 last:border-0 transition-all cursor-pointer group ${isSelected ? 'border-l-2 border-l-primary' : 'hover:bg-gray-50'} ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}"
          data-email="${this.escapeHtml(auditor.email)}"
          data-action="auditor-click"
          ${canSelect ? '' : 'data-disabled="true"'}
        >
          <div class="relative flex-shrink-0">
            <input
              type="checkbox"
              class="w-4 h-4 cursor-pointer accent-primary rounded border-2 border-gray-300 checked:bg-primary checked:border-primary transition-all flex-shrink-0 auditor-checkbox"
              data-email="${this.escapeHtml(auditor.email)}"
              ${isSelected ? 'checked' : ''}
              ${!canSelect ? 'disabled' : ''}
            />
          </div>
          <div class="w-8 h-8 rounded bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 overflow-hidden" style="background-color: var(--home-primary-500, #1a733e);">
            ${initials}
          </div>
          <div class="flex items-center justify-between flex-1 gap-2.5 min-w-0">
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-gray-900 m-0 truncate">${this.escapeHtml(auditor.name || auditor.email)}</p>
              <p class="text-[10px] text-gray-600 m-0 truncate">${auditor.role}</p>
            </div>
            ${isSelected && auditsPerAuditor > 0 ? `
              <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
                <span class="text-white px-2 py-0.5 rounded text-[10px] font-semibold" style="background-color: var(--home-primary-500, #1a733e);">
                  ${auditsPerAuditor} audit${auditsPerAuditor !== 1 ? 's' : ''}
                </span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
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

