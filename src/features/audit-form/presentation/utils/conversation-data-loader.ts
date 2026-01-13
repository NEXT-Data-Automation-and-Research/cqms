/**
 * Conversation Data Loader
 * Handles loading conversation data into the audit form
 * Migrated from audit-form.html loadConversationDataIntoForm()
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { getDropdownLoader } from './dropdown-loader.js';
import { getConversationFormatter } from './conversation-formatter.js';
import { getIntercomConversationLoader } from './intercom-conversation-loader.js';
import type { Conversation } from './conversation-formatter.js';

interface ConversationData {
  conversation: Conversation;
  adminInfo?: { id: string; name?: string; email?: string };
  adminEmail?: string;
  conversation_id?: string;
  aiAuditData?: {
    scorecard_id: string;
    ai_scorecard_data?: any;
    ai_confidence_score?: number;
  };
}

export class ConversationDataLoader {
  private dropdownLoader = getDropdownLoader();
  private formatter = getConversationFormatter();
  private conversationLoader = getIntercomConversationLoader();
  private pendingConversationId: string | null = null;

  /**
   * Load conversation data into form
   */
  async loadConversationDataIntoForm(conversationData: ConversationData): Promise<void> {
    const { conversation, adminInfo, adminEmail, conversation_id, aiAuditData } = conversationData;
    
    // Store conversation ID for later use
    this.pendingConversationId = conversation_id || conversation?.id || null;
    if (typeof window !== 'undefined') {
      (window as any).pendingConversationId = this.pendingConversationId;
    }
    
    // Ensure employees are loaded
    await this.dropdownLoader.loadEmployees();
    
    // Pre-fill employee information
    await this.prefillEmployeeInfo(adminEmail);
    
    // Display Intercom alias if available
    this.displayIntercomAlias(adminInfo, adminEmail);
    
    // Pre-fill conversation ID
    await this.prefillConversationId(conversation);
    
    // Pre-fill conversation date
    this.prefillConversationDate(conversation);
    
    // Pre-fill client information
    this.prefillClientInfo(conversation);
    
    // Check if AI audit data is available and preload it
    if (aiAuditData && aiAuditData.scorecard_id && aiAuditData.ai_scorecard_data) {
      logInfo('AI Audit data found, preloading into form');
      await this.prefillAiAuditData(aiAuditData);
    }
  }

  /**
   * Pre-fill employee information
   */
  private async prefillEmployeeInfo(adminEmail?: string): Promise<void> {
    if (!adminEmail) return;
    
    const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
    if (!employeeSelect) return;
    
    const normalizedEmail = adminEmail.toLowerCase().trim();
    let employeeFound = false;
    
    for (let i = 0; i < employeeSelect.options.length; i++) {
      const optionEmail = ((employeeSelect.options[i] as any).dataset.email || '').toLowerCase().trim();
      if (optionEmail === normalizedEmail) {
        employeeSelect.selectedIndex = i;
        employeeSelect.dispatchEvent(new Event('change'));
        employeeFound = true;
        break;
      }
    }
    
    if (!employeeFound) {
      logWarn(`Employee not found in dropdown for email: ${adminEmail}`);
      await this.showDialog({
        title: 'Employee Not Found',
        message: `Employee with email ${adminEmail} not found in the system. Please select the employee manually.`,
        confirmText: 'OK',
        type: 'warning'
      });
    }
  }

  /**
   * Display Intercom alias
   */
  private displayIntercomAlias(adminInfo?: { name?: string }, adminEmail?: string): void {
    if (!adminInfo?.name) return;
    
    const intercomAliasContainer = document.getElementById('intercomAliasContainer');
    const intercomAliasInput = document.getElementById('intercomAlias') as HTMLInputElement;
    const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
    
    if (intercomAliasContainer && intercomAliasInput && employeeSelect) {
      const selectedEmployeeName = employeeSelect.options[employeeSelect.selectedIndex]?.textContent || '';
      if (adminInfo.name !== selectedEmployeeName) {
        intercomAliasInput.value = adminInfo.name;
        intercomAliasContainer.style.display = 'block';
      } else {
        intercomAliasContainer.style.display = 'none';
      }
    }
  }

  /**
   * Pre-fill conversation ID
   */
  private async prefillConversationId(conversation: Conversation): Promise<void> {
    if (!conversation.id) return;
    
    const interactionIdField = document.getElementById('interactionId') as HTMLInputElement;
    if (!interactionIdField) return;
    
    interactionIdField.value = conversation.id;
    
    // Ensure chat view is shown
    const transcriptChatView = document.getElementById('transcriptChatView');
    const transcriptTextView = document.getElementById('transcriptTextView');
    if (transcriptChatView && transcriptTextView) {
      transcriptChatView.style.display = 'flex';
      transcriptTextView.style.display = 'none';
    }
    
    // Load the conversation after a short delay
    setTimeout(async () => {
      if (conversation.id) {
        await this.conversationLoader.loadConversationFromIntercom(conversation.id);
      }
    }, 300);
  }

  /**
   * Pre-fill conversation date
   */
  private prefillConversationDate(conversation: Conversation): void {
    if (!conversation.created_at) return;
    
    const interactionDateField = document.getElementById('interactionDate') as HTMLInputElement;
    if (!interactionDateField) return;
    
    const conversationDate = new Date((conversation.created_at as number) * 1000);
    interactionDateField.value = conversationDate.toISOString().split('T')[0];
  }

  /**
   * Pre-fill client information
   */
  private prefillClientInfo(conversation: Conversation): void {
    const clientNameField = document.getElementById('clientName') as HTMLInputElement;
    const clientEmailField = document.getElementById('clientEmail') as HTMLInputElement;
    
    if (clientNameField) {
      clientNameField.value = this.formatter.extractClientName(conversation);
    }
    
    if (clientEmailField) {
      const clientEmail = this.formatter.extractClientEmail(conversation);
      if (clientEmail) {
        clientEmailField.value = clientEmail;
      }
    }
  }

  /**
   * Pre-fill AI audit data
   */
  private async prefillAiAuditData(aiAuditData: ConversationData['aiAuditData']): Promise<void> {
    if (!aiAuditData?.scorecard_id) return;
    
    if (typeof window !== 'undefined' && (window as any).loadScorecards) {
      await (window as any).loadScorecards();
    }
    
    const scorecardSelect = document.getElementById('scorecardSelect') as HTMLSelectElement;
    if (!scorecardSelect) return;
    
    const option = Array.from(scorecardSelect.options).find(opt => opt.value === aiAuditData.scorecard_id);
    if (option) {
      scorecardSelect.value = aiAuditData.scorecard_id;
      scorecardSelect.dispatchEvent(new Event('change', { bubbles: true }));
      if (typeof window !== 'undefined' && (window as any).loadScorecardParameters) {
        await (window as any).loadScorecardParameters(aiAuditData.scorecard_id);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    logInfo('AI audit data prefill completed');
  }

  /**
   * Show dialog
   */
  private async showDialog(options: {
    title: string;
    message: string;
    confirmText: string;
    type: string;
  }): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).confirmationDialog) {
      await (window as any).confirmationDialog.show(options);
    } else {
      alert(`${options.title}: ${options.message}`);
    }
  }

  /**
   * Get pending conversation ID
   */
  getPendingConversationId(): string | null {
    return this.pendingConversationId;
  }
}

// Singleton instance
let conversationDataLoaderInstance: ConversationDataLoader | null = null;

/**
 * Get conversation data loader instance
 */
export function getConversationDataLoader(): ConversationDataLoader {
  if (!conversationDataLoaderInstance) {
    conversationDataLoaderInstance = new ConversationDataLoader();
  }
  return conversationDataLoaderInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).loadConversationDataIntoForm = async (conversationData: ConversationData) => {
    await getConversationDataLoader().loadConversationDataIntoForm(conversationData);
  };
}

