/**
 * Conversation Panel Component
 * A flexible, reusable component for displaying Intercom conversations
 */

export interface ConversationPanelOptions {
    containerId?: string;
    showInfoGrid?: boolean;
    showAttributes?: boolean;
    autoLoad?: boolean;
    conversationId?: string;
    onConversationLoaded?: (conversation: any) => void;
    onError?: (error: Error) => void;
}

export class ConversationPanel {
    private container: HTMLElement | null = null;
    private chatMessagesContainer: HTMLElement | null = null;
    private transcriptChatView: HTMLElement | null = null;
    private transcriptTextView: HTMLElement | null = null;
    private viewChatBtn: HTMLElement | null = null;
    private options: ConversationPanelOptions;
    private currentConversation: any = null;

    constructor(options: ConversationPanelOptions = {}) {
        this.options = {
            containerId: 'conversationPanel',
            showInfoGrid: true,
            showAttributes: true,
            autoLoad: false,
            ...options
        };
    }

    /**
     * Initialize the conversation panel
     */
    async init(): Promise<void> {
        if (this.options.containerId) {
            this.container = document.getElementById(this.options.containerId);
            if (!this.container) {
                throw new Error(`Container with ID "${this.options.containerId}" not found`);
            }
        } else {
            // Create container if not provided
            this.container = document.createElement('div');
            this.container.id = 'conversationPanel';
            document.body.appendChild(this.container);
        }

        this.render();
        this.attachEventListeners();

        if (this.options.autoLoad && this.options.conversationId) {
            await this.loadConversation(this.options.conversationId);
        }
    }

    /**
     * Render the conversation panel HTML
     */
    private render(): void {
        if (!this.container) return;

        this.container.innerHTML = `
            <div style="display: flex; flex-direction: column; height: 100%; background: white; border-radius: 0.3234rem; border: 0.0304rem solid #e5e7eb; overflow: hidden;">
                <!-- Conversation Info Grid (Collapsible) -->
                ${this.options.showInfoGrid ? `
                <div id="conversationInfoGrid" style="background: #f9fafb; border-bottom: 0.0304rem solid #e5e7eb; padding: 0.3234rem;">
                    <button id="toggleInfoGridBtn" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0.3234rem 0.4852rem; background: transparent; border: none; cursor: pointer; font-size: 0.4852rem; font-weight: 600; color: #374151; font-family: 'Poppins', sans-serif;">
                        <span>Conversation Details</span>
                        <svg id="infoGridToggleIcon" style="width: 0.6064rem; height: 0.6064rem; transition: transform 0.2s;" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                    <div id="conversationInfoGridContent" style="display: none; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: 0.3234rem; font-family: 'Poppins', sans-serif; margin-top: 0.3234rem;">
                        <!-- Information cards will be populated here -->
                    </div>
                </div>
                ` : ''}
                
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
                
                <!-- Conversation Attributes Panel -->
                ${this.options.showAttributes ? `
                <div id="conversationAttributesPanel" style="background: white; border-top: 0.0304rem solid #e5e7eb; padding: 0; display: none; box-shadow: 0 -0.0606rem 0.1213rem rgba(0,0,0,0.05); overflow-y: auto;">
                    <div id="conversationAttributesContent" style="padding: 0.3234rem; display: block;">
                        <div id="conversationAttributesGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(6.0644rem, 1fr)); gap: 0.3234rem;">
                            <!-- Attributes will be dynamically populated here -->
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Cache references
        this.chatMessagesContainer = document.getElementById('chatMessagesContainer');
        this.transcriptChatView = document.getElementById('transcriptChatView');
        this.transcriptTextView = document.getElementById('transcriptTextView');
        this.viewChatBtn = document.getElementById('viewChatBtn');
    }

    /**
     * Attach event listeners
     */
    private attachEventListeners(): void {
        // Toggle info grid
        const toggleBtn = document.getElementById('toggleInfoGridBtn');
        const infoGridContent = document.getElementById('conversationInfoGridContent');
        const toggleIcon = document.getElementById('infoGridToggleIcon');

        if (toggleBtn && infoGridContent && toggleIcon) {
            toggleBtn.addEventListener('click', () => {
                const isHidden = infoGridContent.style.display === 'none';
                infoGridContent.style.display = isHidden ? 'grid' : 'none';
                toggleIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            });
        }
    }

    /**
     * Load conversation from Intercom
     */
    async loadConversation(conversationId: string): Promise<void> {
        console.log('🔄 [ConversationPanel] Loading conversation:', conversationId);

        if (!this.chatMessagesContainer) {
            throw new Error('Chat messages container not found');
        }

        // Show loading state
        this.showLoading();

        try {
            // Get Supabase configuration
            const supabaseUrl = (window as any).SupabaseConfig?.url || 
                               (window as any).supabaseClient?.supabaseUrl || 
                               (window as any).env?.SUPABASE_URL || '';
            const supabaseAnonKey = (window as any).SupabaseConfig?.anonKey || 
                                   (window as any).supabaseClient?.supabaseKey || 
                                   (window as any).env?.SUPABASE_ANON_KEY || '';

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Supabase configuration not found. Please refresh the page.');
            }

            // Fetch conversation data from Intercom API via Supabase Edge Function
            const edgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-proxy?conversation_id=${encodeURIComponent(conversationId)}&display_as=plaintext`;

            // Get user's JWT token
            let userToken = null;
            try {
                if ((window as any).getUserJWTToken && typeof (window as any).getUserJWTToken === 'function') {
                    userToken = await (window as any).getUserJWTToken();
                } else if ((window as any).supabaseClient) {
                    const { data: { session } } = await (window as any).supabaseClient.auth.getSession();
                    userToken = session?.access_token || null;
                }
            } catch (tokenError) {
                console.warn('⚠️ [ConversationPanel] Could not get user token:', tokenError);
            }

            if (!userToken) {
                throw new Error('User authentication required. Please log in again.');
            }

            const response = await fetch(edgeFunctionUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'apikey': supabaseAnonKey,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
                }
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const conversation = await response.json();
            this.currentConversation = conversation;

            console.log('✅ [ConversationPanel] Conversation loaded successfully');

            // Display conversation
            await this.displayConversation(conversation);

            // Call callback if provided
            if (this.options.onConversationLoaded) {
                this.options.onConversationLoaded(conversation);
            }

        } catch (error) {
            console.error('❌ [ConversationPanel] Error loading conversation:', error);
            this.showError(error as Error);
            
            if (this.options.onError) {
                this.options.onError(error as Error);
            }
        }
    }

    /**
     * Show loading state
     */
    private showLoading(): void {
        if (!this.chatMessagesContainer) return;

        this.chatMessagesContainer.innerHTML = `
            <div style="text-align: center; padding: 1.2937rem; color: #000000;">
                <div style="display: inline-block; width: 1.2937rem; height: 1.2937rem; border: 0.091rem solid #e5e7eb; border-top-color: #1A733E; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 0.6469rem;"></div>
                <p style="margin-top: 0.6469rem; font-size: 0.5659rem; font-weight: 500; margin-bottom: 0.3234rem;">Loading conversation from Intercom...</p>
                <div style="width: 100%; max-width: 12.937rem; height: 0.2426rem; background: #e5e7eb; border-radius: 0.1213rem; margin: 0 auto; overflow: hidden;">
                    <div id="conversationLoadingBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #1A733E, #2d8650); border-radius: 0.1213rem; transition: width 0.3s ease; animation: loadingPulse 1.5s ease-in-out infinite;"></div>
                </div>
                <p id="conversationLoadingStatus" style="font-size: 0.4852rem; color: #6b7280; margin-top: 0.3234rem;">Connecting to Intercom...</p>
            </div>
        `;
    }

    /**
     * Show error state
     */
    private showError(error: Error): void {
        if (!this.chatMessagesContainer) return;

        this.chatMessagesContainer.innerHTML = `
            <div style="text-align: center; padding: 1.2937rem; color: #ef4444;">
                <svg style="width: 2.4258rem; height: 2.4258rem; margin: 0 auto 0.6469rem; opacity: 0.7; color: #ef4444;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style="font-size: 0.5659rem; font-weight: 600; margin-bottom: 0.3234rem; color: #dc2626;">Failed to load conversation</p>
                <p style="font-size: 0.4852rem; color: #6b7280; margin-bottom: 0.1617rem;">${this.escapeHtml(error.message || 'Unknown error occurred')}</p>
            </div>
        `;
    }

    /**
     * Display conversation messages
     */
    private async displayConversation(conversation: any): Promise<void> {
        if (!this.chatMessagesContainer) return;

        // Handle different conversation_parts structures
        let parts = [];
        if (conversation.conversation_parts?.conversation_parts) {
            parts = conversation.conversation_parts.conversation_parts;
        } else if (Array.isArray(conversation.conversation_parts)) {
            parts = conversation.conversation_parts;
        } else if (conversation.parts && Array.isArray(conversation.parts)) {
            parts = conversation.parts;
        }

        if (parts.length === 0) {
            this.chatMessagesContainer.innerHTML = `
                <div style="text-align: center; padding: 1.2937rem; color: #6b7280;">
                    <p style="font-size: 0.5659rem;">No messages found in this conversation.</p>
                </div>
            `;
            return;
        }

        // Clear container
        this.chatMessagesContainer.innerHTML = '';
        this.chatMessagesContainer.style.gap = '0.3234rem';

        // Render each part
        parts.forEach((part: any) => {
            const messageDiv = this.renderMessagePart(part, conversation);
            if (messageDiv && this.chatMessagesContainer) {
                this.chatMessagesContainer.appendChild(messageDiv);
            }
        });

        // Show chat view
        if (this.transcriptChatView) {
            this.transcriptChatView.style.display = 'flex';
        }
        if (this.transcriptTextView) {
            this.transcriptTextView.style.display = 'none';
        }
    }

    /**
     * Render a single message part
     */
    private renderMessagePart(part: any, conversation: any): HTMLElement | null {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            width: 100%;
            display: flex;
            margin: 0.4043rem 0;
            padding: 0 0.8086rem;
        `;

        const author = part.author || {};
        const authorName = author.name || author.email || 'Unknown';
        const authorType = author.type || 'unknown';
        const body = part.body || '';
        const createdAt = part.created_at ? new Date(part.created_at * 1000) : new Date();

        const isAdmin = authorType === 'admin' || authorType === 'team';
        const isUser = authorType === 'user' || authorType === 'contact';
        const isBot = authorType === 'bot';

        // Determine alignment and styling
        if (isAdmin || isBot) {
            messageDiv.style.justifyContent = 'flex-end';
            messageDiv.style.alignItems = 'flex-end';
        } else {
            messageDiv.style.justifyContent = 'flex-start';
            messageDiv.style.alignItems = 'flex-start';
        }

        const bgColor = isAdmin ? '#1A733E' : isBot ? '#1d1d1d' : '#ffffff';
        const textColor = (isAdmin || isBot) ? '#ffffff' : '#374151';
        const borderRadius = isAdmin || isBot 
            ? '0.4852rem 0.4852rem 0.1617rem 0.4852rem'
            : '0.4852rem 0.4852rem 0.4852rem 0.1617rem';

        messageDiv.innerHTML = `
            <div style="display: inline-block; max-width: 70%; padding: 0.4852rem 0.6469rem; background: ${bgColor}; color: ${textColor}; border-radius: ${borderRadius};">
                <div style="font-size: 0.485rem; font-weight: 600; margin-bottom: 0.1617rem; opacity: 0.9;">${this.escapeHtml(authorName)}</div>
                <div style="font-size: 0.5659rem; line-height: 1.5;">${this.sanitizeMessageBody(body)}</div>
                <div style="font-size: 0.4043rem; color: ${isAdmin || isBot ? 'rgba(255,255,255,0.7)' : '#6b7280'}; margin-top: 0.1617rem;">
                    ${createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        `;

        return messageDiv;
    }

    /**
     * Sanitize message body
     */
    private sanitizeMessageBody(body: string): string {
        if (!body) return '';
        return this.escapeHtml(body);
    }

    /**
     * Escape HTML
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get current conversation
     */
    getConversation(): any {
        return this.currentConversation;
    }

    /**
     * Clear conversation
     */
    clear(): void {
        if (this.chatMessagesContainer) {
            this.chatMessagesContainer.innerHTML = `
                <div style="text-align: center; padding: 1.2937rem; color: #000000; font-size: 0.5659rem;">
                    <p>Enter an Interaction ID to automatically load conversation from Intercom</p>
                </div>
            `;
        }
        this.currentConversation = null;
    }
}

// Export singleton instance getter
let conversationPanelInstance: ConversationPanel | null = null;

export function getConversationPanel(options?: ConversationPanelOptions): ConversationPanel {
    if (!conversationPanelInstance) {
        conversationPanelInstance = new ConversationPanel(options);
    }
    return conversationPanelInstance;
}
