/**
 * Transcript Section Component
 * Handles the left column with interaction details and chat/transcript view
 */

export interface TranscriptSectionConfig {
  onInteractionIdChange?: (id: string) => void;
  onDateChange?: (date: string) => void;
  onClientNameChange?: (name: string) => void;
  onClientEmailChange?: (email: string) => void;
  onViewChat?: () => void;
  onCopyConversationId?: () => void;
  onCopyClientEmail?: () => void;
  onTranslate?: () => void;
  onToggleInfoGrid?: () => void;
}

export class TranscriptSection {
  private container: HTMLElement | null = null;
  private config: TranscriptSectionConfig;

  constructor(config: TranscriptSectionConfig = {}) {
    this.config = config;
  }

  /**
   * Render the transcript section component
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
  }

  /**
   * Initialize with existing DOM (doesn't replace HTML, just attaches listeners)
   */
  initializeWithExistingDOM(): void {
    this.attachEventListeners();
  }

  /**
   * Get HTML template
   */
  private getHTML(): string {
    return `
      <div id="leftColumn" style="display: flex; flex-direction: column; gap: 0.3234rem; flex: 0 0 33%; min-width: 13.6451rem; max-width: 75%; padding-left: 0.9704rem; padding-right: 0.6469rem; overflow-x: visible; overflow-y: visible; box-sizing: border-box;">
        <!-- Transcript -->
        <div style="display: flex; flex-direction: column; gap: 0.3234rem; flex: 1; min-height: 0;">
          <div style="background: #f9fafb; border-radius: 0.3234rem; padding: 0; border: 0.0304rem solid #e5e7eb; display: flex; flex-direction: column; flex: 1; min-height: 75vh; max-height: 100vh; transition: height 0.3s ease; overflow: hidden;">
            <div style="background: #f9fafb; padding: 0.6469rem; border-bottom: 0.0304rem solid #e5e7eb; flex-shrink: 0; display: flex; flex-direction: column; gap: 0.4852rem;">
              <!-- First Row: Transcript Title and Form Fields -->
              <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap;">
                  <h3 style="font-size: 0.6064rem; font-weight: 600; color: #1A733E; margin: 0; font-family: 'Poppins', sans-serif; display: flex; align-items: center; gap: 0.3234rem;">
                    <svg style="width: 0.7278rem; height: 0.7278rem;" viewBox="0 0 24 24" fill="#1A733E"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                    Transcript
                  </h3>
                  <div style="display: flex; align-items: center; gap: 0.1617rem;">
                    <span style="font-size: 0.4447rem; color: #000000; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap;">ID:</span>
                    <input type="text" id="interactionId" name="interactionId" required placeholder="Enter..." style="padding: 0.1617rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; min-width: 2.4258rem;">
                    <button type="button" id="copyConversationIdBtn" style="padding: 0.0808rem; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #000000; transition: all 0.2s;" title="Copy ID" onmouseover="this.style.color='#1A733E';" onmouseout="this.style.color='#000000';">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                    </button>
                    <button type="button" id="viewChatBtn" disabled style="padding: 0.1617rem 0.3234rem; background-color: #000000; color: white; border: none; border-radius: 0.1617rem; font-size: 0.4447rem; font-family: 'Poppins', sans-serif; cursor: not-allowed; white-space: nowrap; transition: all 0.2s ease; font-weight: 500; opacity: 0.6;" title="Open in Intercom (load conversation first)">Open</button>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 0.1617rem;">
                    <span style="font-size: 0.4447rem; color: #000000; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap;">Date:</span>
                    <input type="date" id="interactionDate" name="interactionDate" required style="padding: 0.1617rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600;">
                  </div>
                  <div style="width: 0.0304rem; height: 0.6469rem; background: #d1d5db;"></div>
                  <div style="display: flex; align-items: center; gap: 0.1617rem; min-width: 0;">
                    <span style="font-size: 0.4447rem; color: #000000; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap; flex-shrink: 0;">Name:</span>
                    <input type="text" id="clientName" name="clientName" readonly placeholder="Client name..." style="padding: 0.1617rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; min-width: 3.6387rem; box-sizing: border-box; background-color: #f9fafb;">
                  </div>
                  <div style="width: 0.0304rem; height: 0.6469rem; background: #d1d5db;"></div>
                  <div style="display: flex; align-items: center; gap: 0.1617rem; min-width: 0;">
                    <span style="font-size: 0.4447rem; color: #000000; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap; flex-shrink: 0;">Email:</span>
                    <input type="email" id="clientEmail" name="clientEmail" placeholder="client@..." style="padding: 0.1617rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; min-width: 3.6387rem; box-sizing: border-box;">
                    <button type="button" id="copyClientEmailBtn" style="padding: 0.0808rem; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #000000; transition: all 0.2s;" title="Copy Email" onmouseover="this.style.color='#1A733E';" onmouseout="this.style.color='#000000';">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <!-- Second Row: Quick Actions (Compact) -->
              <div id="clientNameSection" style="display: none; align-items: center; justify-content: flex-end; gap: 0.3234rem; padding-top: 0.3234rem; border-top: 0.0304rem solid #e5e7eb;">
                <div style="display: flex; align-items: center; gap: 0.1617rem;">
                  <button type="button" id="translateChatBtn" disabled style="padding: 0.2425rem 0.4043rem; background: #f3f4f6; border: 0.0304rem solid #d1d5db; border-radius: 0.2425rem; font-size: 0.4043rem; font-family: 'Poppins', sans-serif; font-weight: 500; color: #000000; cursor: not-allowed; transition: all 0.2s; display: flex; align-items: center; gap: 0.1617rem; white-space: nowrap; opacity: 0.6;" title="Translation feature is currently disabled">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem;">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                    </svg>
                    <span>Translate</span>
                  </button>
                </div>
              </div>
              <!-- Third Row: Collapsible Information Grid -->
              <div id="conversationInfoGrid" style="display: block; padding-top: 0.3234rem; border-top: 0.0304rem solid #e5e7eb; margin-top: 0.3234rem;">
                <button id="toggleInfoGridBtn" type="button" style="width: 100%; padding: 0.3234rem 0.4852rem; background: #f9fafb; border: 0.0304rem solid #e5e7eb; border-radius: 0.2425rem; font-family: 'Poppins', sans-serif; font-size: 0.4447rem; font-weight: 600; color: #1A733E; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s; margin-bottom: 0.3234rem;">
                  <span style="display: flex; align-items: center; gap: 0.2425rem;">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem;">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Conversation Details</span>
                  </span>
                  <svg id="toggleInfoGridIcon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem; transition: transform 0.2s; transform: rotate(0deg);">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                <div id="conversationInfoGridContent" style="display: none; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: 0.3234rem; font-family: 'Poppins', sans-serif;">
                  <!-- Information cards will be populated here -->
                </div>
              </div>
            </div>
            <!-- Chat Interface View -->
            <div id="transcriptChatView" style="display: flex; padding: 0.4852rem; background: #f0f2f5; overflow-y: auto; overflow-x: hidden; flex: 1; flex-direction: column; scrollbar-width: thin; scrollbar-color: #000000 #f0f2f5; position: relative; min-height: 0;">
              <!-- Chat messages will be dynamically inserted here -->
              <div id="chatMessagesContainer" style="display: flex; flex-direction: column; min-height: 0; width: 100%; gap: 0.3234rem; padding: 0.2426rem 0;">
                <div style="text-align: center; padding: 1.2937rem; color: #000000; font-size: 0.5659rem;">
                  <p>Enter an Interaction ID to automatically load conversation from Intercom</p>
                </div>
              </div>
            </div>
            <!-- Text Area View (Fallback) -->
            <div id="transcriptTextView" style="display: none; padding: 0.6469rem; background: white; overflow-y: auto; flex: 1; position: relative;">
              <textarea id="transcript" name="transcript" placeholder="Paste the interaction transcript here..." style="width: 100%; height: 100%; padding: 0; border: none; font-size: 0.5257rem; line-height: 1.6; color: #374151; font-family: 'Poppins', sans-serif; background-color: transparent; resize: none; box-sizing: border-box; outline: none; transition: padding-top 0.3s ease;"></textarea>
            </div>
          </div>
          <!-- Conversation Attributes Panel -->
          <div id="conversationAttributesPanel" style="background: white; border-radius: 0.3234rem; padding: 0; border: 0.0304rem solid #e5e7eb; display: none; box-shadow: 0 0.0606rem 0.1213rem rgba(0,0,0,0.05); overflow-y: auto;">
            <div id="conversationAttributesContent" style="padding: 0.3234rem; display: block;">
              <div id="conversationAttributesGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(6.0644rem, 1fr)); gap: 0.3234rem;">
                <!-- Attributes will be dynamically populated here -->
              </div>
            </div>
          </div>
          <!-- Conversation Attributes Panel for text view -->
          <div id="conversationAttributesPanelTextView" style="background: white; border-radius: 0.3234rem; padding: 0.3234rem; border: 0.0304rem solid #e5e7eb; display: none; box-shadow: 0 0.0606rem 0.1213rem rgba(0,0,0,0.05); overflow-y: auto;">
            <div id="conversationAttributesGridTextView" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(6.0644rem, 1fr)); gap: 0.3234rem;">
              <!-- Attributes will be dynamically populated here -->
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners (can be called separately for existing DOM)
   */
  attachEventListeners(): void {
    const interactionIdInput = document.getElementById('interactionId') as HTMLInputElement;
    const interactionDateInput = document.getElementById('interactionDate') as HTMLInputElement;
    const clientNameInput = document.getElementById('clientName') as HTMLInputElement;
    const clientEmailInput = document.getElementById('clientEmail') as HTMLInputElement;
    const viewChatBtn = document.getElementById('viewChatBtn') as HTMLButtonElement;
    const copyConversationIdBtn = document.getElementById('copyConversationIdBtn');
    const copyClientEmailBtn = document.getElementById('copyClientEmailBtn');
    const translateChatBtn = document.getElementById('translateChatBtn');
    const toggleInfoGridBtn = document.getElementById('toggleInfoGridBtn');

    if (interactionIdInput && this.config.onInteractionIdChange) {
      interactionIdInput.addEventListener('change', (e) => {
        this.config.onInteractionIdChange?.((e.target as HTMLInputElement).value);
      });
    }

    if (interactionDateInput && this.config.onDateChange) {
      interactionDateInput.addEventListener('change', (e) => {
        this.config.onDateChange?.((e.target as HTMLInputElement).value);
      });
    }

    if (clientNameInput && this.config.onClientNameChange) {
      clientNameInput.addEventListener('change', (e) => {
        this.config.onClientNameChange?.((e.target as HTMLInputElement).value);
      });
    }

    if (clientEmailInput && this.config.onClientEmailChange) {
      clientEmailInput.addEventListener('change', (e) => {
        this.config.onClientEmailChange?.((e.target as HTMLInputElement).value);
      });
    }

    if (viewChatBtn && this.config.onViewChat) {
      viewChatBtn.addEventListener('click', () => {
        this.config.onViewChat?.();
      });
    }

    if (copyConversationIdBtn && this.config.onCopyConversationId) {
      copyConversationIdBtn.addEventListener('click', () => {
        this.config.onCopyConversationId?.();
      });
    }

    if (copyClientEmailBtn && this.config.onCopyClientEmail) {
      copyClientEmailBtn.addEventListener('click', () => {
        this.config.onCopyClientEmail?.();
      });
    }

    if (translateChatBtn && this.config.onTranslate) {
      translateChatBtn.addEventListener('click', () => {
        this.config.onTranslate?.();
      });
    }

    if (toggleInfoGridBtn && this.config.onToggleInfoGrid) {
      toggleInfoGridBtn.addEventListener('click', () => {
        this.config.onToggleInfoGrid?.();
      });
    }
  }

  /**
   * Get interaction ID input element
   */
  getInteractionIdInput(): HTMLInputElement | null {
    return document.getElementById('interactionId') as HTMLInputElement;
  }

  /**
   * Get chat messages container
   */
  getChatMessagesContainer(): HTMLElement | null {
    return document.getElementById('chatMessagesContainer');
  }

  /**
   * Show chat view
   */
  showChatView(): void {
    const chatView = document.getElementById('transcriptChatView');
    const textView = document.getElementById('transcriptTextView');
    if (chatView) chatView.style.display = 'flex';
    if (textView) textView.style.display = 'none';
  }

  /**
   * Show text view
   */
  showTextView(): void {
    const chatView = document.getElementById('transcriptChatView');
    const textView = document.getElementById('transcriptTextView');
    if (chatView) chatView.style.display = 'none';
    if (textView) textView.style.display = 'block';
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
