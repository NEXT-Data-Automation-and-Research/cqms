/**
 * AI Audit Controls Component
 * Batch AI audit configuration
 */

import { safeSetHTML, escapeHtml } from '../../../../../utils/html-sanitizer.js';

export class AIAuditControls {
  private container: HTMLElement;
  private selectedConversations: string[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-base font-bold text-white mb-4">AI Audit Controls</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">Scorecard</label>
            <select id="aiAuditScorecard" class="form-input w-full">
              <option value="">Select scorecard...</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">Date</label>
            <input type="date" id="aiAuditDate" class="form-input w-full" />
          </div>
          <div class="flex items-center justify-between text-sm text-white/60">
            <span>Selected: <span id="selectedCount" class="font-semibold text-white">0</span></span>
          </div>
          <div class="flex gap-2">
            <button type="button" id="selectAllBtn" 
                    class="flex-1 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors">
              Select All
            </button>
            <button type="button" id="clearSelectionBtn" 
                    class="flex-1 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors">
              Clear
            </button>
          </div>
          <button type="button" id="processAIAuditBtn" 
                  class="w-full px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled>
            Process AI Audit
          </button>
          <div id="aiAuditStatus" class="hidden text-sm">
            <!-- Status messages will be shown here -->
          </div>
        </div>
      </div>
    `);
  }

  private attachEventListeners(): void {
    const selectAllBtn = this.container.querySelector('#selectAllBtn') as HTMLButtonElement;
    const clearBtn = this.container.querySelector('#clearSelectionBtn') as HTMLButtonElement;
    const processBtn = this.container.querySelector('#processAIAuditBtn') as HTMLButtonElement;
    
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => this.selectAll());
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSelection());
    }
    
    if (processBtn) {
      processBtn.addEventListener('click', () => this.processAIAudit());
    }
  }

  loadScorecards(scorecards: Array<{ id: string; name: string }>): void {
    const select = this.container.querySelector('#aiAuditScorecard') as HTMLSelectElement;
    if (!select) return;

    const optionsHtml = '<option value="">Select scorecard...</option>' +
      scorecards.map(sc => 
        `<option value="${escapeHtml(sc.id)}">${escapeHtml(sc.name)}</option>`
      ).join('');
    safeSetHTML(select, optionsHtml);
  }

  updateSelectedCount(count: number): void {
    this.selectedConversations = Array(count).fill('').map((_, i) => `conv-${i}`);
    const countEl = this.container.querySelector('#selectedCount') as HTMLElement;
    if (countEl) {
      countEl.textContent = String(count);
    }

    const processBtn = this.container.querySelector('#processAIAuditBtn') as HTMLButtonElement;
    if (processBtn) {
      processBtn.disabled = count === 0;
    }
  }

  private selectAll(): void {
    this.container.dispatchEvent(new CustomEvent('select-all-conversations'));
  }

  private clearSelection(): void {
    this.selectedConversations = [];
    this.updateSelectedCount(0);
    this.container.dispatchEvent(new CustomEvent('clear-selection'));
  }

  private processAIAudit(): void {
    const scorecardId = (this.container.querySelector('#aiAuditScorecard') as HTMLSelectElement).value;
    const date = (this.container.querySelector('#aiAuditDate') as HTMLInputElement).value;
    
    if (!scorecardId) {
      alert('Please select a scorecard');
      return;
    }

    this.container.dispatchEvent(new CustomEvent('process-ai-audit', {
      detail: { scorecardId, date, conversationIds: this.selectedConversations }
    }));
  }

  showStatus(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const statusEl = this.container.querySelector('#aiAuditStatus') as HTMLElement;
    if (!statusEl) return;

    const colors = {
      success: 'text-green-300',
      error: 'text-red-300',
      info: 'text-blue-300'
    };

    statusEl.className = `text-sm ${colors[type]}`;
    statusEl.textContent = message;
    statusEl.classList.remove('hidden');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

