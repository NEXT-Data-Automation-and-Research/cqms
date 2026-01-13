/**
 * Conversation Starter Controller
 * Handles starting an audit from an Intercom conversation
 * Migrated from audit-form.html startAuditFromConversation()
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { getConversationExtractors } from '../utils/conversation-extractors.js';
import { getAdminLookup } from '../utils/admin-lookup.js';
import { getDropdownLoader } from '../utils/dropdown-loader.js';
import type { Conversation } from '../utils/conversation-formatter.js';

export class ConversationStarter {
  private extractors = getConversationExtractors();
  private adminLookup = getAdminLookup();
  private dropdownLoader = getDropdownLoader();

  /**
   * Start audit from conversation
   */
  async startAuditFromConversation(conversation: Conversation): Promise<void> {
    try {
      logInfo('START AUDIT FROM CONVERSATION');
      logInfo('Conversation:', conversation);
      
      // Extract admin information from conversation
      const adminInfo = this.extractors.extractAdminFromConversation(conversation);
      
      if (!adminInfo || !adminInfo.id) {
        await this.showDialog({
          title: 'Admin Not Found',
          message: 'Could not find admin information in this conversation. Please select the employee manually.',
          confirmText: 'OK',
          type: 'warning'
        });
      }
      
      // If admin email is not available, try to look it up
      let adminEmail = adminInfo?.email;
      if (!adminEmail && adminInfo?.id) {
        // Try to fetch admin email from cache or API
        try {
          const adminId = adminInfo.id;
          const email = await this.lookupAdminEmail(adminId);
          adminEmail = email || undefined;
        } catch (error) {
          logWarn('Failed to lookup admin email:', error);
        }
      }
      
      // Show the full screen audit form modal
      const auditFormModal = document.getElementById('auditFormModal');
      if (auditFormModal) {
        auditFormModal.style.display = 'flex';
      }
      
      // Ensure employees are loaded
      await this.dropdownLoader.loadEmployees();
      
      // Pre-fill employee information
      await this.prefillEmployeeInfo(adminEmail);
      
      // Store conversation ID for later use
      if (conversation.id && typeof window !== 'undefined') {
        (window as any).pendingConversationId = conversation.id;
      }
      
      // Display Intercom alias if available and different from employee name
      this.displayIntercomAlias(adminInfo?.name);
      
    } catch (error) {
      logError('Error starting audit from conversation:', error);
      await this.showDialog({
        title: 'Error',
        message: `Failed to start audit: ${(error as Error).message}`,
        confirmText: 'OK',
        type: 'error'
      });
    }
  }

  /**
   * Lookup admin email by ID
   */
  private async lookupAdminEmail(adminId: string): Promise<string | null> {
    // Try to get from cache or API
    // This is a simplified version - full implementation would query admin cache
    return null;
  }

  /**
   * Pre-fill employee information
   */
  private async prefillEmployeeInfo(adminEmail: string | null | undefined): Promise<void> {
    if (!adminEmail) {
      logWarn('Admin email not available');
      return;
    }
    
    const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
    if (!employeeSelect) {
      logWarn('Employee select not found');
      return;
    }
    
    // Find and select the employee in dropdown by email
    const normalizedEmail = adminEmail.toLowerCase().trim();
    let employeeFound = false;
    
    for (let i = 0; i < employeeSelect.options.length; i++) {
      const optionEmail = ((employeeSelect.options[i] as any).dataset?.email || '').toLowerCase().trim();
      if (optionEmail === normalizedEmail) {
        employeeSelect.selectedIndex = i;
        // Trigger change event to populate other fields
        employeeSelect.dispatchEvent(new Event('change'));
        employeeFound = true;
        logInfo(`Employee found and selected: ${adminEmail}`);
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
  private displayIntercomAlias(alias: string | null | undefined): void {
    if (!alias) return;
    
    const intercomAliasContainer = document.getElementById('intercomAliasContainer');
    const intercomAliasInput = document.getElementById('intercomAlias') as HTMLInputElement;
    
    if (intercomAliasContainer && intercomAliasInput) {
      intercomAliasContainer.style.display = 'block';
      intercomAliasInput.value = alias;
    }
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
}

// Singleton instance
let conversationStarterInstance: ConversationStarter | null = null;

/**
 * Get conversation starter instance
 */
export function getConversationStarter(): ConversationStarter {
  if (!conversationStarterInstance) {
    conversationStarterInstance = new ConversationStarter();
  }
  return conversationStarterInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).startAuditFromConversation = async (conversation: Conversation) => {
    await getConversationStarter().startAuditFromConversation(conversation);
  };
}

