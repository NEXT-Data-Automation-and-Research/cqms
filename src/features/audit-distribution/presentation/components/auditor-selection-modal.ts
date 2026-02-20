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
  /** No longer used: all auditors are always shown, with Quality Analysts first. */
  includeOtherAuditors?: boolean;
  selectedAuditors: Set<string>;
  bulkAuditCount: number;
  selectedEmployeeCount: number;
  scheduledDate: Date | null;
  /** No longer used: "Others" button removed; all auditors shown by default. */
  onToggleIncludeOthers?: () => void;
  onAuditorSelect: (email: string, selected: boolean) => void;
  /** Called with the list of auditor emails to select (e.g. visible/filtered list for "Select all"). */
  onSelectAllAuditors: (emails: string[]) => void;
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
  /** Search query for filtering auditors (applies to all: auditors + others when visible) */
  private auditorSearchQuery: string = '';

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

  /** Role sort order: Quality Analyst first (most assigned), then others. */
  private static readonly ROLE_SORT_ORDER: Record<string, number> = {
    'Quality Analyst': 0,
    'Auditor': 1,
    'Quality Supervisor': 2,
    'Admin': 3,
    'Super Admin': 4,
    'Manager': 5
  };

  private sortAuditorsWithQualityAnalystsFirst(auditors: Auditor[]): Auditor[] {
    return [...auditors].sort((a, b) => {
      const orderA = AuditorSelectionModal.ROLE_SORT_ORDER[a.role] ?? 99;
      const orderB = AuditorSelectionModal.ROLE_SORT_ORDER[b.role] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || a.email).localeCompare(b.name || b.email);
    });
  }

  private render(): void {
    const {
      auditors,
      otherAuditors,
      selectedAuditors,
      bulkAuditCount,
      selectedEmployeeCount,
      scheduledDate
    } = this.config;

    const allAuditors = this.sortAuditorsWithQualityAnalystsFirst([...auditors, ...otherAuditors]);
    const auditorsToShow = this.filterAuditorsBySearch(allAuditors, this.auditorSearchQuery);
    const canSelectAuditors = bulkAuditCount > 0;
    const totalAudits = bulkAuditCount * selectedEmployeeCount;
    const auditsPerAuditor = selectedAuditors.size > 0
      ? Math.ceil(totalAudits / selectedAuditors.size)
      : 0;

    const auditorsList = this.renderAuditorsList(auditorsToShow, selectedAuditors, auditsPerAuditor, canSelectAuditors);
    const scheduledDateValue = scheduledDate ? scheduledDate.toISOString().split('T')[0] : '';
    const step1Done = bulkAuditCount > 0;
    const step2Done = !!scheduledDateValue;
    const step3Done = selectedAuditors.size > 0;
    const journeyMapHtml = this.renderJourneyMap(step1Done, step2Done, step3Done);

    safeSetHTML(this.modalContainer, `
      <div 
        id="auditorSelectionModal" 
        class="h-full ${this.isOpen ? '' : 'hidden'} transition-opacity duration-300"
      >
        <div class="bg-white rounded-lg border border-gray-200 shadow h-full flex flex-col overflow-hidden">
          <!-- Header (compact) -->
          <div class="bg-gray-50 border-b border-gray-200 px-3 py-2 flex-shrink-0">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-semibold text-gray-900 m-0 truncate">Assign audits</h2>
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
          <div class="flex-1 overflow-hidden px-3 py-2 min-h-0 flex flex-col">
            <div class="flex items-start w-full py-1.5 mb-2 flex-shrink-0 border-b border-gray-100 pb-2" role="list" aria-label="Assignment steps">
              ${journeyMapHtml}
            </div>
            <div class="flex flex-col gap-2 flex-1 min-h-0">
              <!-- Audits + Schedule (compact single card) -->
              <div class="bg-gray-50 rounded border border-gray-200 p-2 flex-shrink-0">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <label class="text-[10px] font-semibold text-gray-700 flex items-center gap-1" title="How many audits each selected employee will receive">
                    <span class="text-red-500">*</span> Audits per employee
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

              <!-- Auditors (compact table like people list) - grows to fill space. All roles shown, Quality Analysts first. -->
              <div class="bg-gray-50 rounded border border-gray-200 overflow-hidden flex flex-col min-h-0 flex-1">
                <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 flex-shrink-0">
                  <label class="text-[10px] font-semibold text-gray-700 flex items-center gap-1" title="Who will perform these audits">
                    <span class="text-red-500">*</span> Who will audit
                  </label>
                </div>
                ${!canSelectAuditors ? `
                <p class="px-2 py-2 text-[10px] text-amber-700 bg-amber-50 border-b border-amber-200/60 flex-shrink-0">Complete step 1 above to choose who will perform the audits.</p>
                ` : ''}
                <div class="px-2 py-1.5 border-b border-gray-200 flex-shrink-0">
                  <input
                    type="text"
                    id="auditorSearchInput"
                    class="w-full h-6 px-2 pl-6 text-[10px] border border-gray-300 rounded bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-gray-900 placeholder-gray-400"
                    placeholder="Search by name, email, or role"
                    value="${this.escapeHtml(this.auditorSearchQuery)}"
                    aria-label="Search auditors"
                  />
                </div>
                <div class="auditor-modal-list-scroll overflow-auto flex-1 min-h-[8rem]">
                  ${auditorsList}
                </div>
              </div>
            </div>
          </div>

          <!-- Footer (compact) -->
          <div class="border-t border-gray-200 px-3 py-2 flex-shrink-0 bg-gray-50">
            ${selectedEmployeeCount > 0 || selectedAuditors.size > 0 || totalAudits > 0 ? `
              <div class="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                ${selectedEmployeeCount > 0 ? `<span class="text-[10px] text-gray-600" title="Employees selected">Employees: <strong>${selectedEmployeeCount}</strong></span>` : ''}
                ${selectedAuditors.size > 0 ? `<span class="text-[10px] text-gray-600" title="Auditors selected">Auditors: <strong>${selectedAuditors.size}</strong></span>` : ''}
                ${totalAudits > 0 ? `<span class="text-[10px] text-gray-600" id="totalAuditsCount" title="Total audits to assign">Total: <strong>${totalAudits}</strong> audit${totalAudits !== 1 ? 's' : ''}</span>` : ''}
                ${auditsPerAuditor > 0 && selectedAuditors.size > 0 ? `<span class="text-[10px] text-gray-600" title="Audits per auditor">Per auditor: <strong>${auditsPerAuditor}</strong></span>` : ''}
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
                title="${selectedEmployeeCount === 0 ? 'Select employees first' : !canSelectAuditors ? 'Set audits per employee first' : selectedAuditors.size === 0 ? 'Select at least one auditor' : 'Assign these audits'}"
              >
                Assign ${totalAudits > 0 ? `${totalAudits} ` : ''}audit${totalAudits !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    `);

    this.initializeCounterInput();
    this.attachEventListeners();
  }

  /** Journey map: 3 steps with circles, connectors, and labels. Shows completed/current state. */
  private renderJourneyMap(step1Done: boolean, step2Done: boolean, step3Done: boolean): string {
    const steps: { label: string; done: boolean }[] = [
      { label: 'Set audits per employee', done: step1Done },
      { label: 'Choose date', done: step2Done },
      { label: 'Select who will audit', done: step3Done }
    ];
    return steps
      .map((step, index) => {
        const isLast = index === steps.length - 1;
        const connectorColor = step.done ? 'bg-primary' : 'bg-gray-200';
        const circleBg = step.done ? 'bg-primary border-primary' : 'bg-white border-gray-300';
        const circleContent = step.done
          ? '<svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
          : `<span class="text-[10px] font-semibold text-gray-500">${index + 1}</span>`;
        const labelColor = step.done ? 'text-primary font-semibold' : 'text-gray-500';
        return `
          <div class="flex flex-col items-center flex-1 relative" role="listitem">
            ${!isLast ? `<div class="absolute top-2.5 left-[calc(50%+0.5rem)] w-[calc(100%-1.25rem)] h-0.5 ${connectorColor} z-0" aria-hidden="true"></div>` : ''}
            <div class="w-5 h-5 rounded-full border-2 ${circleBg} flex items-center justify-center flex-shrink-0 mb-1.5 relative z-10">${circleContent}</div>
            <span class="text-[9px] ${labelColor} text-center leading-tight max-w-[4.5rem]">${this.escapeHtml(step.label)}</span>
          </div>
        `;
      })
      .join('');
  }

  /** Filter auditors by search query (name, email, role). Applies to all auditors including others. */
  private filterAuditorsBySearch(auditors: Auditor[], query: string): Auditor[] {
    const q = query.trim().toLowerCase();
    if (!q) return auditors;
    return auditors.filter(
      (a) =>
        (a.name ?? '').toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q) ||
        (a.role ?? '').toLowerCase().includes(q)
    );
  }

  private renderAuditorsList(
    auditors: Auditor[],
    selectedAuditors: Set<string>,
    auditsPerAuditor: number,
    canSelect: boolean
  ): string {
    if (auditors.length === 0) {
      return '<div class="text-center py-4 text-gray-500 text-[11px]">No auditors to show. Clear the search or try different words.</div>';
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
            <th class="text-center p-1.5 font-semibold text-gray-700 text-[10px] w-12" title="Audits this auditor will receive">Each</th>
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

    // Select all auditors (header checkbox) - applies to visible/filtered list only
    const selectAllAuditors = this.modalContainer.querySelector('#selectAllAuditors');
    if (selectAllAuditors) {
      selectAllAuditors.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        if (checked) {
          const all = this.sortAuditorsWithQualityAnalystsFirst([...this.config.auditors, ...this.config.otherAuditors]);
          const visible = this.filterAuditorsBySearch(all, this.auditorSearchQuery);
          this.config.onSelectAllAuditors(visible.map((a) => a.email));
        } else {
          this.config.onDeselectAllAuditors();
        }
      });
    }

    // Auditor search (filters all auditors including others)
    const auditorSearchInput = this.modalContainer.querySelector('#auditorSearchInput') as HTMLInputElement;
    if (auditorSearchInput) {
      auditorSearchInput.addEventListener('input', () => {
        this.auditorSearchQuery = auditorSearchInput.value;
        this.render();
        const newInput = this.modalContainer.querySelector('#auditorSearchInput') as HTMLInputElement;
        if (newInput) {
          newInput.focus();
          const len = newInput.value.length;
          newInput.setSelectionRange(len, len);
        }
      });
    }

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

