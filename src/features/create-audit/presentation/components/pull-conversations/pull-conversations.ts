/**
 * Pull Conversations Component
 * Intercom integration UI for fetching conversations
 */

import type { Conversation } from '../../../domain/entities.js';
import { safeSetHTML, escapeHtml } from '../../../../../utils/html-sanitizer.js';
import { logError } from '../../../../../utils/logging-helper.js';

export class PullConversations {
  private container: HTMLElement;
  private conversations: Conversation[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-base font-bold text-white mb-4">Pull Conversations from Intercom</h3>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Start Date</label>
              <input type="date" id="conversationStartDate" class="form-input w-full" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">End Date</label>
              <input type="date" id="conversationEndDate" class="form-input w-full" />
            </div>
          </div>
          <button type="button" id="pullConversationsBtn" 
                  class="w-full px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity">
            Pull Conversations
          </button>
          <div id="conversationsList" class="hidden mt-4 max-h-96 overflow-y-auto space-y-2">
            <!-- Conversations will be loaded here -->
          </div>
        </div>
      </div>
    `);
  }

  private attachEventListeners(): void {
    const btn = this.container.querySelector('#pullConversationsBtn') as HTMLButtonElement;
    if (btn) {
      btn.addEventListener('click', () => this.pullConversations());
    }
  }

  private async pullConversations(): Promise<void> {
    const startDate = (this.container.querySelector('#conversationStartDate') as HTMLInputElement).value;
    const endDate = (this.container.querySelector('#conversationEndDate') as HTMLInputElement).value;
    
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const btn = this.container.querySelector('#pullConversationsBtn') as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Pulling...';
    }

    try {
      // Dispatch event for controller to handle
      this.container.dispatchEvent(new CustomEvent('pull-conversations', {
        detail: { startDate, endDate }
      }));
    } catch (error) {
      logError('Error pulling conversations:', error);
      alert('Failed to pull conversations');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Pull Conversations';
      }
    }
  }

  displayConversations(conversations: Conversation[]): void {
    this.conversations = conversations;
    const list = this.container.querySelector('#conversationsList') as HTMLElement;
    if (!list) return;

    if (conversations.length === 0) {
      safeSetHTML(list, '<p class="text-sm text-white/60 text-center">No conversations found</p>');
      list.classList.remove('hidden');
      return;
    }

    const htmlContent = conversations.map(conv => `
      <div class="conversation-item p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors" 
           data-conversation-id="${escapeHtml(conv.id)}">
        <div class="text-sm font-semibold text-white truncate">${escapeHtml(conv.subject)}</div>
        <div class="text-xs text-white/60 mt-1">${escapeHtml(conv.clientName)}</div>
        <div class="text-xs text-white/50 mt-1">${this.formatDate(conv.created)}</div>
      </div>
    `).join('');

    safeSetHTML(list, htmlContent);

    list.classList.remove('hidden');

    // Attach click handlers
    list.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const conversationId = item.getAttribute('data-conversation-id');
        if (conversationId) {
          this.selectConversation(conversationId);
        }
      });
    });
  }

  private selectConversation(conversationId: string): void {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    this.container.dispatchEvent(new CustomEvent('conversation-selected', {
      detail: { conversation }
    }));
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

