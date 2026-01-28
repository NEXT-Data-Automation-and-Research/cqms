/**
 * Conversations Panel Component
 * Displays filters and conversation table for selected audit
 */

import { safeSetHTML, safeSetTableBodyHTML } from '../../../../../utils/html-sanitizer.js';
import { logInfo, logError, logWarn } from '../../../../../utils/logging-helper.js';
import { getAuthenticatedSupabase } from '../../../../../utils/authenticated-supabase.js';
// ConversationStatistics interface definition
export interface ConversationStatistics {
  totalConversations: number;
  totalParticipationParts: number;
  averageCSAT: number;
  conversationsWithRating: number;
  averageConversationLength: number;
  totalConversationLength: number;
  channelBreakdown: Record<string, number>;
  tagBreakdown: Record<string, number>;
  conversationsByDate: Record<string, number>;
}

export interface Conversation {
  id: string;
  client: string;
  subject: string;
  csat: number;
  cxScore: number;
  length: number; // Duration in minutes
  totalParts: number; // Total conversation parts count
  errorsDetected: number;
  tags: string[];
  created: string;
  aiStatus: 'Completed' | 'Processing' | 'Failed';
  channel?: string;
  timeToAdminReply?: number; // Response time in seconds
  handlingTime?: number; // Total handling time in seconds
  cxScoreExplanation?: string; // CX Score explanation text
  topics?: string[]; // Conversation topics
}

export class ConversationsPanel {
  private container: HTMLElement;
  private emptyState!: HTMLElement;
  private contentPanel!: HTMLElement;
  private tableBody: HTMLTableSectionElement | null = null;
  private selectedAudit: any = null;
  private conversations: Conversation[] = [];
  private selectedConversationIds: Set<string> = new Set();
  private onConversationsSelectedCallback?: (conversationIds: string[]) => void;
  private channelDropdownContainer!: HTMLElement;
  private channelDropdownButton!: HTMLElement;
  private channelDropdownMenu!: HTMLElement;
  private selectedChannel: string = '';
  private onStatisticsUpdatedCallback?: (stats: ConversationStatistics) => void;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    if (!this.container) {
      logError(`ConversationsPanel: Container with ID "${containerId}" not found.`);
      return;
    }

    this.render();
    this.emptyState = this.container.querySelector('#conversations-panel-empty')!;
    this.contentPanel = this.container.querySelector('#conversations-panel-content')!;
    
    // Try to get tableBody, but it might be inside a hidden div
    // We'll lazy-load it when needed if not found initially
    this.tableBody = this.container.querySelector('#conversations-table-body') as HTMLTableSectionElement | null;
    
    if (!this.tableBody) {
      logWarn('Table body not found during initialization, will query when needed');
    }

    this.attachEventListeners();
  }
  
  /**
   * Get table body element, lazy-loading if needed
   * Works even when element is inside hidden panel
   */
  private getTableBody(): HTMLTableSectionElement | null {
    // Always re-query if tableBody exists but is not in DOM
    if (this.tableBody && !this.tableBody.parentElement) {
      this.tableBody = null;
    }
    
    if (!this.tableBody) {
      // Try to find the table body - it might be inside hidden content panel
      // querySelector works even on hidden elements
      this.tableBody = this.container.querySelector('#conversations-table-body') as HTMLTableSectionElement;
      
      if (!this.tableBody) {
        // If still not found, try finding the content panel first
        const contentPanel = this.container.querySelector('#conversations-panel-content');
        if (contentPanel) {
          this.tableBody = contentPanel.querySelector('#conversations-table-body') as HTMLTableSectionElement;
        }
      }
      
      if (!this.tableBody) {
        // Try to find the table and get its tbody
        // First try content panel (even if hidden)
        const contentPanel = this.container.querySelector('#conversations-panel-content');
        let table: HTMLTableElement | null = null;
        
        if (contentPanel) {
          table = contentPanel.querySelector('table') as HTMLTableElement;
        }
        
        // Fallback: search in entire container
        if (!table) {
          table = this.container.querySelector('table') as HTMLTableElement;
        }
        
        if (table) {
          // Check if tbody already exists
          this.tableBody = table.querySelector('tbody#conversations-table-body') as HTMLTableSectionElement;
          if (!this.tableBody) {
            // Check if there's any tbody
            const existingTbody = table.querySelector('tbody');
            if (existingTbody) {
              // Use existing tbody and set ID
              existingTbody.id = 'conversations-table-body';
              this.tableBody = existingTbody;
            } else {
              // Create new tbody if it doesn't exist
              this.tableBody = document.createElement('tbody');
              this.tableBody.id = 'conversations-table-body';
              table.appendChild(this.tableBody);
            }
          }
        } else {
          // Table not found - this can happen if HTML hasn't loaded yet
          // Don't throw error, return null and let caller retry
          logWarn('Table element not found yet, will retry', {
            hasContentPanel: !!contentPanel,
            containerId: this.container.id,
            contentPanelHTML: contentPanel ? contentPanel.innerHTML.substring(0, 300) : 'no content panel'
          });
          return null;
        }
      }
    }
    
    return this.tableBody;
  }

  private render(): void {
    // HTML is loaded from conversations-panel.html
  }

  private initializeChannelDropdown(): void {
    this.channelDropdownContainer = this.container.querySelector('#channel-dropdown-container')!;
    if (!this.channelDropdownContainer) {
      logWarn('Channel dropdown container not found');
      return;
    }
    
    // Don't re-initialize if already initialized
    if (this.channelDropdownButton) {
      return;
    }

    const channels = [
      { value: '', label: 'All Channels' },
      { value: 'chat', label: 'Chat' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' }
    ];

    // Clear container
    this.channelDropdownContainer.textContent = '';
    
    // Create button
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'conversation-channel-dropdown-button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-haspopup', 'true');
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'conversation-channel-dropdown-label';
    labelSpan.textContent = 'All Channels';
    button.appendChild(labelSpan);
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'conversation-channel-dropdown-chevron');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 12 12');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M2 4L6 8L10 4');
    svg.appendChild(path);
    button.appendChild(svg);
    
    // Create menu
    const menu = document.createElement('div');
    menu.className = 'conversation-channel-dropdown-menu';
    
    channels.forEach(channel => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = `conversation-channel-dropdown-option ${channel.value === '' ? 'selected' : ''}`;
      option.setAttribute('data-value', this.escapeHtml(channel.value));
      option.textContent = channel.label;
      menu.appendChild(option);
    });
    
    this.channelDropdownContainer.appendChild(button);
    this.channelDropdownContainer.appendChild(menu);

    this.channelDropdownButton = this.channelDropdownContainer.querySelector('.conversation-channel-dropdown-button')!;
    this.channelDropdownMenu = this.channelDropdownContainer.querySelector('.conversation-channel-dropdown-menu')!;

    // Toggle dropdown
    this.channelDropdownButton?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleChannelDropdown();
    });

    // Handle option selection
    const options = this.channelDropdownMenu.querySelectorAll('.conversation-channel-dropdown-option');
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = (option as HTMLElement).dataset.value || '';
        this.selectChannel(value);
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.channelDropdownContainer && !this.channelDropdownContainer.contains(e.target as Node)) {
        this.closeChannelDropdown();
      }
    });
  }

  private toggleChannelDropdown(): void {
    const isOpen = this.channelDropdownMenu.classList.contains('show');
    if (isOpen) {
      this.closeChannelDropdown();
    } else {
      this.openChannelDropdown();
    }
  }

  private openChannelDropdown(): void {
    this.channelDropdownMenu.classList.add('show');
    this.channelDropdownButton.setAttribute('aria-expanded', 'true');
  }

  private closeChannelDropdown(): void {
    this.channelDropdownMenu.classList.remove('show');
    this.channelDropdownButton.setAttribute('aria-expanded', 'false');
  }

  private selectChannel(value: string): void {
    this.selectedChannel = value;
    const channels = [
      { value: '', label: 'All Channels' },
      { value: 'chat', label: 'Chat' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' }
    ];
    const selectedChannel = channels.find(c => c.value === value);
    const labelElement = this.channelDropdownButton.querySelector('.conversation-channel-dropdown-label');
    if (labelElement && selectedChannel) {
      labelElement.textContent = selectedChannel.label;
    }

    // Update selected state in menu
    const options = this.channelDropdownMenu.querySelectorAll('.conversation-channel-dropdown-option');
    options.forEach(option => {
      const optionValue = (option as HTMLElement).dataset.value || '';
      if (optionValue === value) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });

    this.closeChannelDropdown();
    this.pullConversations();
  }

  private attachEventListeners(): void {
    const selectAll = this.container.querySelector('#select-all-conversations') as HTMLInputElement;
    selectAll?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.toggleAllConversations(checked);
    });

    const useSelectedBtn = this.container.querySelector('#use-selected-conversations');
    useSelectedBtn?.addEventListener('click', () => this.useSelectedConversations());

    // Filter button
    const filterButton = this.container.querySelector('#conversation-filter-button');
    filterButton?.addEventListener('click', () => {
      // TODO: Open advanced filters modal/panel
      logInfo('Advanced filters clicked');
    });

    // Filter listeners - trigger pull when filters change
    const startDate = this.container.querySelector('#conversation-start-date') as HTMLInputElement;
    const endDate = this.container.querySelector('#conversation-end-date') as HTMLInputElement;
    const searchInput = this.container.querySelector('#conversation-search') as HTMLInputElement;

    [startDate, endDate].forEach(input => {
      input?.addEventListener('change', () => this.pullConversations());
    });

    searchInput?.addEventListener('input', () => this.applyFilters());
  }

  onConversationsSelected(callback: (conversationIds: string[]) => void): void {
    this.onConversationsSelectedCallback = callback;
  }

  onStatisticsUpdated(callback: (stats: ConversationStatistics) => void): void {
    this.onStatisticsUpdatedCallback = callback;
  }

  selectAudit(audit: any): void {
    this.selectedAudit = audit;
    this.showContent();
    this.updateAuditInfo();
    this.clearConversations();
  }

  async displayEmployee(employee: any): Promise<void> {
    try {
      logInfo('👤 displayEmployee called', { 
        employeeEmail: employee?.employee_email,
        employeeName: employee?.employee_name,
        hasEmployee: !!employee
      });
      
      if (!employee) {
        logError('displayEmployee called with null/undefined employee');
        return;
      }
      
      if (!employee.employee_email) {
        logError('displayEmployee called with employee missing email', { employee });
        return;
      }
      
      // Store employee summary for conversation filtering
      this.selectedAudit = {
        employee_id: employee.employee_id,
        employee_name: employee.employee_name,
        employee_email: employee.employee_email,
        intercom_alias: employee.intercom_alias,
        audit_count: employee.audit_count,
        audits: employee.audits
      };
      
      logInfo('✅ Employee stored in selectedAudit', { 
        employeeEmail: this.selectedAudit.employee_email 
      });
      
      // Ensure DOM elements are ready
      if (!this.contentPanel) {
        logError('Content panel not ready', { 
          hasContentPanel: !!this.contentPanel
        });
        return;
      }
      
      this.showContent();
      
      // Update employee info immediately (doesn't need table body)
      this.updateEmployeeInfo(employee);
      this.setDefaultDateRange();
      
      // Wait for DOM to update after removing hidden class
      // Use requestAnimationFrame + setTimeout to ensure DOM is ready
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            requestAnimationFrame(resolve);
          }, 100);
        });
      });
      
      // Force re-query the table body after content is shown
      this.tableBody = null;
      
      // Try multiple times with increasing delays to find table body
      let tableBody: HTMLTableSectionElement | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          tableBody = this.getTableBody();
          if (tableBody && tableBody.parentElement) {
            break;
          }
        } catch (error) {
          // Ignore errors and retry
        }
        
        if (attempt < 4) {
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      }
      
      // Last attempt: directly query the DOM with more aggressive searching
      if (!tableBody || !tableBody.parentElement) {
        const contentPanel = this.container.querySelector('#conversations-panel-content');
        if (contentPanel) {
          // Try multiple query strategies
          let table = contentPanel.querySelector('table');
          if (!table) {
            // Try finding by class or any table element
            table = contentPanel.querySelector('table.min-w-full') || 
                   contentPanel.querySelector('table') ||
                   this.container.querySelector('table');
          }
          
          if (table) {
            let tbody = table.querySelector('tbody#conversations-table-body');
            if (!tbody) {
              tbody = table.querySelector('tbody');
            }
            if (tbody) {
              this.tableBody = tbody as HTMLTableSectionElement;
              tableBody = this.tableBody;
              logInfo('✅ Found table body via direct query', {
                hasTableBody: !!tableBody,
                hasParent: !!tableBody.parentElement
              });
            } else {
              // Create tbody if table exists but tbody doesn't
              this.tableBody = document.createElement('tbody');
              this.tableBody.id = 'conversations-table-body';
              table.appendChild(this.tableBody);
              tableBody = this.tableBody;
              logInfo('✅ Created table body element', {
                hasTableBody: !!tableBody,
                hasParent: !!tableBody.parentElement
              });
            }
          } else {
            logError('Table still not found after all attempts', {
              hasContentPanel: !!contentPanel,
              contentPanelHTML: contentPanel ? contentPanel.innerHTML.substring(0, 500) : 'no content panel',
              allTables: Array.from(this.container.querySelectorAll('table')).length
            });
          }
        }
      }
      
      // Clear conversations if table body is available
      if (tableBody && tableBody.parentElement) {
        this.clearConversations();
      } else {
        logWarn('Table body not found, but continuing to pull conversations', {
          hasTableBody: !!tableBody,
          hasParent: tableBody ? !!tableBody.parentElement : false,
          contentPanelVisible: !this.contentPanel.classList.contains('hidden'),
          contentPanelExists: !!this.contentPanel
        });
      }
      
      logInfo('📞 About to call pullConversations', {
        employeeEmail: this.selectedAudit?.employee_email
      });
      
      // Automatically pull conversations when employee is selected
      // Don't await - let it run asynchronously
      this.pullConversations().catch((error) => {
        logError('Error in pullConversations:', error);
      });
      
    } catch (error) {
      logError('Error in displayEmployee:', error);
      // Don't re-throw - log the error and let the UI continue
      // The error is already logged, and we don't want to break the UI flow
    }
  }

  private setDefaultDateRange(): void {
    const startDateInput = this.container.querySelector('#conversation-start-date') as HTMLInputElement;
    const endDateInput = this.container.querySelector('#conversation-end-date') as HTMLInputElement;

    if (startDateInput && endDateInput) {
      // Always set to yesterday when employee is selected
      // Set start to beginning of yesterday (00:00:00 UTC)
      const yesterdayStart = new Date();
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setUTCHours(0, 0, 0, 0);
      const startDateStr = yesterdayStart.toISOString().split('T')[0];

      // Set end to end of yesterday (23:59:59 UTC)
      const yesterdayEnd = new Date();
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      yesterdayEnd.setUTCHours(23, 59, 59, 999);
      const endDateStr = yesterdayEnd.toISOString().split('T')[0];

      startDateInput.value = startDateStr;
      endDateInput.value = endDateStr;
    }
  }

  private updateEmployeeInfo(employee: any): void {
    const employeeName = this.container.querySelector('#selected-audit-employee-name');
    const auditMeta = this.container.querySelector('#selected-audit-meta');

    if (employeeName) {
      employeeName.textContent = employee.employee_name || employee.employee_email;
    }

    if (auditMeta) {
      const alias = employee.intercom_alias ? `${employee.intercom_alias}` : 'No alias';
      auditMeta.textContent = `${employee.audit_count} audit${employee.audit_count !== 1 ? 's' : ''} • ${alias}`;
    }
  }

  private showContent(): void {
    try {
      if (!this.emptyState || !this.contentPanel) {
        logError('Cannot show content: DOM elements not ready', {
          hasEmptyState: !!this.emptyState,
          hasContentPanel: !!this.contentPanel
        });
        return;
      }
      
      this.emptyState.classList.add('hidden');
      this.contentPanel.classList.remove('hidden');
      
      // Reset tableBody reference so it will be re-queried after content is shown
      this.tableBody = null;
      
      // Initialize dropdown when content is shown (container is inside hidden panel initially)
      // Use setTimeout to ensure DOM is ready after removing hidden class
      setTimeout(() => {
        try {
          if (!this.channelDropdownContainer || !this.channelDropdownButton) {
            this.initializeChannelDropdown();
          }
        } catch (error) {
          logError('Error initializing channel dropdown:', error);
        }
      }, 0);
    } catch (error) {
      logError('Error in showContent:', error);
    }
  }

  private updateAuditInfo(): void {
    const employeeName = this.container.querySelector('#selected-audit-employee-name');
    const auditMeta = this.container.querySelector('#selected-audit-meta');

    if (employeeName) {
      employeeName.textContent = this.selectedAudit.employee_name || this.selectedAudit.employee_email;
    }

    if (auditMeta) {
      const date = this.selectedAudit.scheduled_date || this.selectedAudit.created_at?.split('T')[0] || 'N/A';
      auditMeta.textContent = `${this.selectedAudit.scorecard_name || 'N/A'} • ${date}`;
    }
  }

  async pullConversations(): Promise<void> {
    if (!this.selectedAudit) {
      const cardsContainer = this.container.querySelector('#conversations-cards-body');
      if (cardsContainer) {
        cardsContainer.innerHTML = `
          <div class="col-span-1 px-4 py-8 text-center">
            <p class="text-white/60 text-sm">No employee selected</p>
          </div>
        `;
      }
      return;
    }

    const startDateInput = this.container.querySelector('#conversation-start-date') as HTMLInputElement;
    const endDateInput = this.container.querySelector('#conversation-end-date') as HTMLInputElement;
    const startDate = startDateInput?.value;
    const endDate = endDateInput?.value;

    // Set default dates if not provided (yesterday)
    if (!startDate || !endDate) {
      this.setDefaultDateRange();
      const updatedStartDate = (this.container.querySelector('#conversation-start-date') as HTMLInputElement)?.value;
      const updatedEndDate = (this.container.querySelector('#conversation-end-date') as HTMLInputElement)?.value;
      if (!updatedStartDate || !updatedEndDate) {
        const cardsContainer = this.container.querySelector('#conversations-cards-body');
        if (cardsContainer) {
          cardsContainer.innerHTML = `
            <div class="col-span-1 px-4 py-8 text-center">
              <p class="text-white/60 text-sm">Please select date range</p>
            </div>
          `;
        }
        return;
      }
    }

    // Show loading state
    const cardsContainer = this.container.querySelector('#conversations-cards-body');
    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="col-span-1 px-4 py-12 text-center">
          <div class="flex flex-col items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <svg class="w-6 h-6 text-white/40 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </div>
            <p class="text-white/60 text-sm font-medium">Loading conversations...</p>
          </div>
        </div>
      `;
    }

    try {
      const employeeEmail = this.selectedAudit.employee_email;
      const intercomAlias = this.selectedAudit.intercom_alias;
      
      if (!employeeEmail) {
        throw new Error('Employee email is required');
      }

      // ✅ SECURITY: Use authenticated Supabase helper
      const supabase = await getAuthenticatedSupabase();

      // Get authentication token (auth methods are allowed per security rules)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Get Supabase URL from client or environment
      // Try to get from the Supabase client first (most reliable)
      let supabaseUrl: string | null = null;
      
      // Method 1: Try to get from Supabase client instance
      try {
        if (supabase && (supabase as any).supabaseUrl) {
          supabaseUrl = (supabase as any).supabaseUrl;
        } else if (supabase && (supabase as any).supabaseKey) {
          // If we have the client, try to get URL from window.env or fetch
          supabaseUrl = (window as any).env?.SUPABASE_URL || null;
        }
      } catch (e) {
        logWarn('Could not get Supabase URL from client:', e);
      }
      
      // Method 2: Try window.env
      if (!supabaseUrl) {
        supabaseUrl = (window as any).env?.SUPABASE_URL || null;
      }
      
      // Method 3: Fetch from API
      if (!supabaseUrl) {
        supabaseUrl = await this.getSupabaseUrlFromEnv();
      }
      
      if (!supabaseUrl) {
        logError('Supabase URL not found. Tried: client instance, window.env, /api/env');
        throw new Error('Supabase URL not configured. Please check your environment variables.');
      }

      // Build edge function URL
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-conversations`;
      
      logInfo('🔗 Edge function URL', { url: edgeFunctionUrl, employeeEmail });
      
      // Build query parameters
      const params = new URLSearchParams({
        employee_email: employeeEmail,
      });

      // Add date range
      const finalStartDate = startDate || (this.container.querySelector('#conversation-start-date') as HTMLInputElement)?.value;
      const finalEndDate = endDate || (this.container.querySelector('#conversation-end-date') as HTMLInputElement)?.value;
      
      if (finalStartDate && finalEndDate) {
        // Convert to Unix timestamps (seconds) - Use UTC to avoid timezone issues
        const startDateObj = new Date(finalStartDate + 'T00:00:00Z');
        const endDateObj = new Date(finalEndDate + 'T23:59:59Z');
        const startTimestamp = Math.floor(startDateObj.getTime() / 1000);
        const endTimestamp = Math.floor(endDateObj.getTime() / 1000);
        params.append('updated_since', String(startTimestamp));
        params.append('updated_before', String(endTimestamp));
      } else {
        // If no dates provided, use yesterday as default
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setUTCHours(0, 0, 0, 0);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setUTCHours(23, 59, 59, 999);
        params.append('updated_since', String(Math.floor(yesterday.getTime() / 1000)));
        params.append('updated_before', String(Math.floor(endOfYesterday.getTime() / 1000)));
      }

      logInfo('📞 Fetching conversations for employee', { 
        employeeEmail, 
        intercomAlias, 
        dateRange: `${finalStartDate} to ${finalEndDate}`,
        url: edgeFunctionUrl,
        params: params.toString()
      });

      // Call edge function with authentication
      let response: Response;
      try {
        const requestUrl = `${edgeFunctionUrl}?${params.toString()}`;
        logInfo('🔗 Calling edge function', { url: requestUrl, employeeEmail });
        
        response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        
        logInfo('📥 Edge function response received', { 
          status: response.status, 
          statusText: response.statusText,
          ok: response.ok 
        });
      } catch (fetchError) {
        logError('Network error calling edge function:', fetchError);
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to edge function'}`);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        let errorData: any;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        logError('Edge function error response', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorData 
        });
        
        throw new Error(errorData.error || errorData.message || `Failed to fetch conversations: ${response.status} ${response.statusText}`);
      }

      const data = await response.json().catch(async (parseError) => {
        const text = await response.text();
        logError('Failed to parse edge function response', { error: parseError, responseText: text });
        throw new Error('Invalid response from edge function');
      });
      
      logInfo('📊 Edge function response', { 
        conversationCount: data.conversations?.length || 0,
        totalCount: data.total_count,
        hasMore: data.has_more,
        participationCount: data.participation_count,
        employeeEmail: data.employee_email,
        date: data.date
      });
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        logError('Invalid edge function response structure', { data });
        throw new Error('Invalid response format from edge function');
      }
      
      if (!Array.isArray(data.conversations)) {
        logWarn('Edge function returned non-array conversations', { conversations: data.conversations });
        data.conversations = [];
      }
      
      // Transform Intercom conversations to our Conversation format
      // Log first conversation structure for debugging
      if (data.conversations && data.conversations.length > 0) {
        logInfo('📋 Sample conversation structure', {
          firstConv: JSON.stringify(data.conversations[0], null, 2).substring(0, 1000),
          hasSource: !!data.conversations[0].source,
          hasRating: !!data.conversations[0].rating,
          hasTags: !!data.conversations[0].tags,
          hasContacts: !!data.conversations[0].contacts,
          sourceType: data.conversations[0].source?.type,
          sourceAuthor: data.conversations[0].source?.author,
          ratingValue: data.conversations[0].rating
        });
      }
      
      this.conversations = (data.conversations || []).map((conv: any) => {
        try {
        // Helper function to extract conversation parts array
        const getConversationParts = (conv: any): any[] => {
          if (!conv.conversation_parts) return [];
          
          // If it's already an array, return it
          if (Array.isArray(conv.conversation_parts)) {
            return conv.conversation_parts;
          }
          
          // If it's an object, check for nested arrays
          if (typeof conv.conversation_parts === 'object') {
            if (Array.isArray(conv.conversation_parts.conversation_parts)) {
              return conv.conversation_parts.conversation_parts;
            }
            if (Array.isArray(conv.conversation_parts.parts)) {
              return conv.conversation_parts.parts;
            }
          }
          
          return [];
        };
        
        const parts = getConversationParts(conv);
        
        // Extract subject from source or first part body
        let subject = '';
        
        // Try title first (Intercom API v2.14)
        if (conv.title) {
          subject = String(conv.title).trim();
        }
        
        // Try source.subject
        if (!subject && conv.source && typeof conv.source === 'object') {
          subject = conv.source.subject || conv.source.body || '';
        }
        
        // Try source.title
        if (!subject && conv.source && typeof conv.source === 'object' && conv.source.title) {
          subject = String(conv.source.title).trim();
        }
        
        // Fallback to first part body
        if (!subject && parts.length > 0) {
          // Try to get subject from first user message
          const firstUserPart = parts.find((p: any) => p.author?.type === 'user');
          if (firstUserPart?.body) {
            subject = String(firstUserPart.body).substring(0, 100).replace(/\n/g, ' ').trim();
          } else if (parts[0]?.body) {
            subject = String(parts[0].body).substring(0, 100).replace(/\n/g, ' ').trim();
          }
        }
        
        // Final fallback
        if (!subject) {
          const convId = String(conv.id || 'unknown');
          subject = `Conversation ${convId}`;
        }
        
        // Extract client email/name from source or conversation parts
        let clientEmail = '';
        let clientName = '';
        
        // Try source.author first (Intercom API structure)
        if (conv.source && typeof conv.source === 'object') {
          if (conv.source.author) {
            clientEmail = conv.source.author.email || '';
            clientName = conv.source.author.name || '';
          }
          // Also check source.contacts for contact information
          if (!clientEmail && conv.source.contacts && Array.isArray(conv.source.contacts) && conv.source.contacts.length > 0) {
            const contact = conv.source.contacts[0];
            clientEmail = contact.email || '';
            clientName = contact.name || '';
          }
        }
        
        // Fallback: check conversation parts for user author
        if (!clientEmail && !clientName) {
          const userPart = parts.find((p: any) => p.author?.type === 'user');
          if (userPart?.author) {
            clientEmail = userPart.author.email || '';
            clientName = userPart.author.name || '';
          }
        }
        
        // Fallback: check contacts array directly on conversation
        if (!clientEmail && !clientName && conv.contacts && Array.isArray(conv.contacts) && conv.contacts.length > 0) {
          const contact = conv.contacts[0];
          clientEmail = contact.email || '';
          clientName = contact.name || '';
        }
        
        // Use email username or name as client identifier
        const client = clientEmail ? clientEmail.split('@')[0] : (clientName || 'Unknown');
        
        // Calculate conversation length (duration) in minutes
        let lengthMinutes = 0;
        if (conv.created_at && conv.updated_at) {
          const created = typeof conv.created_at === 'number' ? conv.created_at * 1000 : new Date(conv.created_at).getTime();
          const updated = typeof conv.updated_at === 'number' ? conv.updated_at * 1000 : new Date(conv.updated_at).getTime();
          lengthMinutes = Math.round((updated - created) / (1000 * 60)); // Convert to minutes
        }
        
        // Get total conversation parts count from statistics
        const totalParts = conv.statistics?.count_conversation_parts || conv.participation_part_count || parts.length;
        
        // Extract tags - Intercom API v2.14 structure: tags.tags[] with name field
        let tags: string[] = [];
        if (conv.tags && typeof conv.tags === 'object') {
          // Check for tags.tags array (Intercom API structure)
          if (conv.tags.tags && Array.isArray(conv.tags.tags)) {
            tags = conv.tags.tags.map((tag: any) => {
              if (tag && typeof tag === 'object' && tag.name) return tag.name;
              if (typeof tag === 'string') return tag;
              if (tag && typeof tag === 'object' && tag.id) return String(tag.id);
              return null;
            }).filter((tag: any): tag is string => Boolean(tag));
          } else if (Array.isArray(conv.tags)) {
            // Direct array format
            tags = conv.tags.map((tag: any) => {
              if (typeof tag === 'string') return tag;
              if (tag && typeof tag === 'object' && tag.name) return tag.name;
              if (tag && typeof tag === 'object' && tag.id) return String(tag.id);
              return null;
            }).filter((tag: any): tag is string => Boolean(tag));
          } else if (conv.tags.data && Array.isArray(conv.tags.data)) {
            // Alternative structure with data array
            tags = conv.tags.data.map((tag: any) => {
              if (typeof tag === 'string') return tag;
              if (tag && typeof tag === 'object' && tag.name) return tag.name;
              if (tag && typeof tag === 'object' && tag.id) return String(tag.id);
              return null;
            }).filter((tag: any): tag is string => Boolean(tag));
          }
        }
        
        // Extract topics
        let topics: string[] = [];
        if (conv.topics && typeof conv.topics === 'object') {
          if (conv.topics.topics && Array.isArray(conv.topics.topics)) {
            topics = conv.topics.topics.map((topic: any) => {
              if (topic && typeof topic === 'object' && topic.name) return topic.name;
              if (typeof topic === 'string') return topic;
              return null;
            }).filter((topic: any): topic is string => Boolean(topic));
          } else if (Array.isArray(conv.topics)) {
            topics = conv.topics.map((topic: any) => {
              if (typeof topic === 'string') return topic;
              if (topic && typeof topic === 'object' && topic.name) return topic.name;
              return null;
            }).filter((topic: any): topic is string => Boolean(topic));
          }
        }
        
        // Determine channel from source type
        const channelMap: Record<string, string> = {
          'conversation': 'chat',
          'email': 'email',
          'phone': 'phone',
          'twitter': 'twitter',
          'facebook': 'facebook',
          'instagram': 'instagram',
          'whatsapp': 'whatsapp',
        };
        const channel = channelMap[conv.source?.type] || 'chat';

        // Format created date
        let createdDate = '';
        if (conv.created_at_iso) {
          createdDate = conv.created_at_iso.split('T')[0];
        } else if (conv.created_at) {
          const created = typeof conv.created_at === 'number' ? new Date(conv.created_at * 1000) : new Date(conv.created_at);
          createdDate = created.toISOString().split('T')[0];
        }

        // Ensure ID is a string
        const conversationId = String(conv.id || 'unknown');
        
        return {
          id: conversationId,
          client: client,
          subject: subject,
          csat: (() => {
            // Intercom conversation_rating.rating field (1-5 scale)
            if (conv.conversation_rating && typeof conv.conversation_rating === 'object') {
              if (typeof conv.conversation_rating.rating === 'number') {
                return conv.conversation_rating.rating;
              }
            }
            // Fallback: check rating field directly
            if (conv.rating) {
              if (typeof conv.rating === 'number') return conv.rating;
              if (typeof conv.rating === 'object' && conv.rating.rating) {
                return typeof conv.rating.rating === 'number' ? conv.rating.rating : 0;
              }
            }
            return 0;
          })(),
          cxScore: (() => {
            // CX Score from custom_attributes
            if (conv.custom_attributes && typeof conv.custom_attributes === 'object') {
              const cxScore = conv.custom_attributes['CX Score rating'];
              if (typeof cxScore === 'number') return cxScore;
              if (typeof cxScore === 'string') {
                const parsed = parseFloat(cxScore);
                return isNaN(parsed) ? 0 : parsed;
              }
            }
            return 0;
          })(),
          length: lengthMinutes, // Duration in minutes
          totalParts: totalParts, // Total conversation parts count
          errorsDetected: 0, // Would need AI analysis
          tags: Array.isArray(tags) ? tags : [],
          topics: Array.isArray(topics) ? topics : [],
          timeToAdminReply: conv.statistics?.time_to_admin_reply || undefined,
          handlingTime: conv.statistics?.handling_time || undefined,
          cxScoreExplanation: conv.custom_attributes?.['CX Score explanation'] || undefined,
          created: createdDate,
          aiStatus: 'Completed' as const,
          channel: channel
        };
        } catch (error) {
          logError('❌ Error processing conversation', error);
          // Return a safe default conversation object
          return {
            id: String(conv.id || 'unknown'),
            client: 'Unknown',
            subject: `Conversation ${conv.id || 'unknown'}`,
            csat: 0,
            cxScore: 0,
            length: 0,
            totalParts: 0,
            errorsDetected: 0,
            tags: [],
            topics: [],
            created: conv.created_at_iso || (conv.created_at ? new Date(typeof conv.created_at === 'number' ? conv.created_at * 1000 : new Date(conv.created_at).getTime()).toISOString().split('T')[0] : ''),
            aiStatus: 'Completed' as const,
            channel: 'chat'
          };
        }
      }).filter(Boolean); // Remove any null/undefined entries

      logInfo(`✅ Loaded ${this.conversations.length} conversations`, {
        originalCount: data.conversations?.length || 0,
        transformedCount: this.conversations.length,
        employeeEmail
      });

      // Calculate statistics from conversations using dynamic import
      let statistics: ConversationStatistics;
      try {
        // @ts-ignore - Runtime import path
        const statsModule = await import('/js/features/create-audit/presentation/utils/conversation-statistics.js');
        statistics = statsModule.calculateConversationStatistics(
          this.conversations as Conversation[],
          data.participation_count || 0
        );
      } catch (error) {
        logError('Error loading conversation statistics module:', error);
        // Fallback: create empty statistics
        statistics = {
          totalConversations: this.conversations.length,
          totalParticipationParts: data.participation_count || 0,
          averageCSAT: 0,
          conversationsWithRating: 0,
          averageConversationLength: 0,
          totalConversationLength: 0,
          channelBreakdown: {},
          tagBreakdown: {},
          conversationsByDate: {}
        };
      }

      // Notify statistics callback if registered
      if (this.onStatisticsUpdatedCallback) {
        this.onStatisticsUpdatedCallback(statistics);
      }

      // Ensure conversations are displayed even if filters would hide them initially
      if (this.conversations.length > 0) {
        this.applyFilters();
      } else {
        // If no conversations after transformation, still render to show empty state
        this.renderConversations([]);
      }
    } catch (error) {
      
      logError('❌ Error pulling conversations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const cardsContainer = this.container.querySelector('#conversations-cards-body');
      if (cardsContainer) {
        cardsContainer.innerHTML = `
          <div class="col-span-1 px-4 py-16 text-center">
            <div class="flex flex-col items-center gap-3">
              <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p class="text-red-400 text-sm font-semibold">Error loading conversations</p>
              <p class="text-white/50 text-xs">${this.escapeHtml(errorMessage)}</p>
            </div>
          </div>
        `;
      } else {
        logError('Cannot display error: cards container not available');
      }
    }
  }

  /**
   * Get Supabase URL from environment API or cached value
   */
  private async getSupabaseUrlFromEnv(): Promise<string | null> {
    try {
      // Try to get from cache first (stored during initialization)
      const cachedUrl = localStorage.getItem('supabase_url');
      if (cachedUrl) {
        logInfo('Using cached Supabase URL');
        return cachedUrl;
      }

      // Fetch from API
      const response = await fetch('/api/env');
      if (response.ok) {
        const env = await response.json();
        const url = env.SUPABASE_URL || null;
        
        // Cache it for future use
        if (url) {
          localStorage.setItem('supabase_url', url);
        }
        
        return url;
      } else {
        logWarn(`Failed to fetch Supabase URL: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      logWarn('Failed to fetch Supabase URL from environment:', error);
    }
    return null;
  }

  private applyFilters(): void {
    const startDate = (this.container.querySelector('#conversation-start-date') as HTMLInputElement)?.value;
    const endDate = (this.container.querySelector('#conversation-end-date') as HTMLInputElement)?.value;
    const searchTerm = (this.container.querySelector('#conversation-search') as HTMLInputElement)?.value.toLowerCase();

    let filtered = [...this.conversations];

    if (startDate) {
      filtered = filtered.filter(conv => conv.created >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(conv => conv.created <= endDate);
    }
    if (this.selectedChannel) {
      filtered = filtered.filter(conv => conv.channel === this.selectedChannel);
    }
    if (searchTerm) {
      filtered = filtered.filter(conv =>
        conv.client.toLowerCase().includes(searchTerm) ||
        conv.subject.toLowerCase().includes(searchTerm) ||
        conv.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    this.renderConversations(filtered);
  }

  private renderConversations(conversations: Conversation[]): void {
    // Update conversations count
    const countElement = this.container.querySelector('#conversations-count');
    if (countElement) {
      countElement.textContent = `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`;
    }

    const cardsContainer = this.container.querySelector('#conversations-cards-body');
    if (!cardsContainer) {
      logError('Conversations cards container not found');
      return;
    }
    
    if (conversations.length === 0) {
      cardsContainer.innerHTML = `
        <div class="col-span-1 px-4 py-16 text-center">
          <div class="flex flex-col items-center gap-3">
            <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <svg class="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <p class="text-white/60 text-sm font-medium">No conversations found</p>
            <p class="text-white/40 text-xs">Try adjusting your filters or date range</p>
          </div>
        </div>
      `;
      return;
    }

    // Build HTML string for card-based layout
    const htmlContent = conversations.map(conv => {
      const isSelected = this.selectedConversationIds.has(conv.id);
      const aiStatusClass = conv.aiStatus.toLowerCase() === 'completed' ? 'completed' :
                           conv.aiStatus.toLowerCase() === 'processing' ? 'processing' : 'failed';

      // Channel icon mapping
      const channelIcons: Record<string, string> = {
        'chat': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>',
        'email': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
        'phone': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>',
      };
      const channelIcon = channelIcons[conv.channel || 'chat'] || channelIcons['chat'];
      const channelLabel = conv.channel ? conv.channel.charAt(0).toUpperCase() + conv.channel.slice(1) : 'Chat';
      
      // Format subject to be more readable
      let subjectDisplay = conv.subject;
      if (subjectDisplay.startsWith('Conversation ')) {
        subjectDisplay = subjectDisplay.replace(/^Conversation \d+/, '').trim() || 'Conversation';
      }
      
      // Format date
      const dateDisplay = conv.created || '-';
      
      // CSAT stars
      const csatStars = '★'.repeat(Math.min(conv.csat, 5)) + '☆'.repeat(Math.max(0, 5 - conv.csat));
      
      // Format ID
      const idStr = String(conv.id);
      const shortId = idStr.length > 12 ? idStr.substring(idStr.length - 8) : idStr;
      
      // Get assignment ID from selected audit (prefer pending assignments)
      const getAssignmentId = (): string | null => {
        if (!this.selectedAudit || !this.selectedAudit.audits || !Array.isArray(this.selectedAudit.audits)) {
          return null;
        }
        // Prefer pending assignments, then in_progress, then any
        const pending = this.selectedAudit.audits.find((a: any) => a.status === 'pending');
        if (pending && pending.id) return pending.id;
        const inProgress = this.selectedAudit.audits.find((a: any) => a.status === 'in_progress');
        if (inProgress && inProgress.id) return inProgress.id;
        const first = this.selectedAudit.audits[0];
        return first && first.id ? first.id : null;
      };
      
      const assignmentId = getAssignmentId();
      const playButtonHtml = assignmentId ? `
        <button 
          class="conversation-play-button"
          data-conversation-id="${this.escapeHtml(conv.id)}"
          data-assignment-id="${this.escapeHtml(assignmentId)}"
          title="Start audit for this conversation"
          style="display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; background: linear-gradient(135deg, #1A733E 0%, #15582E 100%); border: none; border-radius: 0.375rem; cursor: pointer; transition: all 0.2s; flex-shrink: 0;"
          onmouseover="this.style.background='linear-gradient(135deg, #15582E 0%, #0f3d1f 100%)'; this.style.transform='scale(1.05)'"
          onmouseout="this.style.background='linear-gradient(135deg, #1A733E 0%, #15582E 100%)'; this.style.transform='scale(1)'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
      ` : '';
      
      return `
        <div class="conversation-card ${isSelected ? 'conversation-card-selected' : ''}" data-conversation-id="${this.escapeHtml(conv.id)}">
          <!-- Card Header -->
          <div class="conversation-card-header">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <input type="checkbox" class="conversation-checkbox form-checkbox w-4 h-4 flex-shrink-0" 
                     value="${this.escapeHtml(conv.id)}" ${isSelected ? 'checked' : ''} />
              <div class="conversation-id-tile flex items-center gap-1.5 group cursor-pointer flex-shrink-0" 
                   title="Click to copy conversation ID: ${this.escapeHtml(conv.id)}"
                   onclick="navigator.clipboard.writeText('${this.escapeHtml(conv.id)}').then(() => { const el = event.currentTarget.querySelector('.copy-indicator'); if (el) { el.textContent = '✓'; setTimeout(() => { el.textContent = '📋'; }, 2000); } })">
                <span class="text-white/80 text-xs font-mono font-semibold hover:text-white transition-colors">${this.escapeHtml(shortId)}</span>
                <span class="copy-indicator text-white/40 group-hover:text-white/70 text-xs transition-colors" title="Click to copy">📋</span>
              </div>
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-sm font-semibold text-blue-300 border border-white/10 flex-shrink-0">
                  ${this.escapeHtml(conv.client.charAt(0).toUpperCase())}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-white font-medium text-sm truncate" title="${this.escapeHtml(conv.client)}">${this.escapeHtml(conv.client)}</div>
                  <div class="flex items-center gap-2 mt-0.5">
                    <div class="flex items-center gap-1 text-white/50 text-xs">
                      <div class="w-3 h-3 flex-shrink-0">${channelIcon}</div>
                      <span>${this.escapeHtml(channelLabel)}</span>
                    </div>
                    <span class="text-white/30">•</span>
                    <span class="text-white/50 text-xs">${dateDisplay}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              ${playButtonHtml}
              <span class="ai-status-badge-compact ${aiStatusClass}" title="${this.escapeHtml(conv.aiStatus)}">${this.escapeHtml(conv.aiStatus.charAt(0))}</span>
            </div>
          </div>
          
          <!-- Card Body -->
          <div class="conversation-card-body">
            <!-- Subject -->
            <div class="conversation-card-subject">
              <div class="text-white/90 text-sm leading-relaxed line-clamp-2" title="${this.escapeHtml(conv.subject)}">${this.escapeHtml(subjectDisplay)}</div>
            </div>
            
            <!-- Metrics Row -->
            <div class="conversation-card-metrics">
              <div class="conversation-metric">
                <div class="conversation-metric-label">CSAT</div>
                <div class="conversation-metric-value">
                  ${conv.csat > 0 ? `<span class="text-yellow-400 text-sm font-semibold" title="CSAT Rating: ${conv.csat}/5">${csatStars}</span>` : '<span class="text-white/30 text-sm">-</span>'}
                </div>
              </div>
              <div class="conversation-metric">
                <div class="conversation-metric-label">CX Score</div>
                <div class="conversation-metric-value">
                  ${conv.cxScore > 0 ? `<span class="inline-flex items-center justify-center px-2 py-1 rounded-md text-sm font-semibold ${conv.cxScore >= 4 ? 'bg-green-500/20 text-green-400' : conv.cxScore >= 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}" title="CX Score: ${conv.cxScore}/5${conv.cxScoreExplanation ? ' - ' + this.escapeHtml(conv.cxScoreExplanation.substring(0, 100)) : ''}">${conv.cxScore}/5</span>` : '<span class="text-white/30 text-sm">-</span>'}
                </div>
              </div>
              <div class="conversation-metric">
                <div class="conversation-metric-label">Duration</div>
                <div class="conversation-metric-value">
                  <span class="text-white/90 text-sm font-medium">${conv.length}m</span>
                </div>
              </div>
              <div class="conversation-metric">
                <div class="conversation-metric-label">Parts</div>
                <div class="conversation-metric-value">
                  <span class="text-white/90 text-sm font-medium">${conv.totalParts}</span>
                </div>
              </div>
              ${conv.errorsDetected > 0 ? `
              <div class="conversation-metric">
                <div class="conversation-metric-label">Errors</div>
                <div class="conversation-metric-value">
                  <span class="inline-flex items-center justify-center px-2 py-1 rounded-md text-sm font-semibold bg-red-500/20 text-red-400">${conv.errorsDetected}</span>
                </div>
              </div>
              ` : ''}
            </div>
            
            <!-- Tags and Topics -->
            ${(Array.isArray(conv.tags) && conv.tags.length > 0) || (Array.isArray(conv.topics) && conv.topics.length > 0) ? `
            <div class="conversation-card-footer">
              ${Array.isArray(conv.tags) && conv.tags.length > 0 ? `
              <div class="conversation-tags-section">
                <div class="conversation-tags-label">Tags:</div>
                <div class="conversation-tags-list">
                  ${conv.tags.map(tag => `<span class="conversation-tag-compact">${this.escapeHtml(tag)}</span>`).join('')}
                </div>
              </div>
              ` : ''}
              ${Array.isArray(conv.topics) && conv.topics.length > 0 ? `
              <div class="conversation-topics-section">
                <div class="conversation-topics-label">Topics:</div>
                <div class="conversation-topics-list">
                  ${conv.topics.map(topic => `<span class="conversation-topic-badge">${this.escapeHtml(topic)}</span>`).join('')}
                </div>
              </div>
              ` : ''}
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Safely set HTML content using DOMPurify
    safeSetHTML(cardsContainer as HTMLElement, htmlContent);

    // Attach checkbox listeners
    cardsContainer.querySelectorAll('.conversation-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const convId = (e.target as HTMLInputElement).value;
        const checked = (e.target as HTMLInputElement).checked;
        this.toggleConversation(convId, checked);
      });
    });
    
    // Attach card click listeners (for selection)
    cardsContainer.querySelectorAll('.conversation-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't toggle if clicking checkbox, copy button, or play button
        const target = e.target as HTMLElement;
        if (target.closest('.conversation-checkbox') || target.closest('.conversation-id-tile') || target.closest('.conversation-play-button')) {
          return;
        }
        const convId = card.getAttribute('data-conversation-id');
        if (convId) {
          const checkbox = card.querySelector('.conversation-checkbox') as HTMLInputElement;
          if (checkbox) {
            checkbox.checked = !checkbox.checked;
            this.toggleConversation(convId, checkbox.checked);
          }
        }
      });
    });
    
    // Attach play button listeners
    cardsContainer.querySelectorAll('.conversation-play-button').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        const conversationId = button.getAttribute('data-conversation-id');
        const assignmentId = button.getAttribute('data-assignment-id');
        
        if (conversationId && assignmentId) {
          // Navigate to audit form with assignment and conversation IDs
          // Include employee_name from selectedAudit to ensure it carries over to the audit form
          const employeeName = this.selectedAudit?.employee_name || '';
          let auditFormUrl = `/src/features/audit-form/presentation/new-audit-form.html?assignment=${encodeURIComponent(assignmentId)}&conversation_id=${encodeURIComponent(conversationId)}`;
          
          // Add employee_name parameter if available (helps with form pre-population)
          if (employeeName) {
            auditFormUrl += `&employee_name=${encodeURIComponent(employeeName)}`;
          }
          
          logInfo('🎬 Opening audit form', { assignmentId, conversationId, employeeName, url: auditFormUrl });
          window.location.href = auditFormUrl;
        } else {
          logWarn('Cannot open audit form: missing assignment or conversation ID', { conversationId, assignmentId });
        }
      });
    });
  }
  
  private attachConversationCheckboxListeners(): void {
    const cardsContainer = this.container.querySelector('#conversations-cards-body');
    if (!cardsContainer) return;
    
    cardsContainer.querySelectorAll('.conversation-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const convId = (e.target as HTMLInputElement).value;
        const checked = (e.target as HTMLInputElement).checked;
        this.toggleConversation(convId, checked);
      });
    });
  }

  private toggleConversation(conversationId: string, checked: boolean): void {
    if (checked) {
      this.selectedConversationIds.add(conversationId);
    } else {
      this.selectedConversationIds.delete(conversationId);
    }
    this.updateSelectionUI();
  }

  private toggleAllConversations(checked: boolean): void {
    const cardsContainer = this.container.querySelector('#conversations-cards-body');
    if (!cardsContainer) return;
    const checkboxes = cardsContainer.querySelectorAll('.conversation-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
      this.toggleConversation(checkbox.value, checked);
    });
  }

  private updateSelectionUI(): void {
    const count = this.selectedConversationIds.size;
    const countElement = this.container.querySelector('#selected-count');
    const actionsPanel = this.container.querySelector('#selected-conversations-actions');

    if (countElement) {
      countElement.textContent = count.toString();
    }

    if (actionsPanel) {
      if (count > 0) {
        actionsPanel.classList.remove('hidden');
      } else {
        actionsPanel.classList.add('hidden');
      }
    }

    // Update select all checkbox
    const selectAll = this.container.querySelector('#select-all-conversations') as HTMLInputElement;
    if (selectAll) {
      const tableBody = this.getTableBody();
      if (!tableBody) return;
      const visibleCheckboxes = Array.from(tableBody.querySelectorAll('.conversation-checkbox') as NodeListOf<HTMLInputElement>);
      const allChecked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
      selectAll.checked = allChecked;
    }
  }

  private useSelectedConversations(): void {
    const selectedIds = Array.from(this.selectedConversationIds);
    if (this.onConversationsSelectedCallback) {
      this.onConversationsSelectedCallback(selectedIds);
    }
  }

  private clearConversations(): void {
    this.conversations = [];
    this.selectedConversationIds.clear();
    
    try {
      const cardsContainer = this.container.querySelector('#conversations-cards-body');
      if (cardsContainer) {
        cardsContainer.innerHTML = `
          <div class="col-span-1 px-4 py-12 text-center">
            <div class="flex flex-col items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <svg class="w-6 h-6 text-white/40 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
              <p class="text-white/60 text-sm font-medium">Loading conversations...</p>
            </div>
          </div>
        `;
      } else {
        logWarn('Cannot clear conversations: cards container not available');
      }
    } catch (error) {
      logError('Error clearing conversations:', error);
    }
    
    this.updateSelectionUI();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getSelectedConversations(): string[] {
    return Array.from(this.selectedConversationIds);
  }
}

