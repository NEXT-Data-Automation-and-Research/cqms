/**
 * Auditor Selection Panel Component
 * Panel for selecting auditors and configuring bulk assignment
 */

import type { Auditor } from '../../domain/types.js';
import { CounterInput } from './counter-input.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export interface AuditorSelectionPanelConfig {
  auditors: Auditor[];
  otherAuditors: Auditor[];
  includeOtherAuditors: boolean;
  selectedAuditors: Set<string>;
  bulkAuditCount: number;
  selectedEmployeeCount: number;
  onToggleIncludeOthers: () => void;
  onAuditorSelect: (email: string, selected: boolean) => void;
  onSelectAllAuditors: () => void;
  onDeselectAllAuditors: () => void;
  onBulkAuditCountChange: (count: number) => void;
  onScheduledDateChange?: (date: Date | null) => void;
  onAssign: () => void;
}

export class AuditorSelectionPanel {
  private container: HTMLElement;
  private config: AuditorSelectionPanelConfig;
  private counterInput: CounterInput | null = null;
  private isExpanded: boolean = false;

  constructor(container: HTMLElement, config: AuditorSelectionPanelConfig) {
    this.container = container;
    this.config = config;
    // Start collapsed by default - will be expanded by toggle button or when employees are selected
    this.isExpanded = false;
    this.render();
  }

  private render(): void {
    const {
      auditors,
      otherAuditors,
      includeOtherAuditors,
      selectedAuditors,
      bulkAuditCount,
      selectedEmployeeCount
    } = this.config;

    const auditorsToShow = includeOtherAuditors ? [...auditors, ...otherAuditors] : auditors;
    const canSelectAuditors = bulkAuditCount > 0;
    const totalAudits = bulkAuditCount * selectedEmployeeCount;
    const auditsPerAuditor = selectedAuditors.size > 0
      ? Math.ceil(totalAudits / selectedAuditors.size)
      : 0;

    const auditorsList = this.renderAuditorsList(auditorsToShow, selectedAuditors, auditsPerAuditor, canSelectAuditors);

    const iconRotation = this.isExpanded ? 'rotate-180' : '';
    
    safeSetHTML(this.container, `
      <div class="glass-card rounded-xl flex flex-col h-full w-full overflow-hidden">
        <!-- Enhanced Header -->
        <div class="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-white/10 px-5 py-4 flex-shrink-0">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-bold text-white m-0 mb-0.5">Select Auditor(s)</h3>
              <p class="text-xs text-white/60 m-0 font-medium">Choose auditors for assignment</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                class="px-3 py-1.5 text-xs border rounded-lg backdrop-blur-sm text-white transition-all font-semibold flex items-center gap-1.5 ${includeOtherAuditors ? 'bg-primary border-primary text-white shadow-sm' : 'border-white/20 bg-white/10 hover:bg-white/20 hover:border-primary/50'}"
                onclick="event.stopPropagation(); this.dispatchEvent(new CustomEvent('toggleOthers'))"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  ${includeOtherAuditors ? '<path d="M18 6L6 18M6 6l12 12"/>' : '<path d="M12 5v14m-7-7h14"/>'}
                </svg>
                <span id="toggleOthersText">${includeOtherAuditors ? 'Hide Others' : 'Include Others'}</span>
              </button>
              <button
                id="panelExpandButton"
                class="w-10 h-10 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all flex items-center justify-center flex-shrink-0"
                onclick="event.stopPropagation(); this.dispatchEvent(new CustomEvent('togglePanel'))"
                title="${this.isExpanded ? 'Collapse Panel' : 'Expand Panel'}"
              >
                <svg id="panelExpandIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="transition-transform duration-300" style="transform: ${this.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>
          </div>
          ${selectedEmployeeCount > 0 ? `
            <div class="flex items-center gap-2 text-xs">
              <div class="flex items-center gap-1.5 px-2.5 py-1 bg-primary/20 rounded-md border border-primary/30">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-primary">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span class="font-semibold text-primary">${selectedEmployeeCount} employee${selectedEmployeeCount !== 1 ? 's' : ''} selected</span>
              </div>
              ${selectedAuditors.size > 0 ? `
                <div class="flex items-center gap-1.5 px-2.5 py-1 bg-success/20 rounded-md border border-success/30">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-success">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                  </svg>
                  <span class="font-semibold text-success">${selectedAuditors.size} auditor${selectedAuditors.size !== 1 ? 's' : ''}</span>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
        <div class="panel-content flex flex-col gap-5 flex-1 min-h-0 overflow-hidden px-5 py-4" style="display: ${this.isExpanded ? 'flex' : 'none'}; opacity: ${this.isExpanded ? '1' : '0'};">
          <!-- Audits Configuration Section -->
          <div class="flex flex-col gap-3 flex-shrink-0 bg-white/5 rounded-xl p-4 border border-white/10">
            <div class="flex items-center gap-2 mb-1">
              <label class="text-sm font-bold text-white flex items-center gap-1.5">
                <span class="text-red-400 text-base">*</span>
                <span>Audits per employee</span>
              </label>
            </div>
            <div id="bulkAuditCountContainer" class="flex justify-center my-2"></div>
            <div class="mt-3 pt-3 border-t border-white/10">
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

          <!-- Schedule Date Section -->
          <div class="flex flex-col gap-3 flex-shrink-0 bg-white/5 rounded-xl p-4 border border-white/10">
            <label class="text-sm font-bold text-white flex items-center gap-2">
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
                class="filter-input text-sm px-3 py-2.5 border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all w-full placeholder:text-white/50 focus:bg-white/15"
                min="${new Date().toISOString().split('T')[0]}"
              />
              <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button
                class="px-3 py-1.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-medium flex items-center gap-1.5"
                onclick="this.dispatchEvent(new CustomEvent('setDate', { detail: 'today' }))"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Today
              </button>
              <button
                class="px-3 py-1.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-medium flex items-center gap-1.5"
                onclick="this.dispatchEvent(new CustomEvent('setDate', { detail: 'tomorrow' }))"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
                Tomorrow
              </button>
              <button
                class="px-3 py-1.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-medium flex items-center gap-1.5"
                onclick="this.dispatchEvent(new CustomEvent('setDate', { detail: 'clear' }))"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Clear
              </button>
            </div>
          </div>

          <!-- Auditor Selection Section -->
          <div class="flex flex-col gap-3 flex-1 min-h-0">
            <div class="flex items-center justify-between flex-shrink-0">
              <label class="text-sm font-bold text-white flex items-center gap-1.5">
                <span class="text-red-400 text-base">*</span>
                <span>Select Auditor(s)</span>
              </label>
              ${selectedAuditors.size > 0 ? `
                <div class="flex items-center gap-1.5 px-2.5 py-1 bg-primary/20 rounded-md border border-primary/30">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-primary">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span class="text-xs font-semibold text-primary">${selectedAuditors.size} selected</span>
                </div>
              ` : ''}
            </div>
            <div class="auditors-list-container auditors-list-container--panel flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto py-1">
              ${auditorsList}
            </div>
          </div>

          <!-- Assign Button -->
          <button
            class="premium-btn w-full bg-gradient-to-r from-primary to-primary-dark text-white py-3.5 px-4 rounded-lg text-sm font-bold hover:from-primary-dark hover:to-primary transition-all disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed flex-shrink-0 shadow-lg flex items-center justify-center gap-2 mt-2"
            id="assignButton"
            ${!canSelectAuditors || selectedAuditors.size === 0 || selectedEmployeeCount === 0 ? 'disabled' : ''}
            onclick="this.dispatchEvent(new CustomEvent('assign'))"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Assign ${totalAudits > 0 ? `${totalAudits} ` : ''}Audit${totalAudits !== 1 ? 's' : ''}</span>
          </button>
        </div>
      </div>
    `);

    this.initializeCounterInput();
    this.attachEventListeners();
  }

  private toggle(): void {
    this.isExpanded = !this.isExpanded;
    const content = this.container.querySelector('.panel-content') as HTMLElement;
    const expandIcon = this.container.querySelector('#panelExpandIcon') as HTMLElement;
    const expandButton = this.container.querySelector('#panelExpandButton') as HTMLElement;
    
    if (content) {
      if (this.isExpanded) {
        content.style.display = 'flex';
        // Force reflow
        content.offsetHeight;
        content.style.opacity = '1';
      } else {
        content.style.opacity = '0';
        setTimeout(() => {
          if (!this.isExpanded) {
            content.style.display = 'none';
          }
        }, 300);
      }
    }

    // Update expand icon rotation
    if (expandIcon) {
      expandIcon.style.transform = this.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    // Update button title
    if (expandButton) {
      expandButton.title = this.isExpanded ? 'Collapse Panel' : 'Expand Panel';
    }
  }

  expand(): void {
    if (!this.isExpanded) {
      this.toggle();
    }
  }

  collapse(): void {
    if (this.isExpanded) {
      this.toggle();
    }
  }

  setExpanded(expanded: boolean): void {
    if (expanded !== this.isExpanded) {
      this.isExpanded = expanded;
      this.render();
    }
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

    const items = auditors.map(auditor => {
      const isSelected = selectedAuditors.has(auditor.email);
      const initials = auditor.name
        ? auditor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'A';

      return `
        <div
          class="flex items-center gap-3 p-3.5 bg-white/5 backdrop-blur-sm border rounded-xl transition-all cursor-pointer group ${isSelected ? 'bg-primary/15 border-primary/40 shadow-sm shadow-primary/20' : 'border-white/10 hover:bg-white/10 hover:border-primary/30'} ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}"
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
            ${isSelected ? `
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" class="text-primary">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            ` : ''}
          </div>
          <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-md ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent' : ''}">
            ${initials}
          </div>
          <div class="flex items-center justify-between flex-1 gap-3 min-w-0">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-white m-0 truncate">${this.escapeHtml(auditor.name || auditor.email)}</p>
              ${auditor.role !== 'Quality Analyst' ? `<p class="text-xs text-white/60 m-0 mt-1 truncate font-medium">${auditor.role}</p>` : '<p class="text-xs text-white/50 m-0 mt-1 font-medium">Quality Analyst</p>'}
            </div>
            ${isSelected && auditsPerAuditor > 0 ? `
              <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
                <span class="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                  ${auditsPerAuditor} audit${auditsPerAuditor !== 1 ? 's' : ''}
                </span>
                <span class="text-[10px] text-white/50 font-medium">assigned</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="flex flex-col gap-2.5 flex-1 min-h-0">
        <div class="flex flex-col gap-2.5 overflow-y-auto flex-1">
          ${items}
        </div>
        <div class="flex gap-2.5 pt-3 border-t border-white/10 mt-1 flex-shrink-0">
          <button
            class="flex-1 py-2.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            ${!canSelect ? 'disabled' : ''}
            onclick="this.dispatchEvent(new CustomEvent('selectAllAuditors'))"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Select All
          </button>
          <button
            class="flex-1 py-2.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-semibold flex items-center justify-center gap-1.5"
            onclick="this.dispatchEvent(new CustomEvent('deselectAllAuditors'))"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Clear
          </button>
        </div>
      </div>
    `;
  }

  private initializeCounterInput(): void {
    const container = this.container.querySelector('#bulkAuditCountContainer');
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
    // ✅ SECURITY: Set up event listeners for auditor clicks (prevents XSS)
    this.container.querySelectorAll('[data-action="auditor-click"]').forEach(element => {
      if (element.hasAttribute('data-listener-attached')) return;
      element.setAttribute('data-listener-attached', 'true');
      
      element.addEventListener('click', (e) => {
        const email = element.getAttribute('data-email');
        const disabled = element.getAttribute('data-disabled') === 'true';
        if (email && !disabled) {
          element.dispatchEvent(new CustomEvent('auditorClick', { detail: email }));
        }
      });
    });
    
    // ✅ SECURITY: Set up event listeners for auditor checkboxes (prevents XSS)
    this.container.querySelectorAll('.auditor-checkbox').forEach(checkbox => {
      if (checkbox.hasAttribute('data-listener-attached')) return;
      checkbox.setAttribute('data-listener-attached', 'true');
      
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        const email = checkbox.getAttribute('data-email');
        const checked = (checkbox as HTMLInputElement).checked;
        if (email) {
          checkbox.dispatchEvent(new CustomEvent('auditorSelect', { detail: { email, checked } }));
        }
      });
    });
    
    // Panel expand/collapse button
    const expandButton = this.container.querySelector('#panelExpandButton');
    expandButton?.addEventListener('togglePanel', () => {
      this.toggle();
    });

    const toggleOthersBtn = this.container.querySelector('[onclick*="toggleOthers"]');
    toggleOthersBtn?.addEventListener('toggleOthers', () => {
      this.config.onToggleIncludeOthers();
    });

    // Keep existing event listeners for CustomEvents
    const auditorSelects = this.container.querySelectorAll('[data-email]');
    auditorSelects.forEach(el => {
      el.addEventListener('auditorSelect', ((e: CustomEvent) => {
        const { email, checked } = e.detail;
        this.config.onAuditorSelect(email, checked);
      }) as EventListener);

      el.addEventListener('auditorClick', ((e: CustomEvent) => {
        const email = e.detail;
        const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (checkbox && !checkbox.disabled) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new CustomEvent('auditorSelect', {
            detail: { email, checked: checkbox.checked }
          }));
        }
      }) as EventListener);
    });

    const selectAllBtn = this.container.querySelector('[onclick*="selectAllAuditors"]');
    selectAllBtn?.addEventListener('selectAllAuditors', () => {
      this.config.onSelectAllAuditors();
    });

    const deselectAllBtn = this.container.querySelector('[onclick*="deselectAllAuditors"]');
    deselectAllBtn?.addEventListener('deselectAllAuditors', () => {
      this.config.onDeselectAllAuditors();
    });

    const assignBtn = this.container.querySelector('#assignButton');
    assignBtn?.addEventListener('assign', () => {
      this.config.onAssign();
    });

    const dateInput = this.container.querySelector('#scheduledDateInput') as HTMLInputElement;
    dateInput?.addEventListener('change', () => {
      const date = dateInput.value ? new Date(dateInput.value) : null;
      if (this.config.onScheduledDateChange) {
        this.config.onScheduledDateChange(date);
      }
    });

    const dateButtons = this.container.querySelectorAll('[onclick*="setDate"]');
    dateButtons.forEach(btn => {
      btn.addEventListener('setDate', ((e: CustomEvent) => {
        const option = e.detail;
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

        if (this.config.onScheduledDateChange) {
          this.config.onScheduledDateChange(date);
        }
      }) as EventListener);
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  update(config: Partial<AuditorSelectionPanelConfig>): void {
    const wasExpanded = this.isExpanded;
    const shouldAutoExpand = config.selectedEmployeeCount !== undefined && config.selectedEmployeeCount > 0;
    const shouldAutoCollapse = config.selectedEmployeeCount !== undefined && config.selectedEmployeeCount === 0;
    
    this.config = { ...this.config, ...config };
    
    // Auto-expand/collapse logic
    if (shouldAutoExpand && !wasExpanded) {
      this.isExpanded = true;
    } else if (shouldAutoCollapse && wasExpanded) {
      this.isExpanded = false;
    }
    
    this.render();
  }
}

