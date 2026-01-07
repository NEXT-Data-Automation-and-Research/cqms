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
    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.classList.add('opacity-100');
        modal.classList.remove('opacity-0');
      }, 10);
    }
  }

  hide(): void {
    const modal = this.modalContainer.querySelector('#auditorSelectionModal') as HTMLElement;
    if (modal) {
      modal.classList.add('opacity-0');
      modal.classList.remove('opacity-100');
      setTimeout(() => {
        modal.classList.add('hidden');
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
        class="fixed inset-0 z-50 flex items-center justify-center ${this.isOpen ? '' : 'hidden'} transition-opacity duration-300"
        style="background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px);"
      >
        <div class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col border border-white/10 overflow-hidden transform transition-all">
          <!-- Header -->
          <div class="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-white/10 px-6 py-4 flex-shrink-0">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-bold text-white m-0 mb-1">Create audit</h2>
                <p class="text-sm text-white/70 m-0">Select auditors and configure assignment</p>
              </div>
              <button
                id="closeModalBtn"
                class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                data-action="close-modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            ${selectedEmployeeCount > 0 ? `
              <div class="flex items-center gap-3 mt-3">
                <div class="flex items-center gap-2 px-3 py-1.5 bg-primary/20 rounded-lg border border-primary/30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-primary">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span class="text-sm font-semibold text-primary">${selectedEmployeeCount} employee${selectedEmployeeCount !== 1 ? 's' : ''} selected</span>
                </div>
                ${selectedAuditors.size > 0 ? `
                  <div class="flex items-center gap-2 px-3 py-1.5 bg-success/20 rounded-lg border border-success/30">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-success">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                    </svg>
                    <span class="text-sm font-semibold text-success">${selectedAuditors.size} auditor${selectedAuditors.size !== 1 ? 's' : ''}</span>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <div class="flex flex-col gap-5">
              <!-- Audits Configuration -->
              <div class="bg-white/5 rounded-xl p-5 border border-white/10">
                <label class="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <span class="text-red-400 text-base">*</span>
                  <span>Audits per employee</span>
                </label>
                <div id="bulkAuditCountContainer" class="flex justify-center my-2"></div>
                <div class="mt-4 pt-4 border-t border-white/10">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="text-xs text-white/60 mb-1 font-medium">Total audits to assign</div>
                      <div class="text-3xl font-bold text-primary" id="totalAuditsCount">${totalAudits}</div>
                    </div>
                    ${auditsPerAuditor > 0 ? `
                      <div class="text-right">
                        <div class="text-xs text-white/60 mb-1 font-medium">Per auditor</div>
                        <div class="text-xl font-bold text-success">${auditsPerAuditor}</div>
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>

              <!-- Schedule Date -->
              <div class="bg-white/5 rounded-xl p-5 border border-white/10">
                <label class="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-white/70">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>Schedule Date <span class="text-white/50 font-normal text-xs">(Optional)</span></span>
                </label>
                <div class="relative">
                  <input
                    type="date"
                    id="scheduledDateInput"
                    value="${scheduledDateValue}"
                    class="w-full px-4 py-2.5 border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-white/50 focus:bg-white/15 text-white"
                    min="${new Date().toISOString().split('T')[0]}"
                  />
                </div>
                <div class="flex items-center gap-2 flex-wrap mt-3">
                  <button
                    class="px-3 py-1.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-medium flex items-center gap-1.5"
                    data-action="set-date"
                    data-date-option="today"
                  >
                    Today
                  </button>
                  <button
                    class="px-3 py-1.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-medium flex items-center gap-1.5"
                    data-action="set-date"
                    data-date-option="tomorrow"
                  >
                    Tomorrow
                  </button>
                  <button
                    class="px-3 py-1.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-medium flex items-center gap-1.5"
                    data-action="set-date"
                    data-date-option="clear"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <!-- Auditor Selection -->
              <div class="bg-white/5 rounded-xl p-5 border border-white/10">
                <div class="flex items-center justify-between mb-4">
                  <label class="text-sm font-bold text-white flex items-center gap-2">
                    <span class="text-red-400 text-base">*</span>
                    <span>Select Auditor(s)</span>
                  </label>
                  <div class="flex items-center gap-2">
                    <button
                      id="toggleOthersBtn"
                      class="px-3 py-1.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-medium flex items-center gap-1.5"
                      data-action="toggle-others"
                    >
                      ${includeOtherAuditors ? 'Hide Others' : 'Include Others'}
                    </button>
                    ${selectedAuditors.size > 0 ? `
                      <div class="flex items-center gap-1.5 px-2.5 py-1 bg-primary/20 rounded-md border border-primary/30">
                        <span class="text-xs font-semibold text-primary">${selectedAuditors.size} selected</span>
                      </div>
                    ` : ''}
                  </div>
                </div>
                <div class="max-h-64 overflow-y-auto space-y-2 mb-4">
                  ${auditorsList}
                </div>
                <div class="flex gap-2 pt-3 border-t border-white/10">
                  <button
                    id="selectAllAuditorsBtn"
                    class="flex-1 py-2.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    ${!canSelectAuditors ? 'disabled' : ''}
                    data-action="select-all-auditors"
                  >
                    Select All
                  </button>
                  <button
                    id="deselectAllAuditorsBtn"
                    class="flex-1 py-2.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-semibold flex items-center justify-center gap-1.5"
                    data-action="deselect-all-auditors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t border-white/10 px-6 py-4 flex-shrink-0 bg-gray-900/50">
            <div class="flex items-center justify-end gap-3">
              <button
                id="cancelButton"
                class="px-4 py-2 text-sm border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all font-medium"
                data-action="close-modal"
              >
                Cancel
              </button>
              <button
                id="assignButton"
                class="px-6 py-2.5 text-sm bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold hover:from-primary-dark hover:to-primary transition-all disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                ${!canSelectAuditors || selectedAuditors.size === 0 || selectedEmployeeCount === 0 ? 'disabled' : ''}
                data-action="assign"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Assign ${totalAudits > 0 ? `${totalAudits} ` : ''}Audit${totalAudits !== 1 ? 's' : ''}</span>
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
          class="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm border rounded-xl transition-all cursor-pointer group ${isSelected ? 'bg-primary/15 border-primary/40 shadow-sm shadow-primary/20' : 'border-white/10 hover:bg-white/10 hover:border-primary/30'} ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}"
          data-email="${this.escapeHtml(auditor.email)}"
          data-action="auditor-click"
          ${canSelect ? '' : 'data-disabled="true"'}
        >
          <div class="relative flex-shrink-0">
            <input
              type="checkbox"
              class="w-5 h-5 cursor-pointer accent-primary flex-shrink-0 auditor-checkbox"
              data-email="${this.escapeHtml(auditor.email)}"
              ${isSelected ? 'checked' : ''}
              ${!canSelect ? 'disabled' : ''}
            />
          </div>
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-md">
            ${initials}
          </div>
          <div class="flex items-center justify-between flex-1 gap-3 min-w-0">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-white m-0 truncate">${this.escapeHtml(auditor.name || auditor.email)}</p>
              <p class="text-xs text-white/60 m-0 mt-0.5 truncate font-medium">${auditor.role}</p>
            </div>
            ${isSelected && auditsPerAuditor > 0 ? `
              <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
                <span class="bg-primary text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">
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

    // Click outside to close
    const modal = this.modalContainer.querySelector('#auditorSelectionModal');
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.config.onClose();
      }
    });

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

    // Select all auditors button
    const selectAllBtn = this.modalContainer.querySelector('#selectAllAuditorsBtn');
    selectAllBtn?.addEventListener('click', () => {
      this.config.onSelectAllAuditors();
    });

    // Deselect all auditors button
    const deselectAllBtn = this.modalContainer.querySelector('#deselectAllAuditorsBtn');
    deselectAllBtn?.addEventListener('click', () => {
      this.config.onDeselectAllAuditors();
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

    // Date buttons
    const dateButtons = this.modalContainer.querySelectorAll('[data-action="set-date"]');
    dateButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const option = btn.getAttribute('data-date-option');
        const today = new Date();
        let date: Date | null = null;

        if (option === 'today') {
          date = today;
        } else if (option === 'tomorrow') {
          date = new Date(today);
          date.setDate(date.getDate() + 1);
        }

        if (dateInput) {
          dateInput.value = date ? date.toISOString().split('T')[0] : '';
        }

        this.config.onScheduledDateChange(date);
      });
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

